import { describe, it, expect, beforeEach } from "vitest";
import { InventoryRepository } from "../database/repositories/InventoryRepository";
import { AccountingRepository } from "../database/repositories/AccountingRepository";
import { getDb } from "../database/db";
import { stockItems, tenants, warehouses, journalEntries, cheques } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { runMigrationsUp } from "../database/migrations";
import { PGlite } from "@electric-sql/pglite";

describe("Optimistic Locking & Concurrency Conflict Tests (P2)", () => {
  const tenantId = "TEN-LOCK-TEST";
  const warehouseId = "WH-LOCK-01";
  const sku = "SKU-LOCK-99";
  const entryId = "JE-LOCK-01";
  const chequeId = "CHQ-LOCK-01";

  beforeEach(async () => {
    // Seed test database record with version = 1
    const db = await getDb();
    
    // Ensure tenant and warehouse exist
    try {
      await db.insert(tenants).values({ id: tenantId, name: "Test Tenant" });
      await db.insert(warehouses).values({ id: warehouseId, tenantId, name: "Locking WH", location: "Loc" });
    } catch (e) {}

    // Delete existing sku to ensure clean state
    await db.delete(stockItems).where(and(eq(stockItems.sku, sku), eq(stockItems.tenantId, tenantId)));

    // Insert clean item
    await db.insert(stockItems).values({
      sku,
      tenantId,
      name: "Concurrent Item",
      warehouseId,
      quantity: 100,
      unitPrice: "10",
      version: 1,
    });

    // Delete existing journal entry to ensure clean state
    await db.delete(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.tenantId, tenantId)));

    // Insert clean journal entry
    await db.insert(journalEntries).values({
      id: entryId,
      tenantId,
      date: "2026-07-14",
      description: "Original Description",
      reference: "REF-01",
      status: "Draft",
      costCenter: "CC-01",
      profitCenter: "PC-01",
      creator: "SYSTEM",
      version: 1,
    });

    // Delete existing cheque to ensure clean state
    await db.delete(cheques).where(and(eq(cheques.id, chequeId), eq(cheques.tenantId, tenantId)));

    // Insert clean cheque
    await db.insert(cheques).values({
      id: chequeId,
      tenantId,
      chequeNumber: "CHQ-LOCK-01",
      bankName: "Test Bank",
      amount: "5000",
      receiveDate: "2026-07-20",
      dueDate: "2026-08-20",
      beneficiaryType: "ThirdParty",
      beneficiaryName: "Beneficiary Lock",
      status: "InSafe",
      version: 1,
    });
  });

  it("should successfully update a stock item when there are no concurrency conflicts (P2-1)", async () => {
    const item = {
      sku,
      name: "Concurrent Item",
      warehouseId,
      quantity: 120, // updated
      unitPrice: 10,
      minLevel: 10,
      version: 1, // correct version
    };

    await expect(InventoryRepository.updateStockItem(item, tenantId)).resolves.not.toThrow();

    // Verify quantity was updated and version incremented to 2
    const db = await getDb();
    const rows = await db.select().from(stockItems).where(and(eq(stockItems.sku, sku), eq(stockItems.tenantId, tenantId)));
    expect(rows[0].quantity).toBe(120);
    expect(rows[0].version).toBe(2);
  });

  it("should reject concurrent stock updates that provide a stale version (Optimistic Locking) (P2-2)", async () => {
    // Client A and Client B both read the record at version 1
    const itemA = {
      sku,
      name: "Concurrent Item",
      warehouseId,
      quantity: 150,
      unitPrice: 10,
      minLevel: 10,
      version: 1,
    };

    const itemB = {
      sku,
      name: "Concurrent Item",
      warehouseId,
      quantity: 200,
      unitPrice: 10,
      minLevel: 10,
      version: 1, // Client B is also trying to update relying on stale version 1
    };

    // Client A updates successfully
    await InventoryRepository.updateStockItem(itemA, tenantId);

    // Client B tries to update but version is now 2 in DB, so Client B's update should fail
    await expect(InventoryRepository.updateStockItem(itemB, tenantId)).rejects.toThrow("CONCURRENT_WRITE_CONFLICT");

    // Verify quantity is what Client A set, not Client B
    const db = await getDb();
    const rows = await db.select().from(stockItems).where(and(eq(stockItems.sku, sku), eq(stockItems.tenantId, tenantId)));
    expect(rows[0].quantity).toBe(150);
    expect(rows[0].version).toBe(2);
  });

  it("should successfully update a journal entry when there are no concurrency conflicts (P2-3)", async () => {
    const entry = {
      id: entryId,
      description: "Updated Description A",
      status: "Posted",
      version: 1,
    };

    await expect(AccountingRepository.updateJournalEntry(entry, tenantId)).resolves.not.toThrow();

    // Verify description was updated and version incremented to 2
    const db = await getDb();
    const rows = await db.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.tenantId, tenantId)));
    expect(rows[0].description).toBe("Updated Description A");
    expect(rows[0].version).toBe(2);
  });

  it("should reject concurrent journal entry updates that provide a stale version (Optimistic Locking) (P2-4)", async () => {
    const entryA = {
      id: entryId,
      description: "Updated by Client A",
      status: "Draft",
      version: 1,
    };

    const entryB = {
      id: entryId,
      description: "Updated by Client B",
      status: "Draft",
      version: 1,
    };

    // Client A updates successfully
    await AccountingRepository.updateJournalEntry(entryA, tenantId);

    // Client B tries to update but version is now 2 in DB, so Client B's update should fail
    await expect(AccountingRepository.updateJournalEntry(entryB, tenantId)).rejects.toThrow("CONCURRENT_WRITE_CONFLICT");

    // Verify description is what Client A set, not Client B
    const db = await getDb();
    const rows = await db.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.tenantId, tenantId)));
    expect(rows[0].description).toBe("Updated by Client A");
    expect(rows[0].version).toBe(2);
  });

  it("should successfully update a cheque and reject concurrent updates providing a stale version (P2-5)", async () => {
    const chequeA = {
      id: chequeId,
      status: "Collected",
      notes: "Updated by A",
      version: 1,
    };

    const chequeB = {
      id: chequeId,
      status: "Bounced",
      notes: "Updated by B",
      version: 1,
    };

    // 1. Success case: Client A updates first
    await expect(AccountingRepository.updateCheque(chequeA, tenantId)).resolves.not.toThrow();

    // Verify status and notes were updated and version incremented to 2
    const db = await getDb();
    let rows = await db.select().from(cheques).where(and(eq(cheques.id, chequeId), eq(cheques.tenantId, tenantId)));
    expect(rows[0].status).toBe("Collected");
    expect(rows[0].notes).toBe("Updated by A");
    expect(rows[0].version).toBe(2);

    // 2. Conflict case: Client B tries to update relying on stale version 1
    await expect(AccountingRepository.updateCheque(chequeB, tenantId)).rejects.toThrow("CONCURRENT_WRITE_CONFLICT");

    // Verify status is still what Client A set, not Client B
    rows = await db.select().from(cheques).where(and(eq(cheques.id, chequeId), eq(cheques.tenantId, tenantId)));
    expect(rows[0].status).toBe("Collected");
    expect(rows[0].version).toBe(2);
  });
});
