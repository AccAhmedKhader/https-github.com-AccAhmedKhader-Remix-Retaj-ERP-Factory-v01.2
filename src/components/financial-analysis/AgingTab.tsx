import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Users, 
  Building, 
  AlertTriangle, 
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

interface AgingTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const AgingTab: React.FC<AgingTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [type, setType] = useState<"receivables" | "payables">("receivables");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAging();
  }, [type, asOfDate]);

  const fetchAging = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/financial-analysis/aging-report?type=${type}&asOfDate=${asOfDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب تقرير الأعمار");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب أعمار الديون");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Type Toggle Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-lg font-bold text-slate-100">تقرير أعمار الديون المتقادمة (Aging Analysis)</h3>
          <p className="text-xs text-slate-400 mt-1">
            تصنيف مديونيات {type === "receivables" ? "العملاء (ذمم مدينة)" : "الموردين (ذمم دائنة)"} وفق فترات الاستحقاق (0-30، 31-60، 61-90، +90 يوماً)
          </p>
        </div>

        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setType("receivables")}
            className={`px-4 py-2 rounded-lg transition-all ${
              type === "receivables" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ذمم العملاء (Receivables)
          </button>
          <button
            onClick={() => setType("payables")}
            className={`px-4 py-2 rounded-lg transition-all ${
              type === "payables" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ذمم الموردين (Payables)
          </button>
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
        <div className="space-y-6">
          {/* Summary Buckets Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400">0 - 30 يوماً (جاري)</span>
              <div className="text-xl font-bold text-emerald-400">{data.totals?.b0_30?.toLocaleString()} ريال</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400">31 - 60 يوماً</span>
              <div className="text-xl font-bold text-blue-400">{data.totals?.b31_60?.toLocaleString()} ريال</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400">61 - 90 يوماً</span>
              <div className="text-xl font-bold text-amber-400">{data.totals?.b61_90?.toLocaleString()} ريال</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1">
              <span className="text-[11px] text-slate-400">أكثر من 90 يوماً (متأخر)</span>
              <div className="text-xl font-bold text-red-400">{data.totals?.b90_plus?.toLocaleString()} ريال</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1 bg-blue-950/20">
              <span className="text-[11px] text-slate-300 font-semibold">الإجمالي الكلي المفتوح</span>
              <div className="text-xl font-black text-slate-100">{data.totals?.grandTotal?.toLocaleString()} ريال</div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-200">
              تفاصيل المستحقات لكل {type === "receivables" ? "عميل" : "مورد"}
            </h4>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4">اسم الجهة / الحساب</th>
                    <th className="py-3 px-4 text-left">0 - 30 يوماً</th>
                    <th className="py-3 px-4 text-left">31 - 60 يوماً</th>
                    <th className="py-3 px-4 text-left">61 - 90 يوماً</th>
                    <th className="py-3 px-4 text-left">+90 يوماً</th>
                    <th className="py-3 px-4 text-left">الإجمالي (ريال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {data.partyAging?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">لا توجد ذمم مفتوحة حالياً.</td>
                    </tr>
                  ) : (
                    data.partyAging?.map((p: any) => (
                      <tr key={p.partyId} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-semibold text-slate-200">{p.name || p.partyId}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-emerald-400">{p.b0_30?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-blue-400">{p.b31_60?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-amber-400">{p.b61_90?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-red-400 font-bold">{p.b90_plus?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono font-bold text-slate-100">{p.total?.toLocaleString()}</td>
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
