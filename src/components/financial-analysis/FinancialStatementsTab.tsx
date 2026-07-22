import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Layers, 
  Scale, 
  DollarSign, 
  Calendar, 
  ArrowRightLeft, 
  Printer, 
  Download, 
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface StatementsTabProps {
  asOfDate: string;
  theme: string;
  themeClasses: any;
}

export const FinancialStatementsTab: React.FC<StatementsTabProps> = ({ asOfDate, theme, themeClasses }) => {
  const [activeSubTab, setActiveSubTab] = useState<"ifrs18_income" | "balance_sheet" | "cash_flow" | "trial_balance">("ifrs18_income");
  const [comparative, setComparative] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(asOfDate);

  useEffect(() => {
    fetchStatementData();
  }, [activeSubTab, asOfDate, comparative, fromDate, toDate]);

  const fetchStatementData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "";
      if (activeSubTab === "ifrs18_income") {
        url = `/api/v1/financial-analysis/income-statement?fromDate=${fromDate}&toDate=${toDate}&asOfDate=${asOfDate}&comparative=${comparative}`;
      } else if (activeSubTab === "balance_sheet") {
        url = `/api/v1/financial-analysis/balance-sheet?asOfDate=${asOfDate}&comparative=${comparative}`;
      } else if (activeSubTab === "cash_flow") {
        url = `/api/v1/financial-analysis/cash-flow?fromDate=${fromDate}&toDate=${toDate}&asOfDate=${asOfDate}`;
      } else if (activeSubTab === "trial_balance") {
        url = `/api/v1/financial-analysis/trial-balance?asOfDate=${asOfDate}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "تعذر جلب القوائم المالية");
      }
    } catch (err: any) {
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب القوائم المالية");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Header & Subtabs Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveSubTab("ifrs18_income")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === "ifrs18_income"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            قائمة الدخل IFRS 18
          </button>

          <button
            onClick={() => setActiveSubTab("balance_sheet")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === "balance_sheet"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Scale className="w-4 h-4" />
            قائمة المركز المالي (الميزانية)
          </button>

          <button
            onClick={() => setActiveSubTab("cash_flow")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === "cash_flow"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            التدفقات النقدية (غير المباشرة)
          </button>

          <button
            onClick={() => setActiveSubTab("trial_balance")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === "trial_balance"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            ميزان المراجعة بالأرصدة والمجاميع
          </button>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {activeSubTab !== "trial_balance" && (
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 cursor-pointer hover:bg-slate-800">
              <input
                type="checkbox"
                checked={comparative}
                onChange={(e) => setComparative(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500/30"
              />
              <span>مقارنة مع السنة السابقة</span>
            </label>
          )}

          <button
            onClick={handlePrint}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 rounded-xl transition-all"
            title="طباعة القائمة"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">من تاريخ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">إلى تاريخ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="text-slate-500 text-[11px]">
          * الحسابات المالية مستخرجة ومحسوبة آلياً بدقة دسمالية (Decimal Engine) مطابقة لدفتر اليومية المعتمد.
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-slate-800/40 rounded-xl" />
          <div className="h-64 bg-slate-800/40 rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-xl">
          {error}
        </div>
      )}

      {/* Content Rendering */}
      {!loading && !error && data && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* SubTab 1: IFRS 18 Income Statement */}
          {activeSubTab === "ifrs18_income" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">قائمة الدخل وفقاً لمعايير التقرير المالي الدولية IFRS 18</h3>
                  <p className="text-xs text-slate-400 mt-1">تتضمن التصنيفات الفئوية الخمسة المعتمدة: التشغيلية، الاستثمارية، التمويلية، الضريبية، والعمليات المتوقفة</p>
                </div>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs rounded-full font-semibold">
                  IFRS 18 Standard
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">البنود والفئات الهيكلية</th>
                      <th className="py-3 px-4 text-left">الفترة الحالية (ريال)</th>
                      <th className="py-3 px-4 text-left">التحليل الرأسي %</th>
                      {comparative && <th className="py-3 px-4 text-left">السنة السابقة (ريال)</th>}
                      {comparative && <th className="py-3 px-4 text-left">التغير الأفقي %</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {/* Operating Category */}
                    <tr className="bg-blue-950/20 font-bold text-blue-400">
                      <td colSpan={comparative ? 5 : 3} className="py-2.5 px-4">1. الفئة التشغيلية (Operating Category)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">إجمالي إيرادات المبيعات والنشاط الرئيسي</td>
                      <td className="py-2.5 px-4 text-left font-semibold">{data.current?.totalRevenue?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">{data.current?.commonSize?.revenue}%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">{data.prior?.totalRevenue?.toLocaleString()}</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-blue-400">{data.horizontalChanges?.revenueChange}%</td>}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">تكلفة المبيعات (COGS)</td>
                      <td className="py-2.5 px-4 text-left text-red-400">({data.current?.totalCogs?.toLocaleString()})</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">{data.current?.commonSize?.cogs}%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">({data.prior?.totalCogs?.toLocaleString()})</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">{data.horizontalChanges?.cogsChange}%</td>}
                    </tr>
                    <tr className="bg-slate-800/40 font-bold text-slate-100">
                      <td className="py-2.5 px-4 pr-6">مجمل الربح (Gross Profit)</td>
                      <td className="py-2.5 px-4 text-left text-emerald-400 font-bold">{data.current?.grossProfit?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-left text-emerald-400 font-bold">{data.current?.commonSize?.grossProfit}%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-300 font-bold">{data.prior?.grossProfit?.toLocaleString()}</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-emerald-400 font-bold">{data.horizontalChanges?.grossProfitChange}%</td>}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">المصروفات التشغيلية والعمومية (OPEX)</td>
                      <td className="py-2.5 px-4 text-left text-red-400">({data.current?.totalOpex?.toLocaleString()})</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">{data.current?.commonSize?.opex}%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">({data.prior?.totalOpex?.toLocaleString()})</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">{data.horizontalChanges?.opexChange}%</td>}
                    </tr>
                    
                    {/* Subtotal 1: Operating Profit */}
                    <tr className="bg-emerald-950/30 border-y border-emerald-500/30 font-bold text-emerald-400 text-sm">
                      <td className="py-3 px-4">الربح التشغيلي الإجباري (Operating Profit / EBIT)</td>
                      <td className="py-3 px-4 text-left">{data.current?.operatingProfit?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-left">{data.current?.commonSize?.operatingProfit}%</td>
                      {comparative && <td className="py-3 px-4 text-left text-slate-300">{data.prior?.operatingProfit?.toLocaleString()}</td>}
                      {comparative && <td className="py-3 px-4 text-left">{data.horizontalChanges?.operatingProfitChange}%</td>}
                    </tr>

                    {/* Investment Category */}
                    <tr className="bg-purple-950/20 font-bold text-purple-400">
                      <td colSpan={comparative ? 5 : 3} className="py-2.5 px-4">2. الفئة الاستثمارية (Investing Category)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">إيرادات الاستثمارات والأرباح الرأسمالية</td>
                      <td className="py-2.5 px-4 text-left">{data.current?.investingIncome?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">0%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">{data.prior?.investingIncome?.toLocaleString()}</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">0%</td>}
                    </tr>

                    {/* Financing Category */}
                    <tr className="bg-amber-950/20 font-bold text-amber-400">
                      <td colSpan={comparative ? 5 : 3} className="py-2.5 px-4">3. الفئة التمويلية (Financing Category)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">المصروفات والفوائد التمويلية</td>
                      <td className="py-2.5 px-4 text-left text-red-400">({data.current?.totalInterest?.toLocaleString()})</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">0%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">({data.prior?.totalInterest?.toLocaleString()})</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">0%</td>}
                    </tr>

                    {/* Subtotal 2: EBT */}
                    <tr className="bg-slate-800/80 font-bold text-slate-200">
                      <td className="py-2.5 px-4 pr-6">الربح قبل الضرائب والزكاة (EBT)</td>
                      <td className="py-2.5 px-4 text-left">{data.current?.earningsBeforeTax?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">{data.current?.commonSize?.ebt}%</td>
                      {comparative && <td className="py-2.5 px-4 text-left">{data.prior?.earningsBeforeTax?.toLocaleString()}</td>}
                      {comparative && <td className="py-2.5 px-4 text-left">{data.horizontalChanges?.ebtChange}%</td>}
                    </tr>

                    {/* Income Taxes */}
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">4. فئة ضريبة الدخل والزكاة الشرعية</td>
                      <td className="py-2.5 px-4 text-left text-red-400">({data.current?.totalTax?.toLocaleString()})</td>
                      <td className="py-2.5 px-4 text-left text-slate-400">0%</td>
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">({data.prior?.totalTax?.toLocaleString()})</td>}
                      {comparative && <td className="py-2.5 px-4 text-left text-slate-400">0%</td>}
                    </tr>

                    {/* Net Profit Final */}
                    <tr className="bg-blue-600/20 border-t-2 border-blue-500 font-black text-slate-100 text-base">
                      <td className="py-3.5 px-4">صافي أرباح الفترة النهائية (Net Profit)</td>
                      <td className="py-3.5 px-4 text-left text-emerald-400">{data.current?.netProfit?.toLocaleString()} ريال</td>
                      <td className="py-3.5 px-4 text-left text-emerald-400">{data.current?.commonSize?.netProfit}%</td>
                      {comparative && <td className="py-3.5 px-4 text-left text-slate-300">{data.prior?.netProfit?.toLocaleString()} ريال</td>}
                      {comparative && <td className="py-3.5 px-4 text-left text-emerald-400">{data.horizontalChanges?.netProfitChange}%</td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 2: Balance Sheet */}
          {activeSubTab === "balance_sheet" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">قائمة المركز المالي (Balance Sheet)</h3>
                  <p className="text-xs text-slate-400 mt-1">تعد القائمة مقسمة وفقاً لمعيار IAS 1 إلى أصول والتزامات متداولة وغير متداولة وحقوق الملكية</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  data.current?.totalAssets === (data.current?.totalLiabilities + data.current?.totalEquity)
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {data.current?.totalAssets === (data.current?.totalLiabilities + data.current?.totalEquity) ? "الميزانية متزنة 100%" : "خلل في اتزان الميزانية"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets Column */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="bg-slate-800/60 p-3 font-bold text-slate-200 border-b border-slate-800 text-sm">
                    جانب الأصول (Assets)
                  </div>
                  <table className="w-full text-right text-xs">
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      <tr className="bg-blue-950/20 font-semibold text-blue-400">
                        <td colSpan={2} className="py-2 px-3">الأصول المتداولة:</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">النقدية وما يعادلها بالبنوك</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.cashAndEquivalents?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">العملاء والذمم المدينة</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.receivables?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">المخزون السلعي</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.inventory?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-800/30 font-bold text-slate-200">
                        <td className="py-2 px-3 pr-4">مجموع الأصول المتداولة</td>
                        <td className="py-2 px-3 text-left text-blue-400">{data.current?.currentAssets?.toLocaleString()}</td>
                      </tr>

                      <tr className="bg-purple-950/20 font-semibold text-purple-400">
                        <td colSpan={2} className="py-2 px-3">الأصول غير المتداولة:</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">الأصول الثابتة والمعدات (صافي)</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.fixedAssets?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-800/30 font-bold text-slate-200">
                        <td className="py-2 px-3 pr-4">مجموع الأصول غير المتداولة</td>
                        <td className="py-2 px-3 text-left text-purple-400">{data.current?.nonCurrentAssets?.toLocaleString()}</td>
                      </tr>

                      <tr className="bg-blue-600/20 border-t-2 border-blue-500 font-bold text-slate-100 text-sm">
                        <td className="py-3 px-3">إجمالي أصول الشركة</td>
                        <td className="py-3 px-3 text-left text-emerald-400">{data.current?.totalAssets?.toLocaleString()} ريال</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="bg-slate-800/60 p-3 font-bold text-slate-200 border-b border-slate-800 text-sm">
                    جانب الالتزامات وحقوق الملكية (Liabilities & Equity)
                  </div>
                  <table className="w-full text-right text-xs">
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      <tr className="bg-amber-950/20 font-semibold text-amber-400">
                        <td colSpan={2} className="py-2 px-3">الالتزامات المتداولة:</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">الموردون والذمم الدائنة</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.payables?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-800/30 font-bold text-slate-200">
                        <td className="py-2 px-3 pr-4">مجموع الالتزامات المتداولة</td>
                        <td className="py-2 px-3 text-left text-amber-400">{data.current?.currentLiabilities?.toLocaleString()}</td>
                      </tr>

                      <tr className="bg-red-950/20 font-semibold text-red-400">
                        <td colSpan={2} className="py-2 px-3">الالتزامات طويلة الأجل:</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">قروض وتمويلات طويلة الأجل</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.nonCurrentLiabilities?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-800/30 font-bold text-slate-200">
                        <td className="py-2 px-3 pr-4">مجموع الالتزامات الكلية</td>
                        <td className="py-2 px-3 text-left text-red-400">{data.current?.totalLiabilities?.toLocaleString()}</td>
                      </tr>

                      <tr className="bg-emerald-950/20 font-semibold text-emerald-400">
                        <td colSpan={2} className="py-2 px-3">حقوق الملكية:</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">رأس المال المدفوع والاحتياطيات</td>
                        <td className="py-2 px-3 text-left font-semibold">{data.current?.equity?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 pr-6">صافي دخل/أرباح الفترة الحالية</td>
                        <td className="py-2 px-3 text-left font-semibold text-emerald-400">{data.current?.netIncome?.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-800/30 font-bold text-slate-200">
                        <td className="py-2 px-3 pr-4">مجموع حقوق الملكية</td>
                        <td className="py-2 px-3 text-left text-emerald-400">{data.current?.totalEquity?.toLocaleString()}</td>
                      </tr>

                      <tr className="bg-blue-600/20 border-t-2 border-blue-500 font-bold text-slate-100 text-sm">
                        <td className="py-3 px-3">إجمالي الالتزامات وحقوق الملكية</td>
                        <td className="py-3 px-3 text-left text-emerald-400">{(data.current?.totalLiabilities + data.current?.totalEquity)?.toLocaleString()} ريال</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3: Cash Flow Statement */}
          {activeSubTab === "cash_flow" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold text-slate-100">قائمة التدفقات النقدية - الطريقة غير المباشرة (Indirect Method)</h3>
                <p className="text-xs text-slate-400 mt-1">توضح التسويات النقدية من صافي الربح والأنشطة التشغيلية والاستثمارية والتمويلية</p>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-right text-xs">
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    <tr className="bg-blue-950/20 font-bold text-blue-400">
                      <td colSpan={2} className="py-3 px-4 text-sm">أولاً: التدفقات النقدية من الأنشطة التشغيلية</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">صافي ربح الفترة من قائمة الدخل</td>
                      <td className="py-2.5 px-4 text-left font-semibold">{data.operatingActivities?.netIncome?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">إهلاك الأصول الثابتة (تسوية غير نقدية)</td>
                      <td className="py-2.5 px-4 text-left font-semibold">{data.operatingActivities?.depreciation?.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-slate-800/40 font-bold text-emerald-400">
                      <td className="py-2.5 px-4 pr-6">صافي النقد المتوفر من الأنشطة التشغيلية</td>
                      <td className="py-2.5 px-4 text-left font-bold">{data.operatingActivities?.total?.toLocaleString()} ريال</td>
                    </tr>

                    <tr className="bg-purple-950/20 font-bold text-purple-400">
                      <td colSpan={2} className="py-3 px-4 text-sm">ثانياً: التدفقات النقدية من الأنشطة الاستثمارية</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">شراء أصول ثابتة ومعدات رأسمالية</td>
                      <td className="py-2.5 px-4 text-left text-red-400">({data.investingActivities?.capex?.toLocaleString()})</td>
                    </tr>
                    <tr className="bg-slate-800/40 font-bold text-purple-400">
                      <td className="py-2.5 px-4 pr-6">صافي النقد المستخدم في الأنشطة الاستثمارية</td>
                      <td className="py-2.5 px-4 text-left font-bold">{data.investingActivities?.total?.toLocaleString()} ريال</td>
                    </tr>

                    <tr className="bg-amber-950/20 font-bold text-amber-400">
                      <td colSpan={2} className="py-3 px-4 text-sm">ثالثاً: التدفقات النقدية من الأنشطة التمويلية</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 pr-8 text-slate-300">تغيرات التمويل والقروض طويلة الأجل</td>
                      <td className="py-2.5 px-4 text-left font-semibold">{data.financingActivities?.loanChanges?.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-slate-800/40 font-bold text-amber-400">
                      <td className="py-2.5 px-4 pr-6">صافي النقد من الأنشطة التمويلية</td>
                      <td className="py-2.5 px-4 text-left font-bold">{data.financingActivities?.total?.toLocaleString()} ريال</td>
                    </tr>

                    <tr className="bg-blue-600/20 border-t-2 border-blue-500 font-bold text-slate-100 text-sm">
                      <td className="py-3.5 px-4">صافي الزيادة / (النقص) في النقدية خلال الفترة</td>
                      <td className="py-3.5 px-4 text-left text-emerald-400">{data.netChangeInCash?.toLocaleString()} ريال</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SubTab 4: Trial Balance */}
          {activeSubTab === "trial_balance" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">ميزان المراجعة بالأرصدة والمجاميع</h3>
                  <p className="text-xs text-slate-400 mt-1">عرض شامل لكل الحسابات بالدليل المحاسبي وتأكيد اتزان إجمالي الحركات والتسويات</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">رمز الحساب</th>
                      <th className="py-3 px-4">اسم الحساب</th>
                      <th className="py-3 px-4">النوع</th>
                      <th className="py-3 px-4 text-left">الرصيد الافتتاحي</th>
                      <th className="py-3 px-4 text-left">حركات مدين</th>
                      <th className="py-3 px-4 text-left">حركات دائن</th>
                      <th className="py-3 px-4 text-left">الرصيد الختامي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {Array.isArray(data) && data.map((acc: any) => (
                      <tr key={acc.code} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono text-blue-400">{acc.code}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-200">{acc.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{acc.type}</td>
                        <td className="py-2.5 px-4 text-left font-mono">{acc.initialBalance?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-emerald-400">{acc.totalDebit?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono text-amber-400">{acc.totalCredit?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-left font-mono font-bold text-slate-100">{acc.closingBalance?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
