import fs from "fs";
import path from "path";

export interface Migration {
  name: string;
  upFile: string;
  downFile: string;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "core/database", "migrations");

export const migrationsList: Migration[] = [
  {
    name: "0000_initial_schema",
    upFile: "0000_initial_schema.up.sql",
    downFile: "0000_initial_schema.down.sql",
  },
  {
    name: "0001_add_sales_purchase_tables",
    upFile: "0001_add_sales_purchase_tables.up.sql",
    downFile: "0001_add_sales_purchase_tables.down.sql",
  },
  {
    name: "0002_add_optimistic_locking",
    upFile: "0002_add_optimistic_locking.up.sql",
    downFile: "0002_add_optimistic_locking.down.sql",
  },
  {
    name: "0003_add_performance_indexes",
    upFile: "0003_add_performance_indexes.up.sql",
    downFile: "0003_add_performance_indexes.down.sql",
  },
  {
    name: "0004_add_row_level_security",
    upFile: "0004_add_row_level_security.up.sql",
    downFile: "0004_add_row_level_security.down.sql",
  },
  {
    name: "0005_add_manufacturing_cost_centers_tables",
    upFile: "0005_add_manufacturing_cost_centers_tables.up.sql",
    downFile: "0005_add_manufacturing_cost_centers_tables.down.sql",
  },
  {
    name: "0006_add_hr_payroll_tables",
    upFile: "0006_add_hr_payroll_tables.up.sql",
    downFile: "0006_add_hr_payroll_tables.down.sql",
  },
  {
    name: "0007_add_cash_flow_mappings",
    upFile: "0007_add_cash_flow_mappings.up.sql",
    downFile: "0007_add_cash_flow_mappings.down.sql",
  },
  {
    name: "0008_force_row_level_security",
    upFile: "0008_force_row_level_security.up.sql",
    downFile: "0008_force_row_level_security.down.sql",
  },
  {
    name: "0009_add_document_archive_tables",
    upFile: "0009_add_document_archive_tables.up.sql",
    downFile: "0009_add_document_archive_tables.down.sql",
  },
  {
    name: "0010_enterprise_storage_upgrade",
    upFile: "0010_enterprise_storage_upgrade.up.sql",
    downFile: "0010_enterprise_storage_upgrade.down.sql",
  },
];

export async function ensureMigrationsTable(client: any, embedded: boolean) {
  const sql = `
    CREATE TABLE IF NOT EXISTS sys_migrations (
      name TEXT PRIMARY KEY,
      run_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  if (embedded) {
    await client.exec(sql);
  } else {
    await client.query(sql);
  }
}

export async function runMigrationsUp(client: any, embedded: boolean) {
  console.log("[Migrations] Checking database migrations (UP)...");
  await ensureMigrationsTable(client, embedded);

  const querySql = async (sql: string, params: any[] = []) => {
    if (embedded) {
      const res = await client.query(sql, params);
      return res.rows;
    } else {
      const res = await client.query(sql, params);
      return res.rows;
    }
  };

  const executeSql = async (sql: string) => {
    if (embedded) {
      await client.exec(sql);
    } else {
      await client.query(sql);
    }
  };

  // Get already run migrations
  const runMigrationsRows = await querySql("SELECT name FROM sys_migrations");
  const runMigrationsSet = new Set(runMigrationsRows.map((r: any) => r.name));

  for (const m of migrationsList) {
    if (!runMigrationsSet.has(m.name)) {
      console.log(`[Migrations] Applying migration: ${m.name}`);
      const upPath = path.join(MIGRATIONS_DIR, m.upFile);
      let sqlContent = fs.readFileSync(upPath, "utf-8");
      
      // Dynamically inject the operational database password from process.env if present
      const dbPassword = process.env.APP_DB_PASSWORD || "fallback_secure_password_for_dev_2026_entropy_checked";
      sqlContent = sqlContent.replace(/\$APP_DB_PASSWORD\$/g, dbPassword);
      
      await executeSql(sqlContent);
      
      if (embedded) {
        await client.query("INSERT INTO sys_migrations (name) VALUES ($1)", [m.name]);
      } else {
        await client.query("INSERT INTO sys_migrations (name) VALUES ($1)", [m.name]);
      }
      console.log(`[Migrations] Migration ${m.name} completed successfully.`);
    } else {
      console.log(`[Migrations] Migration ${m.name} is already applied.`);
    }
  }
}

export async function runMigrationsDown(client: any, embedded: boolean) {
  console.log("[Migrations] Rolling back database migrations (DOWN)...");
  await ensureMigrationsTable(client, embedded);

  const querySql = async (sql: string, params: any[] = []) => {
    if (embedded) {
      const res = await client.query(sql, params);
      return res.rows;
    } else {
      const res = await client.query(sql, params);
      return res.rows;
    }
  };

  const executeSql = async (sql: string) => {
    if (embedded) {
      await client.exec(sql);
    } else {
      await client.query(sql);
    }
  };

  const runMigrationsRows = await querySql("SELECT name FROM sys_migrations ORDER BY run_at DESC");
  
  for (const row of runMigrationsRows) {
    const m = migrationsList.find(x => x.name === row.name);
    if (m) {
      console.log(`[Migrations] Rolling back migration: ${m.name}`);
      const downPath = path.join(MIGRATIONS_DIR, m.downFile);
      const sqlContent = fs.readFileSync(downPath, "utf-8");
      
      await executeSql(sqlContent);
      
      await client.query("DELETE FROM sys_migrations WHERE name = $1", [m.name]);
      console.log(`[Migrations] Rollback of ${m.name} completed successfully.`);
    }
  }
}
