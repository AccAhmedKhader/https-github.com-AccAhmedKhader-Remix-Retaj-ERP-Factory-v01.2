import React from "react";
import { 
  Building2, 
  Layers, 
  MapPin, 
  Coins, 
  Globe, 
  LayoutDashboard, 
  Calculator, 
  Package, 
  Users, 
  Wrench, 
  ShoppingCart, 
  Cpu, 
  Palette,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  ArrowRightLeft,
  RefreshCw,
  Target,
  FolderOpen,
  Workflow
} from "lucide-react";
import { ERPConfig } from "../types";

export const getThemeClass = (theme?: string) => {
  switch (theme) {
    case "blue":
      return {
        text: "text-blue-400",
        border: "border-blue-500/30",
        bg: "bg-blue-500/10",
        accent: "bg-blue-500",
        borderActive: "border-blue-500/40",
        textActive: "text-blue-400",
        bgActive: "bg-blue-500/20",
        gradient: "from-blue-400 to-cyan-400"
      };
    case "purple":
      return {
        text: "text-purple-400",
        border: "border-purple-500/30",
        bg: "bg-purple-500/10",
        accent: "bg-purple-500",
        borderActive: "border-purple-500/40",
        textActive: "text-purple-400",
        bgActive: "bg-purple-500/20",
        gradient: "from-purple-400 to-pink-400"
      };
    case "amber":
      return {
        text: "text-amber-400",
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        accent: "bg-amber-500",
        borderActive: "border-amber-500/40",
        textActive: "text-amber-400",
        bgActive: "bg-amber-500/20",
        gradient: "from-amber-400 to-orange-400"
      };
    case "rose":
      return {
        text: "text-rose-400",
        border: "border-rose-500/30",
        bg: "bg-rose-500/10",
        accent: "bg-rose-500",
        borderActive: "border-rose-500/40",
        textActive: "text-rose-400",
        bgActive: "bg-rose-500/20",
        gradient: "from-rose-400 to-pink-400"
      };
    case "midnight":
      return {
        text: "text-amber-200",
        border: "border-amber-500/20",
        bg: "bg-[#18140c]",
        accent: "bg-amber-500",
        borderActive: "border-amber-500/50",
        textActive: "text-amber-200",
        bgActive: "bg-amber-950/40",
        gradient: "from-amber-300 via-yellow-400 to-amber-600"
      };
    case "cyberpunk":
      return {
        text: "text-pink-400",
        border: "border-cyan-500/30",
        bg: "bg-pink-500/10",
        accent: "bg-cyan-400",
        borderActive: "border-pink-500/40",
        textActive: "text-cyan-300",
        bgActive: "bg-cyan-500/20",
        gradient: "from-pink-500 via-purple-500 to-cyan-400"
      };
    case "forest":
      return {
        text: "text-emerald-300",
        border: "border-teal-500/30",
        bg: "bg-teal-950/20",
        accent: "bg-teal-500",
        borderActive: "border-emerald-500/40",
        textActive: "text-emerald-300",
        bgActive: "bg-emerald-900/30",
        gradient: "from-emerald-400 to-teal-500"
      };
    case "emerald":
    default:
      return {
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/10",
        accent: "bg-emerald-500",
        borderActive: "border-emerald-500/40",
        textActive: "text-emerald-400",
        bgActive: "bg-emerald-500/20",
        gradient: "from-emerald-400 to-cyan-400"
      };
  }
};

interface SidebarProps {
  config: ERPConfig;
  setConfig: React.Dispatch<React.SetStateAction<ERPConfig>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isFactoryMode: boolean;
  setIsFactoryMode: (mode: boolean) => void;
}

export default function Sidebar({
  config,
  setConfig,
  activeTab,
  setActiveTab,
  isFactoryMode,
  setIsFactoryMode
}: SidebarProps) {
  const tabs = [
    { id: "dashboard", label: "لوحة تحكم ذكاء الأعمال (BI)", icon: LayoutDashboard },
    { id: "onboarding", label: "تهيئة المنشأة الجديدة وتأسيس النشاط", icon: Building2 },
    { id: "accounting", label: "المحاسبة العامة وضريبة القيمة المضافة", icon: Calculator },
    { id: "inventory", label: "المخازن والمستودعات المتعددة", icon: Package },
    { id: "hr", label: "الموارد البشرية والمرتبات", icon: Users },
    { id: "manufacturing", label: "تخطيط التصنيع والإنتاج (MRP)", icon: Wrench },
    { id: "pos", label: "نقطة البيع ومبيعات التراخيص (POS)", icon: ShoppingCart },
    { id: "sales-procurement", label: "دورة المبيعات والمشتريات المتكاملة", icon: ArrowRightLeft },
    { id: "reports-engine", label: "محرك التقارير الشامل والذكي", icon: FileSpreadsheet },
    { id: "e-invoicing", label: "بوابة الفاتورة الإلكترونية والربط الضريبي", icon: ShieldCheck },
    { id: "import-export", label: "بوابة الاستيراد والتصدير والطباعة الشاملة", icon: RefreshCw },
    { id: "crm", label: "إدارة علاقات العملاء (CRM)", icon: Target },
    { id: "document-management", label: "الأرشيف وإدارة المستندات", icon: FolderOpen },
    { id: "workflow", label: "أتمتة سير العمل والموافقات", icon: Workflow },
    { id: "security", label: "الأمان وإدارة الصلاحيات (RBAC)", icon: Lock },
  ];

  const clr = getThemeClass(config.theme);

  const companies: any[] = (config as any).companiesList || [
    { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
    { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
    { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
  ];

  const branches: any[] = (config as any).branchesList || [
    { id: "BR-CAI-01", name: "الإدارة العامة بالقاهرة (شيراتون)", value: "Cairo Headquarters", companyId: "TEN-APEX-01" },
    { id: "BR-ALX-02", name: "مكتب ميناء الإسكندرية اللوجستي", value: "Alex Port Gateway", companyId: "TEN-APEX-01" },
    { id: "BR-DXB-03", name: "مكتب جافزا دبي الإقليمي", value: "Dubai JAFZA Branch", companyId: "TEN-GULF-02" }
  ];

  const warehouses: any[] = (config as any).warehousesList || [
    { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي", value: "WH-CAI-01", branchId: "BR-CAI-01" },
    { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية", value: "WH-ALX-02", branchId: "BR-ALX-02" },
    { id: "WH-DXB-03", name: "مركز جافزا دبي الدولي", value: "WH-DXB-03", branchId: "BR-DXB-03" }
  ];

  // Cascading Selection Logic:
  // 1. Get current active company object
  const activeCompanyObj = companies.find(c => (c.value === config.company || c.name === config.company)) || companies[0];
  const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "";

  // 2. Filter branches of active company
  const baseBranches = branches.filter(b => b.companyId === activeCompanyId);
  const filteredBranches = [
    { id: "all", name: "كافة الفروع", value: "all", companyId: activeCompanyId },
    ...baseBranches
  ];

  // 3. Get current active branch object
  const activeBranchObj = filteredBranches.find(b => (b.value === config.branch || b.name === config.branch)) || filteredBranches[0];
  const activeBranchId = activeBranchObj ? activeBranchObj.id : "";

  // 4. Filter warehouses of active branch
  const activeCompanyBranchIds = baseBranches.map(b => b.id);
  const filteredWarehouses = [
    { id: "all", name: "كافة المخازن", value: "all", branchId: activeBranchId },
    ...warehouses.filter(w => {
      if (activeBranchId === "all") {
        return activeCompanyBranchIds.includes(w.branchId);
      }
      return w.branchId === activeBranchId;
    })
  ];

  // 5. Synchronization effect: ensure active branch & warehouse remain valid upon company/branch change
  React.useEffect(() => {
    const activeComp = companies.find(c => (c.value === config.company || c.name === config.company));
    if (activeComp) {
      const activeCompBranchIds = branches.filter(b => b.companyId === activeComp.id).map(b => b.id);
      const allowedBr = [
        { id: "all", name: "كافة الفروع", value: "all", companyId: activeComp.id },
        ...branches.filter(b => b.companyId === activeComp.id)
      ];
      const isBrValid = allowedBr.some(b => (b.value === config.branch || b.name === config.branch));

      let finalBr = config.branch;
      let finalBrObj = allowedBr.find(b => (b.value === config.branch || b.name === config.branch));

      if (!isBrValid && allowedBr.length > 0) {
        finalBr = allowedBr[0].value || allowedBr[0].name;
        finalBrObj = allowedBr[0];
      } else if (allowedBr.length === 0) {
        finalBr = "";
        finalBrObj = undefined;
      }

      let finalWh = config.warehouse;
      if (finalBrObj) {
        const allowedWh = [
          { id: "all", name: "كافة المخازن", value: "all", branchId: finalBrObj.id },
          ...warehouses.filter(w => {
            if (finalBrObj!.id === "all") {
              return activeCompBranchIds.includes(w.branchId);
            }
            return w.branchId === finalBrObj!.id;
          })
        ];
        const isWhValid = allowedWh.some(w => (w.value === config.warehouse || w.id === config.warehouse));
        if (!isWhValid && allowedWh.length > 0) {
          finalWh = allowedWh[0].value || allowedWh[0].id;
        } else if (allowedWh.length === 0) {
          finalWh = "";
        }
      } else {
        finalWh = "";
      }

      if (finalBr !== config.branch || finalWh !== config.warehouse) {
        setConfig(prev => ({
          ...prev,
          branch: finalBr,
          warehouse: finalWh
        }));
      }
    }
  }, [config.company, config.branch, companies, branches, warehouses, setConfig]);

  const themeOptions = [
    { id: "emerald", label: "زمردي", color: "bg-emerald-500" },
    { id: "blue", label: "أزرق", color: "bg-blue-500" },
    { id: "purple", label: "بنفسجي", color: "bg-purple-500" },
    { id: "amber", label: "كهرماني", color: "bg-amber-500" },
    { id: "rose", label: "وردي", color: "bg-rose-500" },
    { id: "midnight", label: "برونزي فاخر", color: "bg-amber-600 border border-yellow-400" },
    { id: "cyberpunk", label: "سايبر بانك", color: "bg-gradient-to-r from-pink-500 to-cyan-400" },
    { id: "forest", label: "غابات داكنة", color: "bg-teal-700" }
  ];

  return (
    <aside className="w-80 bg-[#0e1424] border-r border-slate-800 flex flex-col h-screen overflow-y-auto shrink-0 text-right" id="erp-sidebar" dir="rtl">
      {/* Platform Branding */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-display font-bold tracking-tight bg-gradient-to-r ${clr.gradient} bg-clip-text text-transparent`}>
            نظام ApexSaaS ERP
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">الإصدار المؤسسي المستقر v1.0.0</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${clr.bg} border ${clr.border} ${clr.text}`}>
          <Building2 className="h-5 w-5" />
        </div>
      </div>

      {/* Multi-Tenant Switchers */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40 space-y-4">
        <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">سياق بيئة النظام والمؤسسة</h2>
        
        {/* Company Switcher */}
        <div>
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mb-1.5">
            <Building2 className={`h-3 w-3 ${clr.text}`} /> المنشأة / الشركة الفعالة
          </label>
          <select 
            value={config.company}
            onChange={(e) => setConfig({ ...config, company: e.target.value })}
            className={`w-full bg-[#151c30] text-xs text-slate-200 border border-slate-700/80 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium`}
          >
            {companies.map((c: any) => (
              <option key={c.id} value={c.value || c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Branch Selector */}
        <div>
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mb-1.5">
            <Layers className="h-3 w-3 text-cyan-400" /> الفرع التشغيلي النشط
          </label>
          <select 
            value={config.branch}
            onChange={(e) => setConfig({ ...config, branch: e.target.value })}
            className="w-full bg-[#151c30] text-xs text-slate-200 border border-slate-700/80 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {filteredBranches.map((b: any) => (
              <option key={b.id} value={b.value || b.name}>{b.name}</option>
            ))}
            {filteredBranches.length === 0 && (
              <option value="">لا توجد فروع لهذه الشركة</option>
            )}
          </select>
        </div>

        {/* Warehouse Selector */}
        <div>
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mb-1.5">
            <MapPin className="h-3 w-3 text-pink-400" /> مستودع التخزين الافتراضي
          </label>
          <select 
            value={config.warehouse}
            onChange={(e) => setConfig({ ...config, warehouse: e.target.value })}
            className="w-full bg-[#151c30] text-xs text-slate-200 border border-slate-700/80 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-pink-500 font-medium"
          >
            {filteredWarehouses.map((w: any) => (
              <option key={w.id} value={w.value || w.id}>{w.name} ({w.id})</option>
            ))}
            {filteredWarehouses.length === 0 && (
              <option value="">لا توجد مخازن لهذا الفرع</option>
            )}
          </select>
        </div>

        {/* Color Palette Theme Selector */}
        <div className="pt-2 border-t border-slate-800/50">
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mb-2">
            <Palette className={`h-3 w-3 ${clr.text}`} /> مظهر وألوان الواجهة
          </label>
          <div className="flex items-center gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                title={opt.label}
                onClick={() => setConfig({ ...config, theme: opt.id as any })}
                className={`h-6 w-6 rounded-full ${opt.color} flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 border ${
                  config.theme === opt.id ? "border-white shadow-lg ring-2 ring-slate-800" : "border-transparent"
                }`}
              >
                {config.theme === opt.id && <Check className="h-3 w-3 text-slate-950 font-bold" />}
              </button>
            ))}
          </div>
        </div>

        {/* Currency & Language Indicators */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mb-1">
              <Coins className="h-2.5 w-2.5 text-amber-400" /> عملة النظام
            </label>
            <select
              value={config.currency}
              onChange={(e) => setConfig({ ...config, currency: e.target.value })}
              className="w-full bg-[#151c30] text-[11px] text-slate-300 border border-slate-700/50 rounded-md px-2 py-1 focus:outline-none"
            >
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mb-1">
              <Globe className="h-2.5 w-2.5 text-blue-400" /> لغة الواجهة
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              className="w-full bg-[#151c30] text-[11px] text-slate-300 border border-slate-700/50 rounded-md px-2 py-1 focus:outline-none"
            >
              <option value="Arabic">العربية (RTL)</option>
              <option value="English">English (EN)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main ERP Navigation Modules */}
      <div className="p-4 flex-1 space-y-1.5">
        <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold px-2 mb-3">باقة تطبيقات النظام المؤسسي</h2>
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !isFactoryMode;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id);
                setIsFactoryMode(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all font-medium duration-150 ${
                isActive 
                  ? `bg-slate-800 ${clr.textActive} border ${clr.borderActive}` 
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? clr.textActive : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Autonomous Software Factory Module (Meta Feature) */}
        <div className="pt-6 border-t border-slate-800/80 mt-6 space-y-1.5">
          <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold px-2 mb-3">مصنع البرمجيات الذاتي</h2>
          
          <button
            id="tab-factory"
            onClick={() => setIsFactoryMode(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all font-medium duration-150 border ${
              isFactoryMode 
                ? "bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/40 text-purple-300" 
                : "text-slate-300 hover:bg-slate-900 hover:text-slate-100 border-transparent"
            }`}
          >
            <Cpu className={`h-4 w-4 ${isFactoryMode ? "text-purple-400" : "text-slate-400 animate-pulse"}`} />
            <div className="text-right">
              <div className="font-bold text-xs">منصة مهندس البرمجيات والمعمارية</div>
              <div className="text-[10px] text-slate-400 font-normal">تدقيق Clean Architecture / SOLID</div>
            </div>
          </button>
        </div>
      </div>

      {/* Connection & Context Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`flex h-2 w-2 rounded-full ${clr.accent} animate-pulse`} />
          <span className="text-slate-400">اتصال مباشر بقاعدة البيانات</span>
        </div>
        <div className="text-[10px] text-slate-500">{config.fiscalYear}</div>
      </div>
    </aside>
  );
}
