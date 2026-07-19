import { SecurityPermissionEngine } from "../security/rbac";

export interface AuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: string;
  newValues: string;
  tenantId: string;
  cryptographicSignature: string; // للتأكد من عدم التلاعب بسجلات المراجعة
}

export interface DatabaseMetadata {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // لدعم الحذف اللطيف Soft Delete
  version: number;
}

export class DatabaseEngineFoundation {
  private auditLogs: AuditRecord[] = [];

  /**
   * Safe transaction execution ensuring atomicity (Unit of Work).
   */
  public async executeTransaction<T>(
    operation: () => Promise<T>,
    rollback: () => Promise<void>
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.error("Transaction failed, initiating database rollback...", error);
      await rollback();
      throw error;
    }
  }

  /**
   * Generates a structural audit trail for any insert/update/delete operation.
   * Multi-tenant context (tenantId) is embedded directly.
   */
  public logAudit(
    userId: string,
    action: "INSERT" | "UPDATE" | "DELETE",
    tableName: string,
    recordId: string,
    tenantId: string,
    newValues: Record<string, any>,
    oldValues?: Record<string, any>
  ): AuditRecord {
    const newValString = JSON.stringify(newValues);
    const oldValString = oldValues ? JSON.stringify(oldValues) : undefined;
    
    // Cryptographically sign the audit record
    const signaturePayload = `${action}-${tableName}-${recordId}-${newValString}-${tenantId}`;
    const cryptographicSignature = SecurityPermissionEngine.generateAuditSignature(signaturePayload, userId);

    const audit: AuditRecord = {
      id: `AUDIT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      tableName,
      recordId,
      oldValues: oldValString,
      newValues: newValString,
      tenantId,
      cryptographicSignature
    };

    this.auditLogs.unshift(audit); // LIFO audit log
    return audit;
  }

  public getAuditLogs(tenantId: string): AuditRecord[] {
    return this.auditLogs.filter(log => log.tenantId === tenantId);
  }
}
