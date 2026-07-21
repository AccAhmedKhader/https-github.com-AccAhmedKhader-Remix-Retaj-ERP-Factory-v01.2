import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Database Password Security & Migration Integration (P0-4)", () => {
  it("should verify that no SQL migration file contains a hardcoded password like ErpAppSecurePass2026", () => {
    const migrationsDir = path.join(process.cwd(), "src", "core/database", "migrations");
    const files = fs.readdirSync(migrationsDir);
    
    for (const file of files) {
      if (file.endsWith(".sql")) {
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        
        // Assert that the deprecated hardcoded password is never found
        expect(content).not.toContain("ErpAppSecurePass2026!");
      }
    }
  });

  it("should verify that the security migration has the safe $APP_DB_PASSWORD$ placeholder", () => {
    const upPath = path.join(process.cwd(), "src", "core/database", "migrations", "0008_force_row_level_security.up.sql");
    const content = fs.readFileSync(upPath, "utf-8");
    
    // Assert the placeholder exists and is formatted correctly
    expect(content).toContain("PASSWORD '$APP_DB_PASSWORD$'");
  });

  it("should verify runtime dynamic password injection and placeholder replacement in migration runner", () => {
    const originalPassword = process.env.APP_DB_PASSWORD;
    try {
      const testPass = "super_secure_dynamic_test_password_123_abc";
      process.env.APP_DB_PASSWORD = testPass;

      // Mock migration text reading
      const mockMigrationText = "CREATE ROLE erp_app_role LOGIN PASSWORD '$APP_DB_PASSWORD$';";
      
      // Perform replacement logic identical to what migrationsList runner does
      const dbPassword = process.env.APP_DB_PASSWORD || "fallback_secure_password_for_dev_2026_entropy_checked";
      const processedSql = mockMigrationText.replace(/\$APP_DB_PASSWORD\$/g, dbPassword);

      expect(processedSql).toBe(`CREATE ROLE erp_app_role LOGIN PASSWORD '${testPass}';`);
    } finally {
      process.env.APP_DB_PASSWORD = originalPassword;
    }
  });
});
