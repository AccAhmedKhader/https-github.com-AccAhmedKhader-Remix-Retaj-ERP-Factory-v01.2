import React, { useState, useEffect } from "react";
import { 
  Users, 
  FileText, 
  Percent, 
  Calendar, 
  ShieldAlert, 
  CheckCircle,
  Building,
  Printer,
  ChevronRight,
  CreditCard,
  CheckCircle2,
  Clock,
  Briefcase,
  Award,
  CircleDollarSign,
  UserPlus,
  Trash2,
  FilePlus,
  Sparkles,
  DollarSign,
  Check,
  X
} from "lucide-react";
import { Employee, ERPConfig, ChartOfAccount, JournalEntry } from "../types";

interface HRModuleProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  config: ERPConfig;
}

export default function HRModule({
  employees = [],
  setEmployees,
  accounts = [],
  setAccounts,
  journalEntries = [],
  setJournalEntries,
  config
 }: HRModuleProps) {
  const [activeTab, setActiveTab] = useState<"payroll" | "attendance" | "recruitment" | "performance" | "loans">("payroll");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(employees[0] || null);
  const [paidEmployees, setPaidEmployees] = useState<string[]>([]);
  const [paySuccessMsg, setPaySuccessMsg] = useState("");
  
  // UI States
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmpSuccessMsg, setNewEmpSuccessMsg] = useState("");

  // New Employee Form States
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empDept, setEmpDept] = useState("البحث والتطوير");
  const [empSalary, setEmpSalary] = useState(15000);
  const [empAttendance, setEmpAttendance] = useState(30);
  const [empTaxRate, setEmpTaxRate] = useState(0.10);
  const [empStatus, setEmpStatus] = useState<"Active" | "On Leave" | "Suspended">("Active");

  // Advanced HR sub-modules states
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([
    { employeeId: "EMP-01", name: "صالح محمود", date: "2026-07-09", checkIn: "08:58", checkOut: "17:05", status: "OnTime" },
    { employeeId: "EMP-02", name: "هدى عبد الرحمن", date: "2026-07-09", checkIn: "09:12", checkOut: "17:00", status: "Late" },
    { employeeId: "EMP-03", name: "سامر البرغوثي", date: "2026-07-09", checkIn: "09:00", checkOut: "17:15", status: "OnTime" }
  ]);

  // Attendance Form States
  const [attEmpId, setAttEmpId] = useState(employees[0]?.id || "EMP-01");
  const [attCheckIn, setAttCheckIn] = useState("09:00");
  const [attCheckOut, setAttCheckOut] = useState("17:00");
  const [attStatus, setAttStatus] = useState("OnTime");

  const [leaveRequests, setLeaveRequests] = useState<any[]>([
    { id: "LR-101", employeeId: "EMP-01", employeeName: "صالح محمود", type: "Annual", duration: 3, status: "Approved", reason: "إجازة عائلية سنوية" },
    { id: "LR-102", employeeId: "EMP-02", employeeName: "هدى عبد الرحمن", type: "Sick", duration: 1, status: "Pending", reason: "وعكة صحية طارئة" }
  ]);

  const [candidates, setCandidates] = useState<any[]>([
    { id: "CAND-01", name: "هاني سلامة", position: "Senior React Developer", stage: "Interviewing", score: 85, expectedSalary: 25000, dept: "البحث والتطوير" },
    { id: "CAND-02", name: "ميادة الشريف", position: "HR Specialist", stage: "Offered", score: 92, expectedSalary: 14000, dept: "الموارد البشرية" }
  ]);

  const [newCandName, setNewCandName] = useState("");
  const [newCandPos, setNewCandPos] = useState("Senior React Developer");
  const [newCandSalary, setNewCandSalary] = useState(20000);
  const [newCandDept, setNewCandDept] = useState("البحث والتطوير");

  const [appraisals, setAppraisals] = useState<any[]>([
    { employeeId: "EMP-01", name: "صالح محمود", rating: 4.8, comments: "أداء متميز وتفانٍ مستمر في تطوير البنية التحتية" },
    { employeeId: "EMP-02", name: "هدى عبد الرحمن", rating: 4.2, comments: "التزام رائع مع تحسين مستمر لمعدلات الاستقطاب والتعيين" }
  ]);

  // Appraisal Form States
  const [appEmpId, setAppEmpId] = useState(employees[0]?.id || "EMP-01");
  const [appRating, setAppRating] = useState(4.5);
  const [appComments, setAppComments] = useState("");

  const [loans, setLoans] = useState<any[]>([
    { id: "LN-001", employeeId: "EMP-01", employeeName: "صالح محمود", amount: 12000, installmentMonthly: 1000, remaining: 8000, status: "Active" }
  ]);

  const [newLoanEmpId, setNewLoanEmpId] = useState(employees[0]?.id || "EMP-01");
  const [newLoanAmount, setNewLoanAmount] = useState(10000);
  const [newLoanInstallment, setNewLoanInstallment] = useState(1000);

  // Load from backend on mount
  useEffect(() => {
    fetch("/api/v1/hr/attendance")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setAttendanceRecords(res.data.map((a: any) => ({
            employeeId: a.employeeId,
            name: a.employeeName,
            date: a.date,
            checkIn: a.checkIn,
            checkOut: a.checkOut,
            status: a.status
          })));
        }
      }).catch(err => console.warn("Could not fetch attendance, using fallback:", err));

    fetch("/api/v1/hr/leaves")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setLeaveRequests(res.data);
        }
      }).catch(err => console.warn("Could not fetch leaves, using fallback:", err));

    fetch("/api/v1/hr/candidates")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setCandidates(res.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            position: c.position,
            stage: c.stage,
            score: c.score,
            expectedSalary: Number(c.expectedSalary),
            dept: c.department
          })));
        }
      }).catch(err => console.warn("Could not fetch candidates, using fallback:", err));

    fetch("/api/v1/hr/appraisals")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setAppraisals(res.data.map((a: any) => ({
            employeeId: a.employeeId,
            name: a.employeeName,
            rating: Number(a.rating),
            comments: a.comments
          })));
        }
      }).catch(err => console.warn("Could not fetch appraisals, using fallback:", err));

    fetch("/api/v1/hr/loans")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setLoans(res.data.map((l: any) => ({
            id: l.id,
            employeeId: l.employeeId,
            employeeName: l.employeeName,
            amount: Number(l.amount),
            installmentMonthly: Number(l.installmentMonthly),
            remaining: Number(l.remaining),
            status: l.status
          })));
        }
      }).catch(err => console.warn("Could not fetch loans, using fallback:", err));

    fetch("/api/v1/hr/payslips")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          const paidIds = res.data.map((p: any) => p.employeeId);
          setPaidEmployees(paidIds);
        }
      }).catch(err => console.warn("Could not fetch payslips, using fallback:", err));
  }, []);

  // Update form dropdown dependencies
  useEffect(() => {
    if (employees && employees.length > 0) {
      if (!attEmpId) setAttEmpId(employees[0].id);
      if (!appEmpId) setAppEmpId(employees[0].id);
      if (!newLoanEmpId) setNewLoanEmpId(employees[0].id);
    }
  }, [employees]);

  // 1. Register Employee Handler
  const handleRegisterEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empRole) return;

    const nextId = `EMP-0${Date.now().toString().slice(-4)}`;
    const newEmployee: Employee = {
      id: nextId,
      name: empName,
      role: empRole,
      department: empDept,
      baseSalary: empSalary,
      attendanceDays: empAttendance,
      withholdingTaxRate: empTaxRate,
      vatRate: 0.14,
      status: empStatus
    };

    setEmployees([...employees, newEmployee]);
    setSelectedEmp(newEmployee);
    setNewEmpSuccessMsg(`تم تسجيل الموظف الجديد (${empName}) بنجاح وإدراجه في كشوف الرواتب والعمليات.`);
    
    // Save to server database
    fetch("/api/v1/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEmployee)
    }).catch(err => console.error("Error saving employee to DB:", err));

    // Reset Form
    setEmpName("");
    setEmpRole("");
    setEmpSalary(15000);
    setEmpAttendance(30);
    setEmpTaxRate(0.10);
    setEmpStatus("Active");
    setShowAddEmployeeForm(false);

    // Clear alert after 5 seconds
    setTimeout(() => {
      setNewEmpSuccessMsg("");
    }, 5000);
  };

  // 2. Pay Salary Action
  const handlePaySalary = (emp: Employee) => {
    if (paidEmployees.includes(emp.id)) return;

    const calc = getPayrollCalculation(emp);
    const expenseAmount = calc.base - calc.attendanceDeduction;
    const taxWithheldAmount = calc.withholdingTax + calc.socialInsurance;
    const journalEntryId = `JE-PAY-${Date.now().toString().slice(-4)}`;

    const journalLines = [
      { accountCode: "50100", accountName: "مصروفات الرواتب ومزايا الموظفين", debit: expenseAmount, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: calc.netSalary },
      { accountCode: "22100", accountName: "التزامات ضريبة الخصم والإضافة (نموذج 41)", debit: 0, credit: taxWithheldAmount }
    ];

    const newJournal: JournalEntry = {
      id: journalEntryId,
      date: new Date().toISOString().split("T")[0],
      description: `صرف وتسوية كشف مرتبات الموظف: ${emp.name} (كود: ${emp.id}) لشهر يوليو 2026 مخصوماً منه التأمينات وضريبة كسب العمل`,
      reference: `PAY-${emp.id}-${Date.now().toString().slice(-4)}`,
      lines: journalLines,
      status: "Posted",
      costCenter: emp.department === "المالية" ? "CC-TAX" : emp.department === "البحث والتطوير" ? "CC-RND" : "CC-OPS",
      profitCenter: "PC-SFT",
      creator: "أحلام سلطان",
      approvedBy: "نظام الأجور الآلي"
    };

    // Update Accounts state balances
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;
      journalLines.forEach(line => {
        if (line.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            balanceChange += (line.debit - line.credit);
          } else {
            balanceChange += (line.credit - line.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + balanceChange };
    });

    setAccounts(updatedAccounts);
    setJournalEntries([newJournal, ...journalEntries]);
    setPaidEmployees([...paidEmployees, emp.id]);

    // Post payslip to backend SQL and ledger
    fetch("/api/v1/hr/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `PS-${Date.now().toString().slice(-4)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        month: "يوليو 2026",
        baseSalary: emp.baseSalary,
        allowances: 0,
        deductions: calc.attendanceDeduction,
        netSalary: calc.netSalary,
        journalEntryId,
        costCenterCode: emp.department === "المالية" ? "CC-TAX" : emp.department === "البحث والتطوير" ? "CC-RND" : "CC-OPS"
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPaySuccessMsg(`تم صرف مرتب الموظف (${emp.name}) بنجاح بقيمة ${calc.netSalary.toLocaleString()} ${config.currency} وتم ترحيل قيد التسوية المحاسبي بنجاح إلى حساب الأستاذ العام.`);
      }
    })
    .catch(err => console.error("Error saving payroll to server database:", err));
  };

  // 3. Add Attendance Entry
  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find(x => x.id === attEmpId);
    if (!targetEmp) return;

    const newRec = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      employeeId: attEmpId,
      employeeName: targetEmp.name,
      date: new Date().toISOString().split("T")[0],
      checkIn: attCheckIn,
      checkOut: attCheckOut,
      status: attStatus
    };

    const displayRec = {
      employeeId: attEmpId,
      name: targetEmp.name,
      date: newRec.date,
      checkIn: attCheckIn,
      checkOut: attCheckOut,
      status: attStatus
    };

    setAttendanceRecords([displayRec, ...attendanceRecords]);
    
    // Increase attendanceDays if on time or late but present
    if (attStatus !== "Absent") {
      setEmployees(employees.map(emp => {
        if (emp.id === attEmpId) {
          return { ...emp, attendanceDays: Math.min(emp.attendanceDays + 1, 30) };
        }
        return emp;
      }));
    }

    fetch("/api/v1/hr/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRec)
    }).catch(err => console.error("Error saving attendance to server database:", err));
  };

  // 4. Leave Request Status Switcher
  const handleApproveLeave = (id: string, approve: boolean) => {
    const targetReq = leaveRequests.find(r => r.id === id);
    if (!targetReq) return;
    const newStatus = approve ? "Approved" : "Rejected";

    setLeaveRequests(leaveRequests.map(req => {
      if (req.id === id) {
        // If approved, subtract from attendance days to simulate deduction or keep track
        if (approve && req.status !== "Approved") {
          setEmployees(employees.map(emp => {
            if (emp.name === req.employeeName) {
              return { ...emp, attendanceDays: Math.max(emp.attendanceDays - req.duration, 0) };
            }
            return emp;
          }));
        }
        return { ...req, status: newStatus };
      }
      return req;
    }));

    fetch(`/api/v1/hr/leaves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    }).catch(err => console.error("Error updating leave request status:", err));
  };

  // 5. Recruitment Candidates Interaction
  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName) return;

    const candId = `CAND-${Date.now().toString().slice(-4)}`;
    const newCand = {
      id: candId,
      name: newCandName,
      position: newCandPos,
      stage: "Interviewing",
      score: 75,
      expectedSalary: newCandSalary,
      dept: newCandDept
    };

    setCandidates([...candidates, newCand]);
    setNewCandName("");

    fetch("/api/v1/hr/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: candId,
        name: newCandName,
        position: newCandPos,
        stage: "Interviewing",
        score: 75,
        expectedSalary: newCandSalary,
        department: newCandDept
      })
    }).catch(err => console.error("Error saving candidate to server database:", err));
  };

  const handleUpdateCandStage = (id: string, stage: "Interviewing" | "Offered" | "Hired") => {
    setCandidates(candidates.map(c => {
      if (c.id === id) {
        return { ...c, stage };
      }
      return c;
    }));

    fetch(`/api/v1/hr/candidates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: stage })
    }).catch(err => console.error("Error updating candidate stage:", err));
  };

  const handleHireCandidate = (cand: any) => {
    const nextId = `EMP-0${Date.now().toString().slice(-4)}`;
    const newEmp: Employee = {
      id: nextId,
      name: cand.name,
      role: cand.position,
      department: cand.dept,
      baseSalary: cand.expectedSalary,
      attendanceDays: 30,
      withholdingTaxRate: 0.10,
      vatRate: 0.14,
      status: "Active"
    };

    setEmployees([...employees, newEmp]);
    setSelectedEmp(newEmp);
    setCandidates(candidates.filter(c => c.id !== cand.id));
    setActiveTab("payroll");
    setNewEmpSuccessMsg(`تمت ترقية المرشح (${cand.name}) وتثبيته كموظف رسمي بالشركة براتب أساسي ${cand.expectedSalary.toLocaleString()} ج.م.`);

    fetch(`/api/v1/hr/candidates/${cand.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "Hired" })
    }).catch(err => console.error("Error setting candidate stage to Hired:", err));

    fetch("/api/v1/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEmp)
    }).catch(err => console.error("Error saving hired employee to DB:", err));
  };

  // 6. Submit Appraisal Review
  const handleAddAppraisal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find(x => x.id === appEmpId);
    if (!targetEmp) return;

    const appraisalId = `APR-${Date.now().toString().slice(-4)}`;
    const existIdx = appraisals.findIndex(a => a.employeeId === appEmpId);
    const newAppr = {
      employeeId: appEmpId,
      name: targetEmp.name,
      rating: appRating,
      comments: appComments || "تقييم أداء دوري متزن"
    };

    if (existIdx >= 0) {
      const updated = [...appraisals];
      updated[existIdx] = newAppr;
      setAppraisals(updated);
    } else {
      setAppraisals([...appraisals, newAppr]);
    }

    setAppComments("");

    fetch("/api/v1/hr/appraisals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: appraisalId,
        employeeId: appEmpId,
        employeeName: targetEmp.name,
        rating: appRating,
        comments: appComments || "تقييم أداء دوري متزن"
      })
    }).catch(err => console.error("Error saving appraisal to DB:", err));
  };

  // 7. Request Loan Action
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find(x => x.id === newLoanEmpId);
    if (!targetEmp) return;

    const loanId = `LN-${Date.now().toString().slice(-4)}`;
    const newL = {
      id: loanId,
      employeeId: newLoanEmpId,
      employeeName: targetEmp.name,
      amount: newLoanAmount,
      installmentMonthly: newLoanInstallment,
      remaining: newLoanAmount,
      status: "Active"
    };

    setLoans([newL, ...loans]);
    setNewLoanAmount(10000);
    setNewLoanInstallment(1000);

    fetch("/api/v1/hr/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newL)
    }).catch(err => console.error("Error saving loan to DB:", err));
  };

  const handlePayLoanInstallment = (id: string) => {
    setLoans(loans.map(l => {
      if (l.id === id) {
        const remaining = Math.max(l.remaining - l.installmentMonthly, 0);
        return {
          ...l,
          remaining,
          status: remaining === 0 ? "Settled" : "Active"
        };
      }
      return l;
    }).filter(l => l.status === "Active" || l.remaining > 0)); // Filter out settled if you want or keep them
  };


  // Computes regional payroll rules
  const getPayrollCalculation = (emp: Employee) => {
    const base = emp.baseSalary;
    
    // Egyptian social insurance deduction standard (e.g., 11% employee contribution)
    const socialInsurance = Math.min(base, 10900) * 0.11; 
    
    // Egyptian income tax tiers (simplified simulation based on annual thresholds)
    // We assume tax rate tier calculated on monthly income
    const taxableIncome = base - socialInsurance;
    const withholdingTax = taxableIncome * emp.withholdingTaxRate;
    
    // Attendance deduction if days under 30
    const attendanceDeduction = emp.attendanceDays < 30 
      ? (base / 30) * (30 - emp.attendanceDays) 
      : 0;
      
    const netSalary = base - socialInsurance - withholdingTax - attendanceDeduction;

    return {
      base,
      socialInsurance,
      withholdingTax,
      attendanceDeduction,
      netSalary
    };
  };

  const clr = {
    text: config.theme === "emerald" ? "text-emerald-400" : "text-cyan-400",
    bg: config.theme === "emerald" ? "bg-emerald-500/10" : "bg-cyan-500/10",
    border: config.theme === "emerald" ? "border-emerald-500/20" : "border-cyan-500/20",
    btn: config.theme === "emerald" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-cyan-500 hover:bg-cyan-600",
  };

  return (
    <div className="space-y-6 text-right" id="hr-payroll-container" dir="rtl">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 font-sans border border-cyan-500/30 font-bold">
            نظام الموارد البشرية والرواتب (HR Suite) نشط
          </span>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">الموارد البشرية وشؤون الموظفين</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            توليد كشوف مرتبات الموظفين القانونية، خطط الحضور والإجازات، تتبع طلبات التوظيف والتعيين، تقييم الأداء، وتنسيق القروض والسلف بالعملة المحلية.
          </p>
        </div>

        {/* Tab Switches */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121829] border border-slate-800 p-1.5 rounded-lg self-start">
          <button
            onClick={() => setActiveTab("payroll")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "payroll" ? "bg-slate-800 text-cyan-400 border border-slate-700/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            مرتبات الموظفين والكشوف
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "attendance" ? "bg-slate-800 text-cyan-400 border border-slate-700/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            الحضور والإجازات
          </button>
          <button
            onClick={() => setActiveTab("recruitment")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "recruitment" ? "bg-slate-800 text-cyan-400 border border-slate-700/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            بوابة التوظيف المفتوحة
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "performance" ? "bg-slate-800 text-cyan-400 border border-slate-700/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            تقييم الأداء والمكافآت
          </button>
          <button
            onClick={() => setActiveTab("loans")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "loans" ? "bg-slate-800 text-cyan-400 border border-slate-700/50" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CircleDollarSign className="h-3.5 w-3.5" />
            السلف والقروض الشخصية
          </button>
        </div>
      </div>

      {newEmpSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold leading-relaxed flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{newEmpSuccessMsg}</span>
          </div>
          <button onClick={() => setNewEmpSuccessMsg("")} className="text-emerald-500 hover:text-emerald-400">✕</button>
        </div>
      )}

      {/* VIEW PANEL 1: PAYROLL (كشف المرتبات والأجور) */}
      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Employees List */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Quick Actions Card */}
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-lg">
              <span className="text-xs font-bold text-slate-300">إدارة ملفات الموظفين</span>
              <button
                onClick={() => setShowAddEmployeeForm(!showAddEmployeeForm)}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                {showAddEmployeeForm ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                <span>{showAddEmployeeForm ? "إلغاء التسجيل" : "تسجيل موظف جديد"}</span>
              </button>
            </div>

            {/* Expandable Register Form */}
            {showAddEmployeeForm && (
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl animate-fadeIn space-y-4">
                <h3 className="font-display font-bold text-slate-200 text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-cyan-400" /> نموذج تعيين ومباشرة موظف جديد
                </h3>
                
                <form onSubmit={handleRegisterEmployee} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-bold">اسم الموظف الرباعي</label>
                    <input
                      type="text"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="مثال: محمد أحمد عبد الرحمن البدري"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">المسمى الوظيفي / الدور</label>
                      <input
                        type="text"
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value)}
                        placeholder="معماري برمجيات أول"
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">القسم الإداري</label>
                      <select
                        value={empDept}
                        onChange={(e) => setEmpDept(e.target.value)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-bold"
                      >
                        <option value="البحث والتطوير">البحث والتطوير (R&D)</option>
                        <option value="المالية">المالية والحسابات (Finance)</option>
                        <option value="الخدمات المهنية">الخدمات المهنية (Consulting)</option>
                        <option value="العمليات واللوجستيات">العمليات واللوجستيات (Operations)</option>
                        <option value="المبيعات والتسويق">المبيعات والتسويق (Sales)</option>
                        <option value="الموارد البشرية">الموارد البشرية (HR)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">الراتب الأساسي الشهري (ج.م)</label>
                      <input
                        type="number"
                        min="3000"
                        value={empSalary}
                        onChange={(e) => setEmpSalary(Number(e.target.value) || 0)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">أيام العمل الفعلية للشهر</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={empAttendance}
                        onChange={(e) => setEmpAttendance(Number(e.target.value) || 30)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">شريحة ضريبة كسب العمل</label>
                      <select
                        value={empTaxRate}
                        onChange={(e) => setEmpTaxRate(Number(e.target.value))}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                      >
                        <option value="0.00">معفى ضريبياً (0%)</option>
                        <option value="0.05">شريحة أولى (5%)</option>
                        <option value="0.10">شريحة ثانية (10%)</option>
                        <option value="0.15">شريحة ثالثة (15%)</option>
                        <option value="0.225">شريحة عليا (22.5%)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block font-bold">الحالة الوظيفية</label>
                      <select
                        value={empStatus}
                        onChange={(e) => setEmpStatus(e.target.value as any)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-bold"
                      >
                        <option value="Active">على رأس العمل (نشط)</option>
                        <option value="On Leave">في إجازة رسمية (On Leave)</option>
                        <option value="Suspended">موقوف مؤقتاً (Suspended)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/10"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>تأكيد تسجيل الموظف وإدراجه بالدفاتر</span>
                  </button>
                </form>
                </div>
            )}

            {/* Employees List Container */}
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/30">
                <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" /> جدول موظفي المنشأة المسجلين
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {employees.length} موظفاً بالشركة
                </span>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-[460px] overflow-y-auto">
                {employees.map(emp => {
                  const calc = getPayrollCalculation(emp);
                  const isSelected = selectedEmp?.id === emp.id;
                  const isPaid = paidEmployees.includes(emp.id);
                  return (
                    <div 
                      key={emp.id} 
                      onClick={() => setSelectedEmp(emp)}
                      className={`p-4 flex items-center justify-between hover:bg-slate-900/20 cursor-pointer transition-all ${
                        isSelected ? "bg-cyan-500/5 border-r-2 border-cyan-500 font-medium" : ""
                      }`}
                    >
                      <div className="space-y-1 text-right">
                        <h4 className="text-xs font-bold text-slate-200">{emp.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span>كود: {emp.id}</span>
                          <span>•</span>
                          <span>{emp.department}</span>
                        </div>
                      </div>
                      <div className="text-left space-y-1">
                        <div className="text-xs font-mono font-bold text-slate-300">
                          {calc.netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })} {config.currency === "EGP" ? "ج.م" : config.currency}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          {isPaid ? (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              تم الصرف
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              مستحق
                            </span>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            emp.status === "Active" 
                              ? "bg-cyan-500/10 text-cyan-400" 
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            {emp.status === "Active" ? "نشط" : emp.status === "On Leave" ? "إجازة" : "موقوف"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Localized Salary Slip Document */}
          <div className="lg:col-span-7 space-y-4">
            {selectedEmp ? (
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fadeIn">
                {/* Slip Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-slate-200 text-sm">قسيمة تفصيل كشف راتب الموظف / Payslip</h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">الفترة المالية الفعالة: يوليو 2026 م (الامتثال لجمهورية مصر العربية)</p>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 text-[11px] font-bold border border-slate-800 bg-slate-900"
                    title="طباعة قسيمة الراتب"
                  >
                    <Printer className="h-3.5 w-3.5" /> طباعة القسيمة
                  </button>
                </div>

                {/* Document Content */}
                <div className="p-6 space-y-6">
                  {paySuccessMsg && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold font-sans flex items-center justify-between">
                      <span>{paySuccessMsg}</span>
                      <button onClick={() => setPaySuccessMsg("")} className="text-slate-400 hover:text-slate-200 font-bold px-1">✕</button>
                    </div>
                  )}
                  {/* Employee / Employer scope */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-sans text-slate-500 block uppercase font-bold">صاحب العمل / الشركة</span>
                      <strong className="text-slate-300 block">
                        {config.company === "Apex Levant Corp" ? "شركة قمة الشام والرافدين المحدودة" : config.company === "Apex Gulf International" ? "شركة قمة الخليج الدولية" : config.company === "Apex Africa Distribution" ? "مؤسسة قمة أفريقيا للتوزيع والاستيراد" : config.company}
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        {config.branch === "Cairo Headquarters" ? "الإدارة العامة بالقاهرة (شيراتون)" : config.branch === "Alex Port Gateway" ? "مكتب ميناء الإسكندرية اللوجستي" : config.branch === "Dubai JAFZA Branch" ? "مكتب جافزا دبي الإقليمي" : config.branch}
                      </span>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-sans text-slate-500 block uppercase font-bold">الموظف المستلم</span>
                      <strong className="text-slate-300 block">{selectedEmp.name}</strong>
                      <span className="text-[10px] text-slate-400 block">{selectedEmp.role}</span>
                    </div>
                  </div>

                  {/* Earnings & Deductions Table */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden text-xs font-sans">
                    <div className="grid grid-cols-12 gap-2 bg-slate-900/40 p-2.5 border-b border-slate-800 text-slate-400 font-bold">
                      <div className="col-span-6 text-right">البيان المالي والتأميني / Description</div>
                      <div className="col-span-3 text-left">الاستحقاقات (+)</div>
                      <div className="col-span-3 text-left">الاستقطاعات (-)</div>
                    </div>

                    {/* Calculations breakdown */}
                    <div className="p-2.5 space-y-2.5">
                      {/* Base Salary */}
                      <div className="grid grid-cols-12 gap-2 text-slate-300">
                        <div className="col-span-6 text-right font-medium">الراتب الأساسي المعتمد / Basic Salary</div>
                        <div className="col-span-3 text-left text-emerald-400 font-mono font-bold">{getPayrollCalculation(selectedEmp).base.toLocaleString()} ج.م</div>
                        <div className="col-span-3 text-left text-slate-600 font-mono">-</div>
                      </div>

                      {/* Social Insurance */}
                      <div className="grid grid-cols-12 gap-2 text-slate-300">
                        <div className="col-span-6 text-right font-medium">حصة الموظف في التأمينات الاجتماعية (11%) / Social Insurance</div>
                        <div className="col-span-3 text-left text-slate-600 font-mono">-</div>
                        <div className="col-span-3 text-left text-rose-400 font-mono font-bold">({getPayrollCalculation(selectedEmp).socialInsurance.toLocaleString()}) ج.م</div>
                      </div>

                      {/* Income Withholding Tax */}
                      <div className="grid grid-cols-12 gap-2 text-slate-300">
                        <div className="col-span-6 text-right font-medium">ضريبة كسب العمل المستقطعة / Income Tax</div>
                        <div className="col-span-3 text-left text-slate-600 font-mono">-</div>
                        <div className="col-span-3 text-left text-rose-400 font-mono font-bold">({getPayrollCalculation(selectedEmp).withholdingTax.toLocaleString()}) ج.م</div>
                      </div>

                      {/* Attendance Deductions */}
                      {getPayrollCalculation(selectedEmp).attendanceDeduction > 0 && (
                        <div className="grid grid-cols-12 gap-2 text-slate-300">
                          <div className="col-span-6 text-right font-medium">جزاء غياب أو انقطاع غير مبرر ({30 - selectedEmp.attendanceDays} يوم)</div>
                          <div className="col-span-3 text-left text-slate-600 font-mono">-</div>
                          <div className="col-span-3 text-left text-rose-400 font-mono font-bold">({getPayrollCalculation(selectedEmp).attendanceDeduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}) ج.م</div>
                        </div>
                      )}
                    </div>

                    {/* Document Total */}
                    <div className="grid grid-cols-12 gap-2 bg-[#121829] p-3.5 border-t border-slate-800 text-xs font-bold">
                      <div className="col-span-6 text-slate-200 text-right">صافي المرتب المستحق للصرف الفعلي / Net Salary</div>
                      <div className="col-span-6 text-left text-emerald-400 font-mono font-extrabold text-sm">
                        {getPayrollCalculation(selectedEmp).netSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })} {config.currency === "EGP" ? "ج.م" : config.currency}
                      </div>
                    </div>
                  </div>

                  {/* Audit & Legal Stamps */}
                  <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-lg flex items-start gap-3 text-[11px] leading-relaxed text-slate-400 text-right">
                    <ShieldAlert className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-300 block mb-1 font-bold">ضمان وموثوقية الامتثال المالي المصري</strong>
                      تم احتساب الاستقطاعات والضرائب طبقاً لأحكام قانون التأمينات الاجتماعية المصري رقم 148 لسنة 2019 وقانون الضريبة على الدخل وتعديلاته بالجمهورية. تعتبر هذه المسودة مستنداً قانونياً معتمداً لدفاتر الحسابات الختامية بالشركة.
                    </div>
                  </div>

                  {/* Pay Salary Action */}
                  <div className="pt-2">
                    {paidEmployees.includes(selectedEmp.id) ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-lg text-xs font-bold font-sans flex items-center gap-2 justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>تم صرف المرتب وترحيل القيد المحاسبي بنجاح لحساب البنك والأستاذ العام</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePaySalary(selectedEmp)}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/15 transition-all font-sans"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>اعتماد وصرف كشف مرتب الموظف (ترحيل القيد المزدوج فورياً)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                يرجى تحديد موظف من القائمة الجانبية لعرض وتدقيق قسيمة راتبه المعتمدة تفصيلياً.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW PANEL 2: ATTENDANCE & LEAVES (الحضور والإجازات) */}
      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add Attendance Log Today */}
          <div className="lg:col-span-4 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
              <Clock className="h-4.5 w-4.5 text-cyan-400" /> تسجيل وتوثيق حضور اليوم
            </h3>

            <form onSubmit={handleAddAttendance} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">اسم الموظف الحاضر</label>
                <select
                  value={attEmpId}
                  onChange={(e) => setAttEmpId(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} (كود: {emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">ساعة الحضور (Check-In)</label>
                  <input
                    type="time"
                    value={attCheckIn}
                    onChange={(e) => setAttCheckIn(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">ساعة الانصراف (Check-Out)</label>
                  <input
                    type="time"
                    value={attCheckOut}
                    onChange={(e) => setAttCheckOut(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">حالة الحضور</label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none"
                >
                  <option value="OnTime">حضور منضبط (On Time)</option>
                  <option value="Late">حضور متأخر (Late)</option>
                  <option value="Absent">غياب عن اليوم (Absent)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Check className="h-4 w-4" />
                <span>حفظ في سجل البصمة اليومي</span>
              </button>
            </form>
          </div>

          {/* Attendance Log table & Leave request manager */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Today's Log */}
            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-cyan-400" /> سجل البصمة والحضور الفعلي
              </h3>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-right divide-y divide-slate-800">
                  <thead className="bg-slate-900/50 text-slate-400 font-bold">
                    <tr>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3 text-center">التاريخ</th>
                      <th className="p-3 text-center">وقت الحضور</th>
                      <th className="p-3 text-center">وقت الانصراف</th>
                      <th className="p-3 text-center">الحالة الإدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {attendanceRecords.map((rec, index) => (
                      <tr key={index} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold">{rec.name}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{rec.date}</td>
                        <td className="p-3 text-center font-mono text-slate-200">{rec.checkIn}</td>
                        <td className="p-3 text-center font-mono text-slate-200">{rec.checkOut}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === "OnTime" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {rec.status === "OnTime" ? "منضبط" : "متأخر"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave Requests */}
            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-purple-400" /> طلبات الإجازات المقدمة والاعتمادات
              </h3>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-xs text-right divide-y divide-slate-800">
                  <thead className="bg-slate-900/50 text-slate-400 font-bold">
                    <tr>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3 text-center">نوع الإجازة</th>
                      <th className="p-3 text-center">المدة (أيام)</th>
                      <th className="p-3">السبب والشرح</th>
                      <th className="p-3 text-center">القرار والإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold">{req.employeeName}</td>
                        <td className="p-3 text-center font-bold text-slate-400">
                          {req.type === "Annual" ? "سنوية عادية" : req.type === "Sick" ? "مرضية طارئة" : "عارضة"}
                        </td>
                        <td className="p-3 text-center font-mono text-purple-400 font-bold">{req.duration} أيام</td>
                        <td className="p-3 text-slate-400 max-w-xs">{req.reason}</td>
                        <td className="p-3 text-center">
                          {req.status === "Pending" ? (
                            <div className="flex items-center gap-1.5 justify-center">
                              <button
                                onClick={() => handleApproveLeave(req.id, true)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2 py-1 rounded text-[10px]"
                              >
                                موافقة
                              </button>
                              <button
                                onClick={() => handleApproveLeave(req.id, false)}
                                className="bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold px-2 py-1 rounded text-[10px]"
                              >
                                رفض
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {req.status === "Approved" ? "موافق عليها" : "مرفوضة"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW PANEL 3: RECRUITMENT (بوابة التوظيف والتعيين) */}
      {activeTab === "recruitment" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add Candidate form */}
          <div className="lg:col-span-4 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
              <UserPlus className="h-4.5 w-4.5 text-cyan-400" /> إضافة ملف مرشح جديد لطلب التوظيف
            </h3>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">اسم المرشح بالكامل</label>
                <input
                  type="text"
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  placeholder="مثال: رامي محمد البشري"
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">الوظيفة المتقدم لها</label>
                <input
                  type="text"
                  value={newCandPos}
                  onChange={(e) => setNewCandPos(e.target.value)}
                  placeholder="Senior React Developer"
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">الراتب المتوقع (ج.م)</label>
                  <input
                    type="number"
                    value={newCandSalary}
                    onChange={(e) => setNewCandSalary(Number(e.target.value) || 12000)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">القسم المقترح</label>
                  <select
                    value={newCandDept}
                    onChange={(e) => setNewCandDept(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="البحث والتطوير">البحث والتطوير</option>
                    <option value="المالية">المالية والحسابات</option>
                    <option value="الموارد البشرية">الموارد البشرية</option>
                    <option value="المبيعات والتسويق">المبيعات والتسويق</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <UserPlus className="h-4 w-4" />
                <span>حفظ الطلب بالبوابة</span>
              </button>
            </form>
          </div>

          {/* Candidates Pipeline table */}
          <div className="lg:col-span-8 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
              <Briefcase className="h-4.5 w-4.5 text-cyan-400" /> بوابة ومراحل فحص طالبي العمل (Hiring Pipeline)
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-right divide-y divide-slate-800">
                <thead className="bg-slate-900/50 text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">اسم المرشح</th>
                    <th className="p-3">الوظيفة المتقدم لها</th>
                    <th className="p-3 text-center">المرحلة الحالية</th>
                    <th className="p-3 text-center">الدرجة الفنية</th>
                    <th className="p-3 text-center">الراتب المتوقع</th>
                    <th className="p-3 text-center">اتخاذ قرار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-900/10">
                      <td className="p-3 font-bold">{cand.name}</td>
                      <td className="p-3 text-slate-300 font-bold">{cand.position}</td>
                      <td className="p-3 text-center">
                        <select
                          value={cand.stage}
                          onChange={(e) => handleUpdateCandStage(cand.id, e.target.value as any)}
                          className="bg-[#141b2d] text-slate-300 border border-slate-700 rounded px-2 py-1 focus:outline-none"
                        >
                          <option value="Interviewing">مقابلة فنية (Interviewing)</option>
                          <option value="Offered">عرض عمل (Offered)</option>
                          <option value="Hired">مقبول وتعيين (Hired)</option>
                        </select>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-cyan-400">{cand.score}%</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-200">{cand.expectedSalary.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center">
                        {cand.stage === "Hired" ? (
                          <button
                            onClick={() => handleHireCandidate(cand)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1 mx-auto"
                          >
                            <UserPlus className="h-3 w-3" /> تثبيت الموظف فورياً
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">جاري التقييم</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL 4: PERFORMANCE (تقييم الأداء والتدريب) */}
      {activeTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Appraisal Form */}
          <div className="lg:col-span-4 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="h-4.5 w-4.5 text-amber-400" /> إرسال تقييم أداء سنوي جديد
            </h3>

            <form onSubmit={handleAddAppraisal} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">اسم الموظف المستهدف</label>
                <select
                  value={appEmpId}
                  onChange={(e) => setAppEmpId(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold flex justify-between">
                  <span>التقييم الفني والأخلاقي (أعلى 5.0)</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">{appRating} / 5.0</span>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={appRating}
                  onChange={(e) => setAppRating(Number(e.target.value) || 4.0)}
                  className="w-full accent-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">ملاحظات ومرئيات المدير المباشر</label>
                <textarea
                  value={appComments}
                  onChange={(e) => setAppComments(e.target.value)}
                  placeholder="أداء متزن وقيادة متميزة لمشروع البنية التحتية"
                  rows={3}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>حفظ التقييم بملف الموظف</span>
              </button>
            </form>
          </div>

          {/* Appraisal Records */}
          <div className="lg:col-span-8 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-amber-500" /> سجل مراجعة وتقييم أداء العاملين
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-right divide-y divide-slate-800">
                <thead className="bg-slate-900/50 text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3 text-center">التقييم الفني والدرجة</th>
                    <th className="p-3">تفصيل الأداء والتعليق الإداري</th>
                    <th className="p-3 text-center">تصنيف الجائزة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {appraisals.map((appr, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10">
                      <td className="p-3 font-bold">{appr.name}</td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400 text-sm">
                        {appr.rating} / 5.0
                      </td>
                      <td className="p-3 text-slate-400 max-w-sm">{appr.comments}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          appr.rating >= 4.5 ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {appr.rating >= 4.5 ? "علاوة سنوية كاملة" : "علاوة تشجيعية"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL 5: LOANS (السلف والقروض الشخصية) */}
      {activeTab === "loans" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add Loan form */}
          <div className="lg:col-span-4 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 border-b border-slate-800 pb-2">
              <CircleDollarSign className="h-4.5 w-4.5 text-emerald-400" /> تقديم طلب سلفة حسنة جديدة للعمل
            </h3>

            <form onSubmit={handleCreateLoan} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold">اسم الموظف طالب السلفة</label>
                <select
                  value={newLoanEmpId}
                  onChange={(e) => setNewLoanEmpId(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-bold"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">مبلغ السلفة المطلوب (ج.م)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={newLoanAmount}
                    onChange={(e) => setNewLoanAmount(Number(e.target.value) || 5000)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold">القسط الشهري (ج.م)</label>
                  <input
                    type="number"
                    min="200"
                    step="100"
                    value={newLoanInstallment}
                    onChange={(e) => setNewLoanInstallment(Number(e.target.value) || 500)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <strong className="text-slate-300 block mb-0.5">القرض والخصم الآلي:</strong>
                تُعتبر السلفة قرضاً حسناً بدون أية فوائد ربوية، على أن يتم ترحيل الخصم تدريجياً وشهرياً من صافي كشف مرتب الموظف عند صرف الرواتب.
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <CircleDollarSign className="h-4 w-4" />
                <span>اعتماد وقيد السلفة بالدفاتر</span>
              </button>
            </form>
          </div>

          {/* Active Loans Table */}
          <div className="lg:col-span-8 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2">
              <CircleDollarSign className="h-4.5 w-4.5 text-emerald-400" /> كشف حساب القروض والسلف الفعالة للموظفين
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-right divide-y divide-slate-800">
                <thead className="bg-slate-900/50 text-slate-400 font-bold">
                  <tr>
                    <th className="p-3">رقم السلفة</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3 text-left">مبلغ السلفة الكلي</th>
                    <th className="p-3 text-left">قسط السداد الشهري</th>
                    <th className="p-3 text-left">المتبقي للاستيفاء</th>
                    <th className="p-3 text-center">إجراء فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-900/10">
                      <td className="p-3 font-mono text-slate-500 font-bold">{loan.id}</td>
                      <td className="p-3 font-bold">{loan.employeeName}</td>
                      <td className="p-3 text-left font-mono text-slate-300">{loan.amount.toLocaleString()} ج.م</td>
                      <td className="p-3 text-left font-mono text-emerald-400 font-bold">{loan.installmentMonthly.toLocaleString()} ج.م</td>
                      <td className="p-3 text-left font-mono text-amber-400 font-bold">{loan.remaining.toLocaleString()} ج.م</td>
                      <td className="p-3 text-center">
                        {loan.remaining > 0 ? (
                          <button
                            onClick={() => handlePayLoanInstallment(loan.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1 rounded text-[10px] transition-all border border-slate-700"
                          >
                            دفع قسط نقداً
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            تم السداد بالكامل
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
