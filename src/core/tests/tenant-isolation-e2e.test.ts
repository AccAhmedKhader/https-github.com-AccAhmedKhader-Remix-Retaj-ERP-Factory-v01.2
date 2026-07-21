// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../../server";
import { getDb, getDbForTenant } from "../database/db";
import { sql } from "drizzle-orm";
import { AuthService } from "../security/auth-service";
import { journalEntries } from "../database/schema";

describe("Row-Level Security (RLS) & E2E Tenant Isolation Integration Tests", () => {
  let tokenA: string;
  let tokenB: string;
  let dbAlpha: any;

  beforeAll(async () => {
    const db = await getDb();
    
    // 1. Seed tenants
    await db.execute(sql`
      INSERT INTO tenants (id, name, fiscal_year)
      VALUES 
        ('TEN-E2E-A', 'Tenant E2E Alpha', '2026'),
        ('TEN-E2E-B', 'Tenant E2E Beta', '2026')
      ON CONFLICT DO NOTHING;
    `);

    // 2. Seed branches
    await db.execute(sql`
      INSERT INTO branches (id, tenant_id, name)
      VALUES 
        ('BR-E2E-A', 'TEN-E2E-A', 'Branch E2E Alpha'),
        ('BR-E2E-B', 'TEN-E2E-B', 'Branch E2E Beta')
      ON CONFLICT DO NOTHING;
    `);

    // 3. Seed users
    await db.execute(sql`
      INSERT INTO users (id, tenant_id, username, password_hash, name, role, branch_id)
      VALUES 
        ('USR-E2E-A', 'TEN-E2E-A', 'user_e2e_alpha', 'hash', 'User E2E Alpha', 'CFO', 'BR-E2E-A'),
        ('USR-E2E-B', 'TEN-E2E-B', 'user_e2e_beta', 'hash', 'User E2E Beta', 'CFO', 'BR-E2E-B')
      ON CONFLICT DO NOTHING;
    `);
    
    // 4. Seed isolated accounting data for Tenant A
    await db.execute(sql`
      INSERT INTO journal_entries (id, tenant_id, date, description, reference, status, creator, cost_center, profit_center)
      VALUES 
        ('JE-E2E-A-TEST', 'TEN-E2E-A', '2026-07-21', 'Journal Entry E2E Alpha Private', 'REF-A-999', 'Approved', 'USR-E2E-A', '', '')
      ON CONFLICT DO NOTHING;
    `);

    // 5. Seed isolated accounting data for Tenant B
    await db.execute(sql`
      INSERT INTO journal_entries (id, tenant_id, date, description, reference, status, creator, cost_center, profit_center)
      VALUES 
        ('JE-E2E-B-TEST', 'TEN-E2E-B', '2026-07-21', 'Journal Entry E2E Beta Private', 'REF-B-999', 'Approved', 'USR-E2E-B', '', '')
      ON CONFLICT DO NOTHING;
    `);

    // 6. Generate authenticated tokens
    tokenA = AuthService.generateAccessToken({
      id: "USR-E2E-A",
      username: "user_e2e_alpha",
      role: "CFO",
      tenantId: "TEN-E2E-A",
      branchId: "BR-E2E-A"
    });

    tokenB = AuthService.generateAccessToken({
      id: "USR-E2E-B",
      username: "user_e2e_beta",
      role: "CFO",
      tenantId: "TEN-E2E-B",
      branchId: "BR-E2E-B"
    });

    // 7. Initialize Tenant A's database proxy
    dbAlpha = await getDbForTenant("TEN-E2E-A");
  });

  it("should return only Tenant A's journal entries when authenticated as Tenant A", async () => {
    const res = await request(app)
      .get("/api/v1/accounting/journal-entries")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const entries = res.body.data;
    expect(entries).toBeDefined();
    
    // Must find Tenant A's entry
    const matchedAlpha = entries.find((e: any) => e.id === "JE-E2E-A-TEST");
    expect(matchedAlpha).toBeDefined();
    expect(matchedAlpha.tenantId).toBe("TEN-E2E-A");

    // Must NOT find Tenant B's entry
    const matchedBeta = entries.find((e: any) => e.id === "JE-E2E-B-TEST");
    expect(matchedBeta).toBeUndefined();
  }, 30000);

  it("should return only Tenant B's journal entries when authenticated as Tenant B", async () => {
    const res = await request(app)
      .get("/api/v1/accounting/journal-entries")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const entries = res.body.data;
    expect(entries).toBeDefined();
    
    // Must find Tenant B's entry
    const matchedBeta = entries.find((e: any) => e.id === "JE-E2E-B-TEST");
    expect(matchedBeta).toBeDefined();
    expect(matchedBeta.tenantId).toBe("TEN-E2E-B");

    // Must NOT find Tenant A's entry
    const matchedAlpha = entries.find((e: any) => e.id === "JE-E2E-A-TEST");
    expect(matchedAlpha).toBeUndefined();
  });

  it("should reject malicious/fake tenantId query parameters or headers with 403, preventing bypass", async () => {
    const res = await request(app)
      .get("/api/v1/accounting/journal-entries")
      .query({ tenantId: "TEN-E2E-B" }) // Attempt parameter tampering
      .set("X-Tenant-Id", "TEN-E2E-B")  // Attempt header tampering
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("TENANT_ACCESS_DENIED");
  });

  it("should throw an explicit database error and block write operations (inserts/updates) when attempting to write data under a different tenant ID (via WITH CHECK)", async () => {
    // Attempting to insert a Tenant B journal entry inside Tenant A's DB proxy context
    await expect(
      dbAlpha.insert(journalEntries).values({
        id: "JE-E2E-MALICIOUS",
        tenantId: "TEN-E2E-B", // Malicious payload
        date: "2026-07-21",
        description: "Malicious Cross-Tenant Write Attempt",
        reference: "EVIL",
        status: "Posted",
        creator: "HACKER",
        version: 1
      })
    ).rejects.toThrow(); // RLS WITH CHECK policy triggers error
  });
});
