import { getDb } from "../db";
import { tenants } from "../schema";
import { eq } from "drizzle-orm";
import { EnterpriseDBEngine, ERPDatabaseState } from "../db-engine";

export class TenantRepository {
  /**
   * Retrieves the full in-memory state of a tenant, ensuring it is initialized first.
   */
  public static async getTenantState(tenantId: string): Promise<ERPDatabaseState> {
    return await EnterpriseDBEngine.initForTenantAsync(tenantId);
  }

  /**
   * Synchronizes and persists the full state for a tenant.
   */
  public static syncTenantState(newState: ERPDatabaseState, tenantId: string) {
    EnterpriseDBEngine.syncState(newState, tenantId);
  }

  /**
   * Checks if a tenant exists in the database.
   */
  public static async exists(tenantId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    return result.length > 0;
  }
}
