import { describe, it, expect, beforeEach } from "vitest";
import { FinancialAnalysisRepository } from "../database/repositories/FinancialAnalysisRepository";
import { getDb } from "../database/db";
import { accounts, journalEntries, journalLines, tenants, salesInvoices, customerPayments, costCenters, profitCenters } from "../database/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";

describe("Financial Analysis Calculations & Unit Tests", () => {
  const tenantId = "TEN-FIN-ANALYSIS-TEST";

  beforeEach(async () => {
    const db = await getDb();
    
    // Cleanup tenant data
    try {
      await db.delete(journalLines).where(eq(journalLines.tenantId, tenantId));
      await db.delete(journalEntries).where(eq(journalEntries.tenantId, tenantId));
      await db.delete(accounts).where(eq(accounts.tenantId, tenantId));
      await db.delete(salesInvoices).where(eq(salesInvoices.tenantId, tenantId));
      await db.delete(customerPayments).where(eq(customerPayments.tenantId, tenantId));
      await db.delete(costCenters).where(eq(costCenters.tenantId, tenantId));
      await db.delete(profitCenters).where(eq(profitCenters.tenantId, tenantId));
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    } catch (e) {}

    // Seed tenant
    await db.insert(tenants).values({ id: tenantId, name: "Financial Analysis Test Tenant" });

    // Seed Accounts
    // Assets
    await db.insert(accounts).values([
      { code: "10100", tenantId, name: "النقدية بالخزينة والبنك", type: "Asset", classification: "أصول متداولة - نقدية", initialBalance: 50000, balance: 50000 },
      { code: "11000", tenantId, name: "العملاء / الذمم المدينة", type: "Asset", classification: "أصول متداولة - مدينون", initialBalance: 30000, balance: 30000 },
      { code: "12000", tenantId, name: "المخزون السلعي", type: "Asset", classification: "أصول متداولة - مخزون", initialBalance: 20000, balance: 20000 },
      { code: "15000", tenantId, name: "الأصول الثابتة - الآلات والمعدات", type: "Asset", classification: "أصول غير متداولة", initialBalance: 100000, balance: 100000 },
      
      // Liabilities
      { code: "20100", tenantId, name: "الموردون / الذمم الدائنة", type: "Liability", classification: "التزامات متداولة - دائنون", initialBalance: 40000, balance: 40000 },
      { code: "25000", tenantId, name: "قروض طويلة الأجل", type: "Liability", classification: "التزامات غير متداولة - تمويل طويل الأجل", initialBalance: 60000, balance: 60000 },
      
      // Equity
      { code: "30100", tenantId, name: "رأس المال المدفوع", type: "Equity", classification: "حقوق الملكية", initialBalance: 100000, balance: 100000 },
      
      // Revenue
      { code: "40100", tenantId, name: "إيرادات المبيعات والخدمات", type: "Revenue", classification: "إيرادات النشاط الرئيسي", initialBalance: 0, balance: 0 },
      
      // Expenses
      { code: "50200", tenantId, name: "تكلفة المبيعات المباشرة", type: "Expense", classification: "تكلفة مبيعات متغيرة", initialBalance: 0, balance: 0 },
      { code: "50100", tenantId, name: "المصروفات العمومية والرواتب", type: "Expense", classification: "مصروفات تشغيلية ثابتة", initialBalance: 0, balance: 0 }
    ]);

    // Seed Cost Center
    await db.insert(costCenters).values({
      id: "CC-TEST-01",
      tenantId,
      code: "CC-01",
      name: "مركز تكلفة المشروع 1",
      budget: 50000
    });

    // Seed Profit Center
    await db.insert(profitCenters).values({
      id: "PC-TEST-01",
      tenantId,
      code: "PC-01",
      name: "فرع الرياض الرئيسي",
      target: 100000
    });

    // Seed Journal Entry 1: Revenue 120,000, Cash 120,000
    await db.insert(journalEntries).values({
      id: "JE-FIN-01",
      tenantId,
      date: "2026-06-15",
      description: "إيرادات مبيعات نقدية",
      reference: "INV-001",
      status: "Posted",
      costCenter: "CC-TEST-01",
      profitCenter: "PC-TEST-01",
      creator: "SYSTEM",
      version: 1
    });

    await db.insert(journalLines).values([
      { id: "JL-01", tenantId, entryId: "JE-FIN-01", accountCode: "10100", debit: 120000, credit: 0, lineOrder: 1 },
      { id: "JL-02", tenantId, entryId: "JE-FIN-01", accountCode: "40100", debit: 0, credit: 120000, lineOrder: 2 }
    ]);

    // Seed Journal Entry 2: COGS 60,000, Inventory 60,000
    await db.insert(journalEntries).values({
      id: "JE-FIN-02",
      tenantId,
      date: "2026-06-20",
      description: "إثبات تكلفة البضاعة المباعة",
      reference: "COGS-001",
      status: "Posted",
      costCenter: "CC-TEST-01",
      profitCenter: "PC-TEST-01",
      creator: "SYSTEM",
      version: 1
    });

    await db.insert(journalLines).values([
      { id: "JL-03", tenantId, entryId: "JE-FIN-02", accountCode: "50200", debit: 60000, credit: 0, lineOrder: 1 },
      { id: "JL-04", tenantId, entryId: "JE-FIN-02", accountCode: "12000", debit: 0, credit: 60000, lineOrder: 2 }
    ]);

    // Seed Journal Entry 3: Opex 20,000, Cash 20,000
    await db.insert(journalEntries).values({
      id: "JE-FIN-03",
      tenantId,
      date: "2026-06-25",
      description: "مصروفات عمومية ورواتب",
      reference: "OPEX-001",
      status: "Posted",
      costCenter: "CC-TEST-01",
      profitCenter: "PC-TEST-01",
      creator: "SYSTEM",
      version: 1
    });

    await db.insert(journalLines).values([
      { id: "JL-05", tenantId, entryId: "JE-FIN-03", accountCode: "50100", debit: 20000, credit: 0, lineOrder: 1 },
      { id: "JL-06", tenantId, entryId: "JE-FIN-03", accountCode: "10100", debit: 0, credit: 20000, lineOrder: 2 }
    ]);

    // Seed Sales Invoice for Aging test
    await db.insert(salesInvoices).values({
      id: "INV-AGING-01",
      tenantId,
      invoiceNumber: "INV-2026-001",
      customerId: "CUST-01",
      customerName: "شركة الابتكار السعودية",
      date: "2026-05-01", // ~80 days old from July 21
      totalAmount: 15000,
      taxAmount: 0,
      status: "Posted"
    });
  });

  it("1. Trial Balance test - verifies total debits, credits, and mathematical balance", async () => {
    const tb = await FinancialAnalysisRepository.getTrialBalance(tenantId, "2026-07-21");
    expect(tb).toBeDefined();
    expect(tb.length).toBeGreaterThan(0);

    const cashAcc = tb.find((a: any) => a.code === "10100");
    expect(cashAcc).toBeDefined();
    // Initial 50,000 + 120,000 Debit - 20,000 Credit = 150,000 closing
    expect(cashAcc?.closingBalance).toBe(150000);
  });

  it("2. Income Statement test - verifies Revenue, COGS, Gross Profit, OPEX and Net Profit using decimal precision", async () => {
    const is = await FinancialAnalysisRepository.getIncomeStatement(tenantId, "2026-01-01", "2026-12-31", false);
    expect(is.current.totalRevenue).toBe(120000);
    expect(is.current.totalCogs).toBe(60000);
    expect(is.current.grossProfit).toBe(60000);
    expect(is.current.totalOpex).toBe(20000);
    expect(is.current.netProfit).toBe(40000); // 120k - 60k - 20k
    expect(is.current.commonSize.grossProfit).toBe(50); // 60k / 120k * 100
  });

  it("3. Balance Sheet test - verifies Assets, Liabilities, Equity and Net Income balance", async () => {
    const bs = await FinancialAnalysisRepository.getBalanceSheet(tenantId, "2026-07-21", false);
    expect(bs.current.netIncome).toBe(40000);
    // Assets: Cash 150k + AR 30k + Inv (20k - 60k = -40k) + Fixed 100k = 240,000 Total Assets
    expect(bs.current.totalAssets).toBe(240000);
    // Liabilities: Payables 40k + Loans 60k = 100,000
    expect(bs.current.totalLiabilities).toBe(100000);
    // Equity: Capital 100k + Net Income 40k = 140,000
    expect(bs.current.totalEquity).toBe(140000);
    // Assets (240k) = Liabilities (100k) + Equity (140k)
    expect(bs.current.totalAssets).toBe(bs.current.totalLiabilities + bs.current.totalEquity);
  });

  it("4. Cash Flow Statement test - indirect method math checks out", async () => {
    const cfs = await FinancialAnalysisRepository.getCashFlowStatement(tenantId, "2026-01-01", "2026-12-31");
    expect(cfs.operatingActivities.netIncome).toBe(40000);
    expect(cfs.netChangeInCash).toBeDefined();
  });

  it("5. Financial Ratios test - calculates liquidity, efficiency, profitability, leverage accurately", async () => {
    const ratiosData = await FinancialAnalysisRepository.getRatios(tenantId, "2026-07-21", "2026-01-01", "2026-12-31");
    const ratios = ratiosData.ratios;
    
    const currRatio = ratios.find(r => r.key === "current_ratio");
    expect(currRatio).toBeDefined();
    expect(currRatio?.value).toBeGreaterThan(0);

    const netMarginRatio = ratios.find(r => r.key === "net_margin");
    expect(netMarginRatio?.value).toBe(33.33); // 40k / 120k * 100 = 33.33%
  });

  it("6. DuPont Analysis test - 3-step and 5-step ROE decomposition", async () => {
    const dupont = await FinancialAnalysisRepository.getDuPont(tenantId, "2026-07-21", "2026-01-01", "2026-12-31");
    expect(dupont.roe).toBeDefined();
    expect(dupont.components3Step.netProfitMargin).toBeCloseTo(33.33, 1);
    expect(dupont.components3Step.assetTurnover).toBe(0.5); // Revenue 120k / Assets 240k
    expect(dupont.components3Step.equityMultiplier).toBeCloseTo(1.71, 1); // Assets 240k / Equity 140k = 1.714
  });

  it("7. Vertical Analysis test - Common-Size structure calculation", async () => {
    const vert = await FinancialAnalysisRepository.getVerticalAnalysis(tenantId, "income", "2026-07-21", "2026-01-01", "2026-12-31");
    expect(vert.baseValue).toBe(120000);
    const revItem = vert.items.find(i => i.name.includes("إجمالي الإيرادات"));
    expect(revItem?.percentage).toBe(100);
  });

  it("8. Horizontal Analysis test - trend growth calculations", async () => {
    const horiz = await FinancialAnalysisRepository.getHorizontalAnalysis(tenantId, "income", 3, "month", "2026-07-21");
    expect(horiz.periods.length).toBe(3);
  });

  it("9. Break-Even Analysis test - contribution margin and break-even point", async () => {
    const breakEven = await FinancialAnalysisRepository.getBreakEven(tenantId);
    expect(breakEven.applicable).toBe(true);
    if (breakEven.applicable) {
      expect(breakEven.revenue).toBe(120000);
      expect(breakEven.variableCosts).toBe(60000);
      expect(breakEven.fixedCosts).toBe(20000);
      expect(breakEven.contributionMargin).toBe(60000); // 120k - 60k
      expect(breakEven.contributionMarginRatio).toBe(0.5); // 60k / 120k
      expect(breakEven.breakEvenValue).toBe(40000); // Fixed 20k / 0.5 = 40,000
    }
  });

  it("10. Altman Z-Score test - evaluates financial distress zone accurately", async () => {
    const zScore = await FinancialAnalysisRepository.getAltmanZScore(tenantId, "2026-07-21");
    expect(zScore.applicable).toBe(true);
    if (zScore.applicable) {
      expect(zScore.zScore).toBeDefined();
      expect(["Safe", "Grey", "Distress"]).toContain(zScore.zone);
    }
  });

  it("11. Aging Report test - classifies receivables into aging buckets correctly", async () => {
    const aging = await FinancialAnalysisRepository.getAgingReport(tenantId, "receivables", "2026-07-21");
    expect(aging.type).toBe("receivables");
    expect(aging.totals.b61_90).toBe(15000); // Invoice from 2026-05-01 is ~80 days old
  });

  it("12. Cost & Profit Center Profitability test - budget vs actual variance", async () => {
    const cp = await FinancialAnalysisRepository.getCostCenterProfitability(tenantId, "2026-01-01", "2026-12-31");
    expect(cp.costCenters.length).toBeGreaterThan(0);
    const cc1 = cp.costCenters.find((c: any) => c.id === "CC-TEST-01");
    expect(cc1).toBeDefined();
    // Spent in JE-FIN-02 (60k) + JE-FIN-03 (20k) = 80k spent vs 50k budget = OverBudget
    expect(cc1?.spent).toBe(80000);
    expect(cc1?.status).toBe("OverBudget");
  });
});
