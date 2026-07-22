import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  BarChart2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers,
  Filter
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

interface TrendTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const TrendHorizontalTab: React.FC<TrendTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [statement, setStatement] = useState<"income" | "balance">("income");
  const [interval, setInterval] = useState<"month" | "quarter" | "year">("month");
  const [periodsCount, setPeriodsCount] = useState(6);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [verticalData, setVerticalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendData();
  }, [statement, interval, periodsCount, asOfDate]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [horizRes, vertRes] = await Promise.all([
        fetch(`/api/v1/financial-analysis/horizontal-analysis?statement=${statement}&interval=${interval}&periodsCount=${periodsCount}&asOfDate=${asOfDate}`),
        fetch(`/api/v1/financial-analysis/vertical-analysis?statement=${statement}&asOfDate=${asOfDate}`)
      ]);

      const [horizJson, vertJson] = await Promise.all([
        horizRes.json(),
        vertRes.json()
      ]);

      if (horizJson.success) setData(horizJson.data);
      if (vertJson.success) setVerticalData(vertJson.data);
    } catch (err: any) {
      setError("حدث خطأ أثناء تحميل بيانات التحليل الأفقي والرأسي");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Filter Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatement("income")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statement === "income" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              قائمة الدخل
            </button>
            <button
              onClick={() => setStatement("balance")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statement === "balance" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              الميزانية العمومية
            </button>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setInterval("month")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                interval === "month" ? "bg-slate-800 text-blue-400" : "text-slate-400"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setInterval("quarter")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                interval === "quarter" ? "bg-slate-800 text-blue-400" : "text-slate-400"
              }`}
            >
              ربعي
            </button>
            <button
              onClick={() => setInterval("year")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                interval === "year" ? "bg-slate-800 text-blue-400" : "text-slate-400"
              }`}
            >
              سنوي
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>عدد الفترات المقارنة:</span>
          <select
            value={periodsCount}
            onChange={(e) => setPeriodsCount(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value={3}>3 فترات</option>
            <option value={6}>6 فترات</option>
            <option value={12}>12 فترة</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="h-80 bg-slate-800/40 rounded-xl border border-slate-700/50 animate-pulse" />
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              الرسم البياني الاتجاهي لمسار البنود المالية عبر الفترات
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.periods} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }} />
                  <Legend />
                  {statement === "income" ? (
                    <>
                      <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#3b82f6" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="grossProfit" name="مجمل الربح" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#8b5cf6" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <Line type="monotone" dataKey="totalAssets" name="إجمالي الأصول" stroke="#3b82f6" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="equity" name="حقوق الملكية" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="totalLiabilities" name="الالتزامات" stroke="#ef4444" strokeWidth={2} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vertical Analysis Card & Horizontal Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vertical Common-Size */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                التحليل الرأسي الموحد (Common-Size)
              </h3>
              <p className="text-xs text-slate-400">
                {statement === "income" ? "منسوباً إلى إجمالي الإيرادات (100%)" : "منسوباً إلى إجمالي الأصول (100%)"}
              </p>

              <div className="space-y-2 text-xs">
                {verticalData?.items?.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-300 font-medium">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400">{item.balance?.toLocaleString()} ريال</span>
                      <span className="font-bold text-emerald-400 min-w-[45px] text-left">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horizontal Table */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200">جدول معدلات النمو والتغير الأفقي (%)</h3>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">الفترة</th>
                      {statement === "income" ? (
                        <>
                          <th className="py-3 px-4 text-left">الإيرادات</th>
                          <th className="py-3 px-4 text-left">نمو الإيرادات %</th>
                          <th className="py-3 px-4 text-left">صافي الربح</th>
                          <th className="py-3 px-4 text-left">نمو الربح %</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4 text-left">الأصول</th>
                          <th className="py-3 px-4 text-left">نمو الأصول %</th>
                          <th className="py-3 px-4 text-left">الملكية</th>
                          <th className="py-3 px-4 text-left">نمو الملكية %</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {data.periods?.map((p: any, idx: number) => (
                      <tr key={p.label} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-bold text-slate-100">{p.label}</td>
                        {statement === "income" ? (
                          <>
                            <td className="py-2.5 px-4 text-left font-mono">{p.revenue?.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-left font-mono font-bold text-blue-400">
                              {idx === 0 ? "أساس" : `${p.revenueGrowth}%`}
                            </td>
                            <td className="py-2.5 px-4 text-left font-mono">{p.netProfit?.toLocaleString()}</td>
                            <td className={`py-2.5 px-4 text-left font-mono font-bold ${p.netProfitGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {idx === 0 ? "أساس" : `${p.netProfitGrowth}%`}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-4 text-left font-mono">{p.totalAssets?.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-left font-mono font-bold text-blue-400">
                              {idx === 0 ? "أساس" : `${p.assetsGrowth}%`}
                            </td>
                            <td className="py-2.5 px-4 text-left font-mono">{p.equity?.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-left font-mono font-bold text-emerald-400">
                              {idx === 0 ? "أساس" : `${p.equityGrowth}%`}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
