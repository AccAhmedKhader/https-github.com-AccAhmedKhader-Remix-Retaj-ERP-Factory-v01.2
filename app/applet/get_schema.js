import { PGlite } from "@electric-sql/pglite";

async function dump() {
  const db = new PGlite("/app/applet/erp.db");
  
  // Get all tables
  const tablesRes = await db.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != 'sys_migrations'
  `);
  
  console.log("Found tables:", tablesRes.rows.map(r => r.tablename));
  
  for (const table of tablesRes.rows) {
    const tableName = table.tablename;
    console.log(`\n-- ==========================================================`);
    console.log(`-- Table: ${tableName}`);
    console.log(`-- ==========================================================`);
    
    // Get columns
    const colsRes = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    console.log(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
    const colDefs = colsRes.rows.map(c => {
      let def = `  ${c.column_name} ${c.data_type.toUpperCase()}`;
      if (c.is_nullable === "NO") {
        def += " NOT NULL";
      }
      if (c.column_default) {
        def += ` DEFAULT ${c.column_default}`;
      }
      return def;
    });
    
    // Get primary keys, unique constraints, foreign keys
    // For simplicity, let's print constraints too if possible
    console.log(colDefs.join(",\n"));
    console.log(");");
  }
}

dump().catch(console.error);
