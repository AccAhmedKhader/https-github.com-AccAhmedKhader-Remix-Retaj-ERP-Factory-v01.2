import React, { useState } from "react";
import { 
  Workflow, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  UserCheck, 
  Sparkles, 
  Eye, 
  ArrowRight, 
  Building, 
  FileText, 
  Briefcase,
  HelpCircle,
  Activity,
  User,
  ShieldAlert,
  Sliders,
  Settings,
  Coins
} from "lucide-react";
import { ERPConfig, JournalEntry, SalesInvoice } from "../types";
import { getThemeClass } from "./Sidebar";

interface WorkflowModuleProps {
  config: ERPConfig;
  journalEntries?: JournalEntry[];
  setJournalEntries?: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  salesInvoices?: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
}

export interface WorkflowRule {
  id: string;
  transactionType: "Journal" | "SalesInvoice" | "PurchaseInvoice" | "Payroll";
  name: string;
  steps: { role: string; user: string; status: "Pending" | "Approved" | "Rejected" }[];
  minThreshold: number; // minimum amount required to trigger this workflow
  isActive: boolean;
}

export interface ApprovalTask {
  id: string;
  workflowRuleId: string;
  refCode: string; // JE-102, SINV-102 etc
  title: string;
  amount: number;
  requestedBy: string;
  createdAt: string;
  currentStepIndex: number;
  status: "Pending" | "Approved" | "Rejected";
}

export default function WorkflowModule({
  config,
  journalEntries = [],
  setJournalEntries,
  salesInvoices = [],
  setSalesInvoices
}: WorkflowModuleProps) {
  const clr = getThemeClass(config.theme);

  // Default Workflow Rules/Routes
  const [rules, setRules] = useState<WorkflowRule[]>(() => {
    const defaultRules: WorkflowRule[] = [
      {
        id: "WFR-001",
        transactionType: "Journal",
        name: "اعتماد قيود اليومية ذات القيمة العالية",
        minThreshold: 100000,
        isActive: true,
        steps: [
          { role: "Senior Accountant", user: "سالي حسن (رئيس الحسابات)", status: "Approved" },
          { role: "CFO", user: "ياسمين الجميل (المدير المالي)", status: "Pending" },
          { role: "CEO", user: "إبراهيم الرفاعي (الرئيس التنفيذي)", status: "Pending" }
        ]
      },
      {
        id: "WFR-002",
        transactionType: "SalesInvoice",
        name: "اعتماد وتصديق فواتير المبيعات والتراخيص الكبرى",
        minThreshold: 500000,
        isActive: true,
        steps: [
          { role: "Sales Manager", user: "خالد مراد (مدير المبيعات)", status: "Approved" },
          { role: "CFO", user: "ياسمين الجميل (المدير المالي)", status: "Pending" }
        ]
      },
      {
        id: "WFR-003",
        transactionType: "Payroll",
        name: "تصديق كشوف المرتبات الشهرية والبدلات",
        minThreshold: 1,
        isActive: true,
        steps: [
          { role: "HR Specialist", user: "مريم العشري (أخصائي الموارد)", status: "Approved" },
          { role: "CFO", user: "ياسمين الجميل (المدير المالي)", status: "Pending" }
        ]
      }
    ];

    try {
      const saved = localStorage.getItem(`apex_wf_rules_${config.company}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((rule: any) => ({
            ...rule,
            steps: rule.steps || []
          }));
        }
      }
    } catch (e) {
      console.warn("Failed parsing saved workflow rules:", e);
    }
    return defaultRules;
  });

  // Active Pending Tasks Waiting Action
  const [tasks, setTasks] = useState<ApprovalTask[]>(() => {
    try {
      const saved = localStorage.getItem(`apex_wf_tasks_${config.company}`);
      return saved ? JSON.parse(saved) : [
        {
          id: "WFT-010",
          workflowRuleId: "WFR-001",
          refCode: "JE-2910",
          title: "قيد تسوية العقد السنوي - أوراسكوم للتنمية",
          amount: 1200000,
          requestedBy: "شريف ممدوح (محاسب أول)",
          createdAt: "2026-07-14",
          currentStepIndex: 1, // Currently waiting for step 1 (CFO)
          status: "Pending"
        },
        {
          id: "WFT-011",
          workflowRuleId: "WFR-002",
          refCode: "SINV-2026-004",
          title: "فاتورة ترخيص مجمع السويدي إليكتريك الأساسية",
          amount: 450000,
          requestedBy: "أحمد رائف (مدير المبيعات الخارجية)",
          createdAt: "2026-07-15",
          currentStepIndex: 1, // Waiting for CFO
          status: "Pending"
        },
        {
          id: "WFT-012",
          workflowRuleId: "WFR-003",
          refCode: "PAY-2026-06",
          title: "كشف الأجور والمرتبات والبدلات التشغيلية - يونيو",
          amount: 285000,
          requestedBy: "مريم العشري (مدير الموارد البشرية)",
          createdAt: "2026-07-11",
          currentStepIndex: 1, // Waiting for CFO
          status: "Pending"
        }
      ];
    } catch (e) {
      return [];
    }
  });

  // Designer Form modal states
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<WorkflowRule["transactionType"]>("Journal");
  const [ruleThreshold, setRuleThreshold] = useState(100000);
  const [ruleRoles, setRuleRoles] = useState<string[]>(["Accountant", "CFO"]);

  const saveRules = (next: WorkflowRule[]) => {
    setRules(next);
    localStorage.setItem(`apex_wf_rules_${config.company}`, JSON.stringify(next));
  };

  const saveTasks = (next: ApprovalTask[]) => {
    setTasks(next);
    localStorage.setItem(`apex_wf_tasks_${config.company}`, JSON.stringify(next));
  };

  // Process Approval Action
  const handleApprove = (task: ApprovalTask) => {
    const rule = rules.find(r => r.id === task.workflowRuleId);
    if (!rule) return;

    const nextStepIndex = task.currentStepIndex + 1;
    const isCompleted = nextStepIndex >= rule.steps.length;

    let updatedTasks: ApprovalTask[] = [];

    if (isCompleted) {
      // Mark as fully approved
      updatedTasks = tasks.map(t => {
        if (t.id === task.id) {
          return { ...t, status: "Approved" as const };
        }
        return t;
      });

      // --- LINKED ERP STATE INTEGRATION ---
      // If the fully approved item is a Journal Entry, update its status from Draft to Posted!
      if (task.refCode.startsWith("JE-") && setJournalEntries) {
        setJournalEntries(prev => prev.map(je => {
          if (je.id === task.refCode) {
            return { ...je, status: "Posted" as const, approvedBy: "سلسلة الموافقات الرقمية" };
          }
          return je;
        }));
      }

      // If it is a Sales Invoice, approve its status!
      if (task.refCode.startsWith("SINV-") && setSalesInvoices) {
        setSalesInvoices(prev => prev.map(inv => {
          if (inv.id === task.refCode) {
            return { ...inv, status: "Approved" as any };
          }
          return inv;
        }));
      }

      alert(`🎉 تم الاعتماد والموافقة النهائية على [${task.refCode}] وتم ترحيله بالكامل إلى الأستاذ العام للـ ERP.`);
    } else {
      // Move to next step in workflow chain
      updatedTasks = tasks.map(t => {
        if (t.id === task.id) {
          return { ...t, currentStepIndex: nextStepIndex };
        }
        return t;
      });
      alert(`✅ تم اعتماد خطوة الموافق الحالية. تم إحالة المعاملة [${task.refCode}] للموافق التالي: ${rule.steps[nextStepIndex].user}`);
    }

    saveTasks(updatedTasks);
  };

  const handleReject = (task: ApprovalTask) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return { ...t, status: "Rejected" as const };
      }
      return t;
    });
    saveTasks(updatedTasks);

    // Update original state if needed to mark as Rejected
    if (task.refCode.startsWith("JE-") && setJournalEntries) {
      setJournalEntries(prev => prev.map(je => {
        if (je.id === task.refCode) {
          return { ...je, status: "Draft" as const }; // Revert or mark rejected
        }
        return je;
      }));
    }

    alert(`❌ تم رفض المعاملة [${task.refCode}] وإرجاعها لمنشئ الحركة للتصحيح وإعادة الرفع.`);
  };

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;

    const formattedSteps = ruleRoles.map((role, idx) => ({
      role,
      user: role === "Accountant" ? "أحمد رائف (محاسب أول)" :
            role === "CFO" ? "ياسمين الجميل (المدير المالي)" :
            role === "CEO" ? "إبراهيم الرفاعي (الرئيس التنفيذي)" : "موافق نظامي",
      status: (idx === 0 ? "Approved" : "Pending") as any
    }));

    const newRule: WorkflowRule = {
      id: `WFR-${Date.now().toString().slice(-4)}`,
      transactionType: ruleType,
      name: ruleName,
      minThreshold: Number(ruleThreshold) || 1,
      isActive: true,
      steps: formattedSteps
    };

    saveRules([...rules, newRule]);
    setIsAddRuleOpen(false);

    // Reset
    setRuleName("");
    setRuleThreshold(100000);
    setRuleRoles(["Accountant", "CFO"]);
  };

  const getTransactionLabel = (type: WorkflowRule["transactionType"]) => {
    switch (type) {
      case "Journal": return "قيود وسندات اليومية العامة";
      case "SalesInvoice": return "فواتير المبيعات والتراخيص";
      case "PurchaseInvoice": return "أوامر وفواتير الشراء المركزي";
      case "Payroll": return "كشوف المرتبات والأجور الشهرية";
    }
  };

  return (
    <div className="p-6 space-y-6 text-right" dir="rtl" id="workflow-automation">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2 justify-start">
            <Workflow className={`h-6 w-6 ${clr.text}`} /> أتمتة سير العمل وسلسلة الموافقات المتعددة
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            صمم مسارات الاعتماد الذكي، وعيّن الموافقين، وفوض الصلاحيات للقيود والفواتير الحساسة تلقائياً.
          </p>
        </div>
        <button
          onClick={() => setIsAddRuleOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-950 ${clr.accent} hover:opacity-90 active:scale-95 transition-all cursor-pointer`}
        >
          <Plus className="h-4 w-4" /> تصميم مسار موافقات جديد
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">المهام في قائمة انتظار الاعتماد</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              {tasks.filter(t => t.status === "Pending").length} معاملات معلقة
            </span>
            <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1 justify-start">
              <Clock className="h-3 w-3" /> تتطلب فحص وتوقيع فوري
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">إجمالي القوانين الفعالة (Rules)</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              {rules.filter(r => r.isActive).length} مسارات معتمدة آلياً
            </span>
            <p className="text-[10px] text-slate-400 mt-1">تراقب كافة الحركات والقيود الكبرى</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sliders className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">متوسط وقت دورة الاعتماد كاملة</span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
              4.5 ساعات تشغيلية
            </span>
            <p className="text-[10px] text-slate-400 mt-1">أسرع بنسبة 85% من الموافقات الورقية</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">تأمين حوكمة التدقيق المالي</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              مطابقة بنسبة 100%
            </span>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 justify-start">
              <UserCheck className="h-3 w-3" /> التوقيع بختم وتشفير موثق
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Tasks (Right) and Configured Paths (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Queue - Span 2 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4 border-b border-slate-800 pb-3">
              <Clock className="h-4.5 w-4.5 text-amber-400" /> قائمة انتظار الاعتمادات الحالية
            </h3>

            <div className="space-y-4">
              {tasks.filter(t => t.status === "Pending").map((task) => {
                const rule = rules.find(r => r.id === task.workflowRuleId);
                const currentApproverObj = rule ? rule.steps[task.currentStepIndex] : null;

                return (
                  <div 
                    key={task.id}
                    className="bg-slate-900/40 border border-slate-800/80 hover:border-slate-800 rounded-xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 justify-start">
                        <span className="bg-slate-800 border border-slate-700 font-mono text-[10px] text-slate-300 px-2 py-0.5 rounded font-bold shrink-0">
                          {task.refCode}
                        </span>
                        <h4 className="text-xs font-bold text-slate-200">{task.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">
                        بواسطة: {task.requestedBy} • تاريخ الطلب: {task.createdAt}
                      </p>

                      {/* Path visualization */}
                      {rule && (
                        <div className="flex items-center gap-1.5 pt-2 flex-wrap justify-start">
                          <span className="text-[10px] text-slate-500 font-bold">مسار الاعتماد الحالي:</span>
                          {rule.steps.map((st, idx) => {
                            const isCurrent = idx === task.currentStepIndex;
                            const isPast = idx < task.currentStepIndex;
                            return (
                              <React.Fragment key={idx}>
                                {idx > 0 && <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />}
                                <span className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-bold ${
                                  isCurrent ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse" :
                                  isPast ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  "bg-slate-950 text-slate-500 border border-slate-900"
                                }`}>
                                  {st.role} ({st.user.split(" ")[0]})
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between shrink-0 h-full gap-3">
                      <span className="text-sm font-mono font-bold text-slate-100 block">
                        {task.amount.toLocaleString()} <span className="text-xs font-sans text-slate-400">{config.currency}</span>
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReject(task)}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 rounded text-[10px] font-bold transition-all cursor-pointer"
                        >
                          رفض المعاملة
                        </button>
                        <button
                          onClick={() => handleApprove(task)}
                          className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/40 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> موافقة واعتماد الخطوة
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {tasks.filter(t => t.status === "Pending").length === 0 && (
                <div className="p-10 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 font-sans text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                  قائمة الانتظار فارغة! كافة الفواتير والقيود تم فحصها وتوقيعها واعتمادها بنسبة 100%.
                </div>
              )}
            </div>
          </div>

          {/* History table */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <Activity className="h-4.5 w-4.5 text-blue-400" /> سجل العمليات والاعتمادات المؤرشفة
            </h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2">
                    <th className="pb-2">رقم المعاملة</th>
                    <th className="pb-2">الوصف والملخص</th>
                    <th className="pb-2">القيمة الإجمالية</th>
                    <th className="pb-2 text-left">حالة الاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {tasks.filter(t => t.status !== "Pending").map(task => (
                    <tr key={task.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-3 font-mono text-slate-400 font-bold">{task.refCode}</td>
                      <td className="py-3 font-medium">
                        <div>{task.title}</div>
                        <div className="text-[10px] text-slate-500">بواسطة: {task.requestedBy}</div>
                      </td>
                      <td className="py-3 font-mono">{task.amount.toLocaleString()} {config.currency}</td>
                      <td className="py-3 text-left">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-0.5 border ${
                          task.status === "Approved" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {task.status === "Approved" ? "مكتملة ومرحلة" : "مرفوضة ومعادة للتصحيح"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Workflow Paths Configuration Panel - Span 1 */}
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4 border-b border-slate-800 pb-3">
              <Sliders className="h-4.5 w-4.5 text-indigo-400" /> مسارات الاعتماد النشطة (SaaS Active Routes)
            </h3>

            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-500 font-bold">{rule.id}</span>
                    <span className={`h-2 w-2 rounded-full ${rule.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 leading-snug">{rule.name}</h4>
                    <p className="text-[10px] text-indigo-400 mt-1 font-sans">{getTransactionLabel(rule.transactionType)}</p>
                  </div>

                  <div className="border-t border-slate-850 pt-2.5 space-y-1.5 text-[10px]">
                    <div className="text-slate-500 font-bold">الحد الأدنى لتنشيط المسار آلياً:</div>
                    <div className="font-mono text-slate-300 font-bold">{rule.minThreshold.toLocaleString()} {config.currency}</div>
                    
                    <div className="text-slate-500 font-bold pt-1">سلسلة الموافقين المعتمدة:</div>
                    <div className="space-y-1">
                      {rule.steps.map((st, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded text-[9px] border border-slate-900">
                          <span className="text-slate-400 font-medium">{st.role}</span>
                          <span className="text-slate-500">{st.user.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Advisor Card */}
          <div className="bg-gradient-to-br from-indigo-950/20 via-[#0b0f19] to-[#0b0f19] border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 justify-start">
              <Sparkles className="h-4.5 w-4.5 text-purple-400 animate-pulse" /> توصية الرقابة الذكية والامتثال
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              ندعم حوكمة المعيار الدولي للتدقيق (ISA 240). يتم قفل القيود الكبرى المفتوحة تلقائياً ولا يمكن تدوير حسابات الإيراد إلا بعد توقيع CFO المشفر بالـ Private Key للشركة وتدقيق نموذج 14% ضريبياً.
            </p>
          </div>
        </div>
      </div>

      {/* Add Rule Dialog Modal */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <Workflow className={`h-4.5 w-4.5 ${clr.text}`} /> نمذجة وتصميم مسار موافقات (Workflow Rule)
            </h3>

            <form onSubmit={handleAddRuleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block font-bold mb-1">اسم مسار الموافقات ووصفه</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="مثال: اعتماد فواتير المشتريات الخارجية الكبرى"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">نوع المعاملة والعملية</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as WorkflowRule["transactionType"])}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="Journal">قيود يومية عامة</option>
                    <option value="SalesInvoice">فواتير مبيعات وتراخيص</option>
                    <option value="PurchaseInvoice">أوامر وفواتير شراء</option>
                    <option value="Payroll">مرتبات وأجور</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">الحد الأدنى للقيمة للتنشيط ({config.currency})</label>
                  <input
                    type="number"
                    required
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">مسار سلسلة الموافقين (مرتبة بالتوالي)</label>
                <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-850">
                  <label className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={ruleRoles.includes("Accountant")} 
                      onChange={(e) => {
                        if (e.target.checked) setRuleRoles([...ruleRoles, "Accountant"]);
                        else setRuleRoles(ruleRoles.filter(r => r !== "Accountant"));
                      }}
                    />
                    <span>خطوة 1: محاسب أول / مراجع حسابات فروع</span>
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={ruleRoles.includes("CFO")} 
                      onChange={(e) => {
                        if (e.target.checked) setRuleRoles([...ruleRoles, "CFO"]);
                        else setRuleRoles(ruleRoles.filter(r => r !== "CFO"));
                      }}
                    />
                    <span>خطوة 2: المدير المالي المركزي للمنطقة (CFO)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={ruleRoles.includes("CEO")} 
                      onChange={(e) => {
                        if (e.target.checked) setRuleRoles([...ruleRoles, "CEO"]);
                        else setRuleRoles(ruleRoles.filter(r => r !== "CEO"));
                      }}
                    />
                    <span>خطوة 3: الرئيس التنفيذي للشركة أو المنشأة (CEO)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}
                >
                  حفظ وتفعيل المسار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
