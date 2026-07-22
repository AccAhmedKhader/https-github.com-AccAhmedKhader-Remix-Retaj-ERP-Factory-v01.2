import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  Activity, 
  CheckCircle2,
  Award
} from "lucide-react";

interface ZScoreTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const AltmanZScoreTab: React.FC<ZScoreTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchZScore();
  }, [asOfDate]);

  const fetchZScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/financial-analysis/altman-z-score?asOfDate=${asOfDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب نموذج ألت مان");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب نموذج Z-Score");
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
        <p>{error || "تعذر تحميل نموذج ألت مان"}</p>
      </div>
    );
  }

  if (!data.applicable) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-6 rounded-xl space-y-2">
        <h3 className="font-bold">غير متوفر</h3>
        <p className="text-xs">{data.message}</p>
      </div>
    );
  }

  const zScore = data?.zScore || 0;
  const zone = data?.zone || "Grey";
  const explanationAr = data?.explanationAr || "";
  const components = data?.components || {};
  const rawValues = data?.rawValues || {};

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              نموذج التنبؤ بالتعثر المالي والإفلاس (Altman Z-Score Model)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">تقييم مخاطر السلامة المالية والاستقرار التشغيلي للشركة</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            يعتمد نموذج Altman Z-Score للشركات غير المدرجة على دمج خمس نسب مالية مفتاحية تتنبأ باحتمالية التعثر المالي والإفلاس خلال فترة 24 شهراً مقبلة بدقة تصل إلى 90%.
          </p>
        </div>

        {/* Big Zone Gauge */}
        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center min-w-[260px] text-center shadow-2xl ${
          zone === "Safe" ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400" :
          zone === "Grey" ? "bg-amber-950/30 border-amber-500/40 text-amber-400" :
          "bg-red-950/30 border-red-500/40 text-red-400"
        }`}>
          <div className="text-xs font-semibold mb-1 opacity-80">درجة مؤشر Z-Score الحالي</div>
          <div className="text-4xl font-black my-1">{zScore}</div>
          <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-950/60 border border-current mt-2">
            {zone === "Safe" ? "منطقة الأمان (Safe Zone)" :
             zone === "Grey" ? "منطقة التحذير (Grey Zone)" :
             "منطقة التعثر المالي (Distress Zone)"}
          </div>
        </div>
      </div>

      {/* Zone Threshold Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <h4 className="text-xs font-bold text-slate-300">مقياس النطاقات الثلاثة للمؤشر (Altman Zones)</h4>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className={`p-3 rounded-xl border ${zone === "Distress" ? "bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/50" : "bg-red-950/20 border-red-900/40 text-red-400/60"}`}>
            <div>منطقة التعثر (Distress)</div>
            <div className="text-[10px] opacity-70 mt-1">Z &lt; 1.23</div>
          </div>

          <div className={`p-3 rounded-xl border ${zone === "Grey" ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/50" : "bg-amber-950/20 border-amber-900/40 text-amber-400/60"}`}>
            <div>المنطقة الرمادية (Grey Zone)</div>
            <div className="text-[10px] opacity-70 mt-1">1.23 ≤ Z ≤ 2.90</div>
          </div>

          <div className={`p-3 rounded-xl border ${zone === "Safe" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50" : "bg-emerald-950/20 border-emerald-900/40 text-emerald-400/60"}`}>
            <div>منطقة الأمان (Safe Zone)</div>
            <div className="text-[10px] opacity-70 mt-1">Z &gt; 2.90</div>
          </div>
        </div>
        <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
          <strong>التفسير التشخيصي:</strong> {explanationAr}
        </p>
      </div>

      {/* Components Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h4 className="text-sm font-bold text-slate-200">تفاصيل مكونات المعادلة الخمسة (Z-Score Components)</h4>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold">X1: السيولة العاملة</span>
            <div className="text-lg font-bold text-slate-100">{components.x1}</div>
            <p className="text-[10px] text-slate-500">رأس المال العامل / الأصول ({rawValues.workingCapital?.toLocaleString()})</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold">X2: الأرباح المحتجزة</span>
            <div className="text-lg font-bold text-slate-100">{components.x2}</div>
            <p className="text-[10px] text-slate-500">الأرباح المحتجزة / الأصول ({rawValues.retainedEarnings?.toLocaleString()})</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold">X3: قدرة توليد الأرباح</span>
            <div className="text-lg font-bold text-emerald-400">{components.x3}</div>
            <p className="text-[10px] text-slate-500">EBIT / إجمالي الأصول ({rawValues.ebit?.toLocaleString()})</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold">X4: ملاءة التمويل</span>
            <div className="text-lg font-bold text-slate-100">{components.x4}</div>
            <p className="text-[10px] text-slate-500">القيمة الدفترية للحقوق / الالتزامات</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold">X5: كفاءة المبيعات</span>
            <div className="text-lg font-bold text-blue-400">{components.x5}</div>
            <p className="text-[10px] text-slate-500">إجمالي المبيعات / الأصول ({rawValues.sales?.toLocaleString()})</p>
          </div>
        </div>
      </div>
    </div>
  );
};
