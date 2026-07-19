import { getDb } from "../db";
import { journalEntries, journalLines, cheques, accounts, cashFlowMappings } from "../schema";
import { eq, and } from "drizzle-orm";
import { JournalEntry, Cheque } from "../../../types";

export class AccountingRepository {
  /**
   * Retrieves all journal entries for a tenant.
   */
  public static async getJournalEntries(tenantId: string): Promise<any[]> {
    const db = await getDb();
    const entries = await db.select().from(journalEntries).where(eq(journalEntries.tenantId, tenantId));
    const lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));

    // Map lines to entries
    return entries.map((entry: any) => {
      const entryLines = lines.filter((line: any) => line.entryId === entry.id);
      return {
        ...entry,
        lines: entryLines.map((line: any) => ({
          ...line,
          debit: Number(line.debit),
          credit: Number(line.credit),
        })),
      };
    });
  }

  /**
   * Creates a new journal entry with optimistic locking version initialization.
   */
  public static async createJournalEntry(entry: any, tenantId: string): Promise<void> {
    const db = await getDb();
    await db.transaction(async (tx: any) => {
      // 1. Insert entry with version 1
      await tx.insert(journalEntries).values({
        id: entry.id,
        tenantId,
        date: entry.date,
        description: entry.description,
        reference: entry.reference || "",
        status: entry.status || "Posted",
        costCenter: entry.costCenter || "",
        profitCenter: entry.profitCenter || "",
        creator: entry.creator || "SYSTEM",
        approvedBy: entry.approvedBy || null,
        isReversed: entry.isReversed || false,
        reversedEntryId: entry.reversedEntryId || null,
        isPeriodLocked: entry.isPeriodLocked || false,
        version: 1,
      });

      // 2. Insert lines
      for (const line of entry.lines) {
        await tx.insert(journalLines).values({
          id: `${entry.id}-${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          entryId: entry.id,
          accountCode: line.accountCode,
          accountName: line.accountName || "",
          debit: (line.debit || 0).toString(),
          credit: (line.credit || 0).toString(),
        });

        // 3. Update account balance (Double-entry posting)
        const diff = (line.debit || 0) - (line.credit || 0);
        if (diff !== 0) {
          const accs = await tx.select().from(accounts).where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, line.accountCode)));
          if (accs.length > 0) {
            const newBal = Number(accs[0].balance) + diff;
            await tx.update(accounts)
              .set({ balance: newBal.toString() })
              .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, line.accountCode)));
          }
        }
      }
    });
  }

  /**
   * Updates an existing journal entry enforcing Optimistic Locking.
   */
  public static async updateJournalEntry(entry: any, tenantId: string): Promise<void> {
    const db = await getDb();
    const currentVersion = entry.version || 1;

    await db.transaction(async (tx: any) => {
      // 1. Query current state to check existence and version BEFORE update
      const existing = await tx.select().from(journalEntries).where(and(eq(journalEntries.id, entry.id), eq(journalEntries.tenantId, tenantId)));
      if (existing.length === 0) {
        throw new Error("NOT_FOUND");
      }
      if (existing[0].status === "Posted") {
        throw new Error("CANNOT_MODIFY_POSTED_JOURNAL");
      }
      if (existing[0].version !== currentVersion) {
        throw new Error("CONCURRENT_WRITE_CONFLICT");
      }

      // 2. Perform the update and increment version with double-layered atomic safety check
      await tx.update(journalEntries)
        .set({
          description: entry.description,
          status: entry.status,
          version: currentVersion + 1,
          updatedAt: new Date(),
        })
        .where(and(
          eq(journalEntries.id, entry.id),
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.version, currentVersion)
        ));
    });
  }

  /**
   * Retrieves all cheques for a tenant.
   */
  public static async getCheques(tenantId: string): Promise<any[]> {
    const db = await getDb();
    const results = await db.select().from(cheques).where(eq(cheques.tenantId, tenantId));
    return results.map((r: any) => ({
      id: r.id,
      chequeNumber: r.chequeNumber,
      bankName: r.bankName,
      amount: Number(r.amount),
      receiveDate: r.receiveDate,
      dueDate: r.dueDate,
      customerId: r.customerId || undefined,
      customerName: r.customerName || undefined,
      beneficiaryType: r.beneficiaryType as any,
      beneficiaryName: r.beneficiaryName,
      status: r.status as any,
      supplierId: r.supplierId || undefined,
      supplierName: r.supplierName || undefined,
      notes: r.notes || undefined,
      version: r.version,
    }));
  }

  /**
   * Updates a cheque with Optimistic Locking.
   */
  public static async updateCheque(cheque: any, tenantId: string): Promise<void> {
    const db = await getDb();
    const currentVersion = cheque.version || 1;

    const existing = await db.select().from(cheques).where(and(eq(cheques.id, cheque.id), eq(cheques.tenantId, tenantId)));
    if (existing.length === 0) {
      throw new Error("NOT_FOUND");
    }
    if (existing[0].version !== currentVersion) {
      throw new Error("CONCURRENT_WRITE_CONFLICT");
    }

    await db.update(cheques)
      .set({
        status: cheque.status,
        notes: cheque.notes || null,
        version: currentVersion + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(cheques.id, cheque.id),
        eq(cheques.tenantId, tenantId),
        eq(cheques.version, currentVersion)
      ));
  }

  /**
   * Retrieves all accounts for a tenant.
   */
  public static async getAccounts(tenantId: string): Promise<any[]> {
    const db = await getDb();
    const list = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    return list.map((acc: any) => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance),
      initialBalance: Number(acc.initialBalance),
      classification: acc.classification || undefined,
    }));
  }

  /**
   * Retrieves all cash flow mappings for a tenant.
   */
  public static async getCashFlowMappings(tenantId: string): Promise<any[]> {
    const db = await getDb();
    return await db.select().from(cashFlowMappings).where(eq(cashFlowMappings.tenantId, tenantId));
  }

  /**
   * Upserts a cash flow mapping for a tenant.
   */
  public static async upsertCashFlowMapping(mapping: any, tenantId: string): Promise<void> {
    const db = await getDb();
    const existing = await db.select().from(cashFlowMappings).where(and(
      eq(cashFlowMappings.accountCode, mapping.accountCode),
      eq(cashFlowMappings.tenantId, tenantId)
    ));

    if (existing.length > 0) {
      await db.update(cashFlowMappings)
        .set({
          activityType: mapping.activityType,
          categoryName: mapping.categoryName,
        })
        .where(and(
          eq(cashFlowMappings.accountCode, mapping.accountCode),
          eq(cashFlowMappings.tenantId, tenantId)
        ));
    } else {
      await db.insert(cashFlowMappings).values({
        accountCode: mapping.accountCode,
        tenantId,
        activityType: mapping.activityType,
        categoryName: mapping.categoryName,
      });
    }
  }
}
