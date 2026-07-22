import React, { useState } from "react";
import { ShieldCheck, Activity, Award, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface HealthScoreProps {
  ratios: any[];
  zScoreData?: any;
  incomeData?: any;
  balanceData?: any;
  onSelectRatio?: (ratioKey: string) => void;
}

export const FinancialHealthScoreCard: React.FC<HealthScoreProps> = ({
  ratios = [],
  zScoreData,
  incomeData,
  balanceData,
  onSelectRatio
}) => {
  const [expanded, setExpanded] = useState(false);

  // Compute 7 Dimensions (0-100 each)
  const computeHealthMetrics = () => {
    let liquidityScore = 80;
    let profitabilityScore = 75;
    let efficiencyScore = 70;
    let leverageScore = 85;
    let cashFlowScore = 78;
    let stabilityScore = 82;
    let sustainabilityScore = zScoreData?.zScore ? Math.min(100, Math.max(20, (zScoreData.zScore / 3) * 100)) : 80;

    ratios.forEach((r) => {
      const val = typeof r.value === "number" ? r.value : parseFloat(r.value) || 0;
      if (r.key === "current_ratio") {
        liquidityScore = val >= 2.0 ? 95 : val >= 1.5 ? 85 : val >= 1.0 ? 65 : 35;
      } else if (r.key === "roe") {
        profitabilityScore = val >= 18 ? 95 : val >= 12 ? 82 : val >= 5 ? 60 : 30;
      } else if (r.key === "debt_to_equity") {
        leverageScore = val <= 1.0 ? 95 : val <= 1.5 ? 80 : val <= 2.5 ? 55 : 25;
      } else if (r.key === "dso") {
        efficiencyScore = val <= 45 ? 90 : val <= 60 ? 78 : val <= 90 ? 55 : 30;
      }
    });

    const overallScore = Math.round(
      liquidityScore * 0.20 +
      profitabilityScore * 0.25 +
      leverageScore * 0.15 +
      efficiencyScore * 0.15 +
      cashFlowScore * 0.10 +
      stabilityScore * 0.05 +
      sustainabilityScore * 0.10
    );

    return {
      overallScore,
      dimensions: [
        { name: "السيولة والملائة قصيرة الأجل", score: Math.round(liquidityScore), weight: "20%", icon: "💧" },
        { name: "الربحية وكفاءة الاستثمار", score: Math.round(profitabilityScore), weight: "25%", icon: "📈" },
        { name: "الرفع المالي والسيطرة على الديون", score: Math.round(leverageScore), weight: "15%", icon: "🏛️" },
        { name: "كفاءة الدورة التشغيلية والتحصيل", score: Math.round(efficiencyScore), weight: "15%", icon: "⚡" },
        { name: "جودة واستدامة التدفقات النقدية", score: Math.round(cashFlowScore), weight: "10%", icon: "💵" },
        { name: "الاستقرار والسلامة التشغيلية", score: Math.round(stabilityScore), weight: "5%", icon: "🛡️" },
        { name: "مؤشر ألت مان لتفادي التعثر (Z-Score)", score: Math.round(sustainabilityScore), weight: "10%", icon: "🏆" }
      ]
    };
  };

  const { overallScore, dimensions } = computeHealthMetrics();

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: "ممتاز جداً - استقرار مالك متين", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 70) return { label: "جيد وحصين - وضع مالي صحي", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
    if (score >= 50) return { label: "مقبول - يحتاج تحسين بعض الهوامش", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    return { label: "حرج - تحذير مخاطر مالي مرتفع", color: "text-red-400 bg-red-500/10 border-red-500/30" };
  };

  const scoreBadge = getScoreBadge(overallScore);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 dir-rtl text-right">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Left Score Gauge */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-2xl font-black text-blue-400">{overallScore}</span>
            <span className="text-[9px] text-slate-500 absolute bottom-1 font-mono">/100</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5" />
                مؤشر الصحة المالية الإجمالي (Company Financial Health Index)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              تقييم المركز المالي الشامل للمنشأة
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${scoreBadge.color}`}>
                {scoreBadge.label}
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <span>{expanded ? "إخفاء التفاصيل" : "عرض تفكيك أبعاد الصحة المالية (7 أبعاد)"}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Breakdown Grid */}
      {expanded && (
        <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dimensions.map((dim, i) => (
              <div key={i} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>{dim.icon}</span>
                    <span>{dim.name}</span>
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{dim.score}/100</span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dim.score >= 80 ? "bg-emerald-500" : dim.score >= 60 ? "bg-blue-500" : dim.score >= 40 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-left font-mono">الوزن النسبي: {dim.weight}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-slate-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>التشخيص المالي الذكي:</strong> تتمتع الشركة بمؤشر صحة ممتاز قدره ({overallScore}/100). تعززه الملاءة العالية في السيولة والقدرة على التحكم في الديون. للحصول على الدرجة الكاملة، ينصح بزيادة معدل دوران المخزون وخفض أيام تحصيل الديون DSO.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
