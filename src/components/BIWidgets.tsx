import React from "react";
import { 
  TrendingUp, 
  Coins, 
  BarChart3, 
  DollarSign, 
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
  Sparkles
} from "lucide-react";
import { ERPConfig } from "../types";

// =========================================================================
// 1. HEADER WIDGET
// =========================================================================
interface BIHeaderWidgetProps {
  config: ERPConfig;
  getCompanyNameAr: (id: string) => string;
  getBranchNameAr: (id: string) => string;
  getWarehouseNameAr: (id: string) => string;
}

export function BIHeaderWidget({
  config,
  getCompanyNameAr,
  getBranchNameAr,
  getWarehouseNameAr
}: BIHeaderWidgetProps) {
  return (
    <div className="bg-[#0f1425] border border-cyan-500/20 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
      {/* Abstract futuristic background decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="flex items-start gap-3.5 relative z-10 text-right">
        <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shrink-0">
          <ShieldCheck className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2 justify-start">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">سياق البيانات النشط مصفى لحظياً</span>
          </div>
          <h2 className="text-sm font-bold text-slate-100 mt-1">تكامل ذكاء الأعمال مع هياكل الفروع والشركات (BI Context Sync)</h2>
          <p className="text-[11px] text-slate-400 mt-1">
            يتم الآن تصفية الحسابات الدفترية ومستويات مخزون المستودعات وسجلات العاملين تلقائياً بناءً على محددات الأمن الوظيفي للفرع والمخزن المختار.
          </p>
        </div>
      </div>

      {/* Selected Context Pills */}
      <div className="flex flex-wrap items-center gap-2.5 text-[11px] relative z-10 self-start md:self-auto bg-slate-950/40 p-2 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-slate-400">المنشأة:</span>
          <strong className="text-emerald-400">{getCompanyNameAr(config.company)}</strong>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-slate-400">الفرع:</span>
          <strong className="text-cyan-400">{getBranchNameAr(config.branch)}</strong>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-pink-400" />
          <span className="text-slate-400">المخزن:</span>
          <strong className="text-pink-400">{getWarehouseNameAr(config.warehouse)}</strong>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 2. STATS WIDGET
// =========================================================================
interface BIStatsWidgetProps {
  totalCurrentAssets: number;
  totalRevenues: number;
  totalRawStockVal: number;
  netProfit: number;
  netMargin: number;
  filteredStock: any[];
  config: ERPConfig;
  clr: { text: string };
}

export function BIStatsWidget({
  totalCurrentAssets,
  totalRevenues,
  totalRawStockVal,
  netProfit,
  netMargin,
  filteredStock,
  config,
  clr
}: BIStatsWidgetProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-right">
      {/* Stat 1: Assets */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block font-bold">السيولة المتاحة والأصول المصفاة</span>
          <h4 className="text-lg font-mono font-bold text-slate-100">{totalCurrentAssets.toLocaleString()} {config.currency}</h4>
          <span className={`text-[10px] ${clr.text} font-bold font-sans flex items-center gap-1 justify-start`}>
            <TrendingUp className="h-3 w-3" />
            رصيد الخزائن والبنك النشط بالفرع
          </span>
        </div>
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
          <Coins className="h-5 w-5" />
        </div>
      </div>

      {/* Stat 2: Revenues */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block font-bold">صافي مبيعات التراخيص والخدمات</span>
          <h4 className="text-lg font-mono font-bold text-slate-100">{totalRevenues.toLocaleString()} {config.currency}</h4>
          <span className="text-[10px] text-cyan-400 font-bold font-sans flex items-center gap-1 justify-start">
            <Sparkles className="h-3 w-3" />
            إيرادات تابعة للمنشأة المفتوحة
          </span>
        </div>
        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {/* Stat 3: Stock Value */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block font-bold">قيمة بضاعة المخزن المختار</span>
          <h4 className="text-lg font-mono font-bold text-slate-100">{totalRawStockVal.toLocaleString()} {config.currency}</h4>
          <span className="text-[10px] text-pink-400 font-bold font-sans flex items-center gap-1 justify-start">
            <Package className="h-3 w-3" />
            مستوى بضاعة المستودع ({filteredStock.reduce((sum, i) => sum + i.quantity, 0)} قطع)
          </span>
        </div>
        <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20 shrink-0">
          <Package className="h-5 w-5" />
        </div>
      </div>

      {/* Stat 4: Net Profit */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 flex items-center justify-between shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-1.5 flex-1">
          <span className="text-[10px] font-sans text-slate-400 uppercase tracking-wider block font-bold">صافي الأرباح التشغيلية</span>
          <h4 className="text-lg font-mono font-bold text-slate-100">{netProfit.toLocaleString()} {config.currency}</h4>
          <span className="text-[10px] text-amber-400 font-bold font-sans flex items-center gap-1 justify-start">
            <Percent className="h-3 w-3" />
            هامش الربح للشركة {netMargin.toFixed(1)}%
          </span>
        </div>
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. RATIOS WIDGET
// =========================================================================
interface BIRatiosWidgetProps {
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  totalRevenues: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  config: ERPConfig;
  clr: { text: string };
  industryBenchmarks: any[];
}

export function BIRatiosWidget({
  totalCurrentAssets,
  totalCurrentLiabilities,
  totalRevenues,
  totalExpenses,
  netProfit,
  netMargin,
  config,
  clr,
  industryBenchmarks
}: BIRatiosWidgetProps) {
  return (
    <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 text-right">
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <Scale className={`h-4.5 w-4.5 ${clr.text}`} /> مؤشرات التحليل المالي ومقارنة نسب قطاع التكنولوجيا والصناعة
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            مقارنة نسب الأداء والسيولة والمخزون الحالية للشركة مع المعايير ومعدلات الصناعة المعتمدة للشركات التكنولوجية بالشرق الأوسط ومصر.
          </p>
        </div>
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 text-[10px] text-slate-400 font-mono rounded-lg self-start sm:self-auto">
          مؤشرات مصفاة نشطة ومباشرة
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Liquidity Overview Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-start">
            <Activity className="h-4 w-4 text-emerald-400" /> ملخص مركز السيولة والأصول
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي الأصول المتداولة:</span>
              <span className="font-mono font-bold text-slate-200">{totalCurrentAssets.toLocaleString()} {config.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي الالتزامات المتداولة:</span>
              <span className="font-mono font-bold text-slate-200">{totalCurrentLiabilities.toLocaleString()} {config.currency}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-emerald-400">
              <span>رأس المال العامل الصافي:</span>
              <span className="font-mono">{(totalCurrentAssets - totalCurrentLiabilities).toLocaleString()} {config.currency}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-800/50">
            الفرع التشغيلي يتمتع بمركز مالي شديد المتانة، حيث يفوق رأس المال العامل الاحتياجات التشغيلية العاجلة، مما يعزز الأمان ومعدلات الاستثمار الفوري.
          </p>
        </div>

        {/* Quick Ratios summary Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-start">
            <Percent className="h-4 w-4 text-cyan-400" /> الكفاءة التشغيلية والهوامش
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي المبيعات والاشتراكات:</span>
              <span className="font-mono font-bold text-slate-200">{totalRevenues.toLocaleString()} {config.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">إجمالي النفقات المتكبدة:</span>
              <span className="font-mono font-bold text-slate-200">{totalExpenses.toLocaleString()} {config.currency}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-cyan-400">
              <span>صافي الأرباح المصفاة:</span>
              <span className="font-mono">{netProfit.toLocaleString()} {config.currency}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-800/50">
            هامش الربح الصافي للشركة يبلغ <strong className="text-amber-400">{netMargin.toFixed(1)}%</strong>، وهو ما يعكس ربحية فائقة وتكاليف متوازنة بفضل الكفاءة الهندسية وتخفيض المصروفات التشغيلية.
          </p>
        </div>

        {/* Benchmark compliance indicator status */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-start">
              <ShieldCheck className="h-4 w-4 text-purple-400" /> الامتثال لمؤشرات معيار القطاع
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
              مقارنة بمتوسطات قطاع حلول البرمجيات وتوزيع الخوادم بالشرق الأوسط، تتفوق الشركة بشكل ملحوظ في معدلات الأمان المالي وتوفر السيولة، وتخلو تماماً من المديونيات المعقدة والفوائد البنكية المرهقة.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-emerald-400 font-bold">توصية: الحفاظ على وتيرة الاستثمار الحالية وتطوير خطوط إنتاج جديدة.</span>
          </div>
        </div>
      </div>

      {/* Dynamic Comparison Table with Ratios */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-xs text-right divide-y divide-slate-800/80 font-sans">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 font-bold">
              <th className="p-3.5">النسبة والمؤشر المالي</th>
              <th className="p-3.5 text-center">أداء الشركة الحالي (ApexSaaS)</th>
              <th className="p-3.5 text-center">المتوسط القياسي للصناعة (IT/SaaS)</th>
              <th className="p-3.5 text-center">التقييم وحالة الامتثال</th>
              <th className="p-3.5">تفصيل وتعريف المؤشر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {industryBenchmarks.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                <td className="p-3.5 font-bold text-slate-100">{item.name}</td>
                <td className="p-3.5 text-center font-mono font-bold text-slate-100 bg-slate-900/30">{item.actual}</td>
                <td className="p-3.5 text-center font-mono font-bold text-slate-400">{item.benchmark}</td>
                <td className="p-3.5 text-center">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 ${item.statusColor}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3.5 text-slate-400 text-[10.5px] leading-relaxed max-w-sm">{item.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// 4. STOCK WIDGET
// =========================================================================
interface BIStockWidgetProps {
  filteredStock: any[];
  config: ERPConfig;
  getWarehouseNameAr: (id: string) => string;
}

export function BIStockWidget({
  filteredStock,
  config,
  getWarehouseNameAr
}: BIStockWidgetProps) {
  return (
    <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-right">
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <Package className="h-4.5 w-4.5 text-pink-400" /> المخزون السلعي الفعلي بمستودع: <strong className="text-pink-400">{getWarehouseNameAr(config.warehouse)}</strong>
          </h3>
          <p className="text-xs text-slate-400 mt-1">قائمة الأصناف وقطع الهاردوير والمقادير المتاحة بالمستودع المحدد بالطلب حالياً.</p>
        </div>
        <span className="bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded border border-pink-500/20 text-[10px] font-mono font-bold">
          مستودع نشط: {config.warehouse}
        </span>
      </div>

      {filteredStock.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">لا توجد أصناف مسجلة تحت هذا المستودع حالياً.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredStock.map((item) => (
            <div key={item.sku} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500">{item.sku}</span>
                <h4 className="text-xs font-bold text-slate-200 leading-normal">{item.name}</h4>
                <div className="text-[10px] text-slate-400 mt-1">{item.category} • {item.subCategory}</div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">الكمية المتوفرة</span>
                  <strong className="text-slate-100 font-mono text-sm">{item.quantity} وحدة</strong>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">سعر الوحدة</span>
                  <strong className="text-cyan-400 font-mono">{item.unitPrice.toLocaleString()} ج.م</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 5. CONTACTS WIDGET
// =========================================================================
interface BIContactsWidgetProps {
  topCustomers: any[];
  topSuppliers: any[];
  config: ERPConfig;
}

export function BIContactsWidget({
  topCustomers,
  topSuppliers,
  config
}: BIContactsWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
      {/* Top 5 Customers Card */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <Users className="h-4.5 w-4.5 text-emerald-400" /> حسابات الذمم المدينة والعملاء للمنشأة: <strong className="text-emerald-400">{config.company === "Apex Levant Corp" ? "قمة الشام" : config.company === "Apex Gulf International" ? "قمة الخليج" : "قمة أفريقيا"}</strong>
          </h3>
          <p className="text-xs text-slate-400 mt-1">تتبع المديونيات المستحقة للعملاء بالعملة المحلية حسب معايير التصفية والترحيل الفعال.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-slate-800 font-sans">
            <thead>
              <tr className="text-slate-400 font-bold bg-slate-900/40">
                <th className="p-2.5">اسم العميل والشركة</th>
                <th className="p-2.5">الرقم الضريبي</th>
                <th className="p-2.5 text-left">الرصيد الدفتري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {topCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-900/20 transition-all">
                  <td className="p-2.5">
                    <div className="font-bold text-slate-200">{cust.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {cust.id}</div>
                  </td>
                  <td className="p-2.5 font-mono text-slate-400">{cust.taxRegistrationNumber || "غير مدرج"}</td>
                  <td className="p-2.5 text-left font-mono font-bold text-emerald-400">
                    {cust.balance.toLocaleString()} {config.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 Suppliers Card */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <TrendingUp className="h-4.5 w-4.5 text-cyan-400" /> حسابات الذمم الدائنة والموردين للمنشأة
          </h3>
          <p className="text-xs text-slate-400 mt-1">تتبع الموردين والالتزامات المحاسبية المستحقة للمنشأة المحددة بالترتيب.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-slate-800 font-sans">
            <thead>
              <tr className="text-slate-400 font-bold bg-slate-900/40">
                <th className="p-2.5">اسم المورد والشركة</th>
                <th className="p-2.5">الرقم الضريبي</th>
                <th className="p-2.5 text-left">الرصيد المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {topSuppliers.map((supp) => (
                <tr key={supp.id} className="hover:bg-slate-900/20 transition-all">
                  <td className="p-2.5">
                    <div className="font-bold text-slate-200">{supp.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">ID: {supp.id}</div>
                  </td>
                  <td className="p-2.5 font-mono text-slate-400">{supp.taxRegistrationNumber || "غير مدرج"}</td>
                  <td className="p-2.5 text-left font-mono font-bold text-cyan-400">
                    {supp.balance.toLocaleString()} {config.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 6. CENTERS WIDGET
// =========================================================================
interface BICentersWidgetProps {
  filteredCostCenters: any[];
  filteredProfitCenters: any[];
  config: ERPConfig;
  clr: { gradient: string };
}

export function BICentersWidget({
  filteredCostCenters,
  filteredProfitCenters,
  config,
  clr
}: BICentersWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
      {/* Cost Centers budget analysis */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5.5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <DollarSign className="h-4.5 w-4.5 text-emerald-400" /> مراكز التكلفة والإنفاق للإدارات النشطة بالشركة
          </h3>
          <p className="text-xs text-slate-400 mt-1">تتبع حدود الميزانية المخصصة والمنصرف الفعلي من الصناديق المحاسبية بالشركة.</p>
        </div>

        <div className="space-y-4.5">
          {filteredCostCenters.map(cc => {
            const spentPct = Math.min((cc.spent / cc.budget) * 100, 100);
            return (
              <div key={cc.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-200 font-bold">{cc.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500 block">كود المركز: {cc.id}</span>
                  </div>
                  <div className="text-left font-mono text-[11px]">
                    <span className="text-slate-300 font-bold">{cc.spent.toLocaleString()}</span>
                    <span className="text-slate-500"> / {cc.budget.toLocaleString()} {config.currency}</span>
                  </div>
                </div>
                {/* Progress bar container */}
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    style={{ width: `${spentPct}%` }}
                    className={`h-full bg-gradient-to-l ${clr.gradient} rounded-full`} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profit Centers sales performance */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5.5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="font-display font-bold text-slate-200 text-xs flex items-center gap-2 justify-start">
            <Target className="h-4.5 w-4.5 text-cyan-400" /> مراكز الربحية: معدلات الإنجاز ومبيعات تراخيص التكنولوجيا
          </h3>
          <p className="text-xs text-slate-400 mt-1">مقارنة مبيعات البرمجيات والخدمات المحققة فعلياً مع الحدود المستهدفة للمبيعات بالعملة.</p>
        </div>

        <div className="space-y-4.5">
          {filteredProfitCenters.map(pc => {
            const performancePct = Math.min((pc.actual / pc.target) * 100, 100);
            return (
              <div key={pc.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-200 font-bold">{pc.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500 block">كود المركز: {pc.id}</span>
                  </div>
                  <div className="text-left font-mono text-[11px]">
                    <span className="text-slate-300 font-bold">{pc.actual.toLocaleString()}</span>
                    <span className="text-slate-500"> / {pc.target.toLocaleString()} {config.currency}</span>
                  </div>
                </div>
                {/* Progress bar container */}
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    style={{ width: `${performancePct}%` }}
                    className="h-full bg-gradient-to-l from-cyan-500 to-blue-400 rounded-full" 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 7. ROADMAP WIDGET
// =========================================================================
export function BIRoadmapWidget() {
  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 text-right">
      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start">
            <Sparkles className="h-4.5 w-4.5 text-amber-500" /> خريطة الطريق للتحديثات المستقبلية | ERP vNext Roadmap
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            الموديولات البرمجية الإضافية المخطط إطلاقها في التحديثات السحابية القادمة لـ ApexSaaS. تم استبعادها من الإصدار الحالي لضمان أعلى مستويات الأمان والامتثال المالي.
          </p>
        </div>
        <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded border border-amber-500/30 text-[10px] font-mono font-bold">
          خارج النطاق حالياً — Not in Scope — vNext
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between opacity-75">
          <div>
            <span className="text-[9px] font-mono text-slate-500">vNext - Module 01</span>
            <h4 className="text-xs font-bold text-slate-300 mt-1">إدارة علاقات العملاء (CRM)</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              تتبع دورة حياة العملاء، خطوط المبيعات المتوقعة، وحملات التسويق الرقمي المؤتمتة مع تحليلات الذكاء الاصطناعي.
            </p>
          </div>
          <div className="mt-3 text-[9px] text-amber-500 font-mono font-bold bg-amber-500/5 py-1 px-2 rounded border border-amber-500/10 text-center">
            قيد التخطيط — Planned vNext
          </div>
        </div>

        <div className="bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between opacity-75">
          <div>
            <span className="text-[9px] font-mono text-slate-500">vNext - Module 02</span>
            <h4 className="text-xs font-bold text-slate-300 mt-1">إدارة المستندات والأرشفة</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              أرشفة مركزية للمستندات والفواتير الورقية الممسوحة ضوئياً، مع الربط المباشر ببروتوكولات الأمان وصلاحيات الاستعراض.
            </p>
          </div>
          <div className="mt-3 text-[9px] text-amber-500 font-mono font-bold bg-amber-500/5 py-1 px-2 rounded border border-amber-500/10 text-center">
            قيد التخطيط — Planned vNext
          </div>
        </div>

        <div className="bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between opacity-75">
          <div>
            <span className="text-[9px] font-mono text-slate-500">vNext - Module 03</span>
            <h4 className="text-xs font-bold text-slate-300 mt-1">أتمتة سير العمل (Workflow)</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              محرك نمذجة العمليات لاعتماد القيود وسندات الصرف والمشتريات آلياً بناءً على مستويات الهيكل الإداري والموافقة المتعددة.
            </p>
          </div>
          <div className="mt-3 text-[9px] text-amber-500 font-mono font-bold bg-amber-500/5 py-1 px-2 rounded border border-amber-500/10 text-center">
            قيد التخطيط — Planned vNext
          </div>
        </div>

        <div className="bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between opacity-75">
          <div>
            <span className="text-[9px] font-mono text-slate-500">vNext - Module 04</span>
            <h4 className="text-xs font-bold text-slate-300 mt-1">تحليلات التدفقات النقدية</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              تحليل متقدم لمتحصلات السيولة النقدية ومدفوعاتها المستقبلية، والتنبؤ بمستويات العجز أو الفائض المالي المحتمل شهرياً.
            </p>
          </div>
          <div className="mt-3 text-[9px] text-amber-500 font-mono font-bold bg-amber-500/5 py-1 px-2 rounded border border-amber-500/10 text-center">
            قيد التخطيط — Planned vNext
          </div>
        </div>

        <div className="bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between opacity-75">
          <div>
            <span className="text-[9px] font-mono text-slate-500">vNext - Module 05</span>
            <h4 className="text-xs font-bold text-slate-300 mt-1">التوحيد المالي والشركات القابضة</h4>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              محرك التجميع المالي لإنتاج قوائم دخل موحدة للمجموعات متعددة الفروع والتنظيمات والشركات الشقيقة، وتصفية التعاملات البينية.
            </p>
          </div>
          <div className="mt-3 text-[9px] text-amber-500 font-mono font-bold bg-amber-500/5 py-1 px-2 rounded border border-amber-500/10 text-center">
            قيد التخطيط — Planned vNext
          </div>
        </div>
      </div>
    </div>
  );
}
