import React, { useState, useEffect } from "react";
import { 
  Percent, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  HelpCircle, 
  Scale, 
  DollarSign, 
  Zap,
  ShieldCheck,
  Search
} from "lucide-react";

interface RatiosTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const FinancialRatiosTab: React.FC<RatiosTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRatios();
  }, [asOfDate]);

  const fetchRatios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/financial-analysis/ratios?asOfDate=${asOfDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب النسب المالية");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب النسب المالية");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 bg-slate-800/40 rounded-xl border border-slate-700/50 p-4" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <p>{error || "تعذر تحميل النسب المالية"}</p>
      </div>
    );
  }

  const ratios = data?.ratios || [];
  const categories = data?.categories || [];

  const filteredRatios = ratios.filter((r: any) => {
    const matchesCat = selectedCategory === "all" || r.category === selectedCategory;
    const matchesSearch = (r.titleAr || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.titleEn || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ممتاز</span>;
      case "normal":
      case "acceptable":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">طبيعي/مقبول</span>;
      case "warning":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">تحذير</span>;
      case "critical":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">حرج</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">غير محدد</span>;
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Category filter bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            كل النسب المالية ({ratios.length})
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {cat.titleAr}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو المعيار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Ratios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRatios.map((ratio: any) => (
          <div
            key={ratio.key}
            className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all rounded-xl p-5 space-y-3 flex flex-col justify-between shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">{ratio.categoryAr}</span>
                {getStatusBadge(ratio.status)}
              </div>

              <h4 className="text-sm font-bold text-slate-100">{ratio.titleAr}</h4>
              <p className="text-[11px] text-slate-500 font-mono">{ratio.titleEn}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-100">
                  {ratio.value} <span className="text-xs font-normal text-slate-400">{ratio.unit}</span>
                </span>
                <span className="text-xs text-slate-400">
                  المعيار المستهدف: <strong className="text-slate-200">{ratio.benchmark}</strong>
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                {ratio.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
