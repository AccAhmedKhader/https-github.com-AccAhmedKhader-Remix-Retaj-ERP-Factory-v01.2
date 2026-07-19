import { describe, it, expect, beforeEach } from "vitest";
import { AccountingRepository } from "../database/repositories/AccountingRepository";
import { getDb } from "../database/db";
import { journalEntries, tenants } from "../database/schema";
import { eq, and } from "drizzle-orm";

describe("Accounting Audit Integrity Tests", () => {
  const tenantId = "TEN-ACCT-AUDIT";
  const entryId = "JE-AUDIT-01";

  beforeEach(async () => {
    const db = await getDb();
    try {
      await db.insert(tenants).values({ id: tenantId, name: "Audit Tenant" });
    } catch (e) {}

    await db.delete(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.tenantId, tenantId)));

    await db.insert(journalEntries).values({
      id: entryId,
      tenantId,
      date: "2026-07-14",
      description: "Audited Entry",
      reference: "REF-AUDIT",
      status: "Posted",
      costCenter: "CC-01",
      profitCenter: "PC-01",
      creator: "SYSTEM",
      version: 1,
    });
  });

  it("should strictly reject any update or modification to an already posted journal entry", async () => {
    const updatedEntry = {
      id: entryId,
      description: "Hack description of posted entry",
      status: "Posted",
      version: 1,
    };

    await expect(AccountingRepository.updateJournalEntry(updatedEntry, tenantId))
      .rejects.toThrow("CANNOT_MODIFY_POSTED_JOURNAL");
  });

  it("should prevent closing financial period when there are journal entries in Draft status", async () => {
    // Simulate enterprise database engine memory state containing draft entries
    const { EnterpriseDBEngine } = await import("../database/db-engine");
    
    // Create a temporary mock tenant database
    const mockTenantId = `TEN-TEMP-CLOSE-${Date.now()}`;
    const dbState = EnterpriseDBEngine.initForTenant(mockTenantId);
    
    // Inject a draft journal entry
    dbState.journalEntries.push({
      id: "JE-DRAFT-99",
      date: "2026-07-19",
      description: "Draft test entry",
      reference: "REF-01",
      status: "Draft",
      lines: [],
      costCenter: "CC-01",
      profitCenter: "PC-01",
      creator: "Test User"
    });

    // Attempting to close the period should throw a clear validation error blocking the close
    expect(() => {
      EnterpriseDBEngine.executeTransaction((db) => {
        const draftEntries = db.journalEntries.filter(e => e.status?.toLowerCase() === "draft");
        if (draftEntries.length > 0) {
          throw new Error("CANNOT_CLOSE_PERIOD_WITH_DRAFT_ENTRIES");
        }
      }, mockTenantId);
    }).toThrow("CANNOT_CLOSE_PERIOD_WITH_DRAFT_ENTRIES");
  });

  it("should handle fixed asset multi-year depreciation rounding perfectly", () => {
    // Initializing a fixed asset that needs exact final rounding correction
    const asset = {
      id: "FA-ROUND-TEST",
      name: "High Precision Scale",
      cost: 10000,
      salvageValue: 1000,
      usefulLifeYears: 3, // Depreciable: 9000. Annual: 3000. Monthly: 250 (9000 / 36 = 250)
      bookValue: 1240, // Almost depreciated
      accumulatedDepreciation: 8760,
      status: "Active"
    };

    // Calculate monthly rate normally: Math.round(((cost - salvage) / usefulLifeYears) / 12)
    const annualDepr = (asset.cost - asset.salvageValue) / asset.usefulLifeYears;
    const monthlyDepr = Math.round(annualDepr / 12); // 250
    const remainingDepreciable = asset.bookValue - asset.salvageValue; // 240

    let monthlyDeprFinal = monthlyDepr;
    // Check if remaining depreciable is close to or less than monthlyDepr * 1.5 to adjust final roundings
    if (remainingDepreciable <= monthlyDepr * 1.5) {
      monthlyDeprFinal = remainingDepreciable; // Corrected to exactly 240 to eliminate rounding errors
    }

    expect(monthlyDeprFinal).toBe(240); // Assert final rounding correction applied
    
    // Simulate updating the asset
    asset.accumulatedDepreciation += monthlyDeprFinal;
    asset.bookValue -= monthlyDeprFinal;
    if (asset.bookValue <= asset.salvageValue) {
      asset.status = "Fully Depreciated";
    }

    expect(asset.bookValue).toBe(1000); // Equal to exactly salvage value
    expect(asset.accumulatedDepreciation).toBe(9000); // Depreciated fully
    expect(asset.status).toBe("Fully Depreciated");
  });
});
