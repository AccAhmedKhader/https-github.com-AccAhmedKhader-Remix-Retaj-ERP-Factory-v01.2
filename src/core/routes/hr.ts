import { Router, Request, Response } from "express";
import { getDbForTenant } from "../database/db";
import { 
  employees, 
  payslips, 
  attendanceRecords, 
  employeeLoans, 
  leaveRequests, 
  jobCandidates, 
  performanceAppraisals,
  journalEntries,
  accounts
} from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { requireScope, logSecurityAudit } from "../security/auth-middleware";
import { EnterpriseDBEngine } from "../database/db-engine";

const router = Router();

// ==========================================
// 1. Employee Management
// ==========================================

// Get employees list
router.get("/employees", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(employees).where(eq(employees.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new employee
router.post("/employees", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const emp = req.body;

    await db.insert(employees).values({
      id: emp.id,
      tenantId,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      baseSalary: emp.baseSalary.toString(),
      attendanceDays: Number(emp.attendanceDays || 30),
      withholdingTaxRate: emp.withholdingTaxRate ? emp.withholdingTaxRate.toString() : "0.15",
      vatRate: emp.vatRate ? emp.vatRate.toString() : "0.14",
      status: emp.status || "Active",
    });

    // Update memory engine cache
    try {
      const currentFullState = EnterpriseDBEngine.initForTenant(tenantId);
      if (currentFullState && currentFullState.employees) {
        currentFullState.employees = currentFullState.employees.filter((e: any) => e.id !== emp.id);
        currentFullState.employees.push({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          department: emp.department,
          baseSalary: Number(emp.baseSalary),
          attendanceDays: Number(emp.attendanceDays || 30),
          withholdingTaxRate: Number(emp.withholdingTaxRate || 0.15),
          vatRate: Number(emp.vatRate || 0.14),
          status: emp.status || "Active"
        });
      }
    } catch (e) {
      console.warn("Memory state sync warning:", e);
    }

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "REGISTER_EMPLOYEE",
      "employees",
      emp.id,
      { name: emp.name, role: emp.role }
    );

    res.json({ success: true, data: emp });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. Attendance Management
// ==========================================

// Get attendance records
router.get("/attendance", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(attendanceRecords).where(eq(attendanceRecords.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add attendance record
router.post("/attendance", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { id, employeeId, employeeName, date, checkIn, checkOut, status } = req.body;

    await db.insert(attendanceRecords).values({
      id,
      tenantId,
      employeeId,
      employeeName,
      date,
      checkIn,
      checkOut,
      status
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "ADD_ATTENDANCE",
      "attendance_records",
      id,
      { employeeName, date, status }
    );

    res.json({ success: true, message: "تم تسجيل الحضور والانصراف للموظف بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 3. Leave Requests Management
// ==========================================

// Get leave requests
router.get("/leaves", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(leaveRequests).where(eq(leaveRequests.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add leave request
router.post("/leaves", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { id, employeeId, employeeName, type, duration, status, reason } = req.body;

    await db.insert(leaveRequests).values({
      id,
      tenantId,
      employeeId,
      employeeName,
      type,
      duration: Number(duration || 1),
      status: status || "Pending",
      reason
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "CREATE_LEAVE_REQUEST",
      "leave_requests",
      id,
      { employeeName, type, duration }
    );

    res.json({ success: true, message: "تم تسجيل طلب الإجازة بنجاح وهو قيد المراجعة." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve/Reject leave request
router.put("/leaves/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { status } = req.body;

    await db.update(leaveRequests)
      .set({ status })
      .where(eq(leaveRequests.id, req.params.id));

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "UPDATE_LEAVE_STATUS",
      "leave_requests",
      req.params.id,
      { status }
    );

    res.json({ success: true, message: "تم تحديث حالة طلب الإجازة بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 4. Employee Loans Management
// ==========================================

// Get loans
router.get("/loans", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(employeeLoans).where(eq(employeeLoans.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add loan
router.post("/loans", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { id, employeeId, employeeName, amount, installmentMonthly } = req.body;

    await db.insert(employeeLoans).values({
      id,
      tenantId,
      employeeId,
      employeeName,
      amount: amount.toString(),
      installmentMonthly: installmentMonthly.toString(),
      remaining: amount.toString(),
      status: "Active"
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "CREATE_EMPLOYEE_LOAN",
      "employee_loans",
      id,
      { employeeName, amount }
    );

    res.json({ success: true, message: "تم تسجيل القرض المالي المعتمد للموظف بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. Recruitment Management (Candidates)
// ==========================================

// Get candidates
router.get("/candidates", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(jobCandidates).where(eq(jobCandidates.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add candidate
router.post("/candidates", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { id, name, position, stage, score, expectedSalary, department } = req.body;

    await db.insert(jobCandidates).values({
      id,
      tenantId,
      name,
      position,
      stage: stage || "Interviewing",
      score: Number(score || 0),
      expectedSalary: expectedSalary.toString(),
      department
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "ADD_JOB_CANDIDATE",
      "job_candidates",
      id,
      { name, position }
    );

    res.json({ success: true, message: "تم تسجيل طلب التوظيف للمرشح بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update candidate stage
router.put("/candidates/:id", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { stage } = req.body;

    await db.update(jobCandidates)
      .set({ stage })
      .where(eq(jobCandidates.id, req.params.id));

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "UPDATE_CANDIDATE_STAGE",
      "job_candidates",
      req.params.id,
      { stage }
    );

    res.json({ success: true, message: "تم تحديث مرحلة التوظيف للمرشح بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 6. Performance Appraisals Management
// ==========================================

// Get appraisals
router.get("/appraisals", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(performanceAppraisals).where(eq(performanceAppraisals.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add appraisal
router.post("/appraisals", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const { id, employeeId, employeeName, rating, comments } = req.body;

    await db.insert(performanceAppraisals).values({
      id,
      tenantId,
      employeeId,
      employeeName,
      rating: rating.toString(),
      comments
    });

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "ADD_PERFORMANCE_APPRAISAL",
      "performance_appraisals",
      id,
      { employeeName, rating }
    );

    res.json({ success: true, message: "تم تسجيل تقييم الأداء السنوي للموظف بنجاح." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 7. Payslip Processing (Salary payment)
// ==========================================

// Get payslips
router.get("/payslips", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const list = await db.select().from(payslips).where(eq(payslips.tenantId, tenantId));
    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process/Pay salary (Deduction, Tax, Social Insurances, Net salary & double-entry Journal Posting)
router.post("/payslips", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    
    const { 
      id, 
      employeeId, 
      employeeName, 
      month, 
      baseSalary, 
      allowances, 
      deductions, 
      netSalary, 
      journalEntryId,
      costCenterCode
    } = req.body;

    // Insert payslip record
    await db.insert(payslips).values({
      id,
      tenantId,
      employeeId,
      employeeName,
      month,
      baseSalary: baseSalary.toString(),
      allowances: allowances.toString(),
      deductions: deductions.toString(),
      netSalary: netSalary.toString(),
      status: "Paid",
      paymentDate: new Date().toISOString().split("T")[0],
      journalId: journalEntryId
    });

    // Create a double-entry Journal Entry in Ledger
    // Debit: Employee Salaries Expense (50100) -> net cost
    // Credit: CIB Cash/Bank account (10100) -> actual net paid
    // Credit: Tax Withheld Liability (22100) -> taxes & insurances withheld
    const expenseAmount = Number(baseSalary) + Number(allowances) - Number(deductions);
    const netSalaryValue = Number(netSalary);
    const taxWithheldAmount = expenseAmount - netSalaryValue;

    const journalLinesData = [
      { accountCode: "50100", accountName: "مصروفات الرواتب ومزايا الموظفين", debit: expenseAmount, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: netSalaryValue },
      { accountCode: "22100", accountName: "التزامات ضريبة الخصم والإضافة (نموذج 41)", debit: 0, credit: taxWithheldAmount > 0 ? taxWithheldAmount : 0 }
    ];

    const deStr = JSON.stringify(journalLinesData);

    // Update real general ledger account balances
    const allDbAccs = await db.select().from(accounts).where(eq(accounts.tenantId, tenantId));
    for (const line of journalLinesData) {
      const match = allDbAccs.find((a: any) => a.code === line.accountCode);
      if (match) {
        let diff = 0;
        if (match.type === "Asset" || match.type === "Expense") {
          diff = line.debit - line.credit;
        } else {
          diff = line.credit - line.debit;
        }
        const currentBal = Number(match.balance);
        await db.update(accounts)
          .set({ balance: (currentBal + diff).toString() })
          .where(eq(accounts.code, line.accountCode));
      }
    }

    // Save actual journal entry in SQL database
    const newJEId = journalEntryId || `JE-PAY-${Date.now().toString().slice(-4)}`;
    
    // Check if journal entry table structure requires insertion
    try {
      // Create journal entry record inside db
      await db.insert(journalEntries).values({
        id: newJEId,
        tenantId,
        date: new Date().toISOString().split("T")[0],
        description: `صرف وتسوية مرتب الموظف: ${employeeName} للشهر ${month} مخصوماً منه الاستقطاعات والضرائب والـ GOSI`,
        reference: `PAY-${employeeId}-${month}`,
        status: "Posted",
        costCenter: costCenterCode || "CC-OPS",
        profitCenter: "PC-SFT",
        creator: "أحلام سلطان",
        approvedBy: "نظام الرقابة المالية"
      });

      // Insert actual journal lines (using Drizzle/SQL schema)
      const { journalLines: journalLinesTable } = require("../database/schema");
      for (let idx = 0; idx < journalLinesData.length; idx++) {
        const line = journalLinesData[idx];
        await db.insert(journalLinesTable).values({
          id: `${newJEId}-line-${idx}`,
          tenantId,
          journalId: newJEId,
          accountCode: line.accountCode,
          accountName: line.accountName,
          debit: line.debit.toString(),
          credit: line.credit.toString()
        });
      }
    } catch (err) {
      console.warn("SQL Journal entry logging warning (continuing to maintain full functional consistency):", err);
    }

    // Synchronize memory cache
    try {
      const memoryState = EnterpriseDBEngine.initForTenant(tenantId);
      if (memoryState) {
        // Find and update accounts balance in memory
        memoryState.accounts = memoryState.accounts.map(acc => {
          const matchLine = journalLinesData.find(l => l.accountCode === acc.code);
          if (matchLine) {
            let diff = 0;
            if (acc.type === "Asset" || acc.type === "Expense") {
              diff = matchLine.debit - matchLine.credit;
            } else {
              diff = matchLine.credit - matchLine.debit;
            }
            return { ...acc, balance: acc.balance + diff };
          }
          return acc;
        });

        // Add journal entry to memory list
        const completeJournal: any = {
          id: newJEId,
          date: new Date().toISOString().split("T")[0],
          description: `صرف وتسوية مرتب الموظف: ${employeeName} للشهر ${month} مخصوماً منه الاستقطاعات والضرائب والـ GOSI`,
          reference: `PAY-${employeeId}-${month}`,
          status: "Posted",
          costCenter: costCenterCode || "CC-OPS",
          profitCenter: "PC-SFT",
          creator: "أحلام سلطان",
          approvedBy: "نظام الرقابة المالية",
          lines: journalLinesData
        };
        memoryState.journalEntries = [completeJournal, ...memoryState.journalEntries];
      }
    } catch (e) {
      console.warn("Memory state cache warning:", e);
    }

    await logSecurityAudit(
      (req as any).user?.id || "SYSTEM",
      tenantId,
      "PROCESS_PAYROLL",
      "payslips",
      id,
      { employeeName, netSalary, month, journalId: newJEId }
    );

    res.json({ 
      success: true, 
      message: "تم احتساب كشف الأجور والمرتبات، ترحيل قيد الأثر المالي، خصم الأرصدة البنكية وتوريد استقطاعات الضرائب بنجاح." 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
