import React, { useState, useEffect } from "react";
import { 
  GitCommit, 
  HelpCircle, 
  TrendingUp, 
  Layers, 
  Percent, 
  DollarSign, 
  Activity,
  AlertTriangle
} from "lucide-react";

interface DuPontTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const DuPontTab: React.FC<DuPontTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepMode, setStepMode] = useState<"3step" | "5step">("5step");

  useEffect(() => {
    fetchDuPont();
  }, [asOfDate]);

  const fetchDuPont = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/financial-analysis/dupont?asOfDate=${asOfDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب تحليل ديبونت");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب تحليل ديبونت");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 bg-slate-800/40 rounded-xl border border-slate-700/50 animate-pulse" />
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <p>{error || "تعذر تحميل بيانات ديبونت"}</p>
      </div>
    );
  }

  const roe = data?.roe || 0;
  const roe3Step = data?.roe3Step || 0;
  const components3Step = data?.components3Step || {};
  const components5Step = data?.components5Step || {};

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5" />
              نموذج تفكيك العائد على الملكية (DuPont Framework)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">تحليل ديبونت لتفكيك محركات العائد على حقوق الملكية (ROE)</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            يساعد تحليل ديبونت الإدارة والمستثمرين على تفكيك معدل ROE لفهم ما إذا كان مصدر الربحية يعود إلى كفاءة الأرباح، دوران الأصول، أم التوسع في الرافعة المالية والعبء الضريبي.
          </p>
        </div>

        {/* Toggle 3-step vs 5-step */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setStepMode("3step")}
            className={`px-4 py-2 rounded-lg transition-all ${
              stepMode === "3step" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            النموذج الثلاثي (3-Step)
          </button>
          <button
            onClick={() => setStepMode("5step")}
            className={`px-4 py-2 rounded-lg transition-all ${
              stepMode === "5step" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            النموذج الخماسي الموسع (5-Step)
          </button>
        </div>
      </div>

      {/* Main ROE Summary Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-2">
        <div className="text-xs font-semibold text-slate-400">العائد الإجمالي على حقوق الملكية (ROE)</div>
        <div className="text-4xl font-black text-emerald-400">
          {stepMode === "3step" ? roe3Step : roe}%
        </div>
        <div className="text-xs text-slate-500">
          {stepMode === "3step" ? "محسوب كـ: هامش الربح × دوران الأصول × مضاعف الملكية" : "محسوب عبر الفئات الخمس الموسعة"}
        </div>
      </div>

      {/* Visual Tree Breakdown */}
      {stepMode === "3step" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>المحرك الأول</span>
              <span className="font-semibold text-blue-400">هامش ربح المبيعات</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{components3Step.netProfitMargin}%</div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              يقيس كفاءة تحويل الإيرادات إلى أرباح صافية بعد استقطاع كافة التكاليف والمصروفات.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>المحرك الثاني</span>
              <span className="font-semibold text-purple-400">معدل دوران الأصول</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{components3Step.assetTurnover} <span className="text-xs font-normal text-slate-400">مرة</span></div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              يقيس حجم المبيعات الموّلدة مقابل كل ريال مستثمر في أصول الشركة (كفاءة الأصول).
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>المحرك الثالث</span>
              <span className="font-semibold text-amber-400">مضاعف الملكية (الرافعة)</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{components3Step.equityMultiplier} <span className="text-xs font-normal text-slate-400">مرة</span></div>
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              يعكس نسبة الاعتماد على التمويل بالدين لمضاعفة أصول الشركة وحقوق ملكيتها.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Tax Burden */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] text-slate-400">1. العبء الضريبي (Tax Burden)</span>
            <div className="text-xl font-bold text-slate-100">{components5Step.taxBurden}</div>
            <p className="text-[10px] text-slate-500">صافي الدخل / الربح قبل الضريبة</p>
          </div>

          {/* Interest Burden */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] text-slate-400">2. عبء الفائدة (Interest Burden)</span>
            <div className="text-xl font-bold text-slate-100">{components5Step.interestBurden}</div>
            <p className="text-[10px] text-slate-500">الربح قبل الضريبة / EBIT</p>
          </div>

          {/* Operating Margin */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] text-slate-400">3. الهامش التشغيلي (EBIT %)</span>
            <div className="text-xl font-bold text-emerald-400">{components5Step.operatingMargin}%</div>
            <p className="text-[10px] text-slate-500">EBIT / الإيرادات</p>
          </div>

          {/* Asset Turnover */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] text-slate-400">4. دوران الأصول (Turnover)</span>
            <div className="text-xl font-bold text-slate-100">{components5Step.assetTurnover}</div>
            <p className="text-[10px] text-slate-500">الإيرادات / إجمالي الأصول</p>
          </div>

          {/* Financial Leverage */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] text-slate-400">5. الرافعة المالية (Leverage)</span>
            <div className="text-xl font-bold text-amber-400">{components5Step.equityMultiplier}</div>
            <p className="text-[10px] text-slate-500">الأصول / حقوق الملكية</p>
          </div>
        </div>
      )}
    </div>
  );
};
