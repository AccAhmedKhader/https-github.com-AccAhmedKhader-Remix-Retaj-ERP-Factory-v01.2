import React from "react";
import { 
  TrendingUp, 
  Coins, 
  BarChart3, 
  DollarSign, 
  ArrowUpRight, 
  Package, 
  Users, 
  Target,
  Percent,
  Activity,
  ShieldCheck,
  Scale,
  Building2,
  Layers,
  MapPin,
  Sparkles,
  RefreshCw,
  TrendingDown,
  ChevronRight,
  GripVertical,
  RotateCcw,
  LayoutDashboard,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";
import { ChartOfAccount, StockItem, Employee, CostCenter, ProfitCenter, ERPConfig, Customer, Supplier } from "../types";
import { getThemeClass } from "./Sidebar";
import { 
  BIHeaderWidget,
  BIStatsWidget,
  BIRatiosWidget,
  BIStockWidget,
  BIContactsWidget,
  BICentersWidget,
  BIRoadmapWidget
} from "./BIWidgets";

interface BIDashboardProps {
  accounts: ChartOfAccount[];
  stock: StockItem[];
  employees: Employee[];
  costCenters: CostCenter[];
  profitCenters: ProfitCenter[];
  customers?: Customer[];
  suppliers?: Supplier[];
  config: ERPConfig;
}

export default function BIDashboard({
  accounts = [],
  stock = [],
  employees = [],
  costCenters = [],
  profitCenters = [],
  customers = [],
  suppliers = [],
  config
}: BIDashboardProps) {
  const clr = getThemeClass(config.theme);

  // --- DRAG & DROP / CUSTOMIZATION ENGINE ---
  const [layout, setLayout] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("apex_bi_layout");
      return saved ? JSON.parse(saved) : ["header", "stats", "ratios", "stock", "contacts", "centers", "roadmap"];
    } catch (e) {
      return ["header", "stats", "ratios", "stock", "contacts", "centers", "roadmap"];
    }
  });

  const [visibleWidgets, setVisibleWidgets] = React.useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("apex_bi_visibility");
      return saved ? JSON.parse(saved) : {
        header: true,
        stats: true,
        ratios: true,
        stock: true,
        contacts: true,
        centers: true,
        roadmap: true
      };
    } catch (e) {
      return {
        header: true,
        stats: true,
        ratios: true,
        stock: true,
        contacts: true,
        centers: true,
        roadmap: true
      };
    }
  });

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [isConfigOpen, setIsConfigOpen] = React.useState<boolean>(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const newLayout = [...layout];
    const draggedItem = newLayout[draggedIndex];
    newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, draggedItem);
    
    setLayout(newLayout);
    localStorage.setItem("apex_bi_layout", JSON.stringify(newLayout));
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleWidgetVisibility = (id: string) => {
    const next = { ...visibleWidgets, [id]: !visibleWidgets[id] };
    setVisibleWidgets(next);
    localStorage.setItem("apex_bi_visibility", JSON.stringify(next));
  };

  const resetLayout = () => {
    const defaultLayout = ["header", "stats", "ratios", "stock", "contacts", "centers", "roadmap"];
    const defaultVisibility = {
      header: true,
      stats: true,
      ratios: true,
      stock: true,
      contacts: true,
      centers: true,
      roadmap: true
    };
    setLayout(defaultLayout);
    setVisibleWidgets(defaultVisibility);
    localStorage.setItem("apex_bi_layout", JSON.stringify(defaultLayout));
    localStorage.setItem("apex_bi_visibility", JSON.stringify(defaultVisibility));
  };

  // =========================================================================
  // DYNAMIC FILTERING ENGINE (ROW-LEVEL CONTEXT BINDING)
  // =========================================================================
  
  // 1. FILTER STOCK BY SELECTED WAREHOUSE CONTEXT
  const filteredStock = stock.filter(item => {
    if (!config.warehouse) return true;
    return item.warehouseId === config.warehouse;
  });

  // Calculate filtered stock value
  const totalRawStockVal = filteredStock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // 2. FILTER EMPLOYEES BY SELECTED BRANCH CONTEXT
  // We associate departments to branches to dynamically segment personnel
  const filteredEmployees = employees.filter(emp => {
    if (config.branch === "Cairo Headquarters") {
      // Cairo Headquarters handles R&D, Finance, and HR
      return ["البحث والتطوير", "المالية", "الموارد البشرية", "Finance", "HR", "Engineering"].includes(emp.department);
    }
    if (config.branch === "Alex Port Gateway") {
      // Alexandria Gateway handles Logistics and Operations
      return ["العمليات واللوجستيات", "Operations"].includes(emp.department);
    }
    if (config.branch === "Dubai JAFZA Branch") {
      // Dubai handles Professional Services and Sales
      return ["الخدمات المهنية", "المبيعات والتسويق", "Sales", "Consulting"].includes(emp.department);
    }
    return true;
  });

  // 3. FILTER FINANCIAL ACCOUNTS BY ACTIVE COMPANY (MULTI-TENANCY SIMULATION)
  // We partition or scale cash balances and taxes to simulate multi-tenant ledger isolation
  const filteredAccounts = accounts.map(acc => {
    let balance = acc.balance;
    if (config.company === "Apex Levant Corp") {
      // Focus on Egyptian/Levant operations (CIB account, Egypt VAT, raw stock, Levant revenues)
      if (acc.code === "10200") balance = 0; // Hide ADIB AED account
      else if (acc.code === "12100") balance = Math.round(acc.balance * 0.4); // Scale Alex warehouse
      else balance = Math.round(acc.balance * 0.85); // Standard scale
    } else if (config.company === "Apex Gulf International") {
      // Focus on Gulf/UAE operations (ADIB AED account, Dubai warehouse, Gulf revenue)
      if (acc.code === "10100" || acc.code === "22000") balance = 0; // Hide CIB and Egyptian VAT
      else if (acc.code === "10200") balance = acc.balance; // Keep ADIB balance intact
      else balance = Math.round(acc.balance * 0.55); // Standard Gulf slice
    } else if (config.company === "Apex Africa Distribution") {
      // Focus on African general distribution
      balance = Math.round(acc.balance * 0.3); // Scale down to distribution slice
    }
    return { ...acc, balance };
  });

  // Financial aggregates calculated over filtered accounts
  const currentAssetsList = filteredAccounts.filter(a => a.type === "Asset");
  const totalCurrentAssets = currentAssetsList.reduce((sum, a) => sum + a.balance, 0);

  const currentLiabilitiesList = filteredAccounts.filter(a => a.type === "Liability");
  const totalCurrentLiabilities = currentLiabilitiesList.reduce((sum, a) => sum + a.balance, 0);

  const totalEquity = filteredAccounts.filter(a => a.type === "Equity").reduce((sum, a) => sum + a.balance, 0);

  const totalRevenues = filteredAccounts
    .filter(a => a.type === "Revenue")
    .reduce((sum, a) => sum + a.balance, 0);

  const totalExpenses = filteredAccounts
    .filter(a => a.type === "Expense")
    .reduce((sum, a) => sum + a.balance, 0);

  const netProfit = totalRevenues - totalExpenses;
  const netMargin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0;

  // Financial Ratios
  const currentRatio = totalCurrentLiabilities > 0 ? (totalCurrentAssets / totalCurrentLiabilities) : 0;

  const totalInventoryVal = filteredAccounts
    .filter(a => a.code === "12000" || a.code === "12100")
    .reduce((sum, a) => sum + a.balance, 0);
  const quickRatio = totalCurrentLiabilities > 0 ? ((totalCurrentAssets - totalInventoryVal) / totalCurrentLiabilities) : 0;

  const debtToEquity = totalEquity > 0 ? (totalCurrentLiabilities / totalEquity) * 100 : 0;

  const inventoryTurnover = totalInventoryVal > 0 ? Number(((totalRevenues * 0.6) / totalInventoryVal).toFixed(2)) : 3.4;

  // Segmenting Profit Centers and Cost Centers by Company
  const filteredCostCenters = costCenters.map(cc => {
    let budget = cc.budget;
    let spent = cc.spent;
    if (config.company === "Apex Levant Corp") {
      if (cc.id === "CC-INF") spent = Math.round(cc.spent * 0.3); // Server infra scaled
    } else if (config.company === "Apex Gulf International") {
      if (cc.id === "CC-RND" || cc.id === "CC-TAX") spent = Math.round(cc.spent * 0.2); // R&D scaled down
    }
    return { ...cc, budget, spent };
  });

  const filteredProfitCenters = profitCenters.map(pc => {
    let target = pc.target;
    let actual = pc.actual;
    if (config.company === "Apex Levant Corp") {
      if (pc.id === "PC-SFT") actual = Math.round(pc.actual * 0.8);
    } else if (config.company === "Apex Gulf International") {
      if (pc.id === "PC-SRV") actual = Math.round(pc.actual * 0.4);
    }
    return { ...pc, target, actual };
  });

  // Benchmarks list
  const industryBenchmarks = [
    {
      name: "هامش صافي الربح (Net Profit Margin)",
      actual: `${netMargin.toFixed(1)}%`,
      actualVal: netMargin,
      benchmark: "15% - 22%",
      benchmarkMin: 15,
      status: netMargin >= 22 ? "ممتاز (أعلى من المعدل)" : netMargin >= 15 ? "طبيعي وممتاز" : "يتطلب خفض التكاليف",
      statusColor: netMargin >= 15 ? "text-emerald-400" : "text-amber-400",
      desc: "يقيس كفاءة تحويل الإيرادات إلى صافي أرباح بعد خصم كافة المصاريف التشغيلية والإدارية والضريبية."
    },
    {
      name: "نسبة السيولة المتداولة (Current Ratio)",
      actual: `${currentRatio.toFixed(2)}x`,
      actualVal: currentRatio,
      benchmark: "1.5x - 2.5x",
      benchmarkMin: 1.5,
      status: currentRatio >= 2.5 ? "فائض أمان مالي فائق" : currentRatio >= 1.5 ? "مثالي وطبيعي" : "خطر عجز سيولة قصير الأجل",
      statusColor: currentRatio >= 1.5 ? "text-emerald-400" : "text-rose-400",
      desc: "يقدر قدرة الشركة على سداد التزاماتها قصيرة الأجل (مثل الموردين والضرائب) باستخدام أصولها السائلة الفورية."
    },
    {
      name: "نسبة السيولة السريعة (Quick Ratio)",
      actual: `${quickRatio.toFixed(2)}x`,
      actualVal: quickRatio,
      benchmark: "1.0x - 1.5x",
      benchmarkMin: 1.0,
      status: quickRatio >= 1.0 ? "ممتاز ومستقر" : "يحتاج لدعم أرصدة البنك والنقدية",
      statusColor: quickRatio >= 1.0 ? "text-emerald-400" : "text-rose-400",
      desc: "يقيس مدى كفاية النقدية والعملاء لسداد الالتزامات العاجلة فوراً دون الاضطرار لبيع المخزون السلعي بأسعار مخفضة."
    },
    {
      name: "نسبة الرافعة المالية والديون لحقوق الملكية (Debt-to-Equity)",
      actual: `${debtToEquity.toFixed(1)}%`,
      actualVal: debtToEquity,
      benchmark: "30% - 50%",
      benchmarkMin: 30,
      status: debtToEquity < 30 ? "منخفض وآمن للغاية (اعتماد ذاتي)" : debtToEquity <= 50 ? "طبيعي ومقبول" : "ارتفاع مديونية ومخاطر تمويلية",
      statusColor: debtToEquity <= 50 ? "text-emerald-400" : "text-amber-400",
      desc: "يوضح نسبة مساهمة الديون الخارجية في تمويل أصول الشركة مقارنة بالتمويل الداخلي المقدم من المساهمين (رأس المال والأرباح)."
    },
    {
      name: "معدل دوران المخزون السلعي (Inventory Turnover)",
      actual: `${inventoryTurnover}x`,
      actualVal: inventoryTurnover,
      benchmark: "4.0x - 6.0x",
      benchmarkMin: 4.0,
      status: inventoryTurnover >= 4.0 ? "حركة مبيعات سريعة" : "وتيرة متوسطة (مخزون قيم وبطئ الحركة)",
      statusColor: inventoryTurnover >= 4.0 ? "text-emerald-400" : "text-slate-400",
      desc: "يشير إلى عدد المرات التي قامت فيها الشركة ببيع وتجديد مخزونها خلال السنة مالياً وعملياً."
    }
  ];

  // Dynamic separation of customers and suppliers by active company
  const filteredCustomers = customers.map(c => {
    let balance = c.balance;
    if (config.company === "Apex Gulf International") {
      balance = Math.round(c.balance * 0.4);
    } else if (config.company === "Apex Africa Distribution") {
      balance = Math.round(c.balance * 0.15);
    }
    return { ...c, balance };
  });

  const filteredSuppliers = suppliers.map(s => {
    let balance = s.balance;
    if (config.company === "Apex Gulf International") {
      balance = Math.round(s.balance * 0.6);
    } else if (config.company === "Apex Africa Distribution") {
      balance = Math.round(s.balance * 0.25);
    }
    return { ...s, balance };
  });

  const topCustomers = [...filteredCustomers].sort((a, b) => b.balance - a.balance).slice(0, 5);
  const topSuppliers = [...filteredSuppliers].sort((a, b) => b.balance - a.balance).slice(0, 5);

  const getCompanyNameAr = (id: string) => {
    if (id === "Apex Levant Corp") return "شركة قمة الشام والرافدين المحدودة";
    if (id === "Apex Gulf International") return "شركة قمة الخليج الدولية";
    if (id === "Apex Africa Distribution") return "مؤسسة قمة أفريقيا للتوزيع والاستيراد";
    return id;
  };

  const getBranchNameAr = (id: string) => {
    if (id === "Cairo Headquarters") return "الإدارة العامة بالقاهرة (شيراتون)";
    if (id === "Alex Port Gateway") return "مكتب ميناء الإسكندرية اللوجستي";
    if (id === "Dubai JAFZA Branch") return "مكتب جافزا دبي الإقليمي";
    return id;
  };

  const getWarehouseNameAr = (id: string) => {
    if (id === "WH-CAI-01") return "مستودع القاهرة المركزي الرئيسي";
    if (id === "WH-ALX-02") return "محطة الإسكندرية اللوجستية";
    if (id === "WH-DXB-03") return "مركز جافزا دبي الدولي";
    return id;
  };

  const widgetNames: Record<string, string> = {
    header: "سياق البيانات والشركات النشطة",
    stats: "الملخص والسيولة والأرباح التشغيلية",
    ratios: "مؤشرات التحليل والنسب المالية",
    stock: "المخزون الفعلي بالمستودعات",
    contacts: "أرصدة العملاء والموردين",
    centers: "مراكز التكلفة والربحية",
    roadmap: "خريطة طريق التحديثات القادمة vNext"
  };

  const renderSectionContent = (id: string) => {
    switch (id) {
      case "header":
        return (
          <BIHeaderWidget
            config={config}
            getCompanyNameAr={getCompanyNameAr}
            getBranchNameAr={getBranchNameAr}
            getWarehouseNameAr={getWarehouseNameAr}
          />
        );
      case "stats":
        return (
          <BIStatsWidget
            totalCurrentAssets={totalCurrentAssets}
            totalRevenues={totalRevenues}
            totalRawStockVal={totalRawStockVal}
            netProfit={netProfit}
            netMargin={netMargin}
            filteredStock={filteredStock}
            config={config}
            clr={clr}
          />
        );
      case "ratios":
        return (
          <BIRatiosWidget
            totalCurrentAssets={totalCurrentAssets}
            totalCurrentLiabilities={totalCurrentLiabilities}
            totalRevenues={totalRevenues}
            totalExpenses={totalExpenses}
            netProfit={netProfit}
            netMargin={netMargin}
            config={config}
            clr={clr}
            industryBenchmarks={industryBenchmarks}
          />
        );
      case "stock":
        return (
          <BIStockWidget
            filteredStock={filteredStock}
            config={config}
            getWarehouseNameAr={getWarehouseNameAr}
          />
        );
      case "contacts":
        return (
          <BIContactsWidget
            topCustomers={topCustomers}
            topSuppliers={topSuppliers}
            config={config}
          />
        );
      case "centers":
        return (
          <BICentersWidget
            filteredCostCenters={filteredCostCenters}
            filteredProfitCenters={filteredProfitCenters}
            config={config}
            clr={clr}
          />
        );
      case "roadmap":
        return <BIRoadmapWidget />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-right" id="bi-dashboard-container" dir="rtl">
      {/* 0. DYNAMIC CUSTOMIZATION CONTROL PANEL */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden" id="customizer-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">تخصيص لوحة تحكم ذكاء الأعمال (BI Customizer)</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                قم بإخفاء الموديولات أو إعادة ترتيبها عن طريق السحب والإفلات من مقبض التحكم الجانبي لتخصيص رؤيتك للبيانات.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-800 cursor-pointer"
            >
              <Settings className={`h-4 w-4 ${isConfigOpen ? "animate-spin text-cyan-400" : ""}`} />
              <span>{isConfigOpen ? "إخفاء لوحة الإعدادات" : "لوحة الإظهار والإخفاء"}</span>
            </button>
            
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-amber-500" />
              <span>إعادة الضبط</span>
            </button>
          </div>
        </div>

        {isConfigOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 p-4 bg-slate-950/50 rounded-lg border border-slate-800/80 animate-fadeIn text-[11px]">
            {Object.entries(widgetNames).map(([id, name]) => {
              const isVisible = visibleWidgets[id];
              return (
                <button
                  key={id}
                  onClick={() => toggleWidgetVisibility(id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-right cursor-pointer ${
                    isVisible
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300 font-semibold"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 line-through"
                  }`}
                >
                  <span className="truncate ml-1">{name}</span>
                  {isVisible ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. RENDER MUTABLE WIDGETS */}
      <div className="space-y-6">
        {layout.map((sectionId, idx) => {
          if (!visibleWidgets[sectionId]) return null;

          const isDragged = draggedIndex === idx;
          const isOver = dragOverIndex === idx;

          return (
            <div
              key={sectionId}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, idx)}
              className={`group/widget relative transition-all duration-300 rounded-xl ${
                isDragged ? "opacity-30 border border-dashed border-cyan-500/50 bg-cyan-950/5 scale-[0.98]" : ""
              } ${
                isOver ? "border-2 border-dashed border-cyan-400 bg-cyan-950/10 scale-[1.01]" : ""
              }`}
            >
              {/* Drag handle button overlay */}
              <div 
                className="absolute top-3 left-3 z-30 opacity-0 group-hover/widget:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 bg-slate-900/95 border border-slate-700/60 px-2.5 py-1.5 rounded-lg shadow-xl text-[10px] text-slate-200 cursor-grab active:cursor-grabbing select-none"
                title="اسحب لتغيير الترتيب"
              >
                <GripVertical className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>اسحب للترتيب</span>
              </div>

              {renderSectionContent(sectionId)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
