import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Target, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  PieChart
} from "lucide-react";

interface CostCenterTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const CostCenterProfitabilityTab: React.FC<CostCenterTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(asOfDate);

  useEffect(() => {
    fetchCostCenterData();
  }, [fromDate, toDate, asOfDate]);

  const fetchCostCenterData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/financial-analysis/cost-center-profitability?fromDate=${fromDate}&toDate=${toDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب بيانات مراكز التكلفة والربحية");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب بيانات المراكز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-slate-100">ربحية وأداء مراكز التكلفة ومراكز الربحية</h3>
          <p className="text-xs text-slate-400 mt-1">مقارنة الميزانيات المعتمدة والمستهدفات المالية بالأداء الفعلي المستخرج من قيود اليومية</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="h-80 bg-slate-800/40 rounded-xl border border-slate-700/50 animate-pulse" />
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-xl">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Centers Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                أداء مراكز التكلفة (Cost Centers)
              </h4>
              <span className="text-xs text-slate-400">المصروفات الفعلية vs الميزانية</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3">مركز التكلفة</th>
                    <th className="py-3 px-3 text-left">الميزانية</th>
                    <th className="py-3 px-3 text-left">المنصرف الفعلي</th>
                    <th className="py-3 px-3 text-left">الانحراف</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.costCenters?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">لا توجد مراكز تكلفة مسجلة.</td>
                    </tr>
                  ) : (
                    data.costCenters?.map((cc: any) => (
                      <tr key={cc.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{cc.name}</td>
                        <td className="py-2.5 px-3 text-left font-mono">{cc.budget?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-amber-400">{cc.spent?.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-left font-mono font-bold ${cc.variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {cc.variance?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            cc.status === "OverBudget" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {cc.status === "OverBudget" ? "تجاوز الميزانية" : "ضمن الميزانية"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Profit Centers Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                أداء مراكز الربحية (Profit Centers)
              </h4>
              <span className="text-xs text-slate-400">الأرباح الفعلية vs المستهدف</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3">مركز الربحية</th>
                    <th className="py-3 px-3 text-left">المستهدف</th>
                    <th className="py-3 px-3 text-left">الربح الفعلي</th>
                    <th className="py-3 px-3 text-left">الفارق</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.profitCenters?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">لا توجد مراكز ربحية مسجلة.</td>
                    </tr>
                  ) : (
                    data.profitCenters?.map((pc: any) => (
                      <tr key={pc.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{pc.name}</td>
                        <td className="py-2.5 px-3 text-left font-mono">{pc.target?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-400">{pc.actual?.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-left font-mono font-bold ${pc.variance >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                          {pc.variance?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            pc.status === "AchievedTarget" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {pc.status === "AchievedTarget" ? "تم تحقيق الهدف" : "أقل من المستهدف"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
