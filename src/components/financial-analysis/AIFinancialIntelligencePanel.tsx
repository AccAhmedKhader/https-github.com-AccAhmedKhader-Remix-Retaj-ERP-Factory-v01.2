import React, { useState, useEffect } from "react";
import { 
  X, 
  Pin, 
  PinOff, 
  Maximize2, 
  Minimize2, 
  Search, 
  Copy, 
  Printer, 
  Download, 
  Share2, 
  Bookmark, 
  BookmarkCheck, 
  Languages, 
  Sparkles, 
  HelpCircle, 
  ArrowLeft, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Calculator, 
  Scale, 
  Building2, 
  ShieldAlert, 
  Zap, 
  ChevronRight,
  ExternalLink,
  BookOpen,
  PieChart,
  Target,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { buildRatioIntelligence, RatioIntelligence } from "./ratioIntelligenceEngine";

interface PanelProps {
  ratio: any;
  companyData?: any;
  asOfDate: string;
  onClose: () => void;
  onDrillDown?: (module: string, code?: string) => void;
}

export const AIFinancialIntelligencePanel: React.FC<PanelProps> = ({
  ratio,
  companyData,
  asOfDate,
  onClose,
  onDrillDown
}) => {
  const [intel, setIntel] = useState<RatioIntelligence>(() => buildRatioIntelligence(ratio, companyData));
  
  // UI States
  const [isPinned, setIsPinned] = useState(false);
  const [panelWidth, setPanelWidth] = useState<"standard" | "wide" | "fullscreen">("wide");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Active section tab - saved in localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("ai_ratio_panel_last_tab") || "overview";
  });

  // AI Chat state inside panel
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; time: string }>>([
    {
      role: "assistant",
      content: `أهلاً بك! أنا مستشارك المالي المبتكر لمؤشر (${intel.titleAr}). كيف يمكنني مساعدتك في تحليل هذه النسبة أو محاكاة تأثيراتها على المركز المالي للشركة؟`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setIntel(buildRatioIntelligence(ratio, companyData));
  }, [ratio, companyData]);

  useEffect(() => {
    localStorage.setItem("ai_ratio_panel_last_tab", activeTab);
  }, [activeTab]);

  // Handle Bookmarks
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("bookmarked_ratios") || "[]");
    setIsBookmarked(saved.includes(intel.key));
  }, [intel.key]);

  const toggleBookmark = () => {
    const saved = JSON.parse(localStorage.getItem("bookmarked_ratios") || "[]");
    let updated;
    if (saved.includes(intel.key)) {
      updated = saved.filter((k: string) => k !== intel.key);
      setIsBookmarked(false);
    } else {
      updated = [...saved, intel.key];
      setIsBookmarked(true);
    }
    localStorage.setItem("bookmarked_ratios", JSON.stringify(updated));
  };

  // Copy Summary
  const handleCopy = () => {
    const text = `
=== مركز الذكاء المالي - ${intel.titleAr} (${intel.titleEn}) ===
القيمة الحالية: ${intel.value} ${intel.unit}
الحالة التشغيلية: ${intel.interpretationState}
المعيار المستهدف: ${intel.benchmarks.companyTarget}

التعريف:
${intel.definitionAr}

المعادلة:
${intel.mathFormula}

الموجز التنفيذي للإدارة العليا:
${intel.executiveSummary}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // AI Chat Handler
  const handleSendChat = async (questionText?: string) => {
    const query = questionText || chatInput;
    if (!query.trim()) return;

    const userMsg = { role: "user" as const, content: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!questionText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/v1/financial-analysis/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          ratioContext: {
            key: intel.key,
            titleAr: intel.titleAr,
            value: intel.value,
            status: intel.status,
            benchmarks: intel.benchmarks,
            asOfDate
          }
        })
      });

      const json = await res.json();
      const aiReply = json.success && json.reply 
        ? json.reply 
        : generateLocalAIReply(query, intel);

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err) {
      const fallbackReply = generateLocalAIReply(query, intel);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: fallbackReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const generateLocalAIReply = (query: string, intel: RatioIntelligence): string => {
    const q = query.toLowerCase();
    if (q.includes("تحسين") || q.includes("كيف نرفع") || q.includes("زيادة")) {
      return `لتحسين مؤشر (${intel.titleAr}) البالغ حالياً ${intel.value} ${intel.unit}:\n\n` +
        `1. ${intel.aiRecommendations[0]?.title || "إعادة هيكلة شروط الائتمان والتحصيل"}\n` +
        `2. ${intel.improvementGuide.bestPractices[0] || "مراجعة الذمم المالية بانتظام"}\n` +
        `3. التركيز على التوصية المباشرة: ${intel.aiRecommendations[0]?.expectedImpact || "خفض التكاليف التشغيلية"}.`;
    }
    if (q.includes("خطر") || q.includes("مخاطر") || q.includes("آمن")) {
      return `تقييم المخاطر لمؤشر (${intel.titleAr}):\n\n` +
        `• مستوى الخطورة الحالية: ${intel.riskAnalysis.severity === "Critical" ? "حرج جداً" : "منخفض ووضع آمن"}.\n` +
        `• عند الانخفاض: ${intel.riskAnalysis.ifDecrease}\n` +
        `• التفسير المالي: ${intel.interpretationDesc}`;
    }
    return `بناءً على سجلات الـ ERP حتى تاريخ ${asOfDate}، تبلغ قيمة (${intel.titleAr}) نحو ${intel.value} ${intel.unit}.\n\n` +
      `المعيار القياسي للقطاع هو ${intel.benchmarks.manufacturing}. ${intel.executiveSummary}`;
  };

  const tabsList = [
    { id: "overview", label: "التعريف والمرجعيات", icon: BookOpen },
    { id: "formula", label: "المعادلة ومصادر الأستاذ", icon: Calculator },
    { id: "benchmarks", label: "المقارنة بالنطاقات الآمنة", icon: Target },
    { id: "impact", label: "الأثر المالي والمسؤوليات", icon: Building2 },
    { id: "risk", label: "مركز المخاطر والإنذار", icon: ShieldAlert },
    { id: "trend", label: "الاتجاهات والانحرافات", icon: TrendingUp },
    { id: "insights", label: "الرؤية والتوصيات الذكية", icon: Sparkles },
    { id: "drill", label: "التعمق وسجلات المصدر", icon: ExternalLink },
    { id: "chat", label: "اسأل المستشار المالي AI", icon: HelpCircle }
  ];

  const getWidthClass = () => {
    if (panelWidth === "fullscreen") return "w-full inset-0 z-50 fixed";
    if (panelWidth === "wide") return "w-full md:w-[720px] lg:w-[850px]";
    return "w-full md:w-[540px]";
  };

  return (
    <div className={`fixed inset-y-0 right-0 z-50 bg-slate-950/95 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300 dir-rtl text-right text-slate-100 ${getWidthClass()}`}>
      
      {/* Panel Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black truncate text-slate-100">{lang === "ar" ? intel.titleAr : intel.titleEn}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                intel.status === "excellent" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                intel.status === "normal" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                intel.status === "acceptable" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-red-500/10 text-red-400 border-red-500/30"
              }`}>
                {intel.interpretationState}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">{intel.titleEn} • {intel.categoryAr}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="p-2 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors flex items-center gap-1 text-xs font-bold"
            title="تغيير اللغة (Ar/En)"
          >
            <Languages className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-lg transition-colors ${isBookmarked ? "text-amber-400 bg-amber-500/10" : "hover:bg-slate-800 hover:text-slate-100"}`}
            title="حفظ النسبة بالمفضلة"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="نسخ التقرير المالي"
          >
            <Copy className={`w-4 h-4 ${copied ? "text-emerald-400" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors hidden sm:flex"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPanelWidth(panelWidth === "fullscreen" ? "wide" : "fullscreen")}
            className="p-2 rounded-lg hover:bg-slate-800 hover:text-slate-100 transition-colors hidden sm:flex"
            title={panelWidth === "fullscreen" ? "تصغير النافذة" : "توسيع ملء الشاشة"}
          >
            {panelWidth === "fullscreen" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-lg transition-colors hidden md:flex ${isPinned ? "text-blue-400 bg-blue-500/10" : "hover:bg-slate-800 hover:text-slate-100"}`}
            title={isPinned ? "إلغاء التثبيت" : "تثبيت اللوحة جانبياً"}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-300 transition-colors"
            title="إغلاق اللوحة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-Header KPI Value Summary Card */}
      <div className="bg-slate-900/60 border-b border-slate-800 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400">القيمة الحالية بالـ ERP:</div>
          <div className="text-xl font-black text-blue-400 mt-0.5">
            {intel.value} <span className="text-xs font-normal text-slate-400">{intel.unit}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400">المعيار القياسي للقطاع:</div>
          <div className="text-sm font-bold text-slate-200 mt-1">{intel.benchmarks.manufacturing}</div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400">مستهدف الشركة:</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">{intel.benchmarks.companyTarget}</div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="text-slate-400">درجة أمان المؤشر:</div>
          <div className={`text-sm font-bold mt-1 ${intel.safeRange.zone === "Excellent" ? "text-emerald-400" : "text-amber-400"}`}>
            منطقة {intel.safeRange.zone}
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 shrink-0">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">

        {/* Search Bar inside panel */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="بحث داخل التحليل والتفاسير والمراجع المحاسبية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* TAB 1: OVERVIEW & REFERENCES (Sections 1 & 2 & 15) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>الموجز التنفيذي للإدارة العليا (Executive Brief)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {intel.executiveSummary}
              </p>
            </div>

            {/* Definition Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                ماذا تقيس هذه النسبة وما هو سبب وجودها؟
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                {intel.definitionAr}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400">لماذا يهتم المستثمرون بها؟</span>
                  <p className="text-slate-400 leading-relaxed">{intel.whyInvestorsCare}</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-indigo-400">لماذا يراجعها المراجع المالي والمدقق؟</span>
                  <p className="text-slate-400 leading-relaxed">{intel.whyAuditorsCare}</p>
                </div>
              </div>
            </div>

            {/* Accounting Standards References Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                المرجعيات والمعايير المحاسبية الدولية والمحلية (IFRS / IAS / EAS)
              </h4>
              
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px]">IFRS</span>
                  <span className="text-slate-300">{intel.ifrsRef}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono font-bold text-[10px]">IAS</span>
                  <span className="text-slate-300">{intel.iasRef}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">EAS</span>
                  <span className="text-slate-300">{intel.easRef}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FORMULA & SOURCE LEDGER (Section 3 & 10 & 19) */}
        {activeTab === "formula" && (
          <div className="space-y-6">
            {/* Mathematical Formula Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" />
                المعادلة الرياضية والمالية وطريقة الاحتساب
              </h4>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="text-xs text-slate-400">الصيغة الرياضية الحسابية:</div>
                <div className="text-sm font-black text-blue-400 dir-ltr font-mono bg-slate-900 py-2 rounded-lg">
                  {intel.mathFormula}
                </div>
              </div>

              {/* Step by Step */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400">خطوات الاحتساب الرقمي بالـ ERP:</h5>
                <div className="space-y-1.5 text-xs">
                  {intel.calculationSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-slate-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Source Accounts in Chart of Accounts (Section 19 - Explain Every Number) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                تفكيك الأرقام وحسابات الأستاذ العام المرتبطة
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">رمز الحساب</th>
                      <th className="pb-2">اسم الحساب بالشجرة</th>
                      <th className="pb-2">النوع</th>
                      <th className="pb-2">الرصيد المستخرج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {intel.sourceLedgerAccounts.map((acc, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono text-blue-400">{acc.code}</td>
                        <td className="py-2.5 font-semibold">{acc.nameAr}</td>
                        <td className="py-2.5 text-slate-400">{acc.type}</td>
                        <td className="py-2.5 text-emerald-400 font-mono">{acc.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Typical Journal Entries (Section 10) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">نموذج القيود المحاسبية المؤثرة على النسبة:</h4>
              <div className="space-y-2 text-xs">
                {intel.accountingImpact.typicalJournalEntries.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-slate-300">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BENCHMARKS & SAFE RANGES (Section 5 & 6) */}
        {activeTab === "benchmarks" && (
          <div className="space-y-6">
            {/* Safe Range Visual Gauge Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>شريط النطاقات الآمنة ومقياس الأخطار</span>
                <span className="text-blue-400 font-mono font-bold">{intel.value} {intel.unit}</span>
              </h4>

              {/* Traffic Light Bar Visual */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
                  <div className="w-1/5 bg-red-500/80 rounded-l-full" title="خطر شديد / حرج" />
                  <div className="w-1/5 bg-amber-500/80" title="تحذير" />
                  <div className="w-1/5 bg-blue-500/80" title="مقبول / طبيعي" />
                  <div className="w-2/5 bg-emerald-500/80 rounded-r-full" title="ممتاز" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>منطقة الخطر ({intel.safeRange.dangerThreshold})</span>
                  <span>الحد الأدنى الآمن ({intel.safeRange.minSafe})</span>
                  <span className="text-emerald-400 font-bold">النطاق المثالي ({intel.safeRange.optimalMin} - {intel.safeRange.optimalMax})</span>
                </div>
              </div>
            </div>

            {/* Industry Benchmarks Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                المقارنة المرجعية بمختلف القطاعات الاقتصادية (Industry Benchmarks)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">القطاع الصناعي (Manufacturing):</div>
                  <div className="font-bold text-slate-100 mt-1">{intel.benchmarks.manufacturing}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">قطاع التجارة والتجزئة (Retail):</div>
                  <div className="font-bold text-slate-100 mt-1">{intel.benchmarks.retail}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">قطاع المقاولات (Construction):</div>
                  <div className="font-bold text-slate-100 mt-1">{intel.benchmarks.construction}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">قطاع الخدمات (Services):</div>
                  <div className="font-bold text-slate-100 mt-1">{intel.benchmarks.service}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">مستهدف الشركة الأصلي:</div>
                  <div className="font-bold text-emerald-400 mt-1">{intel.benchmarks.companyTarget}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[11px]">أداء الشركة السابق:</div>
                  <div className="font-bold text-blue-400 mt-1">{intel.benchmarks.previousPerformance}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: IMPACT & STAKEHOLDERS (Section 7 & 9) */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            {/* Impact Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">أبعاد الأثر التشغيلي والمالي والاستراتيجي:</h4>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">الأثر التشغيلي (Operational):</span>
                  <p className="text-slate-300 leading-relaxed">{intel.operationalImpact}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-400">الأثر المالي (Financial):</span>
                  <p className="text-slate-300 leading-relaxed">{intel.financialImpact}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-purple-400">الأثر الاستراتيجي (Strategic):</span>
                  <p className="text-slate-300 leading-relaxed">{intel.strategicImpact}</p>
                </div>
              </div>
            </div>

            {/* Stakeholder Perspective Matrix */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">منظور أصحاب المصلحة والإدارة:</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-bold text-blue-400 block mb-1">الرئيس التنفيذي (CEO):</span>
                  <span className="text-slate-300">{intel.stakeholders.ceo}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">المدير المالي (CFO):</span>
                  <span className="text-slate-300">{intel.stakeholders.cfo}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">المراجع الخارجي (Auditor):</span>
                  <span className="text-slate-300">{intel.stakeholders.auditor}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="font-bold text-purple-400 block mb-1">المستثمرون والبنوك:</span>
                  <span className="text-slate-300">{intel.stakeholders.investor}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RISK & WARNING CENTER (Section 8 & 18) */}
        {activeTab === "risk" && (
          <div className="space-y-6">
            {/* Risk Behavior Scenarios */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                تحليل المخاطر وحالات التغير المفاجئ
              </h4>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400">عند ارتفاع النسبة عن الحد الطبيعي:</span>
                  <p className="text-slate-300 leading-relaxed">{intel.riskAnalysis.ifIncrease}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-red-400">عند انخفاض النسبة عن الحد الطبيعي:</span>
                  <p className="text-slate-300 leading-relaxed">{intel.riskAnalysis.ifDecrease}</p>
                </div>
              </div>
            </div>

            {/* Warning Center List */}
            {intel.warnings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  مركز التنبيهات والتحذيرات التلقائية
                </h4>
                {intel.warnings.map((w, idx) => (
                  <div key={idx} className="bg-slate-950/80 p-3 rounded-xl border border-red-500/20 text-xs text-slate-300">
                    <span className="font-bold text-red-400 block">{w.title}</span>
                    <p className="mt-1 text-slate-400">{w.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: TREND & VARIANCE (Section 11 & 12) */}
        {activeTab === "trend" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                التطور التاريخي والاتجاهات الزمنية
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">الشهر السابق:</span>
                  <div className="font-bold text-slate-200 mt-1">{intel.trendData.previousMonth}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">الربع السابق:</span>
                  <div className="font-bold text-slate-200 mt-1">{intel.trendData.previousQuarter}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">السنة السابقة:</span>
                  <div className="font-bold text-slate-200 mt-1">{intel.trendData.previousYear}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px]">متوسط 3 سنوات:</span>
                  <div className="font-bold text-blue-400 mt-1">{intel.trendData.threeYearAvg}</div>
                </div>
              </div>
            </div>

            {/* Variance Drivers */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">تحليل الانحراف والمحرك الرئيسي للتغير:</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {intel.varianceAnalysis.mainDriver}
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: RECOMMENDATIONS & AI (Section 13 & 14 & 17) */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {/* AI Insights List */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                الملاحظات الذكية المستخرجة تلقائياً من الـ ERP
              </h4>
              <div className="space-y-2 text-xs">
                {intel.aiInsights.map((insight, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300">التوصيات التنفيذية ذات الأولوية:</h4>
              {intel.aiRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{rec.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      أولوية {rec.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <div>الأثر المتوقع: <strong className="text-emerald-400 block">{rec.expectedImpact}</strong></div>
                    <div>المسؤول: <strong className="text-slate-200 block">{rec.responsibleDepartment}</strong></div>
                    <div>الزمن المقدر: <strong className="text-indigo-400 block">{rec.implementationTime}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: DRILL DOWN (Section 20) */}
        {activeTab === "drill" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                الانتقال المباشر للدفاتر القيد والسجلات المالي
              </h4>

              <div className="space-y-2">
                {intel.drillDownLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={() => onDrillDown?.(link.module, link.targetCode)}
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 p-3 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <span>{link.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: ASK AI FINANCIAL ASSISTANT */}
        {activeTab === "chat" && (
          <div className="space-y-4 flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl scrollbar-thin scrollbar-thumb-slate-800">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs max-w-[85%] space-y-1 ${
                    msg.role === "user"
                      ? "mr-auto bg-blue-600 text-white rounded-br-none"
                      : "ml-auto bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                  <span className="text-[9px] opacity-60 block text-left font-mono">{msg.time}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="ml-auto bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs text-slate-400 animate-pulse">
                  جاري تحليل السجلات واستخراج الإجابة...
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => handleSendChat("كيف نرفع قيمة هذه النسبة؟")}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                كيف نرفع النسبة؟
              </button>
              <button
                onClick={() => handleSendChat("ما هي أبرز الحسابات التي أثرت عليها؟")}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                الحسابات الأكثر تأثيراً
              </button>
              <button
                onClick={() => handleSendChat("هل الوضع الحالي آمن؟")}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                تقييم الأمان المالي
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="اسأل المستشار المالي AI عن أي استفسار تخص هذه النسبة..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={chatLoading}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
