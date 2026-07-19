import { getDb } from "../db";
import { stockItems, warehouses, salesInvoices, purchaseInvoices } from "../schema";
import { eq, and, sql } from "drizzle-orm";
import { StockItem } from "../../../types";

export class InventoryRepository {
  /**
   * Retrieves all stock items for a tenant, with optional pagination.
   */
  public static async getStockItems(tenantId: string, page?: number, limit?: number): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    
    // Count total items
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(stockItems)
      .where(eq(stockItems.tenantId, tenantId));
    const total = Number(countResult[0]?.count || 0);

    let query = db.select().from(stockItems).where(eq(stockItems.tenantId, tenantId));
    
    if (page && limit) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset) as any;
    }

    const results = await query;
    const items = results.map((r: any) => ({
      sku: r.sku,
      name: r.name,
      warehouseId: r.warehouseId,
      quantity: r.quantity,
      unitPrice: Number(r.unitPrice),
      minLevel: r.minLevel,
      category: r.category || undefined,
      subCategory: r.subCategory || undefined,
      version: r.version,
    }));

    return { items, total };
  }

  /**
   * Updates a stock item with Optimistic Locking.
   */
  public static async updateStockItem(item: any, tenantId: string): Promise<void> {
    const db = await getDb();
    const currentVersion = item.version || 1;

    const existing = await db.select().from(stockItems).where(and(eq(stockItems.sku, item.sku), eq(stockItems.tenantId, tenantId)));
    if (existing.length === 0) {
      throw new Error("NOT_FOUND");
    }
    if (existing[0].version !== currentVersion) {
      throw new Error("CONCURRENT_WRITE_CONFLICT");
    }

    await db.update(stockItems)
      .set({
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        version: currentVersion + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(stockItems.sku, item.sku),
        eq(stockItems.tenantId, tenantId),
        eq(stockItems.version, currentVersion)
      ));
  }

  /**
   * Retrieves all warehouses for a tenant.
   */
  public static async getWarehouses(tenantId: string): Promise<any[]> {
    const db = await getDb();
    return await db.select().from(warehouses).where(eq(warehouses.tenantId, tenantId));
  }

  /**
   * Retrieves all sales invoices for a tenant, with optional pagination.
   */
  public static async getSalesInvoices(tenantId: string, page?: number, limit?: number): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(salesInvoices)
      .where(eq(salesInvoices.tenantId, tenantId));
    const total = Number(countResult[0]?.count || 0);

    let query = db.select().from(salesInvoices).where(eq(salesInvoices.tenantId, tenantId));
    
    if (page && limit) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset) as any;
    }

    const items = await query;
    return { items, total };
  }

  /**
   * Retrieves all purchase invoices for a tenant, with optional pagination.
   */
  public static async getPurchaseInvoices(tenantId: string, page?: number, limit?: number): Promise<{ items: any[]; total: number }> {
    const db = await getDb();
    
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.tenantId, tenantId));
    const total = Number(countResult[0]?.count || 0);

    let query = db.select().from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId));
    
    if (page && limit) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset) as any;
    }

    const items = await query;
    return { items, total };
  }
}
