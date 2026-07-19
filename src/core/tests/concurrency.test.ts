import { describe, it, expect, beforeEach } from "vitest";
import { InventoryRepository } from "../database/repositories/InventoryRepository";
import { AccountingRepository } from "../database/repositories/AccountingRepository";
import { getDb } from "../database/db";
import { stockItems, tenants, warehouses, journalEntries } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { runMigrationsUp } from "../database/migrations";
import { PGlite } from "@electric-sql/pglite";

describe("Optimistic Locking & Concurrency Conflict Tests", () => {
  const tenantId = "TEN-LOCK-TEST";
  const warehouseId = "WH-LOCK-01";
  const sku = "SKU-LOCK-99";
  const entryId = "JE-LOCK-01";

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
      status: "Posted",
      costCenter: "CC-01",
      profitCenter: "PC-01",
      creator: "SYSTEM",
      version: 1,
    });
  });

  it("should successfully update a stock item when there are no concurrency conflicts", async () => {
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

  it("should reject concurrent stock updates that provide a stale version (Optimistic Locking)", async () => {
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

  it("should successfully update a journal entry when there are no concurrency conflicts", async () => {
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

  it("should reject concurrent journal entry updates that provide a stale version (Optimistic Locking)", async () => {
    const entryA = {
      id: entryId,
      description: "Updated by Client A",
      status: "Posted",
      version: 1,
    };

    const entryB = {
      id: entryId,
      description: "Updated by Client B",
      status: "Posted",
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
});
