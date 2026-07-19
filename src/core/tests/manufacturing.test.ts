import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../database/db";
import { boms, bomComponents, productionOrders, costCenters, profitCenters, stockItems, tenants, warehouses } from "../database/schema";
import { eq, and } from "drizzle-orm";

describe("Manufacturing & Cost Centers Schema and Integration Tests", () => {
  const tenantId = "TEN-MFG-TEST";
  const warehouseId = "WH-MFG-01";
  const rawSku = "RAW-SUGAR-01";
  const productSku = "SWEET-CANDY-01";

  beforeEach(async () => {
    const db = await getDb();

    // Ensure tenant and warehouse exist
    try {
      await db.insert(tenants).values({ id: tenantId, name: "Manufacturing Tenant" }).onConflictDoNothing();
      await db.insert(warehouses).values({ id: warehouseId, tenantId, name: "MFG WH", location: "Cairo" }).onConflictDoNothing();
    } catch (e) {}

    // Clean up test records
    await db.delete(bomComponents).where(eq(bomComponents.tenantId, tenantId));
    await db.delete(boms).where(eq(boms.tenantId, tenantId));
    await db.delete(productionOrders).where(eq(productionOrders.tenantId, tenantId));
    await db.delete(costCenters).where(eq(costCenters.tenantId, tenantId));
    await db.delete(profitCenters).where(eq(profitCenters.tenantId, tenantId));
    await db.delete(stockItems).where(and(eq(stockItems.sku, rawSku), eq(stockItems.tenantId, tenantId)));
    await db.delete(stockItems).where(and(eq(stockItems.sku, productSku), eq(stockItems.tenantId, tenantId)));

    // Insert RAW rawMaterial sugar
    await db.insert(stockItems).values({
      sku: rawSku,
      tenantId,
      name: "سكر أبيض نقي مميز",
      warehouseId,
      quantity: 500,
      unitPrice: "10",
      version: 1,
    });
  });

  it("should successfully insert and retrieve a Bill of Materials (BOM) with its components", async () => {
    const db = await getDb();

    // Create BOM
    await db.insert(boms).values({
      id: "BOM-CANDY",
      tenantId,
      productSku,
      productName: "مكعبات حلوى السكر اللذيذة",
      laborCost: "2.5"
    });

    // Create components
    await db.insert(bomComponents).values({
      id: "BOM-CANDY-COMP-1",
      tenantId,
      bomId: "BOM-CANDY",
      sku: rawSku,
      name: "سكر أبيض نقي مميز",
      quantityRequired: 5
    });

    // Fetch and assert
    const dbBom = await db.select().from(boms).where(and(eq(boms.id, "BOM-CANDY"), eq(boms.tenantId, tenantId)));
    expect(dbBom).toHaveLength(1);
    expect(dbBom[0].productSku).toBe(productSku);
    expect(dbBom[0].laborCost).toBe("2.5");

    const dbComps = await db.select().from(bomComponents).where(and(eq(bomComponents.bomId, "BOM-CANDY"), eq(bomComponents.tenantId, tenantId)));
    expect(dbComps).toHaveLength(1);
    expect(dbComps[0].sku).toBe(rawSku);
    expect(dbComps[0].quantityRequired).toBe(5);
  });

  it("should successfully insert, retrieve and transition a production order status", async () => {
    const db = await getDb();

    // Create order
    await db.insert(productionOrders).values({
      id: "PO-CANDY-01",
      tenantId,
      bomId: "BOM-CANDY",
      productName: "مكعبات حلوى السكر اللذيذة",
      quantity: 10,
      status: "Planned",
      startDate: "2026-07-14"
    });

    // Fetch
    let dbOrders = await db.select().from(productionOrders).where(and(eq(productionOrders.id, "PO-CANDY-01"), eq(productionOrders.tenantId, tenantId)));
    expect(dbOrders).toHaveLength(1);
    expect(dbOrders[0].status).toBe("Planned");

    // Transition status
    await db.update(productionOrders)
      .set({ status: "In Progress" })
      .where(and(eq(productionOrders.id, "PO-CANDY-01"), eq(productionOrders.tenantId, tenantId)));

    dbOrders = await db.select().from(productionOrders).where(and(eq(productionOrders.id, "PO-CANDY-01"), eq(productionOrders.tenantId, tenantId)));
    expect(dbOrders[0].status).toBe("In Progress");
  });

  it("should successfully record budget and spending inside Cost Centers", async () => {
    const db = await getDb();

    // Create cost center
    await db.insert(costCenters).values({
      id: "CC-PROD-TEST",
      tenantId,
      name: "مركز نفقات خط الإنتاج التجريبي",
      budget: "50000",
      spent: "1500"
    });

    const dbCc = await db.select().from(costCenters).where(and(eq(costCenters.id, "CC-PROD-TEST"), eq(costCenters.tenantId, tenantId)));
    expect(dbCc).toHaveLength(1);
    expect(dbCc[0].budget).toBe("50000");
    expect(dbCc[0].spent).toBe("1500");
  });

  it("should successfully record target and actual revenues inside Profit Centers", async () => {
    const db = await getDb();

    // Create profit center
    await db.insert(profitCenters).values({
      id: "PC-SFT-TEST",
      tenantId,
      name: "مركز أرباح تطوير البرمجيات التجريبي",
      target: "100000",
      actual: "8500"
    });

    const dbPc = await db.select().from(profitCenters).where(and(eq(profitCenters.id, "PC-SFT-TEST"), eq(profitCenters.tenantId, tenantId)));
    expect(dbPc).toHaveLength(1);
    expect(dbPc[0].target).toBe("100000");
    expect(dbPc[0].actual).toBe("8500");
  });
});
