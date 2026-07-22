import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  ShieldAlert, 
  DollarSign, 
  Zap,
  RotateCcw
} from "lucide-react";

interface WhatIfTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const WhatIfSimulatorTab: React.FC<WhatIfTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [revenueChange, setRevenueChange] = useState<number>(0); // % change
  const [variableCostChange, setVariableCostChange] = useState<number>(0); // % change
  const [fixedCostChange, setFixedCostChange] = useState<number>(0); // % change
  const [taxRateChange, setTaxRateChange] = useState<number>(0); // % absolute tax rate
  const [interestRateChange, setInterestRateChange] = useState<number>(0); // % change

  const [loading, setLoading] = useState(false);
  const [simulatedData, setSimulatedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runSimulation();
  }, [revenueChange, variableCostChange, fixedCostChange, taxRateChange, interestRateChange, asOfDate]);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/financial-analysis/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asOfDate,
          scenarios: {
            revenueChangePercent: revenueChange,
            variableCostChangePercent: variableCostChange,
            fixedCostChangePercent: fixedCostChange,
            taxRatePercent: taxRateChange,
            interestRateChangePercent: interestRateChange
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        setSimulatedData(json.data);
      } else {
        setError(json.error || "تعذر إجراء محاكاة السيناريوهات");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء إجراء المحاكاة المالية");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRevenueChange(0);
    setVariableCostChange(0);
    setFixedCostChange(0);
    setTaxRateChange(0);
    setInterestRateChange(0);
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              محاكي سيناريوهات الحساسية واتخاذ القرار (What-If Analysis)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">محاكي التغيرات المالية والافتراضات المستقبلية</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            قم بتحريك متغيّرات الإيرادات والتكاليف والضرائب لمشاهدة التأثير الفوري المباشر على صافي أرباح المنشأة، معدل ROE، ومؤشر مخاطر الإفلاس Z-Score دون التعديل على البيانات الحقيقية.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة ضبط المتغيرات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            شريط التحكم بالافتراضات (Scenario Sliders)
          </h3>

          {/* Revenue Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">تغيّر إيرادات المبيعات:</span>
              <span className={`font-bold ${revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {revenueChange > 0 ? `+${revenueChange}%` : `${revenueChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={1}
              value={revenueChange}
              onChange={(e) => setRevenueChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Variable Cost Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">تغيّر التكاليف المتغيرة (COGS):</span>
              <span className={`font-bold ${variableCostChange <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {variableCostChange > 0 ? `+${variableCostChange}%` : `${variableCostChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={1}
              value={variableCostChange}
              onChange={(e) => setVariableCostChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Fixed Cost Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">تغيّر التكاليف الثابتة والرواتب:</span>
              <span className={`font-bold ${fixedCostChange <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fixedCostChange > 0 ? `+${fixedCostChange}%` : `${fixedCostChange}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={1}
              value={fixedCostChange}
              onChange={(e) => setFixedCostChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          {/* Tax Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">معدل ضريبة الدخل والزكاة المطلوبة:</span>
              <span className="font-bold text-indigo-400">{taxRateChange}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={taxRateChange}
              onChange={(e) => setTaxRateChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Results Output Column */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            نتائج المحاكاة المقارنة (الفعلي vs المحاكى)
          </h3>

          {loading && (
            <div className="h-64 bg-slate-800/40 rounded-xl animate-pulse" />
          )}

          {!loading && simulatedData && (
            <div className="space-y-6">
              {/* Main Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Net Profit Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs text-slate-400">صافي الربح المحاكى</div>
                  <div className={`text-2xl font-bold ${simulatedData.simulated?.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {simulatedData.simulated?.netProfit?.toLocaleString()} <span className="text-xs text-slate-400">ريال</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between border-t border-slate-800/80 pt-1.5">
                    <span>الفعلي: {simulatedData.baseline?.netProfit?.toLocaleString()}</span>
                    <span className={`font-semibold ${simulatedData.simulated?.netProfit >= simulatedData.baseline?.netProfit ? "text-emerald-400" : "text-red-400"}`}>
                      {simulatedData.simulated?.netProfit >= simulatedData.baseline?.netProfit ? "ارتفاع" : "انخفاض"}
                    </span>
                  </div>
                </div>

                {/* ROE Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs text-slate-400">العائد على الملكية (ROE)</div>
                  <div className="text-2xl font-bold text-indigo-400">
                    {simulatedData.simulated?.roe}%
                  </div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-1.5">
                    الفعلي الأصلي: {simulatedData.baseline?.roe}%
                  </div>
                </div>

                {/* Break-Even Value Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs text-slate-400">نقطة التعادل المطلوبة</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {simulatedData.simulated?.breakEvenValue?.toLocaleString()} <span className="text-xs text-slate-400">ريال</span>
                  </div>
                  <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-1.5">
                    هامش الأمان المحاكى: {simulatedData.simulated?.marginOfSafety?.toLocaleString()} ريال
                  </div>
                </div>
              </div>

              {/* Z-Score impact snapshot */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">تأثير السيناريو على مؤشر التعثر المالي (Z-Score)</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    درجة ألت مان المحاكاة: <span className="text-emerald-400">{simulatedData.simulated?.zScore}</span> (الأصلي: {simulatedData.baseline?.zScore})
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  simulatedData.simulated?.zZone === "Safe" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  simulatedData.simulated?.zZone === "Grey" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  منطقة {simulatedData.simulated?.zZone}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
