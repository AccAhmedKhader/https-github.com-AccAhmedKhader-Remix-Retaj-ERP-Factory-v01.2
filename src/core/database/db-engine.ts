import fs from "fs";
import path from "path";
import { getDb, getDbForTenant } from "./db";
import { 
  accounts, 
  customers, 
  suppliers, 
  stockItems, 
  warehouses, 
  employees, 
  fixedAssets, 
  cheques, 
  journalEntries, 
  journalLines,
  auditLogs,
  tenants,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  purchaseInvoiceItems,
  branches,
  boms as bomsTable,
  bomComponents as bomComponentsTable,
  productionOrders as productionOrdersTable,
  costCenters as costCentersTable,
  profitCenters as profitCentersTable
} from "./schema";
import { eq, sql } from "drizzle-orm";
import { 
  ChartOfAccount, 
  JournalEntry, 
  JournalLine, 
  StockItem, 
  CostCenter, 
  ProfitCenter,
  Customer,
  Supplier,
  PurchaseInvoice,
  SalesInvoice,
  ProductionOrder,
  Cheque
} from "../../types";

export interface FixedAsset {
  id: string;
  name: string;
  category: "Property" | "Equipment" | "Vehicles" | "IT Hardware";
  purchaseDate: string;
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationAccountCode: string;
  assetAccountCode: string;
  status: "Active" | "Fully Depreciated" | "Disposed";
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  reference: string;
  status: "Unreconciled" | "Reconciled";
  matchedJournalId?: string;
}

export interface CurrencyRate {
  code: string;
  name: string;
  rateToBase: number;
  symbol: string;
}

export interface ERPDatabaseState {
  schemaVersion: number;
  accounts: ChartOfAccount[];
  employees: any[];
  warehouses: any[];
  stock: StockItem[];
  costCenters: CostCenter[];
  profitCenters: ProfitCenter[];
  boms: any[];
  journalEntries: JournalEntry[];
  productionOrders: ProductionOrder[];
  customers: Customer[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  fixedAssets: FixedAsset[];
  bankStatementItems: BankStatementItem[];
  currencyRates: CurrencyRate[];
  cheques: Cheque[];
  config: {
    company: string;
    branch: string;
    warehouse: string;
    fiscalYear: string;
    currency: string;
    language: string;
    theme?: string;
    mode?: "light" | "dark";
  };
}

/**
 * EnterpriseDBEngine: Swapped from flat JSON storage to a real relational PostgreSQL db.
 * Utilizes a high-performance hybrid memory-backed architecture for high-concurrency O(1) reads,
 * while writing and syncing all state modifications inside ACID-compliant PostgreSQL transactions.
 */
export class EnterpriseDBEngine {
  private static tenantStates = new Map<string, ERPDatabaseState>();
  private static initializedTenants = new Set<string>();

  /**
   * Safe asynchronous bootloader.
   * Awaits entire loading process from Postgres into memory so we serve requests with real data.
   */
  public static async init(): Promise<ERPDatabaseState> {
    return await this.initForTenantAsync("TEN-APEX-01");
  }

  public static async initForTenantAsync(tenantId: string = "TEN-APEX-01"): Promise<ERPDatabaseState> {
    if (this.initializedTenants.has(tenantId) && this.tenantStates.has(tenantId)) {
      return this.tenantStates.get(tenantId)!;
    }

    const state = this.getSeedData(tenantId);
    this.tenantStates.set(tenantId, state);
    this.initializedTenants.add(tenantId);

    // Block/wait for SQL loading to complete
    await this.loadStateFromSqlForTenant(tenantId);

    try {
      const db = await getDb();
      let count = 0;
      let jeCount = 0;
      await db.transaction(async (tx: any) => {
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
        const countRes = await tx.select({ count: sql`count(*)` }).from(accounts).where(eq(accounts.tenantId, tenantId));
        count = Number(countRes[0]?.count || 0);

        const jeCountRes = await tx.select({ count: sql`count(*)` }).from(journalEntries).where(eq(journalEntries.tenantId, tenantId));
        jeCount = Number(jeCountRes[0]?.count || 0);
      });

      if (count === 0 || (tenantId === "TEN-APEX-01" && jeCount === 0)) {
        console.log(`[DB Engine] Tenant ${tenantId} is brand new or lacks operational data. Writing initial clean database structure and seed data to SQL...`);
        await this.writeToPostgres(state, tenantId);
        await this.loadStateFromSqlForTenant(tenantId);
      }
    } catch (err) {
      console.error(`[DB Engine] Error auto-seeding SQL for tenant ${tenantId}:`, err);
    }

    return this.tenantStates.get(tenantId)!;
  }

  public static initForTenant(tenantId: string = "TEN-APEX-01"): ERPDatabaseState {
    if (this.initializedTenants.has(tenantId) && this.tenantStates.has(tenantId)) {
      return this.tenantStates.get(tenantId)!;
    }

    const state = this.getSeedData(tenantId);
    this.tenantStates.set(tenantId, state);
    this.initializedTenants.add(tenantId);

    this.loadStateFromSqlForTenant(tenantId).then(async () => {
      try {
        const db = await getDb();
        let count = 0;
        let jeCount = 0;
        await db.transaction(async (tx: any) => {
          await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
          const countRes = await tx.select({ count: sql`count(*)` }).from(accounts).where(eq(accounts.tenantId, tenantId));
          count = Number(countRes[0]?.count || 0);

          const jeCountRes = await tx.select({ count: sql`count(*)` }).from(journalEntries).where(eq(journalEntries.tenantId, tenantId));
          jeCount = Number(jeCountRes[0]?.count || 0);
        });

        if (count === 0 || (tenantId === "TEN-APEX-01" && jeCount === 0)) {
          console.log(`[DB Engine] Tenant ${tenantId} is brand new or lacks operational data. Writing initial clean database structure and seed data to SQL...`);
          await this.writeToPostgres(state, tenantId);
          await this.loadStateFromSqlForTenant(tenantId);
        }
      } catch (err) {
        console.error(`[DB Engine] Error auto-seeding SQL for tenant ${tenantId}:`, err);
      }
    });

    return state;
  }

  /**
   * Asynchronously loads entire database state from PostgreSQL/PGlite into the memory cache for a specific tenant.
   */
  private static async loadStateFromSqlForTenant(tenantId: string) {
    try {
      const db = await getDb();
      console.log(`[DB Engine] Loading full operational state from PostgreSQL/PGlite for tenant ${tenantId} into memory...`);

      let dbAccounts: any[] = [];
      let dbCustomers: any[] = [];
      let dbSuppliers: any[] = [];
      let dbStockItems: any[] = [];
      let dbWarehouses: any[] = [];
      let dbEmployees: any[] = [];
      let dbFixedAssets: any[] = [];
      let dbCheques: any[] = [];
      let dbJournalEntries: any[] = [];
      let dbJournalLines: any[] = [];
      let dbSalesInvoices: any[] = [];
      let dbSalesItems: any[] = [];
      let dbPurchaseInvoices: any[] = [];
      let dbPurchaseItems: any[] = [];
      let dbBoms: any[] = [];
      let dbBomComponents: any[] = [];
      let dbProductionOrders: any[] = [];
      let dbCostCenters: any[] = [];
      let dbProfitCenters: any[] = [];

      await db.transaction(async (tx: any) => {
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

        dbAccounts = await tx.select().from(accounts).where(eq(accounts.tenantId, tenantId));
        dbCustomers = await tx.select().from(customers).where(eq(customers.tenantId, tenantId));
        dbSuppliers = await tx.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));
        dbStockItems = await tx.select().from(stockItems).where(eq(stockItems.tenantId, tenantId));
        dbWarehouses = await tx.select().from(warehouses).where(eq(warehouses.tenantId, tenantId));
        dbEmployees = await tx.select().from(employees).where(eq(employees.tenantId, tenantId));
        dbFixedAssets = await tx.select().from(fixedAssets).where(eq(fixedAssets.tenantId, tenantId));
        dbCheques = await tx.select().from(cheques).where(eq(cheques.tenantId, tenantId));
        dbJournalEntries = await tx.select().from(journalEntries).where(eq(journalEntries.tenantId, tenantId));
        dbJournalLines = await tx.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
        dbSalesInvoices = await tx.select().from(salesInvoices).where(eq(salesInvoices.tenantId, tenantId));
        dbSalesItems = await tx.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.tenantId, tenantId));
        dbPurchaseInvoices = await tx.select().from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId));
        dbPurchaseItems = await tx.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.tenantId, tenantId));
        dbBoms = await tx.select().from(bomsTable).where(eq(bomsTable.tenantId, tenantId));
        dbBomComponents = await tx.select().from(bomComponentsTable).where(eq(bomComponentsTable.tenantId, tenantId));
        dbProductionOrders = await tx.select().from(productionOrdersTable).where(eq(productionOrdersTable.tenantId, tenantId));
        dbCostCenters = await tx.select().from(costCentersTable).where(eq(costCentersTable.tenantId, tenantId));
        dbProfitCenters = await tx.select().from(profitCentersTable).where(eq(profitCentersTable.tenantId, tenantId));
      });

      // Reconstruct state from relational SQL rows
      const mappedAccounts: ChartOfAccount[] = dbAccounts.map((a: any) => ({
        code: a.code,
        name: a.name,
        type: a.type as any,
        balance: Number(a.balance),
        initialBalance: Number(a.initialBalance),
        classification: a.classification || undefined
      }));

      const mappedCustomers: Customer[] = dbCustomers.map((c: any) => ({
        id: c.id,
        name: c.name,
        taxRegistrationNumber: c.taxRegistrationNumber,
        phone: c.phone,
        email: c.email,
        balance: Number(c.balance)
      }));

      const mappedSuppliers: Supplier[] = dbSuppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        taxRegistrationNumber: s.taxRegistrationNumber,
        phone: s.phone,
        email: s.email,
        balance: Number(s.balance)
      }));

      const mappedStock: StockItem[] = dbStockItems.map((st: any) => ({
        sku: st.sku,
        name: st.name,
        warehouseId: st.warehouseId,
        quantity: st.quantity,
        unitPrice: Number(st.unitPrice),
        minLevel: st.minLevel,
        category: st.category || undefined,
        subCategory: st.subCategory || undefined,
        version: st.version || 1
      }));

      const mappedWarehouses = dbWarehouses.map((w: any) => ({
        id: w.id,
        name: w.name,
        location: w.location
      }));

      const mappedEmployees = dbEmployees.map((e: any) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        department: e.department,
        baseSalary: Number(e.baseSalary),
        attendanceDays: e.attendanceDays,
        withholdingTaxRate: Number(e.withholdingTaxRate),
        vatRate: Number(e.vatRate || "0.14"),
        status: e.status as any
      }));

      const mappedFixedAssets: FixedAsset[] = dbFixedAssets.map((fa: any) => ({
        id: fa.id,
        name: fa.name,
        category: fa.category as any,
        purchaseDate: fa.purchaseDate,
        cost: Number(fa.cost),
        salvageValue: Number(fa.salvageValue),
        usefulLifeYears: fa.usefulLifeYears,
        accumulatedDepreciation: Number(fa.accumulatedDepreciation),
        bookValue: Number(fa.bookValue),
        depreciationAccountCode: fa.depreciationAccountCode,
        assetAccountCode: fa.assetAccountCode,
        status: fa.status as any
      }));

      const mappedCheques: Cheque[] = dbCheques.map((ch: any) => ({
        id: ch.id,
        chequeNumber: ch.chequeNumber,
        bankName: ch.bankName,
        amount: Number(ch.amount),
        receiveDate: ch.receiveDate,
        dueDate: ch.dueDate,
        customerId: ch.customerId || undefined,
        customerName: ch.customerName || undefined,
        beneficiaryType: ch.beneficiaryType as any,
        beneficiaryName: ch.beneficiaryName,
        status: ch.status as any,
        supplierId: ch.supplierId || undefined,
        supplierName: ch.supplierName || undefined,
        notes: ch.notes || undefined,
        version: ch.version || 1
      }));

      const mappedJournalEntries: JournalEntry[] = dbJournalEntries.map((je: any) => {
        const lines = dbJournalLines
          .filter((l: any) => l.entryId === je.id)
          .map((l: any) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: Number(l.debit),
            credit: Number(l.credit)
          }));

        return {
          id: je.id,
          date: je.date,
          description: je.description,
          reference: je.reference,
          status: je.status as any,
          costCenter: je.costCenter,
          profitCenter: je.profitCenter,
          creator: je.creator,
          approvedBy: je.approvedBy || undefined,
          lines,
          version: je.version || 1
        };
      });

      const mappedSalesInvoices: SalesInvoice[] = dbSalesInvoices.map((si: any) => {
        const items = dbSalesItems
          .filter((item: any) => item.invoiceId === si.id)
          .map((item: any) => ({
            sku: item.sku,
            name: item.name,
            quantity: Number(item.quantity),
            price: Number(item.unitPrice),
            total: Number(item.lineTotal)
          }));
        
        const subtotal = Number(si.amount);
        const vatAmount = Number(si.taxAmount);
        const total = Number(si.totalAmount);
        const diff = subtotal + vatAmount - total;
        const withholdingTax = Number(diff.toFixed(4));

        return {
          id: si.id,
          date: si.date,
          branchId: si.branchId,
          customerId: si.customerId,
          customerName: si.customerName,
          items,
          subtotal,
          vatAmount,
          withholdingTax: withholdingTax > 0 ? withholdingTax : 0,
          total,
          status: si.status as any,
          paymentMethod: (si.notes && ["Bank", "Cash", "Check"].includes(si.notes)) ? si.notes as any : "Bank"
        };
      });

      const mappedPurchaseInvoices: PurchaseInvoice[] = dbPurchaseInvoices.map((pi: any) => {
        const items = dbPurchaseItems
          .filter((item: any) => item.invoiceId === pi.id)
          .map((item: any) => ({
            sku: item.sku,
            name: item.name,
            quantity: Number(item.quantity),
            price: Number(item.unitPrice),
            total: Number(item.lineTotal)
          }));
        
        const subtotal = Number(pi.amount);
        const vatAmount = Number(pi.taxAmount);
        const total = Number(pi.totalAmount);
        const diff = subtotal + vatAmount - total;
        const withholdingTax = Number(diff.toFixed(4));

        return {
          id: pi.id,
          date: pi.date,
          branchId: pi.branchId,
          supplierId: pi.supplierId,
          supplierName: pi.supplierName,
          items,
          subtotal,
          vatAmount,
          withholdingTax: withholdingTax > 0 ? withholdingTax : 0,
          total,
          status: pi.status as any,
          paymentMethod: (pi.notes && ["Bank", "Cash", "Check"].includes(pi.notes)) ? pi.notes as any : "Bank"
        };
      });

      const mappedBoms = dbBoms.map((bom: any) => {
        const components = dbBomComponents
          .filter((c: any) => c.bomId === bom.id)
          .map((c: any) => ({
            sku: c.sku,
            name: c.name,
            quantityRequired: Number(c.quantityRequired)
          }));
        return {
          id: bom.id,
          productSku: bom.productSku,
          productName: bom.productName,
          laborCost: Number(bom.laborCost),
          components
        };
      });

      const mappedProductionOrders: ProductionOrder[] = dbProductionOrders.map((po: any) => ({
        id: po.id,
        bomId: po.bomId,
        productName: po.productName,
        quantity: po.quantity,
        status: po.status as any,
        startDate: po.startDate,
        completionDate: po.completionDate || undefined
      }));

      const mappedCostCenters: CostCenter[] = dbCostCenters.map((cc: any) => ({
        id: cc.id,
        name: cc.name,
        budget: Number(cc.budget),
        spent: Number(cc.spent)
      }));

      const mappedProfitCenters: ProfitCenter[] = dbProfitCenters.map((pc: any) => ({
        id: pc.id,
        name: pc.name,
        target: Number(pc.target),
        actual: Number(pc.actual)
      }));

      // Update in-memory state with real database records for this tenant
      const state = this.tenantStates.get(tenantId);
      if (state) {
        state.accounts = mappedAccounts;
        state.customers = mappedCustomers;
        state.suppliers = mappedSuppliers;
        state.stock = mappedStock;
        state.warehouses = mappedWarehouses;
        state.employees = mappedEmployees;
        state.fixedAssets = mappedFixedAssets;
        state.cheques = mappedCheques;
        state.journalEntries = mappedJournalEntries;
        state.salesInvoices = mappedSalesInvoices;
        state.purchaseInvoices = mappedPurchaseInvoices;
        state.boms = mappedBoms;
        state.productionOrders = mappedProductionOrders;
        state.costCenters = mappedCostCenters;
        state.profitCenters = mappedProfitCenters;
      }

      console.log(`[DB Engine] Operational state for tenant ${tenantId} loaded into memory successfully.`);
    } catch (err) {
      console.error(`[DB Engine] Failed to load operational state from SQL database for tenant ${tenantId}:`, err);
    }
  }

  /**
   * High integrity transaction executor that commits memory updates directly to the PostgreSQL/PGlite database.
   */
  public static executeTransaction<T>(operation: (db: ERPDatabaseState) => T, tenantId: string = "TEN-APEX-01"): T {
    const state = this.initForTenant(tenantId);

    const backupString = JSON.stringify(state);

    try {
      // Run in-memory mutation on the tenant state
      const result = operation(state);
      
      // Persist the resulting state asynchronously to the PostgreSQL database
      this.writeToPostgres(state, tenantId).catch(err => {
        console.error(`[DB Engine] Failed to async flush transaction to PostgreSQL database for tenant ${tenantId}:`, err);
      });

      return result;
    } catch (error) {
      console.error("[DB Transaction] Error occurred. Rolling back in-memory state...", error);
      const revertedState = JSON.parse(backupString);
      this.tenantStates.set(tenantId, revertedState);
      throw error;
    }
  }

  /**
   * Synchronizes the database state with external updates.
   */
  public static syncState(newState: ERPDatabaseState, tenantId: string = "TEN-APEX-01") {
    if (!newState) return;
    const defaultState = this.getSeedData(tenantId);
    const currentState = this.initForTenant(tenantId);
    const mergedState = {
      ...defaultState,
      ...newState,
      accounts: newState.accounts || currentState.accounts || defaultState.accounts,
      employees: newState.employees || currentState.employees || defaultState.employees,
      warehouses: newState.warehouses || currentState.warehouses || defaultState.warehouses,
      stock: newState.stock || currentState.stock || defaultState.stock,
      costCenters: newState.costCenters || currentState.costCenters || defaultState.costCenters,
      profitCenters: newState.profitCenters || currentState.profitCenters || defaultState.profitCenters,
      boms: newState.boms || currentState.boms || defaultState.boms,
      journalEntries: newState.journalEntries || currentState.journalEntries || defaultState.journalEntries,
      productionOrders: newState.productionOrders || currentState.productionOrders || defaultState.productionOrders,
      customers: newState.customers || currentState.customers || defaultState.customers,
      suppliers: newState.suppliers || currentState.suppliers || defaultState.suppliers,
      purchaseInvoices: newState.purchaseInvoices || currentState.purchaseInvoices || defaultState.purchaseInvoices,
      salesInvoices: newState.salesInvoices || currentState.salesInvoices || defaultState.salesInvoices,
      fixedAssets: newState.fixedAssets || currentState.fixedAssets || defaultState.fixedAssets,
      bankStatementItems: newState.bankStatementItems || currentState.bankStatementItems || defaultState.bankStatementItems,
      currencyRates: newState.currencyRates || currentState.currencyRates || defaultState.currencyRates,
      cheques: newState.cheques || currentState.cheques || defaultState.cheques,
      config: newState.config || currentState.config || defaultState.config,
    };
    this.tenantStates.set(tenantId, mergedState);
    this.writeToPostgres(mergedState, tenantId).catch(err => {
      console.error(`[DB Engine] Failed to sync state to PostgreSQL database for tenant ${tenantId}:`, err);
    });
  }

  /**
   * Persists the current in-memory state directly to SQL database tables inside a secure Transaction.
   */
  private static async writeToPostgres(state: ERPDatabaseState, tenantId: string = "TEN-APEX-01") {
    try {
      const db = await getDbForTenant(tenantId);

      // We perform bulk synchronization of tables
      await db.transaction(async (tx: any) => {
        // Explicitly set the transaction tenant ID context for Row Level Security (RLS)
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

        // Ensure tenant exists in DB to prevent foreign key violation
        let tName = state.config?.company || "شركة جديدة";
        if (tenantId === "TEN-APEX-01") {
          tName = "شركة قمة الشام والرافدين المحدودة";
        } else if (tenantId === "TEN-GULF-02") {
          tName = "شركة قمة الخليج الدولية";
        } else if (tenantId === "TEN-AFRICA-03") {
          tName = "مؤسسة قمة أفريقيا للتوزيع والاستيراد";
        }
        await tx.insert(tenants).values({
          id: tenantId,
          name: tName,
          fiscalYear: state.config?.fiscalYear || "2026"
        }).onConflictDoUpdate({
          target: tenants.id,
          set: {
            name: tName,
            fiscalYear: state.config?.fiscalYear || "2026"
          }
        });

        // Ensure default branch exists for this tenant
        const defaultBranchId = tenantId === "TEN-APEX-01" ? "BR-CAI-01" : tenantId === "TEN-GULF-02" ? "BR-DXB-03" : tenantId === "TEN-AFRICA-03" ? "BR-AFR-04" : `BR-${tenantId}-01`;
        const defaultBranchName = tenantId === "TEN-APEX-01" ? "فرع القاهرة الرئيسي" : tenantId === "TEN-GULF-02" ? "مكتب جافزا دبي الإقليمي" : tenantId === "TEN-AFRICA-03" ? "مكتب قمة أفريقيا الإقليمي" : `الفرع الرئيسي لـ ${tName}`;
        await tx.insert(branches).values({
          id: defaultBranchId,
          tenantId: tenantId,
          name: defaultBranchName
        }).onConflictDoUpdate({
          target: branches.id,
          set: {
            name: defaultBranchName
          }
        });

        // Fetch valid branch for foreign key constraints, or fallback
        const tenantBranches = await tx.select().from(branches).where(eq(branches.tenantId, tenantId)).limit(1);
        const branchId = tenantBranches[0]?.id || defaultBranchId;

        // 1. Sync accounts
        for (const acc of state.accounts) {
          await tx.insert(accounts).values({
            code: acc.code,
            tenantId,
            name: acc.name,
            type: acc.type,
            balance: (acc.balance ?? 0).toString(),
            initialBalance: (acc.initialBalance ?? 0).toString(),
            classification: acc.classification || null
          }).onConflictDoUpdate({
            target: [accounts.tenantId, accounts.code],
            set: {
              balance: (acc.balance ?? 0).toString(),
              name: acc.name,
              type: acc.type
            }
          });
        }

        // 2. Sync customers
        for (const cust of state.customers) {
          await tx.insert(customers).values({
            id: cust.id,
            tenantId,
            name: cust.name,
            taxRegistrationNumber: cust.taxRegistrationNumber,
            phone: cust.phone,
            email: cust.email,
            balance: (cust.balance ?? 0).toString()
          }).onConflictDoUpdate({
            target: customers.id,
            set: {
              balance: (cust.balance ?? 0).toString(),
              name: cust.name,
              phone: cust.phone,
              email: cust.email
            }
          });
        }

        // 3. Sync suppliers
        for (const supp of state.suppliers) {
          await tx.insert(suppliers).values({
            id: supp.id,
            tenantId,
            name: supp.name,
            taxRegistrationNumber: supp.taxRegistrationNumber,
            phone: supp.phone,
            email: supp.email,
            balance: (supp.balance ?? 0).toString()
          }).onConflictDoUpdate({
            target: suppliers.id,
            set: {
              balance: (supp.balance ?? 0).toString(),
              name: supp.name,
              phone: supp.phone,
              email: supp.email
            }
          });
        }

        // 3.5 Sync warehouses
        for (const wh of state.warehouses) {
          await tx.insert(warehouses).values({
            id: wh.id,
            tenantId,
            name: wh.name,
            location: wh.location
          }).onConflictDoUpdate({
            target: [warehouses.tenantId, warehouses.id],
            set: {
              name: wh.name,
              location: wh.location
            }
          });
        }

        // 4. Sync stock
        for (const item of state.stock) {
          const whId = item.warehouseId || "WH-CAI-01";
          const whExists = state.warehouses.some(w => w.id === whId);
          if (!whExists) {
            await tx.insert(warehouses).values({
              id: whId,
              tenantId,
              name: `مستودع تلقائي (${whId})`,
              location: "منشأ تلقائياً لضمان سلامة البيانات"
            }).onConflictDoUpdate({
              target: [warehouses.tenantId, warehouses.id],
              set: {
                name: `مستودع تلقائي (${whId})`
              }
            });
            // Keep memory state in sync
            state.warehouses.push({
              id: whId,
              name: `مستودع تلقائي (${whId})`,
              location: "منشأ تلقائياً لضمان سلامة البيانات"
            });
          }

          await tx.insert(stockItems).values({
            sku: item.sku,
            tenantId,
            name: item.name,
            warehouseId: whId,
            quantity: item.quantity,
            unitPrice: (item.unitPrice ?? 0).toString(),
            minLevel: item.minLevel,
            category: item.category || null,
            subCategory: item.subCategory || null
          }).onConflictDoUpdate({
            target: [stockItems.tenantId, stockItems.sku],
            set: {
              quantity: item.quantity,
              unitPrice: (item.unitPrice ?? 0).toString(),
              name: item.name,
              warehouseId: whId
            }
          });
        }

        // 4.5 Sync employees
        if (state.employees) {
          for (const emp of state.employees) {
            await tx.insert(employees).values({
              id: emp.id,
              tenantId,
              name: emp.name,
              role: emp.role,
              department: emp.department,
              baseSalary: (emp.baseSalary ?? 0).toString(),
              attendanceDays: emp.attendanceDays ?? 30,
              withholdingTaxRate: (emp.withholdingTaxRate ?? 0).toString(),
              vatRate: emp.vatRate ? emp.vatRate.toString() : "0.14",
              status: emp.status || "Active"
            }).onConflictDoUpdate({
              target: employees.id,
              set: {
                name: emp.name,
                role: emp.role,
                department: emp.department,
                baseSalary: (emp.baseSalary ?? 0).toString(),
                attendanceDays: emp.attendanceDays ?? 30,
                withholdingTaxRate: (emp.withholdingTaxRate ?? 0).toString(),
                vatRate: emp.vatRate ? emp.vatRate.toString() : "0.14",
                status: emp.status || "Active"
              }
            });
          }
        }

        // 4.6 Sync fixed assets
        if (state.fixedAssets) {
          for (const fa of state.fixedAssets) {
            await tx.insert(fixedAssets).values({
              id: fa.id,
              tenantId,
              name: fa.name,
              category: fa.category,
              purchaseDate: fa.purchaseDate,
              cost: (fa.cost ?? 0).toString(),
              salvageValue: (fa.salvageValue ?? 0).toString(),
              usefulLifeYears: fa.usefulLifeYears ?? 5,
              accumulatedDepreciation: (fa.accumulatedDepreciation ?? 0).toString(),
              bookValue: (fa.bookValue ?? 0).toString(),
              depreciationAccountCode: fa.depreciationAccountCode,
              assetAccountCode: fa.assetAccountCode,
              status: fa.status || "Active"
            }).onConflictDoUpdate({
              target: fixedAssets.id,
              set: {
                name: fa.name,
                category: fa.category,
                purchaseDate: fa.purchaseDate,
                cost: (fa.cost ?? 0).toString(),
                salvageValue: (fa.salvageValue ?? 0).toString(),
                usefulLifeYears: fa.usefulLifeYears ?? 5,
                accumulatedDepreciation: (fa.accumulatedDepreciation ?? 0).toString(),
                bookValue: (fa.bookValue ?? 0).toString(),
                depreciationAccountCode: fa.depreciationAccountCode,
                assetAccountCode: fa.assetAccountCode,
                status: fa.status || "Active"
              }
            });
          }
        }

        // 5. Sync cheques
        for (const ch of state.cheques) {
          await tx.insert(cheques).values({
            id: ch.id,
            tenantId,
            chequeNumber: ch.chequeNumber,
            bankName: ch.bankName,
            amount: (ch.amount ?? 0).toString(),
            receiveDate: ch.receiveDate,
            dueDate: ch.dueDate,
            customerId: ch.customerId || null,
            customerName: ch.customerName || null,
            beneficiaryType: ch.beneficiaryType,
            beneficiaryName: ch.beneficiaryName,
            status: ch.status,
            supplierId: ch.supplierId || null,
            supplierName: ch.supplierName || null,
            notes: ch.notes || null
          }).onConflictDoUpdate({
            target: cheques.id,
            set: {
              status: ch.status,
              supplierId: ch.supplierId || null,
              supplierName: ch.supplierName || null,
              notes: ch.notes || null
            }
          });
        }

        // 6. Sync journal entries and lines
        for (const je of state.journalEntries) {
          await tx.insert(journalEntries).values({
            id: je.id,
            tenantId,
            date: je.date,
            description: je.description,
            reference: je.reference,
            status: je.status,
            costCenter: je.costCenter,
            profitCenter: je.profitCenter,
            creator: je.creator,
            approvedBy: je.approvedBy || null
          }).onConflictDoUpdate({
            target: journalEntries.id,
            set: {
              status: je.status,
              approvedBy: je.approvedBy || null
            }
          });

          // Re-insert lines for journal entries
          await tx.delete(journalLines).where(eq(journalLines.entryId, je.id));
          for (let i = 0; i < je.lines.length; i++) {
            const l = je.lines[i];
            await tx.insert(journalLines).values({
              id: `${je.id}-L-${i}`,
              tenantId,
              entryId: je.id,
              accountCode: l.accountCode,
              accountName: l.accountName,
              debit: (l.debit ?? 0).toString(),
              credit: (l.credit ?? 0).toString()
            });
          }
        }

        // 7. Sync sales invoices & items
        if (state.salesInvoices) {
          for (const si of state.salesInvoices) {
            await tx.insert(salesInvoices).values({
              id: si.id,
              tenantId,
              branchId,
              customerId: si.customerId,
              customerName: si.customerName,
              date: si.date,
              dueDate: si.date,
              invoiceNumber: si.id,
              amount: (si.subtotal ?? 0).toString(),
              taxAmount: (si.vatAmount ?? 0).toString(),
              totalAmount: (si.total ?? 0).toString(),
              status: si.status,
              notes: si.paymentMethod || null
            }).onConflictDoUpdate({
              target: salesInvoices.id,
              set: {
                customerName: si.customerName,
                date: si.date,
                amount: (si.subtotal ?? 0).toString(),
                taxAmount: (si.vatAmount ?? 0).toString(),
                totalAmount: (si.total ?? 0).toString(),
                status: si.status,
                notes: si.paymentMethod || null
              }
            });

            // Sync nested items
            await tx.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, si.id));
            for (let i = 0; i < si.items.length; i++) {
              const item = si.items[i];
              await tx.insert(salesInvoiceItems).values({
                id: `${si.id}-item-${i}`,
                tenantId,
                invoiceId: si.id,
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                unitPrice: (item.price ?? 0).toString(),
                lineTotal: (item.total ?? 0).toString()
              });
            }
          }
        }

        // 8. Sync purchase invoices & items
        if (state.purchaseInvoices) {
          for (const pi of state.purchaseInvoices) {
            await tx.insert(purchaseInvoices).values({
              id: pi.id,
              tenantId,
              branchId,
              supplierId: pi.supplierId,
              supplierName: pi.supplierName,
              date: pi.date,
              dueDate: pi.date,
              invoiceNumber: pi.id,
              amount: (pi.subtotal ?? 0).toString(),
              taxAmount: (pi.vatAmount ?? 0).toString(),
              totalAmount: (pi.total ?? 0).toString(),
              status: pi.status,
              notes: pi.paymentMethod || null
            }).onConflictDoUpdate({
              target: purchaseInvoices.id,
              set: {
                supplierName: pi.supplierName,
                date: pi.date,
                amount: (pi.subtotal ?? 0).toString(),
                taxAmount: (pi.vatAmount ?? 0).toString(),
                totalAmount: (pi.total ?? 0).toString(),
                status: pi.status,
                notes: pi.paymentMethod || null
              }
            });

            // Sync nested items
            await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, pi.id));
            for (let i = 0; i < pi.items.length; i++) {
              const item = pi.items[i];
              await tx.insert(purchaseInvoiceItems).values({
                id: `${pi.id}-item-${i}`,
                tenantId,
                invoiceId: pi.id,
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                unitPrice: (item.price ?? 0).toString(),
                lineTotal: (item.total ?? 0).toString()
              });
            }
          }
        }

        // 9. Sync BOMs & Components
        if (state.boms) {
          for (const bom of state.boms) {
            const productSku = bom.productSku || (bom as any).sku || "STOCK-SFT-01";
            const productName = bom.productName || (bom as any).name || "تجميع الخوادم الفائقة";
            await tx.insert(bomsTable).values({
              id: bom.id,
              tenantId,
              productSku,
              productName,
              laborCost: (bom.laborCost ?? 0).toString()
            }).onConflictDoUpdate({
              target: [bomsTable.tenantId, bomsTable.id],
              set: {
                productSku,
                productName,
                laborCost: (bom.laborCost ?? 0).toString()
              }
            });

            await tx.delete(bomComponentsTable).where(eq(bomComponentsTable.bomId, bom.id));
            for (let i = 0; i < bom.components.length; i++) {
              const comp = bom.components[i];
              await tx.insert(bomComponentsTable).values({
                id: `${bom.id}-comp-${i}`,
                tenantId,
                bomId: bom.id,
                sku: comp.sku,
                name: comp.name || "عنصر تجميع",
                quantityRequired: comp.quantityRequired ?? (comp as any).quantity ?? 1
              });
            }
          }
        }

        // 10. Sync Production Orders
        if (state.productionOrders) {
          for (const po of state.productionOrders) {
            await tx.insert(productionOrdersTable).values({
              id: po.id,
              tenantId,
              bomId: po.bomId,
              productName: po.productName,
              quantity: po.quantity,
              status: po.status,
              startDate: po.startDate,
              completionDate: po.completionDate || null
            }).onConflictDoUpdate({
              target: productionOrdersTable.id,
              set: {
                status: po.status,
                completionDate: po.completionDate || null
              }
            });
          }
        }

        // 11. Sync Cost Centers
        if (state.costCenters) {
          for (const cc of state.costCenters) {
            await tx.insert(costCentersTable).values({
              id: cc.id,
              tenantId,
              name: cc.name,
              budget: (cc.budget ?? 0).toString(),
              spent: (cc.spent ?? 0).toString()
            }).onConflictDoUpdate({
              target: [costCentersTable.tenantId, costCentersTable.id],
              set: {
                name: cc.name,
                budget: (cc.budget ?? 0).toString(),
                spent: (cc.spent ?? 0).toString()
              }
            });
          }
        }

        // 12. Sync Profit Centers
        if (state.profitCenters) {
          for (const pc of state.profitCenters) {
            await tx.insert(profitCentersTable).values({
              id: pc.id,
              tenantId,
              name: pc.name,
              target: (pc.target ?? 0).toString(),
              actual: (pc.actual ?? 0).toString()
            }).onConflictDoUpdate({
              target: [profitCentersTable.tenantId, profitCentersTable.id],
              set: {
                name: pc.name,
                target: (pc.target ?? 0).toString(),
                actual: (pc.actual ?? 0).toString()
              }
            });
          }
        }
      });
    } catch (err) {
      console.error("[DB Engine] Error syncing memory state to Postgres SQL tables:", err);
    }
  }

  /**
   * Database relational constraints validation.
   */
  public static checkConstraints(lines: JournalLine[], costCenterId: string | undefined, profitCenterId: string | undefined, tenantId: string = "TEN-APEX-01") {
    const state = this.initForTenant(tenantId);
    for (const line of lines) {
      const accExists = state.accounts.some(a => a.code === line.accountCode);
      if (!accExists) {
        throw new Error(`قيد محاسبي غير صالح! كود الحساب [${line.accountCode}] غير موجود في الدليل المحاسبي العام للمؤسسة.`);
      }
    }
  }

  /**
   * Seed operational blueprint.
   */
  private static getSeedData(tenantId: string = "TEN-APEX-01"): ERPDatabaseState {
    const isMainTenant = tenantId === "TEN-APEX-01" || tenantId === "TEN-GULF-02" || tenantId === "TEN-AFRICA-03";
    return {
      schemaVersion: 3,
      accounts: [
        { code: "10100", name: "بنك CIB - الحساب الجاري بالجنيه المصري", type: "Asset", balance: isMainTenant ? 5318800 : 0, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
        { code: "10200", name: "بنك ADIB - حساب فرع الإمارات بالدرهم", type: "Asset", balance: 0, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
        { code: "10300", name: "النقدية بالخزينة الرئيسية", type: "Asset", balance: 0, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
        { code: "11000", name: "العملاء (أوراق القبض والذمم التجارية)", type: "Asset", balance: isMainTenant ? 1708000 : 0, initialBalance: 0, classification: "المدينون والذمم المدينة الأخرى" },
        { code: "12000", name: "مخزون المواد الخام (مستودع القاهرة)", type: "Asset", balance: isMainTenant ? 1480000 : 0, initialBalance: 0, classification: "الأصول المتداولة - المخزون" },
        { code: "12100", name: "مخزون السلع التامة (مستودع الإسكندرية)", type: "Asset", balance: 0, initialBalance: 0, classification: "الأصول المتداولة - المخزون" },
        { code: "20100", name: "الموردون (أوراق الدفع والذمم الدائنة)", type: "Liability", balance: isMainTenant ? 498000 : 0, initialBalance: 0, classification: "الدائنون والذمم الدائنة الأخرى" },
        { code: "22000", name: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", type: "Liability", balance: isMainTenant ? 616000 : 0, initialBalance: 0, classification: "التزامات ضريبية ومستحقات حكومية" },
        { code: "22100", name: "التزامات ضريبة الخصم والإضافة (نموذج 41)", type: "Liability", balance: 0, initialBalance: 0, classification: "التزامات ضريبية ومستحقات حكومية" },
        { code: "30100", name: "رأس المال المدفوع", type: "Equity", balance: isMainTenant ? 5000000 : 0, initialBalance: 0, classification: "رأس المال المساهم" },
        { code: "30200", name: "الأرباح المحتجزة", type: "Equity", balance: 0, initialBalance: 0, classification: "الأرباح والاحتياطيات" },
        { code: "40100", name: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", type: "Revenue", balance: isMainTenant ? 4400000 : 0, initialBalance: 0, classification: "إيرادات النشاط التشغيلي الرئيسي" },
        { code: "40200", name: "خدمات الاستشارات والتخصيص الفني", type: "Revenue", balance: 0, initialBalance: 0, classification: "إيرادات الخدمات الفنية" },
        { code: "50100", name: "مصروفات الرواتب ومزايا الموظفين", type: "Expense", balance: isMainTenant ? 1200000 : 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
        { code: "50200", name: "مصروفات البنية التحتية للخوادم والسحابة", type: "Expense", balance: isMainTenant ? 450000 : 0, initialBalance: 0, classification: "تكلفة الخدمة المستضافة" },
        { code: "50300", name: "مصروفات ضريبة القيمة المضافة المسددة", type: "Expense", balance: isMainTenant ? 207200 : 0, initialBalance: 0, classification: "مصروفات حكومية وضريبية" },
        { code: "50400", name: "المصروفات العمومية والإدارية", type: "Expense", balance: isMainTenant ? 150000 : 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
        { code: "50410", name: "مصروفات أدوات كتابية ومطبوعات", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
        { code: "50420", name: "مصروفات انتقال وبنزين وضيافة", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
        { code: "50430", name: "مصروفات إيجار ومرافق المقر الرئيسي", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" }
      ],
      employees: isMainTenant ? [
        { id: "EMP-01", name: "صالح محمود", role: "CFO", department: "Accounting", baseSalary: 50000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" },
        { id: "EMP-02", name: "هدى عبد الرحمن", role: "HR Manager", department: "HR", baseSalary: 35000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" },
        { id: "EMP-03", name: "سامر البرغوثي", role: "Tech Lead", department: "IT", baseSalary: 45000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" }
      ] : [],
      warehouses: [
        { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي", location: "القاهرة, مصر" },
        { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية", location: "الإسكندرية, مصر" }
      ],
      stock: isMainTenant ? [
        { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", warehouseId: "WH-CAI-01", quantity: 200, unitPrice: 2000, minLevel: 10, category: "Raw Materials" },
        { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", warehouseId: "WH-ALX-02", quantity: 100, unitPrice: 5000, minLevel: 5, category: "Finished Products" }
      ] : [],
      costCenters: isMainTenant ? [
        { id: "CC-RND", name: "مركز أبحاث وتطوير نظم التشغيل", spent: 0, budget: 1500000 },
        { id: "CC-OPS", name: "إدارة العمليات والخدمات اللوجستية", spent: 0, budget: 1000000 },
        { id: "CC-TAX", name: "إدارة التسويات الضريبية", spent: 0, budget: 500000 }
      ] : [],
      profitCenters: isMainTenant ? [
        { id: "PC-SFT", name: "إيرادات تراخيص البرمجيات السحابية", actual: 1000000, target: 5000000 },
        { id: "PC-CNS", name: "إيرادات الاستشارات التقنية والتنفيذ", actual: 0, target: 2000000 }
      ] : [],
      boms: isMainTenant ? [
        { id: "BOM-001", productName: "تجميع الخوادم الفائقة", productSku: "STOCK-SFT-01", laborCost: 500, components: [{ sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantityRequired: 2 }] }
      ] : [],
      journalEntries: isMainTenant ? [
        {
          id: "JE-009",
          date: "2026-01-10",
          description: "قيد تسويات مصروفات عمومية وإدارية أخرى للمقر الرئيسي",
          reference: "OP-EXP-2026",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "50400", accountName: "المصروفات العمومية والإدارية", debit: 30000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 30000 }
          ]
        },
        {
          id: "JE-008c",
          date: "2025-12-20",
          description: "إثبات فاتورة مبيعات تراخيص برمجيات لبنك النيل الاستثماري (غير مسددة)",
          reference: "SLS-2025-006",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 1368000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 1200000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 168000 }
          ]
        },
        {
          id: "JE-008b",
          date: "2025-12-12",
          description: "إثبات فاتورة مشتريات مواد خام من المنصور للإلكترونيات (غير مسددة)",
          reference: "PRC-2025-006",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 300000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 42000, credit: 0 },
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 342000 }
          ]
        },
        {
          id: "JE-008",
          date: "2025-12-15",
          description: "سداد مصروفات تشغيل خوادم وسحابة الشركة لشهر ديسمبر",
          reference: "CLOUD-2025",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "50200", accountName: "مصروفات البنية التحتية للخوادم والسحابة", debit: 450000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 450000 }
          ]
        },
        {
          id: "JE-007e",
          date: "2025-11-25",
          description: "تحصيل قيمة فاتورة مبيعات مجموعة الشريف للاتصالات للحساب الجاري",
          reference: "COLL-SHERIF-NOV",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 912000, credit: 0 },
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 912000 }
          ]
        },
        {
          id: "JE-007d",
          date: "2025-11-25",
          description: "إثبات فاتورة مبيعات تراخيص برمجيات لمجموعة الشريف للاتصالات",
          reference: "SLS-2025-005",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 912000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 800000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 112000 }
          ]
        },
        {
          id: "JE-007c",
          date: "2025-11-18",
          description: "سداد فاتورة مشتريات سيسكو الشرق الأوسط من الحساب الجاري",
          reference: "PMT-SISCO-NOV",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 285000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 285000 }
          ]
        },
        {
          id: "JE-007b",
          date: "2025-11-18",
          description: "إثبات فاتورة مشتريات مواد خام من سيسكو الشرق الأوسط",
          reference: "PRC-2025-005",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 250000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 35000, credit: 0 },
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 285000 }
          ]
        },
        {
          id: "JE-007",
          date: "2025-11-30",
          description: "سداد مصروفات رواتب الموظفين التشغيلية لشهر نوفمبر",
          reference: "SAL-2025",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "50100", accountName: "مصروفات الرواتب ومزايا الموظفين", debit: 1200000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 1200000 }
          ]
        },
        {
          id: "JE-006e",
          date: "2025-10-22",
          description: "تحصيل فاتورة مبيعات بنك النيل الاستثماري بالحساب الجاري",
          reference: "COLL-NILE-OCT",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 684000, credit: 0 },
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 684000 }
          ]
        },
        {
          id: "JE-006d",
          date: "2025-10-22",
          description: "إثبات فاتورة مبيعات تراخيص برمجيات لبنك النيل الاستثماري",
          reference: "SLS-2025-004",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 684000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 600000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 84000 }
          ]
        },
        {
          id: "JE-006c",
          date: "2025-10-15",
          description: "سداد فاتورة مشتريات المنصور للإلكترونيات بالحساب الجاري",
          reference: "PMT-MANSOUR-OCT",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 205200, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 205200 }
          ]
        },
        {
          id: "JE-006b",
          date: "2025-10-15",
          description: "إثبات فاتورة مشتريات مواد خام من المنصور للإلكترونيات",
          reference: "PRC-2025-004",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 180000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 25200, credit: 0 },
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 205200 }
          ]
        },
        {
          id: "JE-006",
          date: "2025-10-01",
          description: "تحصيل دفعة بشيك من مجموعة الشريف للاتصالات وإيداعها بالحساب الجاري",
          reference: "COLL-CUST-01",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 800000, credit: 0 },
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 800000 }
          ]
        },
        {
          id: "JE-005b",
          date: "2025-09-10",
          description: "سداد فاتورة مشتريات سيسكو الشرق الأوسط من الحساب الجاري",
          reference: "PMT-SISCO-SEP",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 171000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 171000 }
          ]
        },
        {
          id: "JE-005a",
          date: "2025-09-10",
          description: "إثبات فاتورة مشتريات مواد خام من سيسكو الشرق الأوسط",
          reference: "PRC-2025-003",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 150000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 21000, credit: 0 },
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 171000 }
          ]
        },
        {
          id: "JE-005",
          date: "2025-09-15",
          description: "إثبات فاتورة مبيعات تراخيص برمجيات لمجموعة الشريف للاتصالات",
          reference: "SLS-2025-001",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 1140000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 1000000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 140000 }
          ]
        },
        {
          id: "JE-004c",
          date: "2025-08-25",
          description: "تحصيل قيمة مبيعات مجموعة الشريف للاتصالات بالحساب الجاري",
          reference: "COLL-SHERIF-AUG",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 342000, credit: 0 },
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 342000 }
          ]
        },
        {
          id: "JE-004b",
          date: "2025-08-25",
          description: "إثبات فاتورة مبيعات تراخيص لمجموعة الشريف للاتصالات",
          reference: "SLS-2025-003",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 342000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 300000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 42000 }
          ]
        },
        {
          id: "JE-004",
          date: "2025-08-20",
          description: "سداد دفعة للمورد المنصور للالكترونيات بالحساب الجاري",
          reference: "PMT-SUPP-01",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 300000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 300000 }
          ]
        },
        {
          id: "JE-003",
          date: "2025-08-12",
          description: "إثبات فاتورة مشتريات مواد خام من المورد المنصور للالكترونيات",
          reference: "PRC-2025-001",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 400000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 56000, credit: 0 },
            { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 456000 }
          ]
        },
        {
          id: "JE-003b",
          date: "2025-07-20",
          description: "إثبات فاتورة مبيعات برمجيات وسدادها فوراً لبنك النيل الاستثماري",
          reference: "SLS-2025-002",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 570000, credit: 0 },
            { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 500000 },
            { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 70000 }
          ]
        },
        {
          id: "JE-003a",
          date: "2025-07-15",
          description: "إثبات فاتورة مشتريات سحابية من سيسكو الشرق الأوسط وسدادها بالكامل",
          reference: "PRC-2025-002",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 200000, credit: 0 },
            { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 28000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 228000 }
          ]
        },
        {
          id: "JE-002",
          date: "2025-07-05",
          description: "شراء وتجهيز خوادم ومعدات المقر التشغيلي بالقاهرة",
          reference: "FA-ACQ-2025",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "50400", accountName: "المصروفات العمومية والإدارية", debit: 120000, credit: 0 },
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 120000 }
          ]
        },
        {
          id: "JE-001",
          date: "2025-07-01",
          description: "قيد إثبات رأس المال المدفوع وتأسيس النشاط وإيداع البنك الرئيسي",
          reference: "INIT-CAPITAL",
          status: "Posted",
          costCenter: "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحمد خضر",
          approvedBy: "أحلام سلطان",
          lines: [
            { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 5000000, credit: 0 },
            { accountCode: "30100", accountName: "رأس المال المدفوع", debit: 0, credit: 5000000 }
          ]
        }
      ] : [],
      productionOrders: isMainTenant ? [
        { id: "MPO-001", bomId: "BOM-SFT-01", productName: "أمر إنتاج الخوادم الفائقة", quantity: 50, status: "Completed", startDate: "2025-07-01", completionDate: "2025-07-02" }
      ] : [],
      customers: isMainTenant ? [
        { id: "CUST-SHERIF", name: "مجموعة الشريف للاتصالات", taxRegistrationNumber: "123-456-789", phone: "0100123456", email: "info@sherif-telecom.com", balance: 340000 },
        { id: "CUST-NILE", name: "بنك النيل الاستثماري", taxRegistrationNumber: "987-654-321", phone: "0225112233", email: "corporate@nilebank.eg", balance: 1368000 }
      ] : [],
      suppliers: isMainTenant ? [
        { id: "SUPP-MANSOUR", name: "المنصور للالكترونيات", taxRegistrationNumber: "111-222-333", phone: "0122987654", email: "sales@mansour-electronics.com", balance: 498000 },
        { id: "SUPP-SISCO", name: "سيسكو الشرق الأوسط", taxRegistrationNumber: "444-555-666", phone: "0229911223", email: "emea@cisco.com", balance: 0 }
      ] : [],
      purchaseInvoices: isMainTenant ? [
        {
          id: "INV-PRC-000",
          date: "2025-07-15",
          supplierId: "SUPP-SISCO",
          supplierName: "سيسكو الشرق الأوسط",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 100, price: 2000, total: 200000 }
          ],
          subtotal: 200000,
          vatAmount: 28000,
          withholdingTax: 0,
          total: 228000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-PRC-001",
          date: "2025-08-12",
          supplierId: "SUPP-MANSOUR",
          supplierName: "المنصور للالكترونيات",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 200, price: 2000, total: 400000 }
          ],
          subtotal: 400000,
          vatAmount: 56000,
          withholdingTax: 0,
          total: 456000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-PRC-002",
          date: "2025-09-10",
          supplierId: "SUPP-SISCO",
          supplierName: "سيسكو الشرق الأوسط",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 75, price: 2000, total: 150000 }
          ],
          subtotal: 150000,
          vatAmount: 21000,
          withholdingTax: 0,
          total: 171000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-PRC-003",
          date: "2025-10-15",
          supplierId: "SUPP-MANSOUR",
          supplierName: "المنصور للالكترونيات",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 90, price: 2000, total: 180000 }
          ],
          subtotal: 180000,
          vatAmount: 25200,
          withholdingTax: 0,
          total: 205200,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-PRC-004",
          date: "2025-11-18",
          supplierId: "SUPP-SISCO",
          supplierName: "سيسكو الشرق الأوسط",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 125, price: 2000, total: 250000 }
          ],
          subtotal: 250000,
          vatAmount: 35000,
          withholdingTax: 0,
          total: 285000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-PRC-005",
          date: "2025-12-12",
          supplierId: "SUPP-MANSOUR",
          supplierName: "المنصور للالكترونيات",
          items: [
            { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 150, price: 2000, total: 300000 }
          ],
          subtotal: 300000,
          vatAmount: 42000,
          withholdingTax: 0,
          total: 342000,
          status: "Unpaid",
          paymentMethod: "Bank"
        }
      ] : [],
      salesInvoices: isMainTenant ? [
        {
          id: "INV-SLS-000",
          date: "2025-07-20",
          customerId: "CUST-NILE",
          customerName: "بنك النيل الاستثماري",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 100, price: 5000, total: 500000 }
          ],
          subtotal: 500000,
          vatAmount: 70000,
          withholdingTax: 0,
          total: 570000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-SLS-002",
          date: "2025-08-25",
          customerId: "CUST-SHERIF",
          customerName: "مجموعة الشريف للاتصالات",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 60, price: 5000, total: 300000 }
          ],
          subtotal: 300000,
          vatAmount: 42000,
          withholdingTax: 0,
          total: 342000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-SLS-001",
          date: "2025-09-15",
          customerId: "CUST-SHERIF",
          customerName: "مجموعة الشريف للاتصالات",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 200, price: 5000, total: 1000000 }
          ],
          subtotal: 1000000,
          vatAmount: 140000,
          withholdingTax: 0,
          total: 1140000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-SLS-003",
          date: "2025-10-22",
          customerId: "CUST-NILE",
          customerName: "بنك النيل الاستثماري",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 120, price: 5000, total: 600000 }
          ],
          subtotal: 600000,
          vatAmount: 84000,
          withholdingTax: 0,
          total: 684000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-SLS-004",
          date: "2025-11-25",
          customerId: "CUST-SHERIF",
          customerName: "مجموعة الشريف للاتصالات",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 160, price: 5000, total: 800000 }
          ],
          subtotal: 800000,
          vatAmount: 112000,
          withholdingTax: 0,
          total: 912000,
          status: "Paid",
          paymentMethod: "Bank"
        },
        {
          id: "INV-SLS-005",
          date: "2025-12-20",
          customerId: "CUST-NILE",
          customerName: "بنك النيل الاستثماري",
          items: [
            { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 240, price: 5000, total: 1200000 }
          ],
          subtotal: 1200000,
          vatAmount: 168000,
          withholdingTax: 0,
          total: 1368000,
          status: "Unpaid",
          paymentMethod: "Bank"
        }
      ] : [],
      fixedAssets: isMainTenant ? [
        { id: "FA-01", name: "خوادم سحابية مخصصة", category: "IT Hardware", purchaseDate: "2025-07-05", cost: 500000, salvageValue: 50000, usefulLifeYears: 5, accumulatedDepreciation: 100000, bookValue: 400000, depreciationAccountCode: "50400", assetAccountCode: "12000", status: "Active" }
      ] : [],
      bankStatementItems: [],
      currencyRates: [
        { code: "EGP", name: "الجنيه المصري", rateToBase: 1.0, symbol: "ج.م" },
        { code: "USD", name: "الدولار الأمريكي", rateToBase: 48.50, symbol: "$" },
        { code: "AED", name: "الدرهم الإماراتي", rateToBase: 13.20, symbol: "د.إ" },
        { code: "SAR", name: "الريال السعودي", rateToBase: 12.92, symbol: "ر.س" }
      ],
      cheques: isMainTenant ? [
        { id: "CHQ-001", chequeNumber: "CHQ-98112", bankName: "CIB", amount: 200000, receiveDate: "2025-09-15", dueDate: "2025-12-15", customerId: "CUST-SHERIF", customerName: "مجموعة الشريف للاتصالات", beneficiaryType: "BeneficiaryType" as any, beneficiaryName: "أبيكس تكنولوجيز القابضة", status: "Collected" }
      ] : [],
      config: {
        company: tenantId === "TEN-APEX-01" ? "Apex Levant Corp" : (tenantId === "TEN-GULF-02" ? "Apex Gulf International" : (tenantId === "TEN-AFRICA-03" ? "Apex Africa Distribution" : "شركة جديدة")),
        branch: tenantId === "TEN-APEX-01" ? "Cairo Headquarters" : (tenantId === "TEN-GULF-02" ? "Dubai JAFZA Branch" : (tenantId === "TEN-AFRICA-03" ? "Africa Regional Office" : "Main Branch")),
        warehouse: tenantId === "TEN-APEX-01" ? "WH-CAI-01" : (tenantId === "TEN-GULF-02" ? "WH-DXB-03" : (tenantId === "TEN-AFRICA-03" ? "WH-AFR-04" : "WH-DEFAULT")),
        fiscalYear: "FY 2026/2027",
        currency: tenantId === "TEN-APEX-01" ? "EGP" : (tenantId === "TEN-GULF-02" ? "AED" : "USD"),
        language: "Arabic",
        theme: "emerald",
        mode: "dark"
      }
    };
  }
}
