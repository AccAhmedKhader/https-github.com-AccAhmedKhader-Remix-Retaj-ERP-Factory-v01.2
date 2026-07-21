import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import * as schema from "./schema";
import { runMigrationsUp } from "./migrations";

// Multi-tenant context store using AsyncLocalStorage
export const tenantContextStore = new AsyncLocalStorage<{ tenantId: string }>();

// ES6 Proxy wrapper to recursively run queries on Drizzle/tx instances in the correct tenant context
export function createTenantDbProxy(db: any, tenantId: string): any {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return function(this: any, ...args: any[]) {
          // If a clientInstance (like PGlite) is active, schedule the set_config query
          // synchronously first to guarantee execution order in PGlite's queue.
          if (clientInstance) {
            try {
              clientInstance.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
            } catch (err) {
              console.error("[DB Engine] Proxy set_config failed:", err);
            }
          }

          // Wrap transactions recursively
          if (prop === "transaction") {
            const userCallback = args[0];
            if (typeof userCallback === "function") {
              args[0] = function(tx: any) {
                return tenantContextStore.run({ tenantId }, () => {
                  const txProxy = createTenantDbProxy(tx, tenantId);
                  return userCallback(txProxy);
                });
              };
            }
          }
          // Wrap normal Drizzle query execution in AsyncLocalStorage tenant scope
          return tenantContextStore.run({ tenantId }, () => {
            return val.apply(target, args);
          });
        };
      }
      return val;
    }
  });
}

// Monkey-patch pg.Client to automatically enforce current tenant session variable on the active connection
try {
  const originalPgQuery = pg.Client.prototype.query;
  pg.Client.prototype.query = function(this: any, ...args: any[]) {
    const store = tenantContextStore.getStore();
    const desiredTenantId = store?.tenantId;
    
    const isSettingTenant = this.__settingTenant || 
      (typeof args[0] === "string" && args[0].includes("set_config")) ||
      (args[0] && typeof args[0] === "object" && args[0].text && args[0].text.includes("set_config"));
    
    if (!desiredTenantId || isSettingTenant) {
      return (originalPgQuery as any).apply(this, args as any);
    }
    
    if (this.__currentTenantId === desiredTenantId) {
      return (originalPgQuery as any).apply(this, args as any);
    }
    
    this.__settingTenant = true;
    const self = this;
    const setConfigQuery = "SELECT set_config('app.current_tenant_id', $1, false)";
    
    // Check if callback pattern is used (last argument is a function)
    const lastArg = args[args.length - 1];
    const hasCallback = typeof lastArg === "function";
    
    if (hasCallback) {
      const userCallback = lastArg;
      (originalPgQuery as any).call(self, setConfigQuery, [desiredTenantId], (err: any) => {
        self.__settingTenant = false;
        if (err) {
          return userCallback(err);
        }
        self.__currentTenantId = desiredTenantId;
        (originalPgQuery as any).apply(self, args as any);
      });
    } else {
      return (originalPgQuery as any).call(self, setConfigQuery, [desiredTenantId])
        .then(() => {
          self.__settingTenant = false;
          self.__currentTenantId = desiredTenantId;
          return (originalPgQuery as any).apply(self, args as any);
        })
        .catch((err: any) => {
          self.__settingTenant = false;
          throw err;
        });
    }
  };
} catch (err) {
  console.error("[DB Engine] Failed to patch pg.Client:", err);
}

// Monkey-patch PGlite to automatically enforce current tenant session variable for tests & dev fallback
try {
  if (PGlite && PGlite.prototype) {
    const originalPgliteQuery = PGlite.prototype.query;
    PGlite.prototype.query = function(this: any, ...args: any[]) {
      const store = tenantContextStore.getStore();
      const desiredTenantId = store?.tenantId;
      
      const isSettingTenant = this.__settingTenant || 
        (typeof args[0] === "string" && args[0].includes("set_config")) ||
        (args[0] && typeof args[0] === "object" && args[0].text && args[0].text.includes("set_config"));
      
      if (!desiredTenantId || isSettingTenant) {
        return originalPgliteQuery.apply(this, args as any);
      }
      
      this.__settingTenant = true;
      const self = this;
      
      if (!self.__queryQueue) {
        self.__queryQueue = Promise.resolve();
      }
      
      const nextInQueue = self.__queryQueue.then(async () => {
        try {
          if (self.__currentTenantId !== desiredTenantId) {
            const setConfigQuery = "SELECT set_config('app.current_tenant_id', $1, false)";
            await originalPgliteQuery.call(self, setConfigQuery, [desiredTenantId]);
            self.__currentTenantId = desiredTenantId;
          }
          self.__settingTenant = false;
          return await originalPgliteQuery.apply(self, args as any);
        } catch (err) {
          self.__settingTenant = false;
          throw err;
        }
      });
      
      self.__queryQueue = nextInQueue.then(() => {}, () => {});
      return nextInQueue;
    };
  }
} catch (err) {
  console.error("[DB Engine] Failed to patch PGlite:", err);
}

function sanitizeConnectionString(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const match = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (match) {
      const [_, protocol, user, pass, rest] = match;
      if (pass.includes("#") || pass.includes("@") || pass.includes("%")) {
        // Only decode if it's already encoded, or encode it if it isn't
        const decodedPass = decodeURIComponent(pass);
        const encodedPass = encodeURIComponent(decodedPass);
        return `${protocol}${user}:${encodedPass}@${rest}`;
      }
    }
  } catch (e) {
    console.error("[DB Engine] Connection string sanitization failed:", e);
  }
  return url;
}

let dbPromise: Promise<any> | null = null;
let clientInstance: any = null;
let isPglite = false;

export async function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const rawDbUrl = process.env.DATABASE_URL;
    const dbUrl = sanitizeConnectionString(rawDbUrl);
    const rawMigrationDbUrl = process.env.MIGRATION_DATABASE_URL || rawDbUrl;
    const migrationDbUrl = sanitizeConnectionString(rawMigrationDbUrl);

    // Determine environment configuration
    const isProd = process.env.NODE_ENV === "production";
    const hasDbUrl = !!rawDbUrl && rawDbUrl.trim() !== "" && rawDbUrl !== "undefined";

    let usePostgres = false;
    if (dbUrl && (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) && process.env.VITEST !== "true") {
      console.log("[DB Engine] Connecting to external PostgreSQL database for migrations...");
      const migrationPool = new pg.Pool({ connectionString: migrationDbUrl, connectionTimeoutMillis: 5000 });
      try {
        // Attempt a quick connection to verify if the server is reachable and active
        const testClient = await migrationPool.connect();
        testClient.release();

        await initializeDatabase(migrationPool, false);
        usePostgres = true;
      } catch (err: any) {
        // In a production environment, if a DATABASE_URL has been defined, any failure to connect
        // to PostgreSQL is a critical failure. Falling back to an ephemeral/local database silently
        // poses high risk of data mismatch or silent data loss.
        if (isProd) {
          console.error("[DB Engine] CRITICAL: Connection to external PostgreSQL database failed in PRODUCTION mode. Throwing error to prevent silent ephemeral fallback.");
          throw err;
        } else {
          // In a development or staging environment, we can safely allow fallback, but we must
          // log it very clearly with a warning so the developer is aware of the fallback state.
          console.warn(
            `[DB Engine] WARNING: FALLBACK TRIGGERED! Connection to external PostgreSQL database failed: ${err.message || err}. ` +
            `Since NODE_ENV is set to "${process.env.NODE_ENV || 'development'}" (non-production), we are falling back to the embedded, file-backed PGlite PostgreSQL database.`
          );
        }
      } finally {
        await migrationPool.end();
        console.log("[DB Engine] Migration connection pool closed.");
      }
    } else {
      // If DATABASE_URL is defined in production but has an invalid/unrecognized format/protocol,
      // fail fast with a helpful error.
      if (isProd && hasDbUrl && process.env.VITEST !== "true") {
        console.error(`[DB Engine] CRITICAL: Invalid or unrecognized protocol in DATABASE_URL in PRODUCTION mode: ${rawDbUrl}. Aborting startup.`);
        throw new Error(`CRITICAL: Invalid DATABASE_URL protocol in production mode: ${rawDbUrl}`);
      }
    }

    if (usePostgres) {
      console.log("[DB Engine] Connecting operational database pool...");
      const pool = new pg.Pool({ connectionString: dbUrl });
      clientInstance = pool;
      isPglite = false;
      const dbInst = drizzlePg(pool, { schema });
      return dbInst;
    } else {
      if (!hasDbUrl) {
        console.log("[DB Engine] No DATABASE_URL provided. Defaulting to embedded local/file-backed PGlite PostgreSQL...");
      } else {
        console.log("[DB Engine] Falling back to embedded local/file-backed PGlite PostgreSQL due to unreachable external database...");
      }
      // Persistent local Postgres database
      let pgliteClient: PGlite | null = null;
      let fallback = false;
      
      if (process.env.VITEST === "true") {
        console.log("[DB Engine] Vitest environment detected. Forcing in-memory PGlite PostgreSQL to prevent file-lock contention.");
        fallback = true;
      }
      
      try {
        if (!fallback) {
        const dbPath = path.resolve(process.cwd(), "erp.db");
        
        // Ensure parent directory exists and is writable
        const parentDir = path.dirname(dbPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        
        // Try creating/verifying writing to the dbPath directory itself
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        fs.accessSync(dbPath, fs.constants.W_OK);
        console.log(`[DB Engine] Verified write access to database path: ${dbPath}`);

        // Auto-remedy for Windows/Linux: Clean up stale lock files from previous crashes/restarts
        const lockFile = path.join(dbPath, "lock");
        if (fs.existsSync(lockFile)) {
          try {
            fs.unlinkSync(lockFile);
            console.log(`[DB Engine] Cleaned up stale PGlite lock file: ${lockFile}`);
          } catch (lockErr: any) {
            console.warn(`[DB Engine] Note: Could not delete lock file (if another process is active, this is normal): ${lockErr.message}`);
          }
        }

        const temp = new PGlite(dbPath);
        // Execute a quick test query to verify WASM engine and storage file locks are working
        await temp.query("SELECT 1");
        pgliteClient = temp;
        }
      } catch (e: any) {
        console.warn("[DB Engine] PGlite failed to initialize using path './erp.db':", e.message || e);
        fallback = true;
      }

      if (fallback || !pgliteClient) {
        console.log("[DB Engine] Initializing a completely in-memory PGlite database as a robust fallback...");
        pgliteClient = new PGlite();
      }

      clientInstance = pgliteClient;
      isPglite = true;
      const dbInst = drizzlePglite(pgliteClient, { schema });
      await initializeDatabase(pgliteClient, true);
      return dbInst;
    }
  })();

  return dbPromise;
}

export function patchPgliteInstance(client: any) {
  // Discarded to prevent double-patching and promise queue deadlock
}

export async function getDbForTenant(tenantId: string) {
  const db = await getDb();
  if (clientInstance) {
    if (isPglite) {
      patchPgliteInstance(clientInstance);
    }
    try {
      await clientInstance.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
    } catch (e) {
      console.error("[DB Engine] Failed to run initial set_config on clientInstance:", e);
    }
  }
  return createTenantDbProxy(db, tenantId);
}

// Graceful shutdown to close PGlite clean up lock files
async function gracefulShutdown() {
  if (clientInstance) {
    console.log("[DB Engine] Graceful shutdown triggered. Releasing database file locks...");
    try {
      if (isPglite) {
        await clientInstance.close();
      } else {
        await clientInstance.end();
      }
      console.log("[DB Engine] Database file locks released cleanly.");
    } catch (err: any) {
      console.error("[DB Engine] Error releasing database locks:", err.message);
    }
  }
}

process.on("SIGINT", async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await gracefulShutdown();
  process.exit(0);
});

async function initializeDatabase(client: any, embedded: boolean) {
  console.log("[DB Engine] Running database initialization and self-healing DDL...");

  const executeSql = async (sql: string) => {
    if (embedded) {
      await client.exec(sql);
    } else {
      await client.query(sql);
    }
  };

  const querySql = async (sql: string, params: any[] = []) => {
    if (embedded) {
      const res = await client.query(sql, params);
      return res.rows;
    } else {
      const res = await client.query(sql, params);
      return res.rows;
    }
  };

  // --- CRITICAL SECTION ---
  // Migrations and core seeds (tenants, branches, users) must succeed, otherwise throw to stop execution
  try {
    // 1. Run migrations
    console.log("[DB Engine] Applying database migrations...");
    await runMigrationsUp(client, embedded);
    console.log("[DB Engine] Migrations checked and applied successfully. Running Phase 2 security schema self-healing...");

    // Phase 2 Self-healing table migrations
    await executeSql(`
      CREATE TABLE IF NOT EXISTS sys_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        refresh_token TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS user_mfa (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        mfa_secret TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        backup_codes TEXT NOT NULL
      );
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS document_acls (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        role TEXT,
        permission_type TEXT NOT NULL,
        action TEXT NOT NULL
      );
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS folder_acls (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        role TEXT,
        permission_type TEXT NOT NULL,
        action TEXT NOT NULL
      );
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS folder_security_settings (
        folder_id TEXT PRIMARY KEY REFERENCES document_folders(id) ON DELETE CASCADE,
        owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        is_protected BOOLEAN NOT NULL DEFAULT FALSE,
        department_id TEXT,
        is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
        is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
        inherit_permissions BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    await executeSql(`
      CREATE TABLE IF NOT EXISTS sys_encryption_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        key_type TEXT NOT NULL,
        encrypted_key_value TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);

    // Phase 3 Self-healing Search and Intelligent Discovery schemas
    await executeSql(`
      CREATE TABLE IF NOT EXISTS document_search_index (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        ocr_text TEXT,
        category TEXT NOT NULL,
        department_id TEXT,
        owner_id TEXT,
        security_level TEXT NOT NULL DEFAULT 'Public',
        status TEXT NOT NULL DEFAULT 'Active',
        tags TEXT,
        custom_metadata TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        extension TEXT,
        has_signature BOOLEAN NOT NULL DEFAULT FALSE,
        has_versions BOOLEAN NOT NULL DEFAULT FALSE,
        has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
        retention_policy TEXT,
        is_legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        embedding_vector TEXT
      );
    `);

    await executeSql(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        filters TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await executeSql(`
      CREATE TABLE IF NOT EXISTS search_analytics_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await executeSql(`
      CREATE TABLE IF NOT EXISTS recent_searches (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await executeSql(`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        client_name TEXT NOT NULL,
        title TEXT NOT NULL,
        value NUMERIC NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'Lead',
        source TEXT NOT NULL DEFAULT 'Direct',
        phone TEXT,
        email TEXT,
        created_at TEXT NOT NULL,
        probability INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Index creation & search vector initialization
    await executeSql(`
      ALTER TABLE document_search_index ADD COLUMN IF NOT EXISTS search_vector tsvector;
    `);

    // GIN index for search_vector
    await executeSql(`
      CREATE INDEX IF NOT EXISTS doc_search_vector_gin_idx ON document_search_index USING GIN (search_vector);
    `);

    // GIN index or standard index for tags/categories
    await executeSql(`
      CREATE INDEX IF NOT EXISTS doc_tags_gin_idx ON document_search_index (tags);
    `);

    // Partial index for active documents
    await executeSql(`
      CREATE INDEX IF NOT EXISTS doc_active_partial_idx ON document_search_index (document_id) WHERE status = 'Active';
    `);

    // Covering index for multi-tenant isolation and security permission validation
    await executeSql(`
      CREATE INDEX IF NOT EXISTS doc_tenant_security_covering_idx ON document_search_index (tenant_id, document_id) INCLUDE (security_level, status);
    `);

    console.log("[DB Engine] Phase 3 search schemas and indexes checked and initialized successfully.");
    console.log("[DB Engine] Phase 2 security schemas checked and initialized successfully. Enforcing seeds...");

    // 2. Insert Default Tenant
    const existingTenants = await querySql("SELECT * FROM tenants WHERE id = $1", ["TEN-APEX-01"]);
    if (existingTenants.length === 0) {
      await executeSql(`
        INSERT INTO tenants (id, name, fiscal_year)
        VALUES ('TEN-APEX-01', 'أبيكس تكنولوجيز القابضة', '2026');
      `);
      console.log("[DB Engine] Seeded default tenant.");
    }

    // 3. Insert Default Branch
    const existingBranches = await querySql("SELECT * FROM branches WHERE id = $1", ["BR-CAI-01"]);
    if (existingBranches.length === 0) {
      await executeSql(`
        INSERT INTO branches (id, tenant_id, name)
        VALUES ('BR-CAI-01', 'TEN-APEX-01', 'فرع القاهرة الرئيسي');
      `);
      console.log("[DB Engine] Seeded default branch.");
    }

    // 4. Seed Users (With cryptographically secure bcrypt hashes)
    const adminPassHash = await bcrypt.hash("AdminPassword2026!", 10);
    const cfoPassHash = await bcrypt.hash("CFOPassword2026!", 10);
    
    await executeSql(`
      INSERT INTO users (id, tenant_id, username, password_hash, name, role, branch_id)
      VALUES 
      ('USR-001', 'TEN-APEX-01', 'admin', '${adminPassHash}', 'أحمد خضر', 'SystemAdmin', 'BR-CAI-01'),
      ('USR-002', 'TEN-APEX-01', 'ahlam', '${cfoPassHash}', 'أحلام سلطان', 'CFO', 'BR-CAI-01')
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        tenant_id = EXCLUDED.tenant_id,
        branch_id = EXCLUDED.branch_id;
    `);
    console.log("[DB Engine] Seeded and updated default enterprise users.");

  } catch (err: any) {
    console.error("[DB Engine] CRITICAL: Database migration or essential seeding failed. Stopping application execution.", err);
    throw err;
  }

  // --- NON-CRITICAL SECTION ---
  // Optional/auxiliary data seeding failures should be handled gracefully without stopping application startup

  // 5. Seed Chart of Accounts
  try {
    const existingAccounts = await querySql("SELECT * FROM accounts");
    if (existingAccounts.length === 0) {
      await executeSql(`
        INSERT INTO accounts (code, tenant_id, name, type, balance, initial_balance, classification)
        VALUES
        ('10100', 'TEN-APEX-01', 'بنك CIB - الحساب الجاري بالجنيه المصري', 'Asset', '0', '0', 'نقدية بالصندوق والبنوك'),
        ('10200', 'TEN-APEX-01', 'بنك ADIB - حساب فرع الإمارات بالدرهم', 'Asset', '0', '0', 'نقدية بالصندوق والبنوك'),
        ('10300', 'TEN-APEX-01', 'النقدية بالخزينة الرئيسية', 'Asset', '0', '0', 'نقدية بالصندوق والبنوك'),
        ('11000', 'TEN-APEX-01', 'العملاء (أوراق القبض والذمم التجارية)', 'Asset', '0', '0', 'المدينون والذمم المدينة الأخرى'),
        ('12000', 'TEN-APEX-01', 'مخزون المواد الخام (مستودع القاهرة)', 'Asset', '0', '0', 'الأصول المتداولة - المخزون'),
        ('12100', 'TEN-APEX-01', 'مخزون السلع التامة (مستودع الإسكندرية)', 'Asset', '0', '0', 'الأصول المتداولة - المخزون'),
        ('20100', 'TEN-APEX-01', 'الموردون (أوراق الدفع والذمم الدائنة)', 'Liability', '0', '0', 'الدائنون والذمم الدائنة الأخرى'),
        ('22000', 'TEN-APEX-01', 'مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)', 'Liability', '0', '0', 'التزامات ضريبية ومستحقات حكومية'),
        ('22100', 'TEN-APEX-01', 'التزامات ضريبة الخصم والإضافة (نموذج 41)', 'Liability', '0', '0', 'التزامات ضريبية ومستحقات حكومية'),
        ('30100', 'TEN-APEX-01', 'رأس المال المدفوع', 'Equity', '0', '0', 'رأس المال المساهم'),
        ('30200', 'TEN-APEX-01', 'الأرباح المحتجزة', 'Equity', '0', '0', 'الأرباح والاحتياطيات'),
        ('40100', 'TEN-APEX-01', 'إيرادات مبيعات تراخيص البرمجيات للمؤسسات', 'Revenue', '0', '0', 'إيرادات النشاط التشغيلي الرئيسي'),
        ('40200', 'TEN-APEX-01', 'خدمات الاستشارات والتخصيص الفني', 'Revenue', '0', '0', 'إيرادات الخدمات الفنية'),
        ('50100', 'TEN-APEX-01', 'مصروفات الرواتب ومزايا الموظفين', 'Expense', '0', '0', 'مصروفات تشغيلية وإدارية'),
        ('50200', 'TEN-APEX-01', 'مصروفات البنية التحتية للخوادم والسحابة', 'Expense', '0', '0', 'تكلفة الخدمة المستضافة'),
        ('50300', 'TEN-APEX-01', 'مصروفات ضريبة القيمة المضافة المسددة', 'Expense', '0', '0', 'مصروفات حكومية وضريبية'),
        ('50400', 'TEN-APEX-01', 'المصروفات العمومية والإدارية', 'Expense', '0', '0', 'مصروفات تشغيلية وإدارية'),
        ('50410', 'TEN-APEX-01', 'مصروفات أدوات كتابية ومطبوعات', 'Expense', '0', '0', 'مصروفات تشغيلية وإدارية'),
        ('50420', 'TEN-APEX-01', 'مصروفات انتقال وبنزين وضيافة', 'Expense', '0', '0', 'مصروفات تشغيلية وإدارية'),
        ('50430', 'TEN-APEX-01', 'مصروفات إيجار ومرافق المقر الرئيسي', 'Expense', '0', '0', 'مصروفات تشغيلية وإدارية');
      `);
      console.log("[DB Engine] Seeded accounts with zero balances.");
    }
  } catch (err) {
    console.error("[DB Engine] Non-critical error seeding optional chart of accounts:", err);
  }

  // 5.5 Seed Cash Flow Mappings (IAS 7 Default Rules)
  try {
    const existingMappings = await querySql("SELECT * FROM cash_flow_mappings WHERE tenant_id = $1", ["TEN-APEX-01"]);
    if (existingMappings.length === 0) {
      await executeSql(`
        INSERT INTO cash_flow_mappings (account_code, tenant_id, activity_type, category_name)
        VALUES
        ('10100', 'TEN-APEX-01', 'CashEquivalent', 'النقدية بالبنوك والصندوق'),
        ('10200', 'TEN-APEX-01', 'CashEquivalent', 'النقدية بالبنوك والصندوق'),
        ('10300', 'TEN-APEX-01', 'CashEquivalent', 'النقدية بالبنوك والصندوق'),
        ('11000', 'TEN-APEX-01', 'Operating', 'متحصلات نقدية من العملاء'),
        ('12000', 'TEN-APEX-01', 'Operating', 'تغيرات المخزون والمواد الخام'),
        ('12100', 'TEN-APEX-01', 'Operating', 'تغيرات المخزون والمواد الخام'),
        ('20100', 'TEN-APEX-01', 'Operating', 'مدفوعات نقدية للموردين والشركاء'),
        ('22000', 'TEN-APEX-01', 'Operating', 'الضرائب المدفوعة أو المستردة'),
        ('22100', 'TEN-APEX-01', 'Operating', 'الضرائب المدفوعة أو المستردة'),
        ('30100', 'TEN-APEX-01', 'Financing', 'متحصلات من إصدار أسهم رأس المال'),
        ('30200', 'TEN-APEX-01', 'Financing', 'الأرباح الموزعة والمحسوبة'),
        ('40100', 'TEN-APEX-01', 'Operating', 'متحصلات نقدية من العملاء'),
        ('40200', 'TEN-APEX-01', 'Operating', 'متحصلات نقدية من العملاء'),
        ('50100', 'TEN-APEX-01', 'Operating', 'مدفوعات نقدية للموظفين (الرواتب)'),
        ('50200', 'TEN-APEX-01', 'Operating', 'مدفوعات عن نفقات التشغيل الأخرى'),
        ('50300', 'TEN-APEX-01', 'Operating', 'الضرائب المدفوعة أو المستردة'),
        ('50400', 'TEN-APEX-01', 'Operating', 'مدفوعات عن نفقات التشغيل الأخرى'),
        ('50410', 'TEN-APEX-01', 'Operating', 'مدفوعات عن نفقات التشغيل الأخرى'),
        ('50420', 'TEN-APEX-01', 'Operating', 'مدفوعات عن نفقات التشغيل الأخرى'),
        ('50430', 'TEN-APEX-01', 'Operating', 'مدفوعات عن نفقات التشغيل الأخرى');
      `);
      console.log("[DB Engine] Seeded default cash flow mappings.");
    }
  } catch (err) {
    console.error("[DB Engine] Non-critical error seeding optional cash flow mappings:", err);
  }

  // 5.6 Seed CRM Deals
  try {
    const existingDeals = await querySql("SELECT * FROM crm_deals WHERE tenant_id = $1", ["TEN-APEX-01"]);
    if (existingDeals.length === 0) {
      await executeSql(`
        INSERT INTO crm_deals (id, tenant_id, client_name, title, value, stage, source, phone, email, created_at, probability)
        VALUES
        ('DEAL-001', 'TEN-APEX-01', 'مجموعة السويدي إليكتريك', 'ترخيص نظام تخطيط موارد السويدي المركزي', 450000, 'Negotiation', 'حملة التسويق الرقمي', '01002930291', 'procurement@elsewedy.com', '2026-07-01', 80),
        ('DEAL-002', 'TEN-APEX-01', 'أوراسكوم للتنمية ومقاولات الشرق', 'تراخيص ERP للفروع الإقليمية', 1200000, 'Proposal', 'طلب مباشر من الموقع', '02-24019283', 'it-director@orascom.com', '2026-07-05', 60),
        ('DEAL-003', 'TEN-APEX-01', 'الشركة المصرية للاتصالات WE', 'تكامل الفواتير وربط بوابة الدفع', 680000, 'Lead', 'علاقات عامة ومعارض', '01552039485', 'cloud-sales@te.eg', '2026-07-10', 20),
        ('DEAL-004', 'TEN-APEX-01', 'بنك مصر المالي الكلي', 'استشارات التحول الرقمي والحوكمة المالية', 350000, 'Won', 'علاقات عامة ومعارض', '02-23094857', 'fintech@banquemisr.com', '2026-06-25', 100);
      `);
      console.log("[DB Engine] Seeded default CRM deals.");
    }
  } catch (err) {
    console.error("[DB Engine] Non-critical error seeding optional CRM deals:", err);
  }

  console.log("[DB Engine] Relational database initialization completed successfully!");
}
