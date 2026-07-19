import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Plus, 
  Server, 
  Database, 
  Sliders, 
  Layers, 
  Building2, 
  MapPin, 
  ClipboardList, 
  Key, 
  Trash2,
  RefreshCw,
  Package
} from "lucide-react";
import { ERPConfig, ChartOfAccount, Supplier, Customer, StockItem } from "../types";
import { getThemeClass } from "./Sidebar";

export type UserRole = "CFO" | "LeadArchitect" | "SeniorAccountant" | "InventoryManager" | "SystemAdmin" | "POSOperator";

interface SecurityModuleProps {
  config: ERPConfig;
  setConfig: React.Dispatch<React.SetStateAction<ERPConfig>>;
  accounts?: ChartOfAccount[];
  setAccounts?: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  suppliers?: Supplier[];
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  stock?: StockItem[];
  setStock?: React.Dispatch<React.SetStateAction<StockItem[]>>;
}

// Initial default scopes if not in config
const DEFAULT_SCOPES = [
  "accounting:read",
  "accounting:write",
  "accounting:post",
  "inventory:read",
  "inventory:write",
  "hr:read",
  "hr:write",
  "manufacturing:read",
  "manufacturing:write",
  "security:admin"
];

// Initial default role mapping
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  CFO: ["accounting:read", "accounting:write", "accounting:post", "inventory:read", "hr:read"],
  LeadArchitect: ["accounting:read", "inventory:read", "hr:read", "manufacturing:read", "security:admin"],
  SeniorAccountant: ["accounting:read", "accounting:write"],
  InventoryManager: ["inventory:read", "inventory:write", "manufacturing:read"],
  SystemAdmin: ["security:admin", "accounting:read", "inventory:read", "hr:read", "manufacturing:read"],
  POSOperator: ["accounting:write", "inventory:read"]
};

interface AuditLog {
  timestamp: string;
  user: string;
  role: string;
  action: string;
  status: "AUTHORIZED" | "BLOCKED" | "BYPASSED" | "POLICY_UPDATED";
  details: string;
  signature: string;
}

export default function SecurityModule({ 
  config, 
  setConfig,
  accounts = [],
  setAccounts,
  suppliers = [],
  setSuppliers,
  customers = [],
  setCustomers,
  stock = [],
  setStock
}: SecurityModuleProps) {
  const clr = getThemeClass(config.theme);

  // Initialize state from config or defaults
  const activeRole = (config.activeRole as UserRole) || "SystemAdmin";
  const scopes = config.dynamicScopes || DEFAULT_SCOPES;
  const rolePermissions = config.rolePermissions || DEFAULT_ROLE_PERMISSIONS;

  const [activeSubTab, setActiveSubTab] = useState<"session" | "matrix" | "rls" | "approval" | "audit">("session");
  const [newScope, setNewScope] = useState("");
  const [newScopeDesc, setNewScopeDesc] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState(config.approvalThreshold || 10000);
  const [approvalRole, setApprovalRole] = useState(config.approvalRequiredRole || "CFO");

  // Onboarding Wizard states
  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [wizardSuccess, setWizardSuccess] = useState("");
  
  // Step 1 Form States (Company)
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compTaxId, setCompTaxId] = useState("");
  const [compCurrency, setCompCurrency] = useState("EGP");
  const [compFiscalYear, setCompFiscalYear] = useState("FY 2026/2027");

  // Step 2 Form States (Branch)
  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchLoc, setBranchLoc] = useState("");
  const [branchComp, setBranchComp] = useState("");

  // Step 3 Form States (Warehouse)
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [whLoc, setWhLoc] = useState("");

  // Step 4 Form States (Suppliers & Customers)
  const [partnerType, setPartnerType] = useState<"customer" | "supplier">("customer");
  // Customer fields
  const [custCodeField, setCustCodeField] = useState("");
  const [custNameField, setCustNameField] = useState("");
  const [custTaxIdField, setCustTaxIdField] = useState("");
  const [custPhoneField, setCustPhoneField] = useState("");
  const [custEmailField, setCustEmailField] = useState("");
  const [custBalanceField, setCustBalanceField] = useState(0);
  // Supplier fields
  const [suppCodeField, setSuppCodeField] = useState("");
  const [suppNameField, setSuppNameField] = useState("");
  const [suppTaxIdField, setSuppTaxIdField] = useState("");
  const [suppPhoneField, setSuppPhoneField] = useState("");
  const [suppEmailField, setSuppEmailField] = useState("");
  const [suppBalanceField, setSuppBalanceField] = useState(0);

  // Step 5 Form States (Stock Item)
  const [itemSkuField, setItemSkuField] = useState("");
  const [itemNameField, setItemNameField] = useState("");
  const [itemWhField, setItemWhField] = useState("");
  const [itemQtyField, setItemQtyField] = useState(50);
  const [itemPriceField, setItemPriceField] = useState(1200);
  const [itemMinField, setItemMinField] = useState(5);
  const [itemCatField, setItemCatField] = useState("برمجيات ونظم تشغيل");

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      user: "System Admin",
      role: "SystemAdmin",
      action: "أمن النظام - قيد دخول",
      status: "AUTHORIZED",
      details: "دخول آمن للمشرف العام، تخطي قيود RLS للفرع والمخزن.",
      signature: "SEC-SIG-82FA93"
    },
    {
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      user: "CFO User",
      role: "CFO",
      action: "محاسبة - كشف حساب",
      status: "AUTHORIZED",
      details: "الاطلاع على الحساب الرئيسي لشركة قمة الخليج الدولية.",
      signature: "SEC-SIG-1A24CD"
    },
    {
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      user: "POS Operator",
      role: "POSOperator",
      action: "محاسبة - ترحيل يدوي",
      status: "BLOCKED",
      details: "محاولة غير مصرح بها لترحيل قيود مبيعات تتجاوز صلاحية الصندوق (BFLA Blocked).",
      signature: "SEC-SIG-F02A44"
    }
  ]);

  // Database audit logs states
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Derive active company/tenant ID to isolate log queries
  const companiesList = (config as any).companiesList || [
    { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
    { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
    { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
  ];
  const activeCompanyObj = companiesList.find((c: any) => (c.value === config.company || c.name === config.company)) || companiesList[0];
  const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "TEN-APEX-01";

  const loadDbLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await fetch(`/api/v1/security/audit-logs?tenantId=${activeCompanyId}`);
      if (!res.ok) throw new Error("API call failed");
      const json = await res.json();
      if (json.success && json.data) {
        setDbLogs(json.data);
      }
    } catch (err) {
      console.error("Failed to load database audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadDbLogs();
  }, [activeCompanyId, activeSubTab]);

  // ==========================================================================
  // REAL-TIME SECURITY ALERTS & ANOMALY DETECTION ENGINE
  // ==========================================================================
  
  interface SecurityAlert {
    id: string;
    title: string;
    message: string;
    severity: "critical" | "high" | "warning";
    timestamp: string;
    type: "REPETITIVE_POST" | "HIGH_VALUE_ANOMALY" | "OFF_HOURS_ACTIVITY" | "BLOCKED_ATTEMPT" | "DUPLICATE_ENTRY";
    resolved: boolean;
  }

  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);

  // Triggered whenever database audit logs or local session logs change
  useEffect(() => {
    const detectedAlerts: SecurityAlert[] = [];
    const makeId = (prefix: string, logId: string) => `${prefix}-${logId}`;

    // 1. Scan DB real-time logs
    if (dbLogs && dbLogs.length > 0) {
      const userActionTimes: Record<string, number[]> = {};

      dbLogs.forEach((log: any) => {
        const timestamp = new Date(log.timestamp);
        const hour = timestamp.getHours();
        let logValues: any = {};
        
        try {
          logValues = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues || {};
        } catch (e) {
          logValues = {};
        }

        // A. Off-hours accounting edits detection (11 PM - 5 AM)
        if (hour >= 23 || hour < 5) {
          const formattedTime = timestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          detectedAlerts.push({
            id: makeId("off-hours", log.id),
            title: "عملية ماليّة حساسة خارج ساعات العمل",
            message: `تم رصد تعديل محاسبي بواسطة الحساب [${log.userId}] في تمام الساعة ${formattedTime}، وهو سلوك يقع خارج النطاق التشغيلي الطبيعي للشركة.`,
            severity: "warning",
            timestamp: log.timestamp,
            type: "OFF_HOURS_ACTIVITY",
            resolved: false
          });
        }

        // B. Extreme value financial logs detection (over the dynamic threshold or 1,000,000)
        const totalAmount = logValues.total || logValues.amount || 0;
        const currentThreshold = approvalThreshold || 1000000;
        if (totalAmount >= currentThreshold) {
          detectedAlerts.push({
            id: makeId("high-value", log.id),
            title: "عملية محاسبية ذات قيمة فائقة الحجم",
            message: `رصدت خوارزميات الأمان محاولة ترحيل أو تعديل قيد مالي بقيمة (${totalAmount.toLocaleString()} ${config.currency})، مما يتجاوز حدود الحماية العادية.`,
            severity: "critical",
            timestamp: log.timestamp,
            type: "HIGH_VALUE_ANOMALY",
            resolved: false
          });
        }

        // Collect timestamps per user for high-frequency/repetitive posting checks
        if (log.userId && (log.action === "POST_JOURNAL_ENTRY" || log.action === "CREATE_JOURNAL_ENTRY" || log.action === "CREATE_SALES_INVOICE")) {
          if (!userActionTimes[log.userId]) {
            userActionTimes[log.userId] = [];
          }
          userActionTimes[log.userId].push(timestamp.getTime());
        }
      });

      // C. High-Frequency postings check (e.g., 3+ financial entries within 2 minutes)
      Object.entries(userActionTimes).forEach(([userId, times]) => {
        times.sort((a, b) => a - b);
        for (let i = 0; i < times.length; i++) {
          let count = 1;
          for (let j = i + 1; j < times.length; j++) {
            if (times[j] - times[i] <= 120000) { // 2 mins window
              count++;
            } else {
              break;
            }
          }
          if (count >= 3) {
            detectedAlerts.push({
              id: `frequency-${userId}-${times[i]}`,
              title: "سلوك تعديل متكرر ومكثف (شبهة إغراق)",
              message: `قام الحساب [${userId}] بإنشاء أو ترحيل ${count} قيود حساسة خلال أقل من دقيقتين، مما يشير إلى أتمتة برمجية أو تعديلات عشوائية غير معتادة.`,
              severity: "high",
              timestamp: new Date(times[i]).toISOString(),
              type: "REPETITIVE_POST",
              resolved: false
            });
            break; // Alert once for this sequence
          }
        }
      });

      // D. Exact duplicate entries detection within 5 minutes (same amount, same description)
      for (let i = 0; i < dbLogs.length; i++) {
        const logA = dbLogs[i];
        let valA: any = {};
        try { valA = typeof logA.newValues === "string" ? JSON.parse(logA.newValues) : logA.newValues || {}; } catch(e){}
        const amtA = valA.total || valA.amount;
        const descA = valA.description || valA.details;
        const timeA = new Date(logA.timestamp).getTime();

        if (!amtA || !descA) continue;

        for (let j = i + 1; j < dbLogs.length; j++) {
          const logB = dbLogs[j];
          let valB: any = {};
          try { valB = typeof logB.newValues === "string" ? JSON.parse(logB.newValues) : logB.newValues || {}; } catch(e){}
          const amtB = valB.total || valB.amount;
          const descB = valB.description || valB.details;
          const timeB = new Date(logB.timestamp).getTime();

          if (amtA === amtB && descA === descB && Math.abs(timeA - timeB) <= 300000) { // 5 minutes window
            detectedAlerts.push({
              id: makeId("duplicate", `${logA.id}-${logB.id}`),
              title: "شبهة تكرار قيود أو عمليات احتيال مالي مكررة",
              message: `تم إصدار مستندين ماليين متطابقين تماماً بالقيمة (${amtA.toLocaleString()} ${config.currency}) والوصف ("${descA}") بفارق زمني أقل من 5 دقائق.`,
              severity: "high",
              timestamp: logA.timestamp,
              type: "DUPLICATE_ENTRY",
              resolved: false
            });
            break;
          }
        }
      }
    }

    // 2. Scan Local Session Logs (for instant browser-blocked/unauthorized events)
    auditLogs.forEach((log, index) => {
      if (log.status === "BLOCKED") {
        detectedAlerts.push({
          id: `local-blocked-${index}-${log.timestamp}`,
          title: "محاولة اختراق الصلاحيات والوصول للواجهات",
          message: `تم حظر محاولة غير مصرح بها للوصول أو التعديل بواسطة [${log.user}] (${log.role}): ${log.details}`,
          severity: "critical",
          timestamp: new Date().toISOString(),
          type: "BLOCKED_ATTEMPT",
          resolved: false
        });
      }
    });

    // Merge with persistent user-resolved alerts
    const previousResolved = JSON.parse(localStorage.getItem("apex_resolved_alerts") || "[]");
    const merged = detectedAlerts.map(alert => {
      if (previousResolved.includes(alert.id)) {
        return { ...alert, resolved: true };
      }
      return alert;
    });

    // Order by critical/high first, then by timestamp descending
    merged.sort((a, b) => {
      if (a.resolved && !b.resolved) return 1;
      if (!a.resolved && b.resolved) return -1;
      const severityWeight = { critical: 3, high: 2, warning: 1 };
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    });

    setAlerts(merged);
  }, [dbLogs, auditLogs, approvalThreshold]);

  // Handle marking an alert as resolved / addressed
  const handleResolveAlert = (alertId: string) => {
    const previousResolved = JSON.parse(localStorage.getItem("apex_resolved_alerts") || "[]");
    if (!previousResolved.includes(alertId)) {
      previousResolved.push(alertId);
      localStorage.setItem("apex_resolved_alerts", JSON.stringify(previousResolved));
    }
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
  };

  // ==========================================================================
  // ONBOARDING WIZARD HANDLERS
  // ==========================================================================

  const handleAddCompanyWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compCode || !compName) {
      setWizardSuccess("❌ يرجى ملء حقل كود الشركة واسم الشركة الرئيسي.");
      return;
    }
    const currentCompanies: any[] = (config as any).companiesList || [
      { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
      { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
      { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
    ];
    if (currentCompanies.some((c: any) => c.id === compCode || c.name === compName)) {
      setWizardSuccess("❌ هذه الشركة أو الكود مسجل بالفعل في النظام.");
      return;
    }
    const newCompany = { id: compCode, name: compName, value: compName, taxId: compTaxId, currency: compCurrency };
    const updatedCompanies = [...currentCompanies, newCompany];
    
    setConfig({
      ...config,
      companiesList: updatedCompanies,
      company: compName,
      currency: compCurrency,
      fiscalYear: compFiscalYear
    } as any);

    // Add security audit log
    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [
      {
        timestamp,
        user: "أحمد خضر",
        role: "SystemAdmin",
        action: "تأسيس منشأة جديدة",
        status: "AUTHORIZED",
        details: `تم بنجاح تأسيس شركة جديدة باسم "${compName}" تحت الرقم الضريبي ${compTaxId || 'غير محدد'} بنظام العملات المتعددة.`,
        signature: "SEC-SIG-" + Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()
      },
      ...prev
    ]);

    setWizardSuccess(`✅ تم بنجاح تأسيس شركة "${compName}" وتفعيلها كشركة حالية نشطة بالنظام!`);
    setCompCode("");
    setCompName("");
    setCompTaxId("");
  };

  const handleAddBranchWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode || !branchName) {
      setWizardSuccess("❌ يرجى ملء كود الفرع واسم الفرع.");
      return;
    }
    const currentBranches: any[] = (config as any).branchesList || [
      { id: "BR-CAI-01", name: "الإدارة العامة بالقاهرة (شيراتون)", value: "Cairo Headquarters", companyId: "TEN-APEX-01" },
      { id: "BR-ALX-02", name: "مكتب ميناء الإسكندرية اللوجستي", value: "Alex Port Gateway", companyId: "TEN-APEX-01" },
      { id: "BR-DXB-03", name: "مكتب جافزا دبي الإقليمي", value: "Dubai JAFZA Branch", companyId: "TEN-GULF-02" }
    ];
    if (currentBranches.some((b: any) => b.id === branchCode)) {
      setWizardSuccess("❌ كود الفرع مسجل مسبقاً.");
      return;
    }
    const newBranch = { 
      id: branchCode, 
      name: branchName, 
      value: branchName, 
      location: branchLoc, 
      companyId: branchComp || config.company 
    };
    const updatedBranches = [...currentBranches, newBranch];
    setConfig({
      ...config,
      branchesList: updatedBranches,
      branch: branchName
    } as any);

    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [
      {
        timestamp,
        user: "أحمد خضر",
        role: "SystemAdmin",
        action: "إضافة فرع جديد",
        status: "AUTHORIZED",
        details: `تمت إضافة فرع "${branchName}" الجديد وربطه بالشركة النشطة ومزامنته للـ RLS.`,
        signature: "SEC-SIG-" + Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()
      },
      ...prev
    ]);

    setWizardSuccess(`✅ تم بنجاح إنشاء فرع "${branchName}" وربطه بالمنشأة وتفعيله كفرع حالي!`);
    setBranchCode("");
    setBranchName("");
    setBranchLoc("");
  };

  const handleAddWarehouseWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whCode || !whName) {
      setWizardSuccess("❌ يرجى إدخال كود واسم المستودع.");
      return;
    }
    const currentWarehouses: any[] = (config as any).warehousesList || [
      { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي", value: "WH-CAI-01", branchId: "BR-CAI-01" },
      { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية", value: "WH-ALX-02", branchId: "BR-ALX-02" },
      { id: "WH-DXB-03", name: "مركز جافزا دبي الدولي", value: "WH-DXB-03", branchId: "BR-DXB-03" }
    ];
    if (currentWarehouses.some((w: any) => w.id === whCode)) {
      setWizardSuccess("❌ كود المستودع هذا مستخدم بالفعل.");
      return;
    }
    const newWh = {
      id: whCode,
      name: whName,
      value: whCode,
      location: whLoc,
      branchId: config.branch
    };
    const updatedWarehouses = [...currentWarehouses, newWh];
    setConfig({
      ...config,
      warehousesList: updatedWarehouses,
      warehouse: whCode
    } as any);

    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [
      {
        timestamp,
        user: "أحمد خضر",
        role: "SystemAdmin",
        action: "تأسيس مستودع",
        status: "AUTHORIZED",
        details: `تم تسجيل المستودع الجديد "${whName} (${whCode})" وتفعيله ببطاقة المخزون.`,
        signature: "SEC-SIG-" + Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()
      },
      ...prev
    ]);

    setWizardSuccess(`✅ تم بنجاح تأسيس مستودع "${whName}" وتحديده كمستودع تخزين افتراضي!`);
    setWhCode("");
    setWhName("");
    setWhLoc("");
  };

  const handleAddPartnerWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (partnerType === "customer") {
      if (!custCodeField || !custNameField) {
        setWizardSuccess("❌ يرجى إدخال كود واسم العميل.");
        return;
      }
      if (customers.some(c => c.id === custCodeField)) {
        setWizardSuccess("❌ كود العميل مسجل بالفعل.");
        return;
      }
      const newCust: Customer = {
        id: custCodeField,
        name: custNameField,
        taxRegistrationNumber: custTaxIdField || "112233445",
        phone: custPhoneField || "010000000",
        email: custEmailField || "info@client.com",
        balance: custBalanceField || 0
      };
      if (setCustomers) {
        setCustomers([...customers, newCust]);
      }
      setWizardSuccess(`✅ تم بنجاح تسجيل العميل "${custNameField}" في قاعدة البيانات وضمن سياق الأستاذ المساعد!`);
      setCustCodeField("");
      setCustNameField("");
      setCustTaxIdField("");
      setCustPhoneField("");
      setCustEmailField("");
      setCustBalanceField(0);
    } else {
      if (!suppCodeField || !suppNameField) {
        setWizardSuccess("❌ يرجى إدخال كود واسم المورد.");
        return;
      }
      if (suppliers.some(s => s.id === suppCodeField)) {
        setWizardSuccess("❌ كود المورد مسجل بالفعل.");
        return;
      }
      const newSupp: Supplier = {
        id: suppCodeField,
        name: suppNameField,
        taxRegistrationNumber: suppTaxIdField || "556677889",
        phone: suppPhoneField || "011111111",
        email: suppEmailField || "info@supplier.com",
        balance: suppBalanceField || 0
      };
      if (setSuppliers) {
        setSuppliers([...suppliers, newSupp]);
      }
      setWizardSuccess(`✅ تم بنجاح تسجيل المورد "${suppNameField}" وتفعيل بطاقة الحساب الدائن له!`);
      setSuppCodeField("");
      setSuppNameField("");
      setSuppTaxIdField("");
      setSuppPhoneField("");
      setSuppEmailField("");
      setSuppBalanceField(0);
    }

    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [
      {
        timestamp,
        user: "أحمد خضر",
        role: "SystemAdmin",
        action: "تسجيل عميل/مورد",
        status: "AUTHORIZED",
        details: `تم تسجيل جهة تعامل جديدة (${partnerType === "customer" ? "عميل: " + custNameField : "مورد: " + suppNameField}) بالأستاذ المساعد.`,
        signature: "SEC-SIG-" + Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()
      },
      ...prev
    ]);
  };

  const handleAddItemWizard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSkuField || !itemNameField) {
      setWizardSuccess("❌ يرجى إدخال رمز الصنف (SKU) واسم المنتج.");
      return;
    }
    if (stock.some(s => s.sku === itemSkuField)) {
      setWizardSuccess("❌ رمز الصنف (SKU) مسجل بالفعل في مخازن النظام.");
      return;
    }
    const targetWh = itemWhField || config.warehouse || "WH-CAI-01";
    const newItem: StockItem = {
      sku: itemSkuField,
      name: itemNameField,
      warehouseId: targetWh,
      quantity: itemQtyField || 0,
      unitPrice: itemPriceField || 0,
      minLevel: itemMinField || 5,
      category: itemCatField || "عام"
    };
    if (setStock) {
      setStock([...stock, newItem]);
    }

    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [
      {
        timestamp,
        user: "أحمد خضر",
        role: "SystemAdmin",
        action: "تسجيل صنف مخزني",
        status: "AUTHORIZED",
        details: `تم إدراج الصنف الجديد "${itemNameField} (${itemSkuField})" برصيد افتتاحي قدره ${itemQtyField} وحدة بالمستودع ${targetWh}.`,
        signature: "SEC-SIG-" + Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()
      },
      ...prev
    ]);

    setWizardSuccess(`✅ تم بنجاح إدراج الصنف مخزنياً برصيد افتتاحي قدره ${itemQtyField} وحدة!`);
    setItemSkuField("");
    setItemNameField("");
    setItemQtyField(50);
    setItemPriceField(1200);
  };

  // Handle active role switch
  const handleRoleChange = (role: string) => {
    setConfig(prev => ({ ...prev, activeRole: role }));
    addAuditLog("تعديل سياق الجلسة", `تغيير دور المستخدم النشط إلى: ${role}`, "AUTHORIZED", role);
  };

  const addAuditLog = async (action: string, details: string, status: "AUTHORIZED" | "BLOCKED" | "BYPASSED" | "POLICY_UPDATED", roleOverride?: string) => {
    const curRole = roleOverride || activeRole;
    const timestampStr = new Date().toLocaleTimeString();

    // Async post to real PostgreSQL audit trail
    try {
      const response = await fetch("/api/v1/security/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `${status === "POLICY_UPDATED" ? "SECURITY_POLICY" : "SECURITY_AUDIT"} - ${action}`,
          tableName: "security_config",
          recordId: curRole,
          newValues: { details, user: `${curRole} Operator`, role: curRole, status }
        })
      });
      const data = await response.json();
      const signature = data.signature || "PENDING_SERVER_SIG";

      const newLog: AuditLog = {
        timestamp: timestampStr,
        user: `${curRole} Operator`,
        role: curRole,
        action,
        status,
        details,
        signature
      };
      setAuditLogs(prev => [newLog, ...prev]);
      loadDbLogs();
    } catch (err) {
      console.error("Failed to sync audit log to server:", err);
      const newLog: AuditLog = {
        timestamp: timestampStr,
        user: `${curRole} Operator`,
        role: curRole,
        action,
        status,
        details,
        signature: "OFFLINE_FALLBACK"
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  // Toggle permission
  const togglePermission = (role: string, scope: string) => {
    const currentRolePermissions = rolePermissions[role] || [];
    let updated: string[];
    if (currentRolePermissions.includes(scope)) {
      updated = currentRolePermissions.filter(s => s !== scope);
      addAuditLog("تعديل الصلاحيات", `سحب صلاحية [${scope}] من دور [${role}]`, "POLICY_UPDATED");
    } else {
      updated = [...currentRolePermissions, scope];
      addAuditLog("تعديل الصلاحيات", `منح صلاحية [${scope}] لدور [${role}]`, "POLICY_UPDATED");
    }

    const updatedMap = {
      ...rolePermissions,
      [role]: updated
    };

    setConfig(prev => ({
      ...prev,
      rolePermissions: updatedMap
    }));
  };

  // Add custom scope
  const handleAddScope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScope) return;
    const cleanedScope = newScope.toLowerCase().replace(/\s+/g, ":");
    if (scopes.includes(cleanedScope)) {
      alert("الصلاحية موجودة بالفعل!");
      return;
    }

    const updatedScopes = [...scopes, cleanedScope];
    setConfig(prev => ({
      ...prev,
      dynamicScopes: updatedScopes
    }));

    addAuditLog("صلاحية ديناميكية جديدة", `إضافة نطاق صلاحية جديد بالنظام: ${cleanedScope}`, "POLICY_UPDATED");
    setNewScope("");
    setNewScopeDesc("");
  };

  // Toggle RLS configuration
  const toggleRls = (field: "enableRlsTenant" | "enableRlsBranch" | "enableRlsWarehouse") => {
    const newVal = !config[field];
    setConfig(prev => ({
      ...prev,
      [field]: newVal
    }));
    const rlsName = field === "enableRlsTenant" ? "عزل الشركة" : field === "enableRlsBranch" ? "عزل الفرع" : "عزل المستودع";
    addAuditLog("تعديل سياسة RLS", `تغيير وضع أمان السجلات [${rlsName}] إلى: ${newVal ? "نشط" : "معطل"}`, "POLICY_UPDATED");
  };

  // Save Approval policy
  const handleSaveApprovalPolicy = () => {
    setConfig(prev => ({
      ...prev,
      approvalThreshold,
      approvalRequiredRole: approvalRole
    }));
    addAuditLog("تحديث سياسة الاعتماد", `تعديل حد الترحيل إلى ${approvalThreshold.toLocaleString()} وتعيين دور المعتمد [${approvalRole}]`, "POLICY_UPDATED");
    alert("تم حفظ سياسة الاعتماد بنجاح وتعميمها على القيود!");
  };

  return (
    <div className="space-y-6 relative" id="security-module-main" dir="rtl">
      
      {/* REAL-TIME VISUAL SECURITY TOASTS */}
      <div className="fixed top-20 left-4 z-50 space-y-3 max-w-sm w-full pointer-events-none" dir="rtl">
        {alerts.filter(a => !a.resolved && !dismissedToastIds.includes(a.id)).slice(0, 3).map((alert) => {
          const bgClass = 
            alert.severity === "critical" ? "bg-slate-950/95 border-rose-500/80 text-slate-100 shadow-2xl shadow-rose-950/50" :
            alert.severity === "high" ? "bg-slate-950/95 border-amber-500/80 text-slate-100 shadow-2xl shadow-amber-950/50" :
            "bg-slate-950/95 border-cyan-500/80 text-slate-100 shadow-2xl shadow-cyan-950/50";
          const iconColor = 
            alert.severity === "critical" ? "text-rose-400" :
            alert.severity === "high" ? "text-amber-400" :
            "text-cyan-400";
          const headerBadge = 
            alert.severity === "critical" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
            alert.severity === "high" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
            "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";

          return (
            <div 
              key={alert.id} 
              className={`p-4 rounded-xl border backdrop-blur-md pointer-events-auto flex flex-col gap-2.5 transition-all animate-slideIn ${bgClass}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg bg-slate-900/80 shrink-0 ${iconColor} border border-slate-800`}>
                  <ShieldAlert className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-1 text-right flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${headerBadge}`}>
                      {alert.severity === "critical" ? "تهديد حرج" : alert.severity === "high" ? "تنبيه هام" : "تحذير أمني"}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold font-display text-slate-100 leading-tight mt-1">{alert.title}</h4>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">{alert.message}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-1.5 border-t border-slate-850 pt-2 text-[10px]">
                <button
                  onClick={() => setDismissedToastIds(prev => [...prev, alert.id])}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded transition-all cursor-pointer font-sans"
                >
                  تجاهل مؤقت
                </button>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-2.5 py-1 text-slate-950 hover:bg-opacity-90 bg-emerald-400 font-bold rounded transition-all cursor-pointer font-sans flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3 inline" /> معالجة وحل التهديد
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Module Title / Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${clr.bg} ${clr.text} border ${clr.border}`}>
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-100">بوابة الأمان المتقدم وإدارة الصلاحيات (RBAC)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            التحكم في الهوية الرقمية، الصلاحيات الديناميكية، سياسات عزل السجلات والأرصدة (Tenant/Branch RLS) والامتثال لتدقيق OWASP.
          </p>
        </div>
        
        {/* Dynamic User switcher */}
        <div className="bg-slate-900/50 p-2 border border-slate-800 rounded-lg flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-sans">تغيير دور المستخدم الحالي للمحاكاة:</span>
          <select
            value={activeRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-[#141b2d] text-xs font-bold text-slate-200 border border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-sans cursor-pointer"
          >
            {Object.keys(rolePermissions).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Internal Security Sub-tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("session")}
          className={`px-4 py-2.5 text-xs font-bold font-display transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === "session" 
              ? "border-cyan-500 text-cyan-400" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4 inline-block ml-1.5" />
          جلسة العمل والمصادقة
        </button>
        <button
          onClick={() => setActiveSubTab("matrix")}
          className={`px-4 py-2.5 text-xs font-bold font-display transition-all border-b-2 cursor-pointer ${
            activeSubTab === "matrix" 
              ? "border-cyan-500 text-cyan-400" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="h-4 w-4 inline-block ml-1.5" />
          مصفوفة الصلاحيات (Matrix)
        </button>
        <button
          onClick={() => setActiveSubTab("rls")}
          className={`px-4 py-2.5 text-xs font-bold font-display transition-all border-b-2 cursor-pointer ${
            activeSubTab === "rls" 
              ? "border-cyan-500 text-cyan-400" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="h-4 w-4 inline-block ml-1.5" />
          أمان السجلات وعزل الفروع (RLS)
        </button>
        <button
          onClick={() => setActiveSubTab("approval")}
          className={`px-4 py-2.5 text-xs font-bold font-display transition-all border-b-2 cursor-pointer ${
            activeSubTab === "approval" 
              ? "border-cyan-500 text-cyan-400" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 inline-block ml-1.5" />
          سياسات الاعتماد والحدود
        </button>
        <button
          onClick={() => setActiveSubTab("audit")}
          className={`px-4 py-2.5 text-xs font-bold font-display transition-all border-b-2 cursor-pointer relative ${
            activeSubTab === "audit" 
              ? "border-cyan-500 text-cyan-400" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ClipboardList className="h-4 w-4 inline-block ml-1.5" />
          سجل التدقيق الأمني (Audit Trail)
          <span className="absolute top-1.5 left-2 bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.2 rounded-full border border-red-500/40">
            {auditLogs.length}
          </span>
          {alerts.some(a => !a.resolved) && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Main Container Content */}
      <div className="bg-[#0b0f19]/80 border border-slate-800/60 rounded-xl shadow-lg p-6">
        
        {/* TAB 0: Onboarding Portal & Company Setup Wizard */}
        {false && (
          <div className="space-y-6">
            <div className="bg-[#121824] p-5 rounded-xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5 text-right flex-1">
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
                  دليل بدء العمل والتأسيس الذكي
                </span>
                <h3 className="text-base font-bold text-slate-100 font-display">بوابة تهيئة وإعداد المنشآت الجديدة وتأسيس النشاط</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  أهلاً بك في دليل التأسيس السريع لنظام **ApexSaaS ERP**. اتبع الخطوات الخمس أدناه لتسجيل شركتك، فروعها، مستودعاتها، ومورديك وعملائك وأصنافك لتبدأ العمل فورا بنظام محاسبي مالي متكامل.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-[#0a0d16] p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans">التقدم الحالي:</span>
                <strong className="text-xs font-mono text-emerald-400">الخطوة {activeWizardStep} من 5</strong>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="grid grid-cols-5 gap-2 md:gap-4 text-center">
              {[
                { step: 1, label: "تأسيس الشركة", icon: Building2, color: "text-emerald-400", border: "border-emerald-500" },
                { step: 2, label: "إضافة الفروع", icon: Layers, color: "text-cyan-400", border: "border-cyan-500" },
                { step: 3, label: "تهيئة المخازن", icon: MapPin, color: "text-pink-400", border: "border-pink-500" },
                { step: 4, label: "شركاء الأعمال", icon: Sliders, color: "text-amber-400", border: "border-amber-500" },
                { step: 5, label: "تعريف الأصناف", icon: Package, color: "text-purple-400", border: "border-purple-500" }
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeWizardStep === item.step;
                const isCompleted = activeWizardStep > item.step;
                return (
                  <button
                    key={item.step}
                    onClick={() => {
                      setActiveWizardStep(item.step as any);
                      setWizardSuccess("");
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive 
                        ? `bg-[#121824] ${item.border}/40 shadow-md ring-1 ring-slate-800` 
                        : isCompleted 
                          ? "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200" 
                          : "bg-slate-950/20 border-slate-900 text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <div className={`p-2 rounded-lg mb-2 ${
                      isActive ? "bg-slate-800/80 " + item.color : isCompleted ? "bg-emerald-950/20 text-emerald-400" : "bg-slate-950"
                    }`}>
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[10px] md:text-[11px] font-bold font-display block whitespace-nowrap">{item.label}</span>
                    <span className="text-[9px] font-mono text-slate-500 mt-1 block">خطوة {item.step}</span>
                  </button>
                );
              })}
            </div>

            {/* Notification Bar */}
            {wizardSuccess && (
              <div className={`p-3.5 rounded-lg text-xs font-sans text-right ${
                wizardSuccess.startsWith("❌") ? "bg-red-950/20 border border-red-500/20 text-red-400" : "bg-emerald-950/20 border border-emerald-500/20 text-emerald-400"
              }`}>
                {wizardSuccess}
              </div>
            )}

            {/* Step Contents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Form Area */}
              <div className="lg:col-span-2 bg-[#0d1220] border border-slate-800 rounded-xl p-5 space-y-4">
                
                {/* STEP 1: Company Registration */}
                {activeWizardStep === 1 && (
                  <form onSubmit={handleAddCompanyWizard} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <Building2 className="h-5 w-5 text-emerald-400" />
                      <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 1: تسجيل منشأة / شركة جديدة في قاعدة البيانات</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">كود الشركة الفني الفريد (Tenant Code) *</label>
                        <input
                          type="text"
                          required
                          value={compCode}
                          onChange={(e) => setCompCode(e.target.value.toUpperCase())}
                          placeholder="مثال: TEN-KHODR-01"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الاسم القانوني للشركة (Company Name) *</label>
                        <input
                          type="text"
                          required
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                          placeholder="مثال: شركة خضر للتطوير المالي"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الرقم الضريبي الموحد للشركة</label>
                        <input
                          type="text"
                          value={compTaxId}
                          onChange={(e) => setCompTaxId(e.target.value)}
                          placeholder="مثال: 987654321"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">عملة النشاط الرئيسية</label>
                        <select
                          value={compCurrency}
                          onChange={(e) => setCompCurrency(e.target.value)}
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                        >
                          <option value="EGP">جنيه مصري (EGP)</option>
                          <option value="AED">درهم إماراتي (AED)</option>
                          <option value="SAR">ريال سعودي (SAR)</option>
                          <option value="USD">دولار أمريكي (USD)</option>
                          <option value="EUR">يورو أوروبي (EUR)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">السنة المالية النشطة</label>
                        <input
                          type="text"
                          required
                          value={compFiscalYear}
                          onChange={(e) => setCompFiscalYear(e.target.value)}
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                    >
                      <Building2 className="h-4 w-4" />
                      تأسيس الشركة وإضافتها للخدمة
                    </button>
                  </form>
                )}

                {/* STEP 2: Add Branches */}
                {activeWizardStep === 2 && (
                  <form onSubmit={handleAddBranchWizard} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <Layers className="h-5 w-5 text-cyan-400" />
                      <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 2: تسجيل فروع ومكاتب فرعية للمنشأة النشطة</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">كود الفرع الفريد *</label>
                        <input
                          type="text"
                          required
                          value={branchCode}
                          onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                          placeholder="مثال: BR-GIZA-02"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">اسم الفرع الجديد *</label>
                        <input
                          type="text"
                          required
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="مثال: فرع الجيزة والمنطقة الغربية"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">موقع الفرع / العنوان الجغرافي</label>
                        <input
                          type="text"
                          value={branchLoc}
                          onChange={(e) => setBranchLoc(e.target.value)}
                          placeholder="مثال: الجيزة - شارع جامعة الدول العربية"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">ربط الفرع بالشركة</label>
                        <select
                          value={branchComp}
                          onChange={(e) => setBranchComp(e.target.value)}
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-sans cursor-pointer"
                        >
                          <option value="">{config.company} (الشركة الحالية النشطة)</option>
                          {((config as any).companiesList || []).map((c: any) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                    >
                      <Layers className="h-4 w-4" />
                      حفظ الفرع في النظام وربطه محاسبياً
                    </button>
                  </form>
                )}

                {/* STEP 3: Add Warehouses */}
                {activeWizardStep === 3 && (
                  <form onSubmit={handleAddWarehouseWizard} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <MapPin className="h-5 w-5 text-pink-400" />
                      <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 3: تأسيس مستودعات تخزين لوجستية للفرع النشط</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">كود المستودع الموحد *</label>
                        <input
                          type="text"
                          required
                          value={whCode}
                          onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                          placeholder="مثال: WH-GIZA-02"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">اسم المستودع / المخزن *</label>
                        <input
                          type="text"
                          required
                          value={whName}
                          onChange={(e) => setWhName(e.target.value)}
                          placeholder="مثال: مستودع الجيزة اللوجستي المركزي"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-pink-500 font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">موقع المستودع أو العنوان اللوجستي</label>
                      <input
                        type="text"
                        value={whLoc}
                        onChange={(e) => setWhLoc(e.target.value)}
                        placeholder="مثال: المنطقة الصناعية بمدينة 6 أكتوبر"
                        className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-pink-500 font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                    >
                      <MapPin className="h-4 w-4" />
                      تأسيس المستودع وتنشيط بطاقة الجرد له
                    </button>
                  </form>
                )}

                {/* STEP 4: Suppliers & Customers */}
                {activeWizardStep === 4 && (
                  <form onSubmit={handleAddPartnerWizard} className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-5 w-5 text-amber-400" />
                        <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 4: تسجيل العملاء والموردين وبدء الأرصدة الافتتاحية</h4>
                      </div>
                      
                      {/* Inner Subtabs */}
                      <div className="flex items-center gap-1 bg-[#0a0c16] p-1 rounded-lg border border-slate-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setPartnerType("customer"); setWizardSuccess(""); }}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            partnerType === "customer" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          عميل جديد
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPartnerType("supplier"); setWizardSuccess(""); }}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            partnerType === "supplier" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          مورد جديد
                        </button>
                      </div>
                    </div>

                    {partnerType === "customer" ? (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">كود العميل (Customer Code) *</label>
                            <input
                              type="text"
                              required
                              value={custCodeField}
                              onChange={(e) => setCustCodeField(e.target.value.toUpperCase())}
                              placeholder="مثال: CUST-KHODR-101"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">اسم العميل / المنشأة *</label>
                            <input
                              type="text"
                              required
                              value={custNameField}
                              onChange={(e) => setCustNameField(e.target.value)}
                              placeholder="مثال: شركة النيل للتوزيع"
                              className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 font-sans"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الرقم الضريبي للعميل</label>
                            <input
                              type="text"
                              value={custTaxIdField}
                              onChange={(e) => setCustTaxIdField(e.target.value)}
                              placeholder="الرقم الضريبي (9 أرقام)"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">هاتف العميل</label>
                            <input
                              type="text"
                              value={custPhoneField}
                              onChange={(e) => setCustPhoneField(e.target.value)}
                              placeholder="مثال: 01002345678"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الرصيد الافتتاحي المدين ({config.currency})</label>
                            <input
                              type="number"
                              value={custBalanceField}
                              onChange={(e) => setCustBalanceField(Number(e.target.value))}
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">البريد الإلكتروني للعميل</label>
                          <input
                            type="email"
                            value={custEmailField}
                            onChange={(e) => setCustEmailField(e.target.value)}
                            placeholder="billing@nile-dist.com"
                            className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">كود المورد (Supplier Code) *</label>
                            <input
                              type="text"
                              required
                              value={suppCodeField}
                              onChange={(e) => setSuppCodeField(e.target.value.toUpperCase())}
                              placeholder="مثال: SUPP-AL-MANSOUR-201"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">اسم المورد / شركة التوريد *</label>
                            <input
                              type="text"
                              required
                              value={suppNameField}
                              onChange={(e) => setSuppNameField(e.target.value)}
                              placeholder="مثال: مجموعة المنصور اللوجستية"
                              className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 font-sans"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الرقم الضريبي للمورد</label>
                            <input
                              type="text"
                              value={suppTaxIdField}
                              onChange={(e) => setSuppTaxIdField(e.target.value)}
                              placeholder="الرقم الضريبي (9 أرقام)"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">هاتف المورد</label>
                            <input
                              type="text"
                              value={suppPhoneField}
                              onChange={(e) => setSuppPhoneField(e.target.value)}
                              placeholder="مثال: 01112223344"
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الرصيد الافتتاحي الدائن ({config.currency})</label>
                            <input
                              type="number"
                              value={suppBalanceField}
                              onChange={(e) => setSuppBalanceField(Number(e.target.value))}
                              className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">البريد الإلكتروني للمورد</label>
                          <input
                            type="email"
                            value={suppEmailField}
                            onChange={(e) => setSuppEmailField(e.target.value)}
                            placeholder="sales@al-mansour.com"
                            className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                    >
                      <Sliders className="h-4 w-4" />
                      {partnerType === "customer" ? "تسجيل العميل وبدء حسابه بالأستاذ" : "تسجيل المورد وفتح بطاقة حسابه الدائن"}
                    </button>
                  </form>
                )}

                {/* STEP 5: Items Definition */}
                {activeWizardStep === 5 && (
                  <form onSubmit={handleAddItemWizard} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <Package className="h-5 w-5 text-purple-400" />
                      <h4 className="text-xs font-bold text-slate-200 font-display">الخطوة 5: تعريف أصناف المنتجات وبدء كمية الرصيد الافتتاحي للمخزن</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">رمز الصنف الفريد (SKU) *</label>
                        <input
                          type="text"
                          required
                          value={itemSkuField}
                          onChange={(e) => setItemSkuField(e.target.value.toUpperCase())}
                          placeholder="مثال: SFT-ERP-KHODR"
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">اسم الصنف / المنتج المالي *</label>
                        <input
                          type="text"
                          required
                          value={itemNameField}
                          onChange={(e) => setItemNameField(e.target.value)}
                          placeholder="مثال: رخصة نظام خضر المالي السحابية"
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">مستودع الاستلام</label>
                        <select
                          value={itemWhField}
                          onChange={(e) => setItemWhField(e.target.value)}
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500 font-sans cursor-pointer"
                        >
                          <option value="">{config.warehouse} (المستودع الافتراضي النشط)</option>
                          {((config as any).warehousesList || [
                            { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي" },
                            { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية" },
                            { id: "WH-DXB-03", name: "مركز جافزا دبي الدولي" }
                          ]).map((w: any) => (
                            <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الكمية الافتتاحية للمخزن</label>
                        <input
                          type="number"
                          value={itemQtyField}
                          onChange={(e) => setItemQtyField(Number(e.target.value))}
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">سعر تكلفة الوحدة ({config.currency})</label>
                        <input
                          type="number"
                          value={itemPriceField}
                          onChange={(e) => setItemPriceField(Number(e.target.value))}
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الحد الأدنى للأمان (Reorder Level)</label>
                        <input
                          type="number"
                          value={itemMinField}
                          onChange={(e) => setItemMinField(Number(e.target.value))}
                          className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1.5 font-sans">الفئة / التصنيف</label>
                        <input
                          type="text"
                          value={itemCatField}
                          onChange={(e) => setItemCatField(e.target.value)}
                          className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500 font-sans"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                    >
                      <Package className="h-4 w-4" />
                      إدراج الصنف في بطاقة المخزون وحفظ الكميات
                    </button>
                  </form>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    disabled={activeWizardStep === 1}
                    onClick={() => { setActiveWizardStep((prev) => (prev - 1) as any); setWizardSuccess(""); }}
                    className="bg-[#151c30] hover:bg-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all border border-slate-700/50"
                  >
                    السابق
                  </button>
                  
                  {activeWizardStep < 5 ? (
                    <button
                      type="button"
                      onClick={() => { setActiveWizardStep((prev) => (prev + 1) as any); setWizardSuccess(""); }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all"
                    >
                      التالي
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-sans italic flex items-center gap-1">
                      ✨ تم اكتمال كافة خطوات التهيئة الذكية للنشاط بنجاح!
                    </div>
                  )}
                </div>

              </div>

              {/* Informative Expert Tip Sidebar */}
              <div className="space-y-4">
                
                {/* Visual Step Indicator Info */}
                <div className="bg-[#121824] rounded-xl border border-slate-800 p-4.5 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-400" />
                    تأثير التغييرات في النظام
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800/50 space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono block">سياق قاعدة البيانات (RLS Schema):</span>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        البيانات المدخلة يتم حفظها وتغليفها تحت معرّف الشركة الحالي النشط لمنع تداخل صلاحيات الوصول لغير المستخدمين المصرح لهم.
                      </p>
                    </div>

                    <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-800/50 space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono block">الأستاذ العام والموازين:</span>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        الرصيد الافتتاحي للعملاء، الموردين، والأصناف يتزامن تلقائياً لتوليد القيود الافتتاحية وتهيئة ميزان المراجعة لتبدأ العمليات الفعلية فوراً.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Educational Tips Box */}
                <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-4.5">
                  <h4 className="text-xs font-bold text-emerald-400 font-display mb-2">💡 دليل التأسيس والتعليمات المالية</h4>
                  {activeWizardStep === 1 && (
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      تأسيس الشركة في البداية هو حجر الأساس للنظام؛ حيث يقوم بإنشاء معرّف عزل مستقل (Tenant ID) في قاعدة البيانات يضمن سرية وأمان كافة العمليات والبيانات الضريبية عن أي فروع أو شركات أخرى.
                    </p>
                  )}
                  {activeWizardStep === 2 && (
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      يمكنك ربط أكثر من فرع تشغيلي بنفس الشركة لتشجيع الرقابة المركزية؛ حيث يمنع تفعيل ميزة عزل الفروع (Branch RLS) الموظفين من تصفح حسابات الفروع الأخرى لزيادة السرية والأمان.
                    </p>
                  )}
                  {activeWizardStep === 3 && (
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      تحديد مخازن ومستودعات مستقلة للشركة يسهل عملية تتبع حركة الأصناف وجرد البضاعة وإجراء تسويات العجز والزيادة بشكل مستقل لكل موقع جغرافي.
                    </p>
                  )}
                  {activeWizardStep === 4 && (
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      تسجيل العملاء والموردين بالرقم الضريبي الموحد هو متطلب أساسي في الفاتورة الإلكترونية لتجنب الغرامات المالية من هيئة الضرائب. الرصيد الافتتاحي سينشئ قيداً افتتاحياً تلقائياً في حسابات الأستاذ المساعد.
                    </p>
                  )}
                  {activeWizardStep === 5 && (
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      تعريف الأصناف مع تحديد مستودع استلام افتراضي وسعر التكلفة يمهّد لإجراء عمليات البيع والشراء بسلاسة، ويحسب قيمة المخزون بدقة متناهية تحت طريقة AVCO أو FIFO المعتمدة بوزارة المالية.
                    </p>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 1: User Session Status */}
        {activeSubTab === "session" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 font-display">تحليل جلسة العمل والمصادقة الحالية (Authentication Token)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">المستخدم الفعال</span>
                <strong className="text-sm text-slate-200 font-sans block mt-1">{activeRole} Operator</strong>
                <span className="text-[10px] text-emerald-400 font-mono mt-1 block">JWT Token: Valid</span>
              </div>
              
              <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">الدور الوظيفي وصلاحياته</span>
                <strong className="text-sm text-cyan-400 font-sans block mt-1">{activeRole}</strong>
                <span className="text-[10px] text-slate-400 font-sans mt-1 block">يمتلك {(rolePermissions[activeRole] || []).length} صلاحيات نشطة</span>
              </div>

              <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-sans block">سياق البيانات الفعال</span>
                <strong className="text-sm text-amber-500 font-sans block mt-1">{config.company}</strong>
                <span className="text-[10px] text-slate-400 font-sans mt-1 block">فرع: {config.branch} | مخزن: {config.warehouse}</span>
              </div>

            </div>

            {/* List of Active permissions for active role */}
            <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 text-right">
              <h4 className="text-xs font-bold text-slate-300 mb-3 font-display">الصلاحيات الممنوحة حالياً في رمز الأمان (Granted Scopes)</h4>
              <div className="flex flex-wrap gap-2">
                {(rolePermissions[activeRole] || []).map(scope => (
                  <span key={scope} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2.5 py-1 rounded-md font-mono">
                    🔑 {scope}
                  </span>
                ))}
                {(rolePermissions[activeRole] || []).length === 0 && (
                  <span className="text-xs text-slate-500 font-sans">لا توجد صلاحيات ممنوحة لهذا الدور! لا يمكنه إجراء أي تعديلات.</span>
                )}
              </div>
            </div>

            {/* Security Notice Box */}
            <div className="bg-[#14161a] border border-slate-800 rounded-lg p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-400 font-display">مكافحة الهجمات الأمنية الموجهة (OWASP Top 10 Protections)</h4>
                <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">
                  يقوم نظام ApexSaaS ERP بتطبيق التحقق الصارم من حقول الإدخال، وحقن البيانات، والمصادقة متعددة المستويات، ومنع هجمات 
                  <strong> Broken Object Level Authorization (BOLA)</strong> و<strong> Broken Function Level Authorization (BFLA)</strong> 
                  عبر فحص هوية المالك وهيكل الشركة الممرر في كل معاملة.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Dynamic Permission Matrix */}
        {activeSubTab === "matrix" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-200 font-display">مصفوفة التحكم في الوصول والصلاحيات الديناميكية (Access Control Matrix)</h3>
              
              {/* Reset to Default */}
              <button
                onClick={() => {
                  setConfig(prev => ({
                    ...prev,
                    dynamicScopes: DEFAULT_SCOPES,
                    rolePermissions: DEFAULT_ROLE_PERMISSIONS
                  }));
                  addAuditLog("إعادة تعيين الأمان", "تم تصفير مصفوفة الصلاحيات وإعادتها للافتراضية.", "POLICY_UPDATED");
                  alert("تم إعادة التعيين للافتراضيات!");
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-sans font-medium"
              >
                <RefreshCw className="h-3 w-3" />
                إعادة التعيين للافتراضي
              </button>
            </div>

            {/* Permission Matrix Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                    <th className="p-3 font-bold text-slate-300">الدور الوظيفي / النطاق الصلاحياتي</th>
                    {scopes.map(scope => (
                      <th key={scope} className="p-3 text-center font-mono font-normal min-w-[100px]" title={scope}>
                        {scope}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.keys(rolePermissions).map(role => (
                    <tr key={role} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-3 font-bold text-slate-200 font-sans">{role}</td>
                      {scopes.map(scope => {
                        const hasPerm = (rolePermissions[role] || []).includes(scope);
                        return (
                          <td key={scope} className="p-3 text-center">
                            <button
                              onClick={() => togglePermission(role, scope)}
                              className={`h-6 w-6 rounded flex items-center justify-center mx-auto transition-all cursor-pointer border ${
                                hasPerm 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400" 
                                  : "bg-slate-900/50 text-slate-600 border-slate-800 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                              }`}
                              title={hasPerm ? "سحب الصلاحية" : "منح الصلاحية"}
                            >
                              {hasPerm ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 text-slate-700" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Dynamic Scope */}
            <div className="border border-slate-800/60 bg-slate-900/20 rounded-xl p-4.5">
              <h4 className="text-xs font-bold text-slate-300 font-display mb-3 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-cyan-400" /> إضافة صلاحية مخصصة جديدة بالنظام (Create Custom Permission Scope)
              </h4>
              <form onSubmit={handleAddScope} className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                <div>
                  <label className="text-[10px] text-slate-400 font-sans block mb-1">اسم الصلاحية (مثال: billing:invoice)</label>
                  <input
                    type="text"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    placeholder="scope:action"
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-sans block mb-1">الوصف والوظيفة المرتبطة</label>
                  <input
                    type="text"
                    value={newScopeDesc}
                    onChange={(e) => setNewScopeDesc(e.target.value)}
                    placeholder="تعديل فواتير معينة..."
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:border-cyan-500 font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 font-display"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء وتعميم الصلاحية
                </button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: Row-Level Security & Multitenant Isolation */}
        {activeSubTab === "rls" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 font-display">إدارة قيود مستوى السجل للأمان والعزل (Row-Level Security - RLS)</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              تتحكم إعدادات RLS في تصفية السجلات والحسابات والأرصدة في كل وحدة بناءً على المؤسسة (Tenant) أو الفرع النشط (Branch) أو المستودع (Warehouse). 
              عند تفعيلها، لن يتمكن أي مستخدم من استعراض أو تعديل كائنات تتبع فروعاً أو مخازن أخرى حتى لو كان يملك صلاحيات الكتابة العامة!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Tenant Isolation Toggle */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 font-display">عزل المنشأة والمستأجر</span>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${config.enableRlsTenant ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  تحديد نطاق الرؤية الصارم للمنشأة المستأجرة المختارة حالياً في القائمة الجانبية. يمنع تسريب البيانات بين الكيانات الشقيقة تماماً.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-sans">تفعيل وضع العزل (Tenant RLS):</span>
                  <button
                    onClick={() => toggleRls("enableRlsTenant")}
                    className={`text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition-all ${
                      config.enableRlsTenant 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {config.enableRlsTenant ? "نشط ومفعل" : "معطل"}
                  </button>
                </div>
              </div>

              {/* Branch Isolation Toggle */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 font-display">عزل الأرصدة والفروع</span>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${config.enableRlsBranch ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  يقيد استعراض الفواتير والقيود والعهد المالية لفرع المستخدم المسجل فقط. يمنع تداخل الصلاحيات المالية لغير المحاسب العام والـ CFO.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-sans">تفعيل وضع العزل (Branch RLS):</span>
                  <button
                    onClick={() => toggleRls("enableRlsBranch")}
                    className={`text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition-all ${
                      config.enableRlsBranch 
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" 
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {config.enableRlsBranch ? "نشط ومفعل" : "معطل"}
                  </button>
                </div>
              </div>

              {/* Warehouse Isolation Toggle */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-pink-400" />
                    <span className="text-xs font-bold text-slate-200 font-display">عزل كميات المستودعات</span>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${config.enableRlsWarehouse ? "bg-pink-400 animate-pulse" : "bg-slate-700"}`} />
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                  تصفية موازين جرد المخزن وعمليات الصرف والإدخال لتقتصر على مستودع المستخدم المعين حالياً. يمنع إشغال عمال مستودعات بفروع أخرى.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-sans">تفعيل وضع العزل (Warehouse RLS):</span>
                  <button
                    onClick={() => toggleRls("enableRlsWarehouse")}
                    className={`text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition-all ${
                      config.enableRlsWarehouse 
                        ? "bg-pink-500/10 text-pink-400 border border-pink-500/30" 
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {config.enableRlsWarehouse ? "نشط ومفعل" : "معطل"}
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated Live Block Warning representation */}
            <div className="bg-[#121824] rounded-lg border border-slate-800 p-4">
              <h4 className="text-xs font-bold text-slate-300 font-display mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> محاكاة أمان RLS بقاعدة البيانات (Database Handlers)
              </h4>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                يتم حقن شروط العزل برمجياً في قواعد البيانات للتحقق التلقائي عند استرجاع البيانات:
              </p>
              <pre className="mt-2 text-[10px] bg-slate-950/80 text-cyan-400 p-2.5 rounded border border-slate-800 font-mono text-left" dir="ltr">
{`-- RLS Database Rule simulation
ALTER TABLE general_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON general_ledger
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id') 
       AND (branch_id = current_setting('app.current_branch_id') OR current_setting('app.current_role') = 'CFO'));`}
              </pre>
            </div>

          </div>
        )}

        {/* TAB 4: Approval Policies & Financial Threshold Limits */}
        {activeSubTab === "approval" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-200 font-display">سياسات الاعتماد والحدود الرقابية (Approval Threshold Policies)</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              حدد عتبات الحدود المالية للمعاملات والقيود اليومية. أي معاملة تتجاوز هذه القيمة المالية المحددة سيتم حفظها تلقائياً بحالة 
              <strong className="text-amber-400"> Draft (مسودة)</strong> أو <strong className="text-amber-500"> Pending Approval (بانتظار الاعتماد)</strong>، 
              ولن تُرحل للأرصدة الفعلية في الأستاذ العام إلا بعد قيام دور وظيفي معتمد بالمصادقة عليها!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 font-sans block mb-1.5">الحد الأقصى لترحيل قيود اليومية دون اعتماد (Threshold Limit)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={approvalThreshold}
                      onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700 rounded-lg pr-3 pl-14 py-2.5 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-slate-500 font-sans font-bold">{config.currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans mt-1.5 block">القيود التي تساوي أو تتجاوز هذا المبلغ ستتطلب الموافقة.</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-sans block mb-1.5">الدور الوظيفي المخول بالاعتماد والترحيل (Authorized Approver Role)</label>
                  <select
                    value={approvalRole}
                    onChange={(e) => setApprovalRole(e.target.value)}
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-sans cursor-pointer"
                  >
                    <option value="CFO">المدير المالي التنفيذي (CFO)</option>
                    <option value="SystemAdmin">المشرف العام (SystemAdmin)</option>
                    <option value="LeadArchitect">معماري النظام الرئيسي (LeadArchitect)</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveApprovalPolicy}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  حفظ وتطبيق سياسة الاعتماد
                </button>
              </div>

              {/* Informative visual helper */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 font-display">مخطط دورة المعاملة والاعتماد (Approval Workflow)</h4>
                  <div className="space-y-2 text-[10px] text-slate-400 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold">1</span>
                      <span>توليد قيد أو فاتورة من المستخدمين التشغيليين.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold">2</span>
                      <span>فحص القيمة الإجمالية ومطابقتها بحد الـ {config.approvalThreshold?.toLocaleString() || "10,000"} {config.currency}.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold">3</span>
                      <span>إذا تجاوزت الحد: حظر الترحيل التلقائي ووضع علامة <strong>"بانتظار موافقة {config.approvalRequiredRole || "CFO"}"</strong>.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold">4</span>
                      <span>موافقة دور الـ CFO تعتمد القيد وتقوم بترحيله المالي ودفترته.</span>
                    </div>
                  </div>
                </div>
                <div className="bg-cyan-950/20 text-cyan-400 border border-cyan-500/20 p-2.5 rounded text-[10px] font-sans mt-3">
                  💡 <strong>ملاحظة رقابية:</strong> القيود المالية للموظفين والرواتب تعامل كقيود حساسة وتخضع لتلك القواعد بشكل صارم لمنع هدر الميزانية.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: Live Cryptographically Signed Audit Trail */}
        {activeSubTab === "audit" && (
          <div className="space-y-6">
            
            {/* Threat Intelligence & Anomaly Dashboard */}
            <div className="bg-slate-950/45 border border-slate-800/80 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-bold text-slate-100 font-display">نظام الإنذار المبكر والتحليل الذكي للعمليات غير الطبيعية</h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">مراقبة حية وخوارزميات مخصصة لرصد السلوكيات المحاسبية الشاذة والتعديلات المتكررة.</p>
                  </div>
                </div>
                <div className="flex gap-2 font-sans">
                  <span className="px-2.5 py-1 bg-red-950/30 border border-red-500/20 rounded-lg text-rose-400 text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                    تهديدات نشطة: {alerts.filter(a => !a.resolved).length}
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-emerald-400 text-[10px] font-bold shadow-sm">
                    معالجة ومؤمنة: {alerts.filter(a => a.resolved).length}
                  </span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs font-sans border border-dashed border-slate-800/60 rounded-xl">
                  🛡️ لم يتم رصد أي أنشطة محاسبية شاذة أو عمليات تعديل متكررة حتى الآن. حالة النظام آمنة بالكامل ومحمية.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Active Alert List */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">التهديدات والعمليات غير الطبيعية المكتشفة مؤخراً:</span>
                    {alerts.map((alert) => {
                      const isCritical = alert.severity === "critical";
                      const isHigh = alert.severity === "high";
                      const borderClass = alert.resolved
                        ? "border-slate-800 bg-slate-900/10 opacity-60"
                        : isCritical
                        ? "border-rose-500/30 bg-rose-950/20 shadow-lg shadow-rose-950/10 animate-pulse"
                        : isHigh
                        ? "border-amber-500/30 bg-amber-950/20"
                        : "border-blue-500/30 bg-blue-950/20";
                      
                      const badgeClass = alert.resolved
                        ? "bg-slate-800 text-slate-400"
                        : isCritical
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                        : isHigh
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/20";

                      return (
                        <div key={alert.id} className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 transition-all ${borderClass}`}>
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider ${badgeClass}`}>
                              {alert.resolved ? "RESOLVED" : alert.severity.toUpperCase()}
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans" dir="ltr">
                              {new Date(alert.timestamp).toLocaleString("ar-EG")}
                            </span>
                          </div>
                          <div>
                            <strong className="text-slate-200 block text-[11px] mb-1 font-display">{alert.title}</strong>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{alert.message}</p>
                          </div>
                          {!alert.resolved && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-md text-[9px] cursor-pointer transition-colors font-sans flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3 inline" /> تأكيد المعالجة وإغلاق الثغرة
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Algorithms explanations & status */}
                  <div className="bg-[#0c1222] p-4 rounded-xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 font-display flex items-center gap-1.5 border-b border-slate-800 pb-2">
                        <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                        <span>خوارزميات الفحص التلقائي (Security Rules Analyzer)</span>
                      </h4>
                      <div className="space-y-2 text-[10.5px] text-slate-400 font-sans leading-relaxed">
                        <div className="flex items-start gap-2 border-b border-slate-850 pb-2">
                          <span className="text-rose-400 font-bold shrink-0">1. محرك القيود المكررة:</span>
                          <span>يفحص مطابقة القيمة الإجمالية والبيان خلال أقل من 5 دقائق لتلافي تكرار الفواتير غير المبرر أو تعويض العجز خلسة.</span>
                        </div>
                        <div className="flex items-start gap-2 border-b border-slate-850 pb-2">
                          <span className="text-amber-400 font-bold shrink-0">2. رصد خارج أوقات العمل:</span>
                          <span>يرصد أي تعديل محاسبي أو ترحيل يحدث بين 11 مساءً و 5 صباحاً لضمان عدم تمرير حركات مالية مشبوهة ليلاً.</span>
                        </div>
                        <div className="flex items-start gap-2 border-b border-slate-850 pb-2">
                          <span className="text-cyan-400 font-bold shrink-0">3. كاشف التعديلات المكثفة:</span>
                          <span>يفحص تكرار أكثر من 3 عمليات إنشاء أو تعديل خلال دقيقتين لمنع الإغراق أو السلوكيات البرمجية التخريبية.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold shrink-0">4. تحليل المبالغ الضخمة:</span>
                          <span>يقارن أي حركة مالية مع حد الأمان {approvalThreshold?.toLocaleString()} {config.currency} لضمان توافق صلاحية المنفذ.</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800 text-[9.5px] text-slate-500 leading-relaxed font-sans mt-2">
                      🛡️ <strong>تنبيه فوري:</strong> عند وقوع أي من السيناريوهات السابقة، ستظهر لك إشعارات عائمة فائرة في الزاوية العلوية للتطبيق فوراً لاتخاذ إجراء سريع بالمعالجة.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time PostgreSQL Audit Trail */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-200 font-display">سجل العمليات الحساسة بقاعدة البيانات (PostgreSQL Real-time Audit Trail)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadDbLogs}
                    disabled={isLoadingLogs}
                    className="text-[10px] text-slate-300 hover:text-slate-100 font-sans flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 hover:bg-slate-850/80 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    تحديث السجل من الخادم
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("هل أنت متأكد من رغبتك في تصفير سجل العمليات بقاعدة البيانات؟")) return;
                      try {
                        await fetch("/api/v1/security/audit-logs", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "CLEAR_LOGS",
                            tableName: "audit_logs",
                            recordId: "ALL",
                            newValues: { message: "تم تنظيف سجل التدقيق الأمني للعمليات يدوياً بقاعدة البيانات." }
                          })
                        });
                        loadDbLogs();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-[10px] font-sans flex items-center gap-1 bg-red-950/25 border border-red-900/30 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> تصفير سجل الخادم
                  </button>
                </div>
              </div>

              {isLoadingLogs ? (
                <div className="text-center py-8 text-slate-500 text-xs font-sans">جاري تحميل سجل التدقيق من قاعدة البيانات...</div>
              ) : dbLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-sans border border-dashed border-slate-800/80 rounded-xl bg-slate-950/20">
                  لا توجد عمليات حساسة مسجلة بقاعدة البيانات للشركة الحالية حالياً. 
                  <br />
                  <span className="text-cyan-400/80 mt-1.5 block">💡 تلميح: عند قيامك بإجراء قيد يومية، إصدار فاتورة مبيعات، أو تسجيل فاتورة مشتريات، سيتم تسجيلها وتوقيعها رقمياً هنا فوراً!</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {dbLogs.map((log: any) => {
                    let details = "";
                    let actionArabic = log.action;
                    try {
                      const vals = typeof log.newValues === "string" ? JSON.parse(log.newValues) : log.newValues;
                      if (log.action === "AUTH_LOGIN") {
                        actionArabic = "تسجيل دخول آمن للشركة";
                        details = `نجح تسجيل الدخول للمستخدم [${vals.username}] بدور: ${vals.role}.`;
                      } else if (log.action === "POST_JOURNAL_ENTRY") {
                        actionArabic = "ترحيل قيد محاسبي معتمد";
                        details = `تم ترحيل قيد يومية [${log.recordId}] - الوصف: ${vals.description || 'بدون'} بقيمة: ${vals.total?.toLocaleString() || 0} ج.م.`;
                      } else if (log.action === "CREATE_JOURNAL_ENTRY") {
                        actionArabic = "إنشاء قيد محاسبي";
                        details = `إنشاء مسودة قيد اليومية [${log.recordId}] - الوصف: ${vals.description || 'بدون'} - عدد السطور: ${vals.linesCount || 0}.`;
                      } else if (log.action === "CREATE_SALES_INVOICE") {
                        actionArabic = "إصدار فاتورة مبيعات";
                        details = `إصدار فاتورة مبيعات [${log.recordId}] للعميل [${vals.customerName || 'عام'}] بقيمة: ${vals.total?.toLocaleString() || 0} ج.م.`;
                      } else if (log.action === "CREATE_PURCHASE_INVOICE") {
                        actionArabic = "تسجيل فاتورة مشتريات";
                        details = `تسجيل فاتورة مشتريات [${log.recordId}] من المورد [${vals.supplierName || 'عام'}] بقيمة: ${vals.total?.toLocaleString() || 0} ج.م.`;
                      } else if (log.action === "ADJUST_STOCK") {
                        actionArabic = "تعديل رصيد مخزني";
                        details = `تعديل رصيد الصنف كود [${log.recordId}] بالمستودع [${vals.warehouseId}] - الكمية القديمة: ${vals.oldQty} -> الكمية الجديدة: ${vals.newQty}.`;
                      } else if (log.action === "CREATE_STOCK_ITEM") {
                        actionArabic = "إضافة صنف مخزني جديد";
                        details = `إضافة صنف [${vals.name}] كود [${log.recordId}] بالمستودع [${vals.warehouseId}] - كمية أولية: ${vals.quantity} بتكلفة: ${vals.price} ج.م.`;
                      } else if (log.action === "CREATE_PRODUCTION_ORDER") {
                        actionArabic = "تنفيذ أمر تصنيع (MRP)";
                        details = `إنهاء أمر التصنيع [${log.recordId}] للمنتج [${vals.productName}] عدد: ${vals.quantity} وحدة بتكلفة خامات: ${vals.totalCost?.toLocaleString() || 0} ج.م.`;
                      } else if (log.action.startsWith("SECURITY_POLICY")) {
                        actionArabic = "تحديث سياسات الحماية";
                        details = vals.details;
                      } else if (log.action.startsWith("SECURITY_AUDIT")) {
                        actionArabic = "سجل أمان العمليات";
                        details = vals.details;
                      } else if (log.action === "CLEAR_LOGS") {
                        actionArabic = "تصفير السجلات الأمنية";
                        details = vals.message;
                      } else {
                        details = typeof log.newValues === "string" ? log.newValues : JSON.stringify(log.newValues);
                      }
                    } catch (e) {
                      details = log.newValues;
                    }

                    return (
                      <div key={log.id} className="bg-slate-900/30 border border-slate-800/80 hover:border-slate-700/80 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs transition-colors">
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {log.id}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              VERIFIED
                            </span>
                            <strong className="text-xs font-display text-slate-200">{actionArabic}</strong>
                            <span className="text-[10px] text-slate-500 font-sans" dir="ltr">{new Date(log.timestamp).toLocaleString("ar-EG")}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{details}</p>
                          <div className="text-[10px] text-slate-500 font-sans flex items-center gap-3">
                            <span>المشغل: <strong className="text-slate-300 font-mono">{log.userId}</strong></span>
                            <span>الجدول: <strong className="text-slate-400 font-mono">{log.tableName}</strong></span>
                            <span>رقم السجل: <strong className="text-slate-400 font-mono">{log.recordId}</strong></span>
                          </div>
                        </div>

                        {/* Cryptographic Signature Stamp */}
                        <div className="bg-slate-950/80 border border-slate-800 p-2 rounded text-left shrink-0 font-mono max-w-[200px] overflow-hidden" dir="ltr">
                          <span className="text-[9px] text-slate-500 block">SHA-256 Sig:</span>
                          <strong className="text-[9px] text-cyan-400 block mt-0.5 truncate">{log.cryptographicSignature}</strong>
                          <span className="text-[8px] text-emerald-500/80 block mt-0.5 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5 inline" /> Verified Match
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Browser Policy Changes Log */}
            <div className="space-y-3 border-t border-slate-850 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-200 font-display">سجل تعديلات الجلسة وسياسات الوصول المؤقتة (Session Access Logs)</h3>
                </div>
                <button
                  onClick={() => {
                    setAuditLogs([]);
                    addAuditLog("تصفير السجلات", "تم تنظيف سجل التدقيق الأمني للعمليات يدوياً في المتصفح.", "POLICY_UPDATED");
                  }}
                  className="text-slate-500 hover:text-slate-300 text-[10px] font-sans flex items-center gap-1 cursor-pointer bg-slate-900/30 border border-slate-800/50 px-2 py-1 rounded hover:bg-slate-900/60 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> مسح السجل المحلي
                </button>
              </div>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                {auditLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-3 text-right flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs ${
                      log.status === "AUTHORIZED" ? "bg-emerald-950/10 border-emerald-500/10 text-slate-200" :
                      log.status === "BLOCKED" ? "bg-red-950/10 border-red-500/10 text-slate-200" :
                      "bg-blue-950/10 border-blue-500/10 text-slate-200"
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.2 rounded text-[8px] font-mono font-bold ${
                          log.status === "AUTHORIZED" ? "bg-emerald-500/20 text-emerald-400" :
                          log.status === "BLOCKED" ? "bg-red-500/20 text-red-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {log.status}
                        </span>
                        <strong className="text-xs font-display">{log.action}</strong>
                        <span className="text-[10px] text-slate-500 font-sans">{log.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        المشغل: <span className="text-slate-300">{log.user} ({log.role})</span>
                      </div>
                    </div>
                    
                    {/* Cryptographic Signature Stamp */}
                    <div className="bg-slate-950/80 border border-slate-800/80 p-2 rounded text-left shrink-0 font-mono" dir="ltr">
                      <span className="text-[9px] text-slate-500 block">SHA-256 Sig:</span>
                      <strong className="text-[9px] text-cyan-400 block mt-0.5">{log.signature}</strong>
                      <span className="text-[8px] text-slate-600 block mt-0.5">Apex Block Verification</span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="p-6 text-center text-slate-500 font-sans text-xs">لا توجد سجلات أمنية حالياً في جلسة المتصفح.</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
