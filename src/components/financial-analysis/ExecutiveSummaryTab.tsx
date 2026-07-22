import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Scale
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";

interface ExecutiveSummaryProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
  onNavigateTab?: (tabId: string) => void;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryProps> = ({ asOfDate, theme, themeClasses, onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchExecutiveSummary();
  }, [asOfDate]);

  const fetchExecutiveSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch income statement, balance sheet, ratios, z-score, break-even in parallel
      const [isRes, bsRes, ratioRes, zRes, beRes] = await Promise.all([
        fetch(`/api/v1/financial-analysis/income-statement?asOfDate=${asOfDate}&comparative=true`),
        fetch(`/api/v1/financial-analysis/balance-sheet?asOfDate=${asOfDate}&comparative=true`),
        fetch(`/api/v1/financial-analysis/ratios?asOfDate=${asOfDate}`),
        fetch(`/api/v1/financial-analysis/altman-z-score?asOfDate=${asOfDate}`),
        fetch(`/api/v1/financial-analysis/break-even`)
      ]);

      const [isData, bsData, ratioData, zData, beData] = await Promise.all([
        isRes.json(),
        bsRes.json(),
        ratioRes.json(),
        zRes.json(),
        beRes.json()
      ]);

      setData({
        income: isData.data?.current || {},
        balance: bsData.data?.current || {},
        ratios: ratioData.data?.ratios || [],
        categories: ratioData.data?.categories || [],
        zScore: zData.data || {},
        breakEven: beData.data || {}
      });
    } catch (err: any) {
      setError("حدث خطأ أثناء تحميل بيانات الملخص التنفيذي. يرجى التحقق من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4" />
          <div className="h-80 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <p>{error || "تعذر تحميل البيانات"}</p>
      </div>
    );
  }

  const income = data?.income || {};
  const balance = data?.balance || {};
  const ratios = data?.ratios || [];
  const zScore = data?.zScore || {};
  const breakEven = data?.breakEven || {};

  const revenue = income.totalRevenue || 0;
  const netProfit = income.netProfit || 0;
  const totalAssets = balance.totalAssets || 0;
  const totalEquity = balance.totalEquity || 0;

  const currentRatio = ratios.find((r: any) => r.key === "current_ratio")?.value || 0;
  const netMargin = ratios.find((r: any) => r.key === "net_margin")?.value || 0;
  const roe = ratios.find((r: any) => r.key === "roe")?.value || 0;
  const debtToEquity = ratios.find((r: any) => r.key === "debt_to_equity")?.value || 0;

  // Radar Chart Data for Financial Health
  const radarData = [
    { subject: "السيولة", value: Math.min(100, (currentRatio / 2) * 100), fullMark: 100 },
    { subject: "الربحية", value: Math.min(100, Math.max(0, netMargin * 4)), fullMark: 100 },
    { subject: "الكفاءة", value: Math.min(100, (roe / 20) * 100), fullMark: 100 },
    { subject: "الأمان المالي", value: zScore.zScore ? Math.min(100, (zScore.zScore / 3) * 100) : 50, fullMark: 100 },
    { subject: "الرافعة المالية", value: Math.min(100, Math.max(0, 100 - (debtToEquity / 2) * 50)), fullMark: 100 }
  ];

  // Executive Waterfall / Overview chart
  const waterfallData = [
    { name: "الإيرادات", amount: revenue, fill: "#3b82f6" },
    { name: "تكلفة المبيعات", amount: income.totalCogs || 0, fill: "#ef4444" },
    { name: "مجمل الربح", amount: income.grossProfit || 0, fill: "#10b981" },
    { name: "المصروفات", amount: income.totalOpex || 0, fill: "#f59e0b" },
    { name: "صافي الربح", amount: netProfit, fill: "#8b5cf6" }
  ];

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Health & Z-Score Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              التقرير المالي التنفيذي العام
            </span>
            <span className="text-xs text-slate-400">بتاريخ {asOfDate}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">ملخص الأداء والتحليل المالي المتقدم للشركة</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            تم إعداد التقرير المالي الشامل بناءً على المعايير المحاسبية الدولية IFRS 18 ومعايير IAS 1، مع استخدام حسابات دقيقة بدون أخطاء تقريبية (Decimal Precision Engine).
          </p>
        </div>

        {/* Z-Score Badge */}
        {zScore.applicable && (
          <div 
            onClick={() => onNavigateTab?.("altman_z")}
            className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer rounded-xl p-4 flex items-center gap-4 min-w-[280px] group"
            title="انقر للانتقال لمؤشر Z-Score للإفلاس"
          >
            <div className={`p-3 rounded-xl border group-hover:scale-110 transition-transform ${
              zScore.zone === "Safe" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
              zScore.zone === "Grey" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
              "bg-red-500/10 text-red-400 border-red-500/30"
            }`}>
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span>مؤشر ألت مان لتفادي المخاطر (Z-Score)</span>
                <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black text-slate-100 mt-0.5">{zScore.zScore}</div>
              <div className={`text-xs font-semibold mt-1 ${
                zScore.zone === "Safe" ? "text-emerald-400" :
                zScore.zone === "Grey" ? "text-amber-400" :
                "text-red-400"
              }`}>
                {zScore.zone === "Safe" ? "منطقة الأمان (Safe Zone)" :
                 zScore.zone === "Grey" ? "منطقة التحذير (Grey Zone)" :
                 "منطقة التعثر (Distress Zone)"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div 
          onClick={() => onNavigateTab?.("statements")}
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer rounded-xl p-5 space-y-3 group"
          title="انقر للانتقال للقوائم المالية (IFRS 18)"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-blue-400 transition-colors flex items-center gap-1">
              إجمالي الإيرادات
              <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">ريال</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>مجمل الربح:</span>
            <span className="font-semibold text-emerald-400">{income.grossProfit?.toLocaleString() || 0} ريال</span>
          </div>
        </div>

        {/* Net Profit */}
        <div 
          onClick={() => onNavigateTab?.("statements")}
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer rounded-xl p-5 space-y-3 group"
          title="انقر للانتقال لقائمة الدخل الشامل"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-blue-400 transition-colors flex items-center gap-1">
              صافي أرباح الفترة
              <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${netProfit >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">ريال</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>هامش الربح الصافي:</span>
            <span className="font-semibold text-slate-200">{netMargin}%</span>
          </div>
        </div>

        {/* Total Assets & ROE */}
        <div 
          onClick={() => onNavigateTab?.("dupont")}
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer rounded-xl p-5 space-y-3 group"
          title="انقر للانتقال لتحليل ديبونت (DuPont)"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-blue-400 transition-colors flex items-center gap-1">
              إجمالي الأصول
              <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">ريال</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>العائد على الملكية (ROE):</span>
            <span className="font-semibold text-indigo-400">{roe}%</span>
          </div>
        </div>

        {/* Liquidity Ratio */}
        <div 
          onClick={() => onNavigateTab?.("ratios")}
          className="bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer rounded-xl p-5 space-y-3 group"
          title="انقر للانتقال لجدول النسب المالية"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-blue-400 transition-colors flex items-center gap-1">
              نسبة التداول (السيولة)
              <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {currentRatio} <span className="text-xs font-normal text-slate-400">مرة</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>الوضع:</span>
            <span className={`font-semibold ${currentRatio >= 1.5 ? "text-emerald-400" : currentRatio >= 1.0 ? "text-amber-400" : "text-red-400"}`}>
              {currentRatio >= 1.5 ? "ممتاز (سيولة عالية)" : currentRatio >= 1.0 ? "مقبول" : "ضعيف (مخاطر سيولة)"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Structure Breakdown Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              توزيع نتائج قائمة الدخل وتدفقات الأرباح
            </h3>
            <span className="text-xs text-slate-500">مبالغ بالريال</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={110} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} ريال`, "المبلغ"]}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Radar Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" />
              مؤشر الاتزان والمخاطر المالية (Financial Health Radar)
            </h3>
            <span className="text-xs text-slate-500">مقياس متزن (0-100)</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#cbd5e1" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                <Radar name="الأداء الحالي" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Insights & Break-Even Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            التوصيات والتحليل الاستراتيجي للإدارة العليا
          </h3>
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <p>
                <strong>كفاءة التشغيل:</strong> يحقق هامش الربح الإجمالي نسبة <span className="text-emerald-400 font-semibold">{revenue > 0 ? ((income.grossProfit / revenue) * 100).toFixed(1) : 0}%</span>، مما يعكس تحكماً متوازناً في تكلفة المبيعات المباشرة.
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <p>
                <strong>إدارة السيولة:</strong> بلغت نسبة التداول الحالية <span className="text-blue-400 font-semibold">{currentRatio}</span>. يوصى بإنشاء محفظة احتياطية لاستيعاب أي تباطؤ في تحصيل ذمم العملاء.
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <p>
                <strong>معايير IFRS 18:</strong> تم فصل الأنشطة التشغيلية والاستثمارية والتمويلية لضمان الوضوح التام في تقرير الأرباح التشغيلية (Operating Profit/EBIT) مقارنة بصافي الأرباح النهائية.
              </p>
            </div>
          </div>
        </div>

        {/* Break-even snapshot */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">تحليل نقطة التعادل (Break-Even)</h3>
          {breakEven.applicable ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">التكاليف الثابتة:</span>
                <span className="font-semibold text-slate-200">{breakEven.fixedCosts?.toLocaleString()} ريال</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">نسبة هامش المساهمة:</span>
                <span className="font-semibold text-slate-200">{(breakEven.contributionMarginRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">مبيعات التعادل المطلوبة:</span>
                <span className="font-bold text-amber-400">{breakEven.breakEvenValue?.toLocaleString()} ريال</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
                هامش الأمان: {breakEven.marginOfSafety?.toLocaleString()} ريال فوق التعادل
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">{breakEven.message || "غير متوفر"}</p>
          )}
        </div>
      </div>
    </div>
  );
};
