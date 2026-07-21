import { describe, it, expect, beforeAll } from "vitest";
import { getDb, getDbForTenant } from "../database/db";
import { logSecurityAudit } from "../security/auth-middleware";
import { sql } from "drizzle-orm";
import { auditLogs } from "../database/schema";

describe("Multi-Tenant Isolation Hardening Regression Tests (P0-2 & P0-3)", () => {
  let dbAlpha: any;
  let dbBeta: any;

  beforeAll(async () => {
    const db = await getDb();
    
    // Seed required mock entities to satisfy foreign key constraints
    await db.execute(sql`
      INSERT INTO tenants (id, name)
      VALUES 
        ('TEN-HARD-ALPHA', 'Tenant Alpha'),
        ('TEN-HARD-BETA', 'Tenant Beta')
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO branches (id, tenant_id, name)
      VALUES 
        ('BR-HARD-ALPHA', 'TEN-HARD-ALPHA', 'Branch Alpha'),
        ('BR-HARD-BETA', 'TEN-HARD-BETA', 'Branch Beta')
      ON CONFLICT DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO users (id, tenant_id, username, password_hash, name, role, branch_id)
      VALUES 
        ('USR-HARD-ALPHA', 'TEN-HARD-ALPHA', 'user_alpha', 'hash', 'Alpha', 'Employee', 'BR-HARD-ALPHA'),
        ('USR-HARD-BETA', 'TEN-HARD-BETA', 'user_beta', 'hash', 'Beta', 'Employee', 'BR-HARD-BETA')
      ON CONFLICT DO NOTHING
    `);

    // Obtain isolated DB proxies for different tenants
    dbAlpha = await getDbForTenant("TEN-HARD-ALPHA");
    dbBeta = await getDbForTenant("TEN-HARD-BETA");
  });

  it("should return a proxied database instance from getDbForTenant", () => {
    expect(dbAlpha).toBeDefined();
    expect(dbBeta).toBeDefined();
    expect(typeof dbAlpha.select).toBe("function");
    expect(typeof dbBeta.select).toBe("function");
  });

  it("should ensure queries under dbAlpha and dbBeta resolve with their respective tenant contexts sequentially", async () => {
    // We execute sequentially because PGlite uses a single-connection state under the hood.
    // In production node-postgres, connections are isolated in a pool.
    
    const alphaContext = await dbAlpha.execute(sql`SELECT current_setting('app.current_tenant_id', true) as tenant`);
    const alphaTenantId = alphaContext.rows[0]?.tenant || alphaContext[0]?.tenant;
    expect(alphaTenantId).toBe("TEN-HARD-ALPHA");

    const betaContext = await dbBeta.execute(sql`SELECT current_setting('app.current_tenant_id', true) as tenant`);
    const betaTenantId = betaContext.rows[0]?.tenant || betaContext[0]?.tenant;
    expect(betaTenantId).toBe("TEN-HARD-BETA");
  });

  it("should isolate transactions sequentially within the proxied database", async () => {
    await dbAlpha.transaction(async (tx1: any) => {
      const context1 = await tx1.execute(sql`SELECT current_setting('app.current_tenant_id', true) as tenant`);
      const tenant1 = context1.rows[0]?.tenant || context1[0]?.tenant;
      expect(tenant1).toBe("TEN-HARD-ALPHA");
    });

    await dbBeta.transaction(async (tx2: any) => {
      const context2 = await tx2.execute(sql`SELECT current_setting('app.current_tenant_id', true) as tenant`);
      const tenant2 = context2.rows[0]?.tenant || context2[0]?.tenant;
      expect(tenant2).toBe("TEN-HARD-BETA");
    });
  });

  it("should ensure logSecurityAudit writes logs securely in the correct tenant context", async () => {
    const signature = await logSecurityAudit(
      "USR-HARD-ALPHA",
      "TEN-HARD-ALPHA",
      "TEST_AUDIT_LOG",
      "documents",
      "DOC-HARD-01",
      { success: true }
    );

    expect(signature).toBeDefined();
    expect(signature).not.toBeNull();

    // Verify the audit log was successfully written using the correct tenant context
    const logs = await dbAlpha.select().from(auditLogs);
    const matchedLog = logs.find((l: any) => l.action === "TEST_AUDIT_LOG");

    expect(matchedLog).toBeDefined();
    expect(matchedLog?.tenantId).toBe("TEN-HARD-ALPHA");
  });
});
