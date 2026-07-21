import { getDb } from "../db";
import {
  accounts,
  journalEntries,
  journalLines,
  costCenters,
  profitCenters,
  salesInvoices,
  purchaseInvoices,
  customerPayments,
  supplierPayments,
  partyLedgerEntries,
  fixedAssets,
  cashFlowMappings
} from "../schema";
import { eq, and, lte, gte } from "drizzle-orm";
import Decimal from "decimal.js";

// Explanation on the mathematical choice:
// We use (ب) - JavaScript-side calculations with the 'decimal.js' library.
// Why: Financial analysis requires multi-step calculations, division (ratios),
// horizontal comparison, and complex ratios (like DuPont and Z-Score). Combining these
// within SQL (SUM aggregations) becomes extremely complex, rigid, and prone to database-specific
// division errors. Retrieving the records and processing them using 'decimal.js'
// ensures 100% precision, robust null/zero-division guards, and clear, maintainable business logic.

export class FinancialAnalysisRepository {
  /**
   * 1. Get Trial Balance
   * Aggregates all journal lines up to a specific date.
   */
  public static async getTrialBalance(tenantId: string, asOfDate: string) {
    const db = await getDb();
    
    // Fetch all accounts
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    
    // Fetch posted journal entries and lines up to asOfDate
    const entries = await db.select().from(journalEntries).where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "Posted"),
        lte(journalEntries.date, asOfDate)
      )
    );
    
    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(
        eq(journalLines.tenantId, tenantId)
      );
      // Filter lines in JS for simplicity & safety
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }

    const trialBalanceMap = new Map<string, { debitSum: Decimal; creditSum: Decimal }>();
    
    // Initialize map
    for (const acc of allAccounts) {
      trialBalanceMap.set(acc.code, { debitSum: new Decimal(0), creditSum: new Decimal(0) });
    }
    
    // Accumulate debits/credits
    for (const l of lines) {
      const current = trialBalanceMap.get(l.accountCode) || { debitSum: new Decimal(0), creditSum: new Decimal(0) };
      current.debitSum = current.debitSum.plus(new Decimal(l.debit || 0));
      current.creditSum = current.creditSum.plus(new Decimal(l.credit || 0));
      trialBalanceMap.set(l.accountCode, current);
    }
    
    const result = allAccounts.map(acc => {
      const accum = trialBalanceMap.get(acc.code) || { debitSum: new Decimal(0), creditSum: new Decimal(0) };
      const initial = new Decimal(acc.initialBalance || 0);
      const debits = accum.debitSum;
      const credits = accum.creditSum;
      
      let closing = new Decimal(0);
      // Normal balance: Asset & Expense are Debit (+) Credit (-)
      // Liability, Equity, Revenue are Credit (+) Debit (-)
      if (acc.type === "Asset" || acc.type === "Expense") {
        closing = initial.plus(debits).minus(credits);
      } else {
        closing = initial.plus(credits).minus(debits);
      }
      
      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        classification: acc.classification,
        initialBalance: initial.toNumber(),
        debit: debits.toNumber(),
        credit: credits.toNumber(),
        closingBalance: closing.toNumber()
      };
    });
    
    return result;
  }

  /**
   * Helper to compute income statement elements.
   */
  private static async computeIncomeStatementData(tenantId: string, fromDate: string, toDate: string) {
    const db = await getDb();
    
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    const entries = await db.select().from(journalEntries).where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "Posted"),
        gte(journalEntries.date, fromDate),
        lte(journalEntries.date, toDate)
      )
    );
    
    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }

    const linesMap = new Map<string, { debit: Decimal; credit: Decimal }>();
    for (const l of lines) {
      const cur = linesMap.get(l.accountCode) || { debit: new Decimal(0), credit: new Decimal(0) };
      cur.debit = cur.debit.plus(new Decimal(l.debit || 0));
      cur.credit = cur.credit.plus(new Decimal(l.credit || 0));
      linesMap.set(l.accountCode, cur);
    }

    let totalRevenue = new Decimal(0);
    let totalCogs = new Decimal(0);
    let totalOpex = new Decimal(0);
    let totalInterest = new Decimal(0);
    let totalTax = new Decimal(0);

    const revenueItems: any[] = [];
    const cogsItems: any[] = [];
    const opexItems: any[] = [];
    const interestItems: any[] = [];
    const taxItems: any[] = [];

    for (const acc of allAccounts) {
      const cur = linesMap.get(acc.code) || { debit: new Decimal(0), credit: new Decimal(0) };
      if (acc.type === "Revenue") {
        // Revenues are credit-normal
        const netRev = cur.credit.minus(cur.debit);
        if (netRev.gt(0) || cur.credit.gt(0)) {
          totalRevenue = totalRevenue.plus(netRev);
          revenueItems.push({ code: acc.code, name: acc.name, balance: netRev.toNumber() });
        }
      } else if (acc.type === "Expense") {
        const netExp = cur.debit.minus(cur.credit);
        // Categorize expenses
        const isCogs = acc.code === "50200" || (acc.classification && acc.classification.toLowerCase().includes("تكلفة"));
        const isInterest = acc.classification && (acc.classification.includes("تمويل") || acc.classification.includes("فوائد"));
        const isTax = acc.code === "50300" || (acc.classification && (acc.classification.includes("ضريبة") || acc.classification.includes("ضرائب")));

        if (isCogs) {
          totalCogs = totalCogs.plus(netExp);
          cogsItems.push({ code: acc.code, name: acc.name, balance: netExp.toNumber() });
        } else if (isInterest) {
          totalInterest = totalInterest.plus(netExp);
          interestItems.push({ code: acc.code, name: acc.name, balance: netExp.toNumber() });
        } else if (isTax) {
          totalTax = totalTax.plus(netExp);
          taxItems.push({ code: acc.code, name: acc.name, balance: netExp.toNumber() });
        } else {
          totalOpex = totalOpex.plus(netExp);
          opexItems.push({ code: acc.code, name: acc.name, balance: netExp.toNumber() });
        }
      }
    }

    const grossProfit = totalRevenue.minus(totalCogs);
    const operatingProfit = grossProfit.minus(totalOpex); // EBIT
    const earningsBeforeTax = operatingProfit.minus(totalInterest); // EBT
    const netProfit = earningsBeforeTax.minus(totalTax);

    return {
      totalRevenue,
      totalCogs,
      grossProfit,
      totalOpex,
      operatingProfit,
      totalInterest,
      earningsBeforeTax,
      totalTax,
      netProfit,
      revenueItems,
      cogsItems,
      opexItems,
      interestItems,
      taxItems
    };
  }

  /**
   * 2. Income Statement
   */
  public static async getIncomeStatement(tenantId: string, fromDate: string, toDate: string, compareWithPrior: boolean) {
    const current = await this.computeIncomeStatementData(tenantId, fromDate, toDate);
    
    let prior: any = null;
    let comparison: any = null;

    if (compareWithPrior) {
      // Calculate prior period of same length
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffMs = to.getTime() - from.getTime();
      const priorToDate = new Date(from.getTime() - 86400000); // 1 day before current start
      const priorFromDate = new Date(priorToDate.getTime() - diffMs);
      
      const priorFromStr = priorFromDate.toISOString().split("T")[0];
      const priorToStr = priorToDate.toISOString().split("T")[0];

      prior = await this.computeIncomeStatementData(tenantId, priorFromStr, priorToStr);

      const percentChange = (currVal: number, priorVal: number) => {
        if (priorVal === 0) return currVal > 0 ? 100 : 0;
        return new Decimal(currVal).minus(priorVal).dividedBy(priorVal).times(100).round().toNumber();
      };

      comparison = {
        revenueChangePercent: percentChange(current.totalRevenue.toNumber(), prior.totalRevenue.toNumber()),
        cogsChangePercent: percentChange(current.totalCogs.toNumber(), prior.totalCogs.toNumber()),
        grossProfitChangePercent: percentChange(current.grossProfit.toNumber(), prior.grossProfit.toNumber()),
        opexChangePercent: percentChange(current.totalOpex.toNumber(), prior.totalOpex.toNumber()),
        operatingProfitChangePercent: percentChange(current.operatingProfit.toNumber(), prior.operatingProfit.toNumber()),
        netProfitChangePercent: percentChange(current.netProfit.toNumber(), prior.netProfit.toNumber())
      };
    }

    const calcCommonSize = (val: Decimal, base: Decimal) => {
      if (base.isZero()) return 0;
      return val.dividedBy(base).times(100).toDecimalPlaces(2).toNumber();
    };

    return {
      current: {
        fromDate,
        toDate,
        revenueItems: current.revenueItems,
        totalRevenue: current.totalRevenue.toNumber(),
        cogsItems: current.cogsItems,
        totalCogs: current.totalCogs.toNumber(),
        grossProfit: current.grossProfit.toNumber(),
        opexItems: current.opexItems,
        totalOpex: current.totalOpex.toNumber(),
        operatingProfit: current.operatingProfit.toNumber(),
        interestItems: current.interestItems,
        totalInterest: current.totalInterest.toNumber(),
        earningsBeforeTax: current.earningsBeforeTax.toNumber(),
        taxItems: current.taxItems,
        totalTax: current.totalTax.toNumber(),
        netProfit: current.netProfit.toNumber(),
        commonSize: {
          revenue: 100,
          cogs: calcCommonSize(current.totalCogs, current.totalRevenue),
          grossProfit: calcCommonSize(current.grossProfit, current.totalRevenue),
          opex: calcCommonSize(current.totalOpex, current.totalRevenue),
          operatingProfit: calcCommonSize(current.operatingProfit, current.totalRevenue),
          netProfit: calcCommonSize(current.netProfit, current.totalRevenue)
        }
      },
      prior: prior ? {
        fromDate: prior.fromDate,
        toDate: prior.toDate,
        totalRevenue: prior.totalRevenue.toNumber(),
        totalCogs: prior.totalCogs.toNumber(),
        grossProfit: prior.grossProfit.toNumber(),
        totalOpex: prior.totalOpex.toNumber(),
        operatingProfit: prior.operatingProfit.toNumber(),
        totalInterest: prior.totalInterest.toNumber(),
        totalTax: prior.totalTax.toNumber(),
        netProfit: prior.netProfit.toNumber()
      } : null,
      comparison
    };
  }

  /**
   * Helper to compute Balance Sheet elements at a specific point in time.
   */
  private static async computeBalanceSheetData(tenantId: string, asOfDate: string) {
    const db = await getDb();
    
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    
    // Sum journal lines <= asOfDate
    const entries = await db.select().from(journalEntries).where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "Posted"),
        lte(journalEntries.date, asOfDate)
      )
    );
    
    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }

    const linesMap = new Map<string, { debit: Decimal; credit: Decimal }>();
    for (const l of lines) {
      const cur = linesMap.get(l.accountCode) || { debit: new Decimal(0), credit: new Decimal(0) };
      cur.debit = cur.debit.plus(new Decimal(l.debit || 0));
      cur.credit = cur.credit.plus(new Decimal(l.credit || 0));
      linesMap.set(l.accountCode, cur);
    }

    let currentAssets = new Decimal(0);
    let nonCurrentAssets = new Decimal(0);
    let currentLiabilities = new Decimal(0);
    let nonCurrentLiabilities = new Decimal(0);
    let equity = new Decimal(0);

    const assetItems: any[] = [];
    const liabilityItems: any[] = [];
    const equityItems: any[] = [];

    // Calculate dynamic profit/loss up to asOfDate to balance the ledger
    let cumulativeRevenue = new Decimal(0);
    let cumulativeExpense = new Decimal(0);

    for (const acc of allAccounts) {
      const cur = linesMap.get(acc.code) || { debit: new Decimal(0), credit: new Decimal(0) };
      const initial = new Decimal(acc.initialBalance || 0);

      if (acc.type === "Asset") {
        const val = initial.plus(cur.debit).minus(cur.credit);
        const isCurrent = acc.code.startsWith("10") || acc.code.startsWith("11") || acc.code.startsWith("12") ||
                          (acc.classification && (acc.classification.includes("متداول") || acc.classification.includes("نقدية") || acc.classification.includes("مخزون")));
        
        if (isCurrent) {
          currentAssets = currentAssets.plus(val);
        } else {
          nonCurrentAssets = nonCurrentAssets.plus(val);
        }
        assetItems.push({ code: acc.code, name: acc.name, balance: val.toNumber(), category: isCurrent ? "Current" : "NonCurrent" });
      } else if (acc.type === "Liability") {
        const val = initial.plus(cur.credit).minus(cur.debit);
        const isCurrent = acc.code.startsWith("20") || acc.code.startsWith("21") || acc.code.startsWith("22") ||
                          (acc.classification && (acc.classification.includes("متداول") || acc.classification.includes("ضرائب")));
        
        if (isCurrent) {
          currentLiabilities = currentLiabilities.plus(val);
        } else {
          nonCurrentLiabilities = nonCurrentLiabilities.plus(val);
        }
        liabilityItems.push({ code: acc.code, name: acc.name, balance: val.toNumber(), category: isCurrent ? "Current" : "NonCurrent" });
      } else if (acc.type === "Equity") {
        const val = initial.plus(cur.credit).minus(cur.debit);
        equity = equity.plus(val);
        equityItems.push({ code: acc.code, name: acc.name, balance: val.toNumber() });
      } else if (acc.type === "Revenue") {
        cumulativeRevenue = cumulativeRevenue.plus(cur.credit.minus(cur.debit));
      } else if (acc.type === "Expense") {
        cumulativeExpense = cumulativeExpense.plus(cur.debit.minus(cur.credit));
      }
    }

    const netIncome = cumulativeRevenue.minus(cumulativeExpense);
    // Add cumulative net income to Equity to balance the ledger
    equity = equity.plus(netIncome);
    equityItems.push({ code: "NET_INCOME_CUMULATIVE", name: "الأرباح والخسائر المتراكمة (النشاط الجاري)", balance: netIncome.toNumber() });

    const totalAssets = currentAssets.plus(nonCurrentAssets);
    const totalLiabilities = currentLiabilities.plus(nonCurrentLiabilities);
    const totalEquity = equity;

    return {
      currentAssets,
      nonCurrentAssets,
      totalAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities,
      equity,
      totalEquity,
      netIncome,
      assetItems,
      liabilityItems,
      equityItems
    };
  }

  /**
   * 3. Balance Sheet
   */
  public static async getBalanceSheet(tenantId: string, asOfDate: string, compareWithPrior: boolean) {
    const current = await this.computeBalanceSheetData(tenantId, asOfDate);
    
    let prior: any = null;
    let comparison: any = null;

    if (compareWithPrior) {
      // Prior date: exactly 1 year ago
      const currentD = new Date(asOfDate);
      const priorD = new Date(currentD);
      priorD.setFullYear(currentD.getFullYear() - 1);
      const priorDateStr = priorD.toISOString().split("T")[0];

      prior = await this.computeBalanceSheetData(tenantId, priorDateStr);

      const percentChange = (currVal: number, priorVal: number) => {
        if (priorVal === 0) return currVal > 0 ? 100 : 0;
        return new Decimal(currVal).minus(priorVal).dividedBy(priorVal).times(100).round().toNumber();
      };

      comparison = {
        assetsChangePercent: percentChange(current.totalAssets.toNumber(), prior.totalAssets.toNumber()),
        currentAssetsChangePercent: percentChange(current.currentAssets.toNumber(), prior.currentAssets.toNumber()),
        liabilitiesChangePercent: percentChange(current.totalLiabilities.toNumber(), prior.totalLiabilities.toNumber()),
        currentLiabilitiesChangePercent: percentChange(current.currentLiabilities.toNumber(), prior.currentLiabilities.toNumber()),
        equityChangePercent: percentChange(current.totalEquity.toNumber(), prior.totalEquity.toNumber())
      };
    }

    const calcCommonSize = (val: Decimal, base: Decimal) => {
      if (base.isZero()) return 0;
      return val.dividedBy(base).times(100).toDecimalPlaces(2).toNumber();
    };

    return {
      current: {
        asOfDate,
        assetItems: current.assetItems,
        liabilityItems: current.liabilityItems,
        equityItems: current.equityItems,
        currentAssets: current.currentAssets.toNumber(),
        nonCurrentAssets: current.nonCurrentAssets.toNumber(),
        totalAssets: current.totalAssets.toNumber(),
        currentLiabilities: current.currentLiabilities.toNumber(),
        nonCurrentLiabilities: current.nonCurrentLiabilities.toNumber(),
        totalLiabilities: current.totalLiabilities.toNumber(),
        equity: current.totalEquity.toNumber(),
        totalEquity: current.totalEquity.toNumber(),
        netIncome: current.netIncome.toNumber(),
        commonSize: {
          currentAssets: calcCommonSize(current.currentAssets, current.totalAssets),
          nonCurrentAssets: calcCommonSize(current.nonCurrentAssets, current.totalAssets),
          totalAssets: 100,
          currentLiabilities: calcCommonSize(current.currentLiabilities, current.totalAssets),
          nonCurrentLiabilities: calcCommonSize(current.nonCurrentLiabilities, current.totalAssets),
          totalLiabilities: calcCommonSize(current.totalLiabilities, current.totalAssets),
          equity: calcCommonSize(current.totalEquity, current.totalAssets)
        }
      },
      prior: prior ? {
        asOfDate: prior.asOfDate,
        currentAssets: prior.currentAssets.toNumber(),
        nonCurrentAssets: prior.nonCurrentAssets.toNumber(),
        totalAssets: prior.totalAssets.toNumber(),
        currentLiabilities: prior.currentLiabilities.toNumber(),
        nonCurrentLiabilities: prior.nonCurrentLiabilities.toNumber(),
        totalLiabilities: prior.totalLiabilities.toNumber(),
        equity: prior.totalEquity.toNumber(),
        totalEquity: prior.totalEquity.toNumber()
      } : null,
      comparison
    };
  }

  /**
   * 4. Cash Flow Statement (IAS 7 - Indirect Method)
   */
  public static async getCashFlowStatement(tenantId: string, fromDate: string, toDate: string) {
    const db = await getDb();
    
    // Fetch live data
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    const mappings = await db.select().from(cashFlowMappings).where(eq(cashFlowMappings.tenantId, tenantId));

    const mappingMap = new Map(mappings.map((m: any) => [m.accountCode, m]));
    const isCashEquivalent = (code: string) => {
      const m = mappingMap.get(code);
      if (m) return m.activityType === "CashEquivalent";
      return ["10100", "10200", "10300"].includes(code);
    };

    // Calculate balances at fromDate - 1 and toDate
    const getBalancesAtDate = async (date: string) => {
      const entries = await db.select().from(journalEntries).where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.status, "Posted"),
          lte(journalEntries.date, date)
        )
      );
      const entryIds = entries.map(e => e.id);
      let lines: any[] = [];
      if (entryIds.length > 0) {
        lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
        const entryIdSet = new Set(entryIds);
        lines = lines.filter(l => entryIdSet.has(l.entryId));
      }

      const balanceMap = new Map<string, Decimal>();
      for (const acc of allAccounts) {
        balanceMap.set(acc.code, new Decimal(acc.initialBalance || 0));
      }

      for (const l of lines) {
        const currentBal = balanceMap.get(l.accountCode) || new Decimal(0);
        const debit = new Decimal(l.debit || 0);
        const credit = new Decimal(l.credit || 0);
        
        // Find normal balance of account code
        const accType = allAccounts.find(a => a.code === l.accountCode)?.type;
        if (accType === "Asset" || accType === "Expense") {
          balanceMap.set(l.accountCode, currentBal.plus(debit).minus(credit));
        } else {
          balanceMap.set(l.accountCode, currentBal.plus(credit).minus(debit));
        }
      }
      return balanceMap;
    };

    const beforeStart = new Date(new Date(fromDate).getTime() - 86400000).toISOString().split("T")[0];
    
    const openingBalances = await getBalancesAtDate(beforeStart);
    const closingBalances = await getBalancesAtDate(toDate);

    // Calculate Net Income for the period
    const currentIncome = await this.computeIncomeStatementData(tenantId, fromDate, toDate);
    const netIncome = currentIncome.netProfit;

    // Changes in working capital items (Operating Activities)
    let arChange = new Decimal(0);
    let inventoryChange = new Decimal(0);
    let apChange = new Decimal(0);
    let taxesChange = new Decimal(0);
    let opexAccrualsChange = new Decimal(0);

    for (const acc of allAccounts) {
      const openVal = openingBalances.get(acc.code) || new Decimal(0);
      const closeVal = closingBalances.get(acc.code) || new Decimal(0);
      const diff = closeVal.minus(openVal);

      if (isCashEquivalent(acc.code)) continue;

      if (acc.code === "11000" || (acc.classification && acc.classification.includes("المدينون"))) {
        // Assets: Increase is a Cash OUTFLOW (-)
        arChange = arChange.minus(diff);
      } else if (acc.code === "12000" || acc.code === "12100" || (acc.classification && acc.classification.includes("المخزون"))) {
        inventoryChange = inventoryChange.minus(diff);
      } else if (acc.code === "20100" || (acc.classification && acc.classification.includes("الدائنون"))) {
        // Liabilities: Increase is a Cash INFLOW (+)
        apChange = apChange.plus(diff);
      } else if (acc.code === "22000" || acc.code === "22100" || (acc.classification && acc.classification.includes("الالتزامات الضريبية"))) {
        taxesChange = taxesChange.plus(diff);
      } else if (acc.code === "20200" || (acc.classification && acc.classification.includes("المستحقة"))) {
        opexAccrualsChange = opexAccrualsChange.plus(diff);
      }
    }

    // Adjustments for non-cash items: Depreciation
    // Find depreciation expenses or changes in accumulated depreciation
    let depreciationAdjustment = new Decimal(0);
    for (const acc of allAccounts) {
      if (acc.classification && acc.classification.includes("إهلاك")) {
        const openVal = openingBalances.get(acc.code) || new Decimal(0);
        const closeVal = closingBalances.get(acc.code) || new Decimal(0);
        depreciationAdjustment = depreciationAdjustment.plus(closeVal.minus(openVal));
      }
    }
    // If no accum. depreciation accounts found, let's look for expense 50500 / other
    if (depreciationAdjustment.isZero()) {
      depreciationAdjustment = new Decimal(currentIncome.opexItems.find(i => i.code === "50500" || i.name.includes("إهلاك"))?.balance || 0);
    }

    const operatingCashFlow = netIncome
      .plus(depreciationAdjustment)
      .plus(arChange)
      .plus(inventoryChange)
      .plus(apChange)
      .plus(taxesChange)
      .plus(opexAccrualsChange);

    // Investing Activities
    let investingCashFlow = new Decimal(0);
    const investingItems: any[] = [];
    for (const acc of allAccounts) {
      if (acc.classification && (acc.classification.includes("أصول غير متداولة") || acc.classification.includes("أصول ثابتة"))) {
        if (acc.classification.includes("مجمع إهلاك") || acc.classification.includes("متراكم إهلاك")) continue;
        const openVal = openingBalances.get(acc.code) || new Decimal(0);
        const closeVal = closingBalances.get(acc.code) || new Decimal(0);
        const diff = closeVal.minus(openVal);
        if (!diff.isZero()) {
          // Increase in asset is Cash OUTFLOW (-)
          investingCashFlow = investingCashFlow.minus(diff);
          investingItems.push({ name: `شراء/استبعاد أصول ثابتة - ${acc.name}`, amount: diff.negated().toNumber() });
        }
      }
    }

    // Financing Activities
    let financingCashFlow = new Decimal(0);
    const financingItems: any[] = [];
    for (const acc of allAccounts) {
      if (acc.type === "Equity" && acc.code !== "NET_INCOME_CUMULATIVE" && acc.code !== "30200") {
        const openVal = openingBalances.get(acc.code) || new Decimal(0);
        const closeVal = closingBalances.get(acc.code) || new Decimal(0);
        const diff = closeVal.minus(openVal);
        if (!diff.isZero()) {
          financingCashFlow = financingCashFlow.plus(diff);
          financingItems.push({ name: `التغير في رأس المال المساهم - ${acc.name}`, amount: diff.toNumber() });
        }
      } else if (acc.type === "Liability" && acc.classification && acc.classification.includes("تمويل طويل الأجل")) {
        const openVal = openingBalances.get(acc.code) || new Decimal(0);
        const closeVal = closingBalances.get(acc.code) || new Decimal(0);
        const diff = closeVal.minus(openVal);
        if (!diff.isZero()) {
          financingCashFlow = financingCashFlow.plus(diff);
          financingItems.push({ name: `الحصول على/سداد قروض طويلة الأجل - ${acc.name}`, amount: diff.toNumber() });
        }
      }
    }

    // Calculate Opening and Closing Cash equivalents directly
    let openingCashVal = new Decimal(0);
    let closingCashVal = new Decimal(0);
    for (const acc of allAccounts) {
      if (isCashEquivalent(acc.code)) {
        openingCashVal = openingCashVal.plus(openingBalances.get(acc.code) || new Decimal(0));
        closingCashVal = closingCashVal.plus(closingBalances.get(acc.code) || new Decimal(0));
      }
    }

    const netChangeInCash = closingCashVal.minus(openingCashVal);

    return {
      fromDate,
      toDate,
      operatingActivities: {
        netIncome: netIncome.toNumber(),
        depreciationAdjustment: depreciationAdjustment.toNumber(),
        receivablesChange: arChange.toNumber(),
        inventoryChange: inventoryChange.toNumber(),
        payablesChange: apChange.toNumber(),
        taxesChange: taxesChange.toNumber(),
        opexAccrualsChange: opexAccrualsChange.toNumber(),
        totalOperatingCashFlow: operatingCashFlow.toNumber()
      },
      investingActivities: {
        items: investingItems,
        totalInvestingCashFlow: investingCashFlow.toNumber()
      },
      financingActivities: {
        items: financingItems,
        totalFinancingCashFlow: financingCashFlow.toNumber()
      },
      netChangeInCash: netChangeInCash.toNumber(),
      openingCash: openingCashVal.toNumber(),
      closingCash: closingCashVal.toNumber(),
      reconciliationError: netChangeInCash.minus(operatingCashFlow.plus(investingCashFlow).plus(financingCashFlow)).toNumber()
    };
  }

  /**
   * 5. Financial Ratios
   */
  public static async getRatios(tenantId: string, asOfDate: string, fromDate: string, toDate: string) {
    const bs = await this.computeBalanceSheetData(tenantId, asOfDate);
    const is = await this.computeIncomeStatementData(tenantId, fromDate, toDate);

    // Gather metrics safely with decimal
    const ca = bs.currentAssets;
    const cl = bs.currentLiabilities;
    const assets = bs.totalAssets;
    const liabilities = bs.totalLiabilities;
    const equity = bs.totalEquity;
    
    // Cash & equivalents
    const db = await getDb();
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    const entries = await db.select().from(journalEntries).where(
      and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.status, "Posted"), lte(journalEntries.date, asOfDate))
    );
    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }
    const balanceMap = new Map<string, Decimal>();
    for (const acc of allAccounts) {
      balanceMap.set(acc.code, new Decimal(acc.initialBalance || 0));
    }
    for (const l of lines) {
      const val = balanceMap.get(l.accountCode) || new Decimal(0);
      const accType = allAccounts.find(a => a.code === l.accountCode)?.type;
      if (accType === "Asset" || accType === "Expense") {
        balanceMap.set(l.accountCode, val.plus(new Decimal(l.debit || 0)).minus(new Decimal(l.credit || 0)));
      } else {
        balanceMap.set(l.accountCode, val.plus(new Decimal(l.credit || 0)).minus(new Decimal(l.debit || 0)));
      }
    }

    let cash = new Decimal(0);
    let inventory = new Decimal(0);
    let receivables = new Decimal(0);
    let payables = new Decimal(0);

    for (const acc of allAccounts) {
      const bal = balanceMap.get(acc.code) || new Decimal(0);
      if (["10100", "10200", "10300"].includes(acc.code)) {
        cash = cash.plus(bal);
      } else if (["12000", "12100"].includes(acc.code) || (acc.classification && acc.classification.includes("المخزون"))) {
        inventory = inventory.plus(bal);
      } else if (acc.code === "11000" || (acc.classification && acc.classification.includes("المدينون"))) {
        receivables = receivables.plus(bal);
      } else if (acc.code === "20100" || (acc.classification && acc.classification.includes("الدائنون"))) {
        payables = payables.plus(bal);
      }
    }

    const rev = is.totalRevenue;
    const cogs = is.totalCogs;
    const ebit = is.operatingProfit;
    const netProfit = is.netProfit;
    const interest = is.totalInterest;

    // Helper functions
    const div = (n: Decimal, d: Decimal) => d.isZero() ? 0 : n.dividedBy(d).toDecimalPlaces(4).toNumber();
    const pct = (n: Decimal, d: Decimal) => d.isZero() ? 0 : n.dividedBy(d).times(100).toDecimalPlaces(2).toNumber();

    // Ratios Calculations
    const currentRatio = div(ca, cl);
    const quickRatio = div(ca.minus(inventory), cl);
    const cashRatio = div(cash, cl);
    const workingCapital = ca.minus(cl).toNumber();

    const invTurnover = div(cogs, inventory);
    const dio = invTurnover === 0 ? 0 : new Decimal(365).dividedBy(invTurnover).round().toNumber();
    const recTurnover = div(rev, receivables);
    const dso = recTurnover === 0 ? 0 : new Decimal(365).dividedBy(recTurnover).round().toNumber();
    const payTurnover = div(cogs, payables);
    const dpo = payTurnover === 0 ? 0 : new Decimal(365).dividedBy(payTurnover).round().toNumber();
    const ccc = dso + dio - dpo;
    const assetTurnover = div(rev, assets);

    const grossMargin = pct(is.grossProfit, rev);
    const operatingMargin = pct(ebit, rev);
    const netMargin = pct(netProfit, rev);
    const roa = pct(netProfit, assets);
    const roe = pct(netProfit, equity);

    // ROIC = EBIT * (1 - taxRate) / (Debt + Equity - Cash)
    // Tax rate estimation
    const taxRate = is.earningsBeforeTax.isZero() ? 0 : is.totalTax.dividedBy(is.earningsBeforeTax).toNumber();
    const investedCapital = liabilities.plus(equity).minus(cash);
    const roic = investedCapital.isZero() ? 0 : pct(ebit.times(1 - taxRate), investedCapital);

    const debtToEquity = div(liabilities, equity);
    const debtRatio = div(liabilities, assets);
    const equityRatio = div(equity, assets);
    const interestCoverage = div(ebit, interest);

    const result = [
      // 1. LIQUIDITY
      {
        key: "current_ratio",
        value: currentRatio,
        category: "liquidity",
        titleAr: "نسبة التداول (السيولة الجارية)",
        titleEn: "Current Ratio",
        descAr: "يقيس قدرة المنشأة على سداد التزاماتها قصيرة الأجل باستخدام أصولها الجارية. المعيار المثالي هو 1.5 إلى 2.0.",
        descEn: "Measures the ability to pay short-term obligations using current assets. Standard ideal is 1.5 to 2.0.",
        evaluationAr: currentRatio >= 1.5 ? "ممتاز - سيولة قوية" : currentRatio >= 1.0 ? "مقبول - سيولة متوسطة" : "حرجة - هناك مخاطر تعسر سيولة"
      },
      {
        key: "quick_ratio",
        value: quickRatio,
        category: "liquidity",
        titleAr: "نسبة السيولة السريعة",
        titleEn: "Quick Ratio",
        descAr: "يقيس القدرة الفورية على سداد الالتزامات بعد استبعاد المخزون الذي يتطلب وقتاً لتسييله. المعيار المثالي هو 1.0 فأكثر.",
        descEn: "Measures immediate capacity to cover current liabilities without inventory. Ideal is 1.0 or higher.",
        evaluationAr: quickRatio >= 1.0 ? "آمن ومطابق للمقاييس العالمية" : "أقل من المعيار - قد يواجه صعوبة تسييل"
      },
      {
        key: "cash_ratio",
        value: cashRatio,
        category: "liquidity",
        titleAr: "نسبة النقدية الفورية",
        titleEn: "Cash Ratio",
        descAr: "يقيس مدى كفاية النقدية وشبه النقدية في البنك لمواجهة المطلوبات فوراً دون تسييل عملاء أو مخزون.",
        descEn: "Measures cash sufficiency to pay short-term debts immediately.",
        evaluationAr: cashRatio >= 0.2 ? "سيولة نقدية جيدة" : "نقدية جافة للغاية"
      },
      {
        key: "working_capital",
        value: workingCapital,
        category: "liquidity",
        titleAr: "رأس المال العامل",
        titleEn: "Working Capital",
        descAr: "الفائض المالي التشغيلي (الأصول المتداولة - الالتزامات المتداولة) المحرك للعمليات اليومية للشركة.",
        descEn: "Net liquid resources available for daily operations.",
        evaluationAr: workingCapital > 0 ? "إيجابي - تدعم استمرارية الأعمال" : "سلبي - خطر تشغيلي كبير"
      },
      // 2. EFFICIENCY
      {
        key: "inventory_turnover",
        value: invTurnover,
        category: "efficiency",
        titleAr: "معدل دوران المخزون",
        titleEn: "Inventory Turnover",
        descAr: "عدد مرات بيع وتجديد المخزون خلال الفترة. الزيادة تدل على كفاءة المبيعات.",
        descEn: "Number of times inventory is sold and replaced.",
        evaluationAr: invTurnover > 4 ? "نشط - حركة مبيعات سريعة" : "بطيء - مخاطر ركود بضائع"
      },
      {
        key: "days_inventory_outstanding",
        value: dio,
        category: "efficiency",
        titleAr: "فترة الاحتفاظ بالمخزون (بالأيام)",
        titleEn: "Days Inventory Outstanding",
        descAr: "متوسط عدد الأيام التي تقضيها البضاعة في المخازن قبل بيعها.",
        descEn: "Average days inventory remains on shelves.",
        evaluationAr: dio < 90 ? "فعالة - وقت تخزين قصير" : "تخزين طويل ومكلف"
      },
      {
        key: "receivables_turnover",
        value: recTurnover,
        category: "efficiency",
        titleAr: "معدل دوران الذمم المدينة",
        titleEn: "Receivables Turnover",
        descAr: "يقيس كفاءة الشركة في تحصيل ديونها من العملاء.",
        descEn: "Efficiency in collecting credit sales from customers.",
        evaluationAr: recTurnover > 6 ? "تحصيل قوي" : "سياسات تحصيل بطيئة"
      },
      {
        key: "days_sales_outstanding",
        value: dso,
        category: "efficiency",
        titleAr: "فترة التحصيل (بالأيام)",
        titleEn: "Days Sales Outstanding",
        descAr: "متوسط عدد الأيام المستغرقة لتحصيل النقدية من المبيعات الآجلة للعملاء.",
        descEn: "Average days to collect cash from customers.",
        evaluationAr: dso < 60 ? "فترة تحصيل سريعة وممتازة" : "تحصيل متأخر - يهدد السيولة"
      },
      {
        key: "cash_conversion_cycle",
        value: ccc,
        category: "efficiency",
        titleAr: "دورة التحول النقدي (CCC)",
        titleEn: "Cash Conversion Cycle",
        descAr: "الزمن الإجمالي اللازم لتحويل النقدية المنفقة على المبيعات والإنتاج مجدداً إلى نقدية محصلة (DSO + DIO - DPO).",
        descEn: "Time required to convert resource inputs into cash flows.",
        evaluationAr: ccc <= 90 ? "دورة نقدية سريعة وكفؤة" : "دورة بطيئة تستهلك نقدية الشركة"
      },
      {
        key: "asset_turnover",
        value: assetTurnover,
        category: "efficiency",
        titleAr: "معدل دوران الأصول",
        titleEn: "Asset Turnover",
        descAr: "يقيس كفاءة الشركة في استخدام أصولها الإجمالية لتوليد مبيعات وإيرادات.",
        descEn: "Measures sales generated per unit of assets.",
        evaluationAr: assetTurnover > 0.5 ? "استغلال جيد للطاقة الإنتاجية" : "أصول عاطلة أو ضعف مبيعات"
      },
      // 3. PROFITABILITY
      {
        key: "gross_margin",
        value: grossMargin,
        category: "profitability",
        titleAr: "هامش ربح العمليات (الربح الإجمالي)",
        titleEn: "Gross Profit Margin",
        descAr: "النسبة المتبقية من إيرادات المبيعات بعد خصم التكاليف المباشرة للمبيعات.",
        descEn: "Percentage of sales remaining after direct production costs.",
        evaluationAr: grossMargin >= 40 ? "هامش قوي يمنح ميزة تنافسية" : "هامش منخفض - ارتفاع تكلفة مباشرة"
      },
      {
        key: "operating_margin",
        value: operatingMargin,
        category: "profitability",
        titleAr: "هامش الربح التشغيلي (EBIT Margin)",
        titleEn: "Operating Margin",
        descAr: "يقيس كفاءة الرقابة على المصروفات الإدارية والتشغيلية قبل الفوائد والضرائب.",
        descEn: "Measures operational efficiency of expense controls.",
        evaluationAr: operatingMargin >= 15 ? "أداء تشغيلي متميز" : "ضعف ربحية تشغيلية"
      },
      {
        key: "net_margin",
        value: netMargin,
        category: "profitability",
        titleAr: "هامش صافي الربح",
        titleEn: "Net Profit Margin",
        descAr: "النسبة الصافية التي تؤول للملاك من كل جنيه مبيعات بعد سداد كافة الالتزامات والضرائب.",
        descEn: "Percentage of revenue resulting in net income.",
        evaluationAr: netMargin >= 10 ? "ربحية نهائية صحية" : "أرباح نهائية هزيلة"
      },
      {
        key: "roa",
        value: roa,
        category: "profitability",
        titleAr: "العائد على الأصول (ROA)",
        titleEn: "Return on Assets",
        descAr: "يقيس العائد المولد من كل وحدة نقدية مستثمرة في الأصول.",
        descEn: "Net income generated per unit of total assets.",
        evaluationAr: roa >= 5 ? "كفاءة استثمارية جيدة" : "ضعف توليد أرباح من الأصول"
      },
      {
        key: "roe",
        value: roe,
        category: "profitability",
        titleAr: "العائد على حقوق الملكية (ROE)",
        titleEn: "Return on Equity",
        descAr: "يقيس كفاءة الشركة في تعظيم ثروة المساهمين والملاك.",
        descEn: "Net income generated relative to shareholder equity.",
        evaluationAr: roe >= 12 ? "معدل عالي ومغري للمستثمرين" : "عائد ضعيف على رأس المال الموظف"
      },
      // 4. LEVERAGE
      {
        key: "debt_to_equity",
        value: debtToEquity,
        category: "leverage",
        titleAr: "نسبة الديون إلى حقوق الملكية",
        titleEn: "Debt-to-Equity",
        descAr: "يقيس نسبة الاعتماد على التمويل الخارجي (الديون) مقابل التمويل الذاتي للملاك.",
        descEn: "Proportion of external debt relative to equity capital.",
        evaluationAr: debtToEquity <= 1.5 ? "هيكل تمويلي آمن ومنخفض المخاطر" : "اعتماد مفرط على الديون وقلق ائتماني"
      },
      {
        key: "debt_ratio",
        value: debtRatio,
        category: "leverage",
        titleAr: "نسبة الديون الإجمالية",
        titleEn: "Debt Ratio",
        descAr: "النسبة المئوية للأصول الإجمالية الممولة عن طريق قروض والتزامات دائنة.",
        descEn: "Percentage of total assets financed with liabilities.",
        evaluationAr: debtRatio <= 0.6 ? "هيكل أصول متزن" : "مخاطر مديونية مرتفعة"
      },
      {
        key: "interest_coverage",
        value: interest === 0 ? "N/A" : interestCoverage,
        category: "leverage",
        titleAr: "معدل تغطية الفوائد",
        titleEn: "Interest Coverage Ratio",
        descAr: "قدرة الأرباح التشغيلية على الوفاء بمصروفات الفوائد البنكية. أقل من 1.5 يشكل قلقاً ائتمانياً.",
        descEn: "Ability to service finance costs from EBIT.",
        evaluationAr: interest === 0 ? "لا توجد فوائد بنكية مستحقة - خالي من الديون الربوية" : interestCoverage >= 3.0 ? "قدرة تغطية ممتازة" : "قدرة تغطية حرجة"
      }
    ];

    return {
      asOfDate,
      ratios: result,
      marketCategory: "not applicable — no equity market data"
    };
  }

  /**
   * 6. Extended DuPont Analysis (5-Step)
   */
  public static async getDuPont(tenantId: string, asOfDate: string, fromDate: string, toDate: string) {
    const bs = await this.computeBalanceSheetData(tenantId, asOfDate);
    const is = await this.computeIncomeStatementData(tenantId, fromDate, toDate);

    const netProfit = is.netProfit;
    const rev = is.totalRevenue;
    const assets = bs.totalAssets;
    const equity = bs.totalEquity;
    const ebt = is.earningsBeforeTax;
    const ebit = is.operatingProfit;

    const div = (n: Decimal, d: Decimal) => d.isZero() ? 0 : n.dividedBy(d).toNumber();

    // 3-step DuPont
    const netProfitMargin = div(netProfit, rev);
    const assetTurnover = div(rev, assets);
    const equityMultiplier = div(assets, equity);
    const roe3 = new Decimal(netProfitMargin).times(assetTurnover).times(equityMultiplier).times(100).toDecimalPlaces(2).toNumber();

    // 5-step DuPont
    // Tax Burden = Net Income / EBT
    const taxBurden = div(netProfit, ebt);
    // Interest Burden = EBT / EBIT
    const interestBurden = div(ebt, ebit);
    // Operating Margin = EBIT / Revenue
    const operatingMargin = div(ebit, rev);

    const roe5 = new Decimal(taxBurden)
      .times(interestBurden)
      .times(operatingMargin)
      .times(assetTurnover)
      .times(equityMultiplier)
      .times(100)
      .toDecimalPlaces(2)
      .toNumber();

    return {
      roe: roe5,
      roe3Step: roe3,
      components3Step: {
        netProfitMargin: netProfitMargin * 100,
        assetTurnover,
        equityMultiplier
      },
      components5Step: {
        taxBurden,
        interestBurden,
        operatingMargin: operatingMargin * 100,
        assetTurnover,
        equityMultiplier
      }
    };
  }

  /**
   * 7. Vertical Analysis
   */
  public static async getVerticalAnalysis(tenantId: string, statement: "income" | "balance", asOfDate: string, fromDate?: string, toDate?: string) {
    const calcCommonSize = (val: number, base: number) => {
      if (base === 0) return 0;
      return new Decimal(val).dividedBy(base).times(100).toDecimalPlaces(2).toNumber();
    };

    if (statement === "income") {
      const from = fromDate || `${new Date().getFullYear()}-01-01`;
      const to = toDate || asOfDate;
      const is = await this.computeIncomeStatementData(tenantId, from, to);
      const base = is.totalRevenue.toNumber();

      return {
        statement,
        baseValue: base,
        items: [
          { name: "إجمالي الإيرادات / المبيعات", balance: base, percentage: 100 },
          { name: "تكلفة المبيعات (COGS)", balance: is.totalCogs.toNumber(), percentage: calcCommonSize(is.totalCogs.toNumber(), base) },
          { name: "مجمل الربح (Gross Profit)", balance: is.grossProfit.toNumber(), percentage: calcCommonSize(is.grossProfit.toNumber(), base) },
          { name: "المصروفات التشغيلية والعمومية", balance: is.totalOpex.toNumber(), percentage: calcCommonSize(is.totalOpex.toNumber(), base) },
          { name: "الربح التشغيلي (EBIT)", balance: is.operatingProfit.toNumber(), percentage: calcCommonSize(is.operatingProfit.toNumber(), base) },
          { name: "المصروفات التمويلية", balance: is.totalInterest.toNumber(), percentage: calcCommonSize(is.totalInterest.toNumber(), base) },
          { name: "الربح قبل الضرائب (EBT)", balance: is.earningsBeforeTax.toNumber(), percentage: calcCommonSize(is.earningsBeforeTax.toNumber(), base) },
          { name: "مصروفات الضرائب والزكاة", balance: is.totalTax.toNumber(), percentage: calcCommonSize(is.totalTax.toNumber(), base) },
          { name: "صافي أرباح الفترة", balance: is.netProfit.toNumber(), percentage: calcCommonSize(is.netProfit.toNumber(), base) }
        ]
      };
    } else {
      const bs = await this.computeBalanceSheetData(tenantId, asOfDate);
      const base = bs.totalAssets.toNumber();

      return {
        statement,
        baseValue: base,
        items: [
          { name: "الأصول المتداولة (السيولة والمخزون)", balance: bs.currentAssets.toNumber(), percentage: calcCommonSize(bs.currentAssets.toNumber(), base) },
          { name: "الأصول غير المتداولة (الأصول الثابتة)", balance: bs.nonCurrentAssets.toNumber(), percentage: calcCommonSize(bs.nonCurrentAssets.toNumber(), base) },
          { name: "إجمالي أصول المنشأة", balance: base, percentage: 100 },
          { name: "الالتزامات المتداولة", balance: bs.currentLiabilities.toNumber(), percentage: calcCommonSize(bs.currentLiabilities.toNumber(), base) },
          { name: "الالتزامات طويلة الأجل", balance: bs.nonCurrentLiabilities.toNumber(), percentage: calcCommonSize(bs.nonCurrentLiabilities.toNumber(), base) },
          { name: "حقوق الملكية للمساهمين", balance: bs.equity.toNumber(), percentage: calcCommonSize(bs.equity.toNumber(), base) },
          { name: "إجمالي المطلوبات وحقوق الملكية", balance: bs.totalLiabilities.plus(bs.equity).toNumber(), percentage: calcCommonSize(bs.totalLiabilities.plus(bs.equity).toNumber(), base) }
        ]
      };
    }
  }

  /**
   * 8. Horizontal Analysis
   */
  public static async getHorizontalAnalysis(tenantId: string, statement: "income" | "balance", periodsCount: number, interval: "month" | "quarter" | "year", asOfDate: string) {
    const periods: { label: string; from: string; to: string }[] = [];
    const baseDate = new Date(asOfDate);

    for (let i = periodsCount - 1; i >= 0; i--) {
      const from = new Date(baseDate);
      const to = new Date(baseDate);

      if (interval === "month") {
        from.setMonth(baseDate.getMonth() - i);
        from.setDate(1);
        to.setMonth(baseDate.getMonth() - i);
        to.setMonth(to.getMonth() + 1);
        to.setDate(0); // last day of month
        periods.push({
          label: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0]
        });
      } else if (interval === "quarter") {
        from.setMonth(baseDate.getMonth() - i * 3);
        from.setMonth(Math.floor(from.getMonth() / 3) * 3);
        from.setDate(1);
        to.setMonth(from.getMonth() + 2);
        to.setMonth(to.getMonth() + 1);
        to.setDate(0);
        periods.push({
          label: `Q${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()}`,
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0]
        });
      } else {
        from.setFullYear(baseDate.getFullYear() - i);
        from.setMonth(0);
        from.setDate(1);
        to.setFullYear(baseDate.getFullYear() - i);
        to.setMonth(11);
        to.setDate(31);
        periods.push({
          label: `${from.getFullYear()}`,
          from: from.toISOString().split("T")[0],
          to: to.toISOString().split("T")[0]
        });
      }
    }

    const dataSeries: any[] = [];
    for (const p of periods) {
      if (statement === "income") {
        const is = await this.computeIncomeStatementData(tenantId, p.from, p.to);
        dataSeries.push({
          label: p.label,
          revenue: is.totalRevenue.toNumber(),
          cogs: is.totalCogs.toNumber(),
          grossProfit: is.grossProfit.toNumber(),
          opex: is.totalOpex.toNumber(),
          netProfit: is.netProfit.toNumber()
        });
      } else {
        const bs = await this.computeBalanceSheetData(tenantId, p.to);
        dataSeries.push({
          label: p.label,
          totalAssets: bs.totalAssets.toNumber(),
          currentAssets: bs.currentAssets.toNumber(),
          totalLiabilities: bs.totalLiabilities.toNumber(),
          equity: bs.equity.toNumber()
        });
      }
    }

    // Horizontal changes
    const analysisSeries = dataSeries.map((d, index) => {
      if (index === 0) {
        return { ...d, growthRate: 0, isBase: true };
      }
      const prior = dataSeries[index - 1];
      const getGrowth = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return new Decimal(curr).minus(prev).dividedBy(prev).times(100).round().toNumber();
      };

      if (statement === "income") {
        return {
          ...d,
          revenueGrowth: getGrowth(d.revenue, prior.revenue),
          cogsGrowth: getGrowth(d.cogs, prior.cogs),
          grossProfitGrowth: getGrowth(d.grossProfit, prior.grossProfit),
          netProfitGrowth: getGrowth(d.netProfit, prior.netProfit)
        };
      } else {
        return {
          ...d,
          assetsGrowth: getGrowth(d.totalAssets, prior.totalAssets),
          liabilitiesGrowth: getGrowth(d.totalLiabilities, prior.totalLiabilities),
          equityGrowth: getGrowth(d.equity, prior.equity)
        };
      }
    });

    return { statement, interval, periods: analysisSeries };
  }

  /**
   * 9. Break-Even Analysis
   */
  public static async getBreakEven(tenantId: string, costCenterId?: string) {
    const db = await getDb();
    
    // Fetch all accounts
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    
    // Sum journal lines
    let query: any = db.select().from(journalEntries).where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "Posted")
      )
    );
    if (costCenterId) {
      query = db.select().from(journalEntries).where(
        and(
          eq(journalEntries.tenantId, tenantId),
          eq(journalEntries.status, "Posted"),
          eq(journalEntries.costCenter, costCenterId)
        )
      );
    }
    const entries = await query;
    const entryIds = entries.map((e: any) => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }

    const linesMap = new Map<string, Decimal>();
    for (const l of lines) {
      const cur = linesMap.get(l.accountCode) || new Decimal(0);
      const debit = new Decimal(l.debit || 0);
      const credit = new Decimal(l.credit || 0);
      linesMap.set(l.accountCode, cur.plus(debit).minus(credit));
    }

    let revenueVal = new Decimal(0);
    let variableCosts = new Decimal(0);
    let fixedCosts = new Decimal(0);

    for (const acc of allAccounts) {
      const netChange = linesMap.get(acc.code) || new Decimal(0);
      if (acc.type === "Revenue") {
        revenueVal = revenueVal.plus(netChange.negated()); // Credit - Debit
      } else if (acc.type === "Expense") {
        const expenseVal = netChange; // Debit - Credit
        
        // Custom Heuristic logic for cost types:
        // Variable: COGS, direct hostings, production labor cost
        // Fixed: Salaries/Benefits (50100), general administrative opex, headquarters rent
        const isVariable = acc.code === "50200" || (acc.classification && (acc.classification.includes("تكلفة المبيعات") || acc.classification.includes("متغير")));
        if (isVariable) {
          variableCosts = variableCosts.plus(expenseVal);
        } else {
          fixedCosts = fixedCosts.plus(expenseVal);
        }
      }
    }

    if (revenueVal.isZero()) {
      return {
        applicable: false,
        message: "بيانات غير كافية - لم يتم تسجيل إيرادات مبيعات لتحديد نقطة التعادل بدقة."
      };
    }

    const contributionMargin = revenueVal.minus(variableCosts);
    const contributionMarginRatio = contributionMargin.dividedBy(revenueVal);
    const breakEvenValue = contributionMarginRatio.isZero() ? new Decimal(0) : fixedCosts.dividedBy(contributionMarginRatio);

    return {
      applicable: true,
      revenue: revenueVal.toNumber(),
      fixedCosts: fixedCosts.toNumber(),
      variableCosts: variableCosts.toNumber(),
      contributionMargin: contributionMargin.toNumber(),
      contributionMarginRatio: contributionMarginRatio.toDecimalPlaces(4).toNumber(),
      breakEvenValue: breakEvenValue.round().toNumber(),
      marginOfSafety: revenueVal.gt(breakEvenValue) ? revenueVal.minus(breakEvenValue).toNumber() : 0,
      notes: "تم تصنيف تكاليف البنية التحتية والمبيعات المباشرة كتكاليف متغيرة، والرواتب ومصروفات المقر والمصروفات الإدارية كتكاليف ثابتة."
    };
  }

  /**
   * 10. Altman Z-Score for Bankruptcy Risk
   */
  public static async getAltmanZScore(tenantId: string, asOfDate: string) {
    const bs = await this.computeBalanceSheetData(tenantId, asOfDate);
    
    // X1 = Working Capital / Total Assets
    const wc = bs.currentAssets.minus(bs.currentLiabilities);
    const totalAssets = bs.totalAssets;
    if (totalAssets.isZero()) {
      return { applicable: false, message: "إجمالي أصول الشركة يساوي صفر - غير قادر على حساب نموذج Z-Score." };
    }
    const x1 = wc.dividedBy(totalAssets);

    // X2 = Retained Earnings / Total Assets
    // Find Retained earnings balance (30200)
    const db = await getDb();
    const reAccount = await db.select().from(accounts).where(
      and(eq(accounts.tenantId, tenantId), eq(accounts.code, "30200"))
    );
    const reBalance = reAccount.length > 0 ? new Decimal(reAccount[0].balance || 0) : bs.netIncome;
    const x2 = reBalance.dividedBy(totalAssets);

    // X3 = EBIT / Total Assets
    // We estimate annual EBIT from current year net income
    const is = await this.computeIncomeStatementData(tenantId, `${new Date(asOfDate).getFullYear()}-01-01`, asOfDate);
    const ebit = is.operatingProfit;
    const x3 = ebit.dividedBy(totalAssets);

    // X4 = Book Value of Equity / Total Liabilities
    const totalLiabilities = bs.totalLiabilities;
    const equityBookValue = bs.totalEquity;
    const x4 = totalLiabilities.isZero() ? new Decimal(999) : equityBookValue.dividedBy(totalLiabilities);

    // X5 = Sales / Total Assets
    const sales = is.totalRevenue;
    const x5 = sales.dividedBy(totalAssets);

    // Altman Z-Score formula for private/unlisted industrial/service companies:
    // Z = 1.2 * X1 + 1.4 * X2 + 3.3 * X3 + 0.6 * X4 + 0.999 * X5
    const zScore = new Decimal(1.2).times(x1)
      .plus(new Decimal(1.4).times(x2))
      .plus(new Decimal(3.3).times(x3))
      .plus(new Decimal(0.6).times(x4))
      .plus(new Decimal(0.999).times(x5))
      .toDecimalPlaces(3);

    let zone = "Grey";
    let explanationAr = "الشركة في النطاق المحايد (مخاطر معتدلة).";
    let explanationEn = "The firm is in the grey zone (moderate bankruptcy risk).";

    if (zScore.gt(2.90)) {
      zone = "Safe";
      explanationAr = "الشركة في منطقة الأمان التام. مخاطر التعثر المالي أو الإفلاس منخفضة للغاية بالمدى المنظور.";
      explanationEn = "Firm is in the Safe Zone. Extremely low bankruptcy or financial distress risk.";
    } else if (zScore.lt(1.23)) {
      zone = "Distress";
      explanationAr = "الشركة في منطقة الخطر الحرجة! احتمالية عالية للتعثر المالي والإفلاس في غضون عامين ما لم تُتخذ إجراءات عاجلة.";
      explanationEn = "Firm is in the Distress Zone! High risk of financial insolvency in the next 24 months.";
    }

    return {
      applicable: true,
      zScore: zScore.toNumber(),
      zone,
      explanationAr,
      explanationEn,
      components: {
        x1: x1.toDecimalPlaces(4).toNumber(),
        x2: x2.toDecimalPlaces(4).toNumber(),
        x3: x3.toDecimalPlaces(4).toNumber(),
        x4: x4.toDecimalPlaces(4).toNumber(),
        x5: x5.toDecimalPlaces(4).toNumber()
      },
      rawValues: {
        workingCapital: wc.toNumber(),
        totalAssets: totalAssets.toNumber(),
        retainedEarnings: reBalance.toNumber(),
        ebit: ebit.toNumber(),
        equityBookValue: equityBookValue.toNumber(),
        totalLiabilities: totalLiabilities.toNumber(),
        sales: sales.toNumber()
      }
    };
  }

  /**
   * 11. Debt Aging Report
   */
  public static async getAgingReport(tenantId: string, type: "receivables" | "payables", asOfDate: string) {
    const db = await getDb();
    
    const isReceivables = type === "receivables";
    
    // Fetch all open invoices
    const invoices = isReceivables 
      ? await db.select().from(salesInvoices).where(
          and(
            eq(salesInvoices.tenantId, tenantId),
            lte(salesInvoices.date, asOfDate)
          )
        )
      : await db.select().from(purchaseInvoices).where(
          and(
            eq(purchaseInvoices.tenantId, tenantId),
            lte(purchaseInvoices.date, asOfDate)
          )
        );

    // Sum matching payments for each invoice
    const customerPays = await db.select().from(customerPayments).where(eq(customerPayments.tenantId, tenantId));
    const supplierPays = await db.select().from(supplierPayments).where(eq(supplierPayments.tenantId, tenantId));

    const totalInvoicesSum = invoices.reduce((sum, inv) => sum.plus(new Decimal(inv.totalAmount || 0)), new Decimal(0));

    // Grouping into buckets
    let b0_30 = new Decimal(0);
    let b31_60 = new Decimal(0);
    let b61_90 = new Decimal(0);
    let b90_plus = new Decimal(0);

    const partyBucketsMap = new Map<string, { name: string; b0_30: Decimal; b31_60: Decimal; b61_90: Decimal; b90_plus: Decimal; total: Decimal }>();

    const asOfTime = new Date(asOfDate).getTime();

    for (const inv of invoices) {
      const invAmount = new Decimal(inv.totalAmount || 0);
      
      // Compute paid amount for this invoice reference
      // Standard heuristic: sum payments matching invoiceNumber reference
      let paid = new Decimal(0);
      if (isReceivables) {
        const matches = customerPays.filter(p => p.customerId === (inv as any).customerId && p.reference === inv.invoiceNumber);
        paid = matches.reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0));
      } else {
        const matches = supplierPays.filter(p => p.supplierId === (inv as any).supplierId && p.reference === inv.invoiceNumber);
        paid = matches.reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0));
      }

      const openAmount = invAmount.minus(paid);
      if (openAmount.lte(0)) continue; // Fully paid

      // Calculate days difference
      const invTime = new Date(inv.date).getTime();
      const diffDays = Math.max(0, Math.floor((asOfTime - invTime) / 86400000));

      const partyId = isReceivables ? (inv as any).customerId : (inv as any).supplierId;
      const partyName = isReceivables ? (inv as any).customerName : (inv as any).supplierName;

      const partyObj = partyBucketsMap.get(partyId) || {
        name: partyName,
        b0_30: new Decimal(0),
        b31_60: new Decimal(0),
        b61_90: new Decimal(0),
        b90_plus: new Decimal(0),
        total: new Decimal(0)
      };

      if (diffDays <= 30) {
        b0_30 = b0_30.plus(openAmount);
        partyObj.b0_30 = partyObj.b0_30.plus(openAmount);
      } else if (diffDays <= 60) {
        b31_60 = b31_60.plus(openAmount);
        partyObj.b31_60 = partyObj.b31_60.plus(openAmount);
      } else if (diffDays <= 90) {
        b61_90 = b61_90.plus(openAmount);
        partyObj.b61_90 = partyObj.b61_90.plus(openAmount);
      } else {
        b90_plus = b90_plus.plus(openAmount);
        partyObj.b90_plus = partyObj.b90_plus.plus(openAmount);
      }

      partyObj.total = partyObj.total.plus(openAmount);
      partyBucketsMap.set(partyId, partyObj);
    }

    const partyList = Array.from(partyBucketsMap.entries()).map(([id, val]) => ({
      partyId: id,
      name: val.name,
      b0_30: val.b0_30.toNumber(),
      b31_60: val.b31_60.toNumber(),
      b61_90: val.b61_90.toNumber(),
      b90_plus: val.b90_plus.toNumber(),
      total: val.total.toNumber()
    }));

    const grandTotal = b0_30.plus(b31_60).plus(b61_90).plus(b90_plus);

    return {
      type,
      asOfDate,
      totals: {
        b0_30: b0_30.toNumber(),
        b31_60: b31_60.toNumber(),
        b61_90: b61_90.toNumber(),
        b90_plus: b90_plus.toNumber(),
        grandTotal: grandTotal.toNumber()
      },
      partyAging: partyList
    };
  }

  /**
   * 12. Cost & Profit Center Profitability
   */
  public static async getCostCenterProfitability(tenantId: string, fromDate: string, toDate: string) {
    const db = await getDb();
    
    const listCostCenters = await db.select().from(costCenters).where(eq(costCenters.tenantId, tenantId));
    const listProfitCenters = await db.select().from(profitCenters).where(eq(profitCenters.tenantId, tenantId));
    const allAccounts = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));

    // Get journal lines within range
    const entries = await db.select().from(journalEntries).where(
      and(
        eq(journalEntries.tenantId, tenantId),
        eq(journalEntries.status, "Posted"),
        gte(journalEntries.date, fromDate),
        lte(journalEntries.date, toDate)
      )
    );

    const entryIds = entries.map(e => e.id);
    let lines: any[] = [];
    if (entryIds.length > 0) {
      lines = await db.select().from(journalLines).where(eq(journalLines.tenantId, tenantId));
      const entryIdSet = new Set(entryIds);
      lines = lines.filter(l => entryIdSet.has(l.entryId));
    }

    const costCenterData = new Map<string, { debit: Decimal; credit: Decimal }>();
    const profitCenterData = new Map<string, { debit: Decimal; credit: Decimal }>();

    for (const l of lines) {
      const ent = entries.find(e => e.id === l.entryId);
      if (!ent) continue;

      if (ent.costCenter) {
        const cur = costCenterData.get(ent.costCenter) || { debit: new Decimal(0), credit: new Decimal(0) };
        cur.debit = cur.debit.plus(new Decimal(l.debit || 0));
        cur.credit = cur.credit.plus(new Decimal(l.credit || 0));
        costCenterData.set(ent.costCenter, cur);
      }

      if (ent.profitCenter) {
        const cur = profitCenterData.get(ent.profitCenter) || { debit: new Decimal(0), credit: new Decimal(0) };
        cur.debit = cur.debit.plus(new Decimal(l.debit || 0));
        cur.credit = cur.credit.plus(new Decimal(l.credit || 0));
        profitCenterData.set(ent.profitCenter, cur);
      }
    }

    const ccReport = listCostCenters.map(cc => {
      const accum = costCenterData.get(cc.id) || { debit: new Decimal(0), credit: new Decimal(0) };
      // Cost center typically tracks expenses (Debit - Credit)
      const actualSpent = accum.debit.minus(accum.credit);
      const budget = new Decimal(cc.budget || 0);
      const variance = budget.minus(actualSpent);
      return {
        id: cc.id,
        name: cc.name,
        budget: budget.toNumber(),
        spent: actualSpent.toNumber(),
        variance: variance.toNumber(),
        status: variance.lt(0) ? "OverBudget" : "WithinBudget"
      };
    });

    const pcReport = listProfitCenters.map(pc => {
      const accum = profitCenterData.get(pc.id) || { debit: new Decimal(0), credit: new Decimal(0) };
      // Profit center tracks net income (Credit - Debit for revenues, Debit - Credit for expenses)
      // For simple aggregation, let's treat credit as revenue inflow and debit as expense outflow
      const actualProfit = accum.credit.minus(accum.debit);
      const target = new Decimal(pc.target || 0);
      const variance = actualProfit.minus(target);
      return {
        id: pc.id,
        name: pc.name,
        target: target.toNumber(),
        actual: actualProfit.toNumber(),
        variance: variance.toNumber(),
        status: variance.lt(0) ? "BelowTarget" : "AchievedTarget"
      };
    });

    return {
      fromDate,
      toDate,
      costCenters: ccReport,
      profitCenters: pcReport
    };
  }
}
