import { Router, Request, Response } from "express";
import { AccountingRepository } from "../database/repositories/AccountingRepository";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";
import { JournalEntry } from "../../types";

const router = Router();

// 1. Get Journal Entries
router.get("/journal-entries", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const entries = await AccountingRepository.getJournalEntries(tenantId);
    res.json({ success: true, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Post Journal Entry (with Double-Entry balance check)
router.post("/journal-entries", requireScope("accounting:post"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const entry: JournalEntry = req.body;

    // Validate double-entry balance
    const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        error: "JOURNAL_UNBALANCED",
        message: `القيد غير متزن رياضياً! إجمالي المدين [${totalDebit}] لا يتساوى مع الدائن [${totalCredit}].`
      });
    }

    await AccountingRepository.createJournalEntry(entry, tenantId);
    res.json({ success: true, message: "تم ترحيل القيد بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Update Journal Entry with Optimistic Locking
router.put("/journal-entries/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
  const entry = req.body;
  entry.id = req.params.id;

  try {
    await AccountingRepository.updateJournalEntry(entry, tenantId);
    res.json({ success: true, message: "تم تحديث القيد المحاسبي بنجاح." });
  } catch (error: any) {
    if (error.message === "CANNOT_MODIFY_POSTED_JOURNAL") {
      return res.status(400).json({
        success: false,
        error: "CANNOT_MODIFY_POSTED_JOURNAL",
        message: "لا يمكن تعديل قيد محاسبي تم ترحيله بالفعل (Posted)."
      });
    }
    if (error.message === "CONCURRENT_WRITE_CONFLICT") {
      await logSecurityAudit(
        (req as any).user?.id || "SYSTEM",
        tenantId,
        "CONCURRENT_WRITE_CONFLICT",
        "journal_entries",
        req.params.id,
        { conflictOnUpdate: entry }
      );
      return res.status(409).json({
        success: false,
        error: "CONCURRENT_WRITE_CONFLICT",
        message: "تعارض في الكتابة المتزامنة! تم تعديل هذا السجل بواسطة مستخدم آخر."
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get Cheques
router.get("/cheques", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const chequesList = await AccountingRepository.getCheques(tenantId);
    res.json({ success: true, data: chequesList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Update Cheque with Optimistic Locking
router.put("/cheques/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
  const cheque = req.body;
  cheque.id = req.params.id;

  try {
    await AccountingRepository.updateCheque(cheque, tenantId);
    res.json({ success: true, message: "تم تحديث حالة الشيك بنجاح." });
  } catch (error: any) {
    if (error.message === "CONCURRENT_WRITE_CONFLICT") {
      await logSecurityAudit(
        (req as any).user?.id || "SYSTEM",
        tenantId,
        "CONCURRENT_WRITE_CONFLICT",
        "cheques",
        req.params.id,
        { conflictOnUpdate: cheque }
      );
      return res.status(409).json({
        success: false,
        error: "CONCURRENT_WRITE_CONFLICT",
        message: "تعارض في الكتابة المتزامنة! تم تعديل هذا الشيك بواسطة مستخدم آخر."
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================================================
// 6. IAS 7 - Mapping Engine API Endpoints
// ==========================================================================

// GET all cash flow mappings
router.get("/cash-flow-mappings", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const mappings = await AccountingRepository.getCashFlowMappings(tenantId);
    res.json({ success: true, data: mappings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST (upsert) a cash flow mapping
router.post("/cash-flow-mappings", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const mapping = req.body; // { accountCode, activityType, categoryName }
    if (!mapping.accountCode || !mapping.activityType || !mapping.categoryName) {
      return res.status(400).json({ success: false, error: "بيانات التوزيع غير مكتملة" });
    }
    await AccountingRepository.upsertCashFlowMapping(mapping, tenantId);
    res.json({ success: true, message: "تم تحديث تصنيف التدفق النقدي للحساب بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================================================
// 7. IAS 7 & IAS 1 - Financial Statements Generators
// ==========================================================================

// GET Statement of Cash Flows (IAS 7) - Direct & Indirect Methods
router.get("/reports/cash-flows", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    
    // 1. Fetch live data
    const accounts = await AccountingRepository.getAccounts(tenantId);
    const entries = await AccountingRepository.getJournalEntries(tenantId);
    const mappings = await AccountingRepository.getCashFlowMappings(tenantId);

    // Create lookup maps
    const mappingMap = new Map(mappings.map((m: any) => [m.accountCode, m]));
    const accountMap = new Map(accounts.map((a: any) => [a.code, a]));

    const isCashEquivalent = (code: string) => {
      const m = mappingMap.get(code);
      if (m) return m.activityType === "CashEquivalent";
      // fallback
      return ["10100", "10200", "10300"].includes(code);
    };

    // Calculate opening and closing cash
    let openingCash = 0;
    let closingCash = 0;
    for (const acc of accounts) {
      if (isCashEquivalent(acc.code)) {
        openingCash += Number(acc.initialBalance || 0);
        closingCash += Number(acc.balance || 0);
      }
    }
    const netIncrease = closingCash - openingCash;

    // --- DIRECT METHOD ---
    const directOperating: Record<string, number> = {};
    const directInvesting: Record<string, number> = {};
    const directFinancing: Record<string, number> = {};

    const addDirectFlow = (code: string, amount: number) => {
      const m = mappingMap.get(code);
      const activityType = m?.activityType || (accountMap.get(code)?.type === "Revenue" || accountMap.get(code)?.type === "Expense" ? "Operating" : "Investing");
      const categoryName = m?.categoryName || accountMap.get(code)?.name || "نقدية أخرى";

      if (activityType === "Operating") {
        directOperating[categoryName] = (directOperating[categoryName] || 0) + amount;
      } else if (activityType === "Investing") {
        directInvesting[categoryName] = (directInvesting[categoryName] || 0) + amount;
      } else if (activityType === "Financing") {
        directFinancing[categoryName] = (directFinancing[categoryName] || 0) + amount;
      }
    };

    for (const entry of entries) {
      const cashLines = entry.lines.filter((l: any) => isCashEquivalent(l.accountCode));
      const netCash = cashLines.reduce((sum: number, l: any) => sum + (Number(l.debit || 0) - Number(l.credit || 0)), 0);
      if (Math.abs(netCash) < 0.01) continue;

      const nonCashLines = entry.lines.filter((l: any) => !isCashEquivalent(l.accountCode));
      if (nonCashLines.length === 0) continue;

      if (netCash > 0) {
        // Cash Inflow: allocate among opposing credit lines
        const opposingCredits = nonCashLines.filter((l: any) => Number(l.credit || 0) > 0);
        const totalCredits = opposingCredits.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
        if (totalCredits > 0) {
          for (const l of opposingCredits) {
            const fraction = Number(l.credit || 0) / totalCredits;
            addDirectFlow(l.accountCode, netCash * fraction);
          }
        } else {
          // fallback apportionment
          const totalAmt = nonCashLines.reduce((sum: number, l: any) => sum + Math.abs(Number(l.debit || 0) - Number(l.credit || 0)), 0);
          for (const l of nonCashLines) {
            const fraction = Math.abs(Number(l.debit || 0) - Number(l.credit || 0)) / totalAmt;
            addDirectFlow(l.accountCode, netCash * fraction);
          }
        }
      } else {
        // Cash Outflow: allocate among opposing debit lines
        const opposingDebits = nonCashLines.filter((l: any) => Number(l.debit || 0) > 0);
        const totalDebits = opposingDebits.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
        if (totalDebits > 0) {
          for (const l of opposingDebits) {
            const fraction = Number(l.debit || 0) / totalDebits;
            addDirectFlow(l.accountCode, netCash * fraction); // netCash is negative
          }
        } else {
          // fallback
          const totalAmt = nonCashLines.reduce((sum: number, l: any) => sum + Math.abs(Number(l.debit || 0) - Number(l.credit || 0)), 0);
          for (const l of nonCashLines) {
            const fraction = Math.abs(Number(l.debit || 0) - Number(l.credit || 0)) / totalAmt;
            addDirectFlow(l.accountCode, netCash * fraction);
          }
        }
      }
    }

    const formatRecord = (rec: Record<string, number>) => {
      return Object.entries(rec).map(([category, amount]) => ({ category, amount }));
    };

    // --- INDIRECT METHOD ---
    // 1. Calculate Net Profit/Loss
    let revenues = 0;
    let expenses = 0;
    for (const acc of accounts) {
      if (acc.type === "Revenue") revenues += Number(acc.balance || 0);
      if (acc.type === "Expense") expenses += Number(acc.balance || 0);
    }
    const netProfit = revenues - expenses;

    // 2. Non-Cash adjustments (Depreciation starting with 50400 or named إهلاك)
    let depreciation = 0;
    for (const acc of accounts) {
      if (acc.code === "50400" || acc.name.includes("إهلاك")) {
        depreciation += Number(acc.balance || 0);
      }
    }

    // 3. Working Capital Deltas
    let receivablesDelta = 0;
    let inventoryDelta = 0;
    let payablesDelta = 0;

    for (const acc of accounts) {
      if (acc.code === "11000" || acc.name.includes("العملاء")) {
        receivablesDelta += (Number(acc.balance || 0) - Number(acc.initialBalance || 0));
      }
      if (acc.code.startsWith("12") || acc.name.includes("مخزون")) {
        inventoryDelta += (Number(acc.balance || 0) - Number(acc.initialBalance || 0));
      }
      if (acc.code === "20100" || acc.name.includes("الموردون")) {
        payablesDelta += (Number(acc.balance || 0) - Number(acc.initialBalance || 0));
      }
    }

    // Cash flow deltas effect
    // Increase in receivable is a cash outflow
    // Increase in inventory is a cash outflow
    // Increase in payable is a cash inflow
    const workingCapitalAdjustments = [
      { name: "التغير في ذمم العملاء والأوراق التجارية", amount: -receivablesDelta },
      { name: "التغير في المخزون السلعي والمواد الخام", amount: -inventoryDelta },
      { name: "التغير في ذمم الموردين والأوراق الدائنة", amount: payablesDelta }
    ];

    const indirectOperatingCash = netProfit + depreciation + workingCapitalAdjustments.reduce((sum, item) => sum + item.amount, 0);

    // Investing activities deltas (Fixed Assets change)
    let fixedAssetsDelta = 0;
    for (const acc of accounts) {
      if (acc.code.startsWith("104") || acc.name.includes("الأصول الثابتة")) {
        fixedAssetsDelta += (Number(acc.balance || 0) - Number(acc.initialBalance || 0));
      }
    }
    const indirectInvesting = [
      { category: "شراء/استبعاد أصول ثابتة ومعدات", amount: -fixedAssetsDelta }
    ];

    // Financing activities deltas (Capital, loans, etc.)
    let capitalDelta = 0;
    for (const acc of accounts) {
      if (acc.code === "30100" || acc.name.includes("رأس المال")) {
        capitalDelta += (Number(acc.balance || 0) - Number(acc.initialBalance || 0));
      }
    }
    const indirectFinancing = [
      { category: "التغير في رأس المال المدفوع", amount: capitalDelta }
    ];

    res.json({
      success: true,
      data: {
        openingCash,
        closingCash,
        netIncrease,
        direct: {
          operating: formatRecord(directOperating),
          investing: formatRecord(directInvesting),
          financing: formatRecord(directFinancing)
        },
        indirect: {
          netProfit,
          adjustments: [
            { name: "إهلاك الأصول الثابتة والاطفاء", amount: depreciation }
          ],
          workingCapital: workingCapitalAdjustments,
          operatingCash: indirectOperatingCash,
          investing: indirectInvesting,
          financing: indirectFinancing
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Statement of Changes in Equity (IAS 1)
router.get("/reports/changes-in-equity", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    
    // Fetch accounts and journal entries
    const accounts = await AccountingRepository.getAccounts(tenantId);
    const entries = await AccountingRepository.getJournalEntries(tenantId);

    // Identify equity accounts
    const equityAccounts = accounts.filter(acc => acc.type === "Equity");

    // Reconstruct Period Net Profit
    let revenues = 0;
    let expenses = 0;
    for (const acc of accounts) {
      if (acc.type === "Revenue") revenues += Number(acc.balance || 0);
      if (acc.type === "Expense") expenses += Number(acc.balance || 0);
    }
    const netProfit = revenues - expenses;

    // Construct high-fidelity IAS 1 equity lines
    const equityReport = equityAccounts.map(acc => {
      const isRetainedEarnings = acc.code === "30200" || acc.name.includes("الأرباح المحتجزة") || acc.name.includes("المبقاة");
      
      const openingBalance = acc.initialBalance || 0;
      const netIncomeAllocated = isRetainedEarnings ? netProfit : 0;
      
      // Separate additions and reductions by scanning journal entries for this account
      let additions = 0; // Credits
      let reductions = 0; // Debits

      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode === acc.code) {
            // Under credit increase rules, a credit to capital is an addition, debit is a reduction
            const deb = Number(line.debit || 0);
            const cred = Number(line.credit || 0);
            if (cred > 0) additions += cred;
            if (deb > 0) reductions += deb;
          }
        }
      }

      // If it's Retained Earnings, netProfit is already part of the final balance,
      // so the closing balance equals: opening + netProfit + additions - reductions.
      const closingBalance = acc.balance || 0;

      return {
        accountCode: acc.code,
        accountName: acc.name,
        openingBalance,
        netIncome: netIncomeAllocated,
        additions,
        reductions,
        closingBalance
      };
    });

    res.json({
      success: true,
      data: equityReport
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
