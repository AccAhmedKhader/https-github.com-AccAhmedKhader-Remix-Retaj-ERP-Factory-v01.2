import React, { useState, useEffect } from "react";
import { 
  Target, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Briefcase, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowLeftRight,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Percent,
  TrendingDown,
  Building2,
  Trash2
} from "lucide-react";
import { ERPConfig, Customer } from "../types";
import { getThemeClass } from "./Sidebar";

interface CRMModuleProps {
  config: ERPConfig;
  customers: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  onGenerateInvoice?: (deal: CRMDeal) => void;
}

export interface CRMDeal {
  id: string;
  clientName: string;
  title: string;
  value: number;
  stage: "Lead" | "Qualification" | "Proposal" | "Negotiation" | "Won" | "Lost";
  source: string;
  phone: string;
  email: string;
  createdAt: string;
  probability: number; // probability of winning in %
}

export default function CRMModule({
  config,
  customers = [],
  setCustomers,
  onGenerateInvoice
}: CRMModuleProps) {
  const clr = getThemeClass(config.theme);

  const [deals, setDeals] = useState<CRMDeal[]>([]);

  useEffect(() => {
    fetch("/api/v1/crm/deals")
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setDeals(res.data);
        }
      })
      .catch(err => console.error("Error loading CRM deals:", err));
  }, []);

  // Modal forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [dealValue, setDealValue] = useState(100000);
  const [dealSource, setDealSource] = useState("مباشر");
  const [dealPhone, setDealPhone] = useState("");
  const [dealEmail, setDealEmail] = useState("");
  const [dealStage, setDealStage] = useState<CRMDeal["stage"]>("Lead");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle || !clientName) return;

    const newDeal: CRMDeal = {
      id: `DEAL-${Date.now().toString().slice(-4)}`,
      title: dealTitle,
      clientName,
      value: Number(dealValue) || 0,
      stage: dealStage,
      source: dealSource,
      phone: dealPhone,
      email: dealEmail,
      createdAt: new Date().toISOString().split("T")[0],
      probability: getStageProbability(dealStage)
    };

    fetch("/api/v1/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDeal)
    })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        setDeals([newDeal, ...deals]);
      }
    })
    .catch(err => console.error("Error saving deal:", err));

    setIsAddOpen(false);

    // Reset Form
    setDealTitle("");
    setClientName("");
    setDealValue(100000);
    setDealPhone("");
    setDealEmail("");
    setDealStage("Lead");
  };

  const getStageProbability = (stage: CRMDeal["stage"]) => {
    switch (stage) {
      case "Lead": return 15;
      case "Qualification": return 30;
      case "Proposal": return 50;
      case "Negotiation": return 80;
      case "Won": return 100;
      case "Lost": return 0;
    }
  };

  const handleStageChange = (dealId: string, newStage: CRMDeal["stage"]) => {
    const updatedProbability = getStageProbability(newStage);
    setDeals(deals.map(d => {
      if (d.id === dealId) {
        return { 
          ...d, 
          stage: newStage,
          probability: updatedProbability
        };
      }
      return d;
    }));

    fetch(`/api/v1/crm/deals/${dealId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage, probability: updatedProbability })
    })
    .catch(err => console.error("Error updating deal stage:", err));
  };

  const handleDeleteDeal = (dealId: string) => {
    setDeals(deals.filter(d => d.id !== dealId));

    fetch(`/api/v1/crm/deals/${dealId}`, {
      method: "DELETE"
    })
    .catch(err => console.error("Error deleting deal:", err));
  };

  const promoteToErpCustomer = (deal: CRMDeal) => {
    if (!setCustomers) return;
    
    // Check if customer already exists in ERP
    if (customers.some(c => c.name === deal.clientName)) {
      alert(`❌ العميل "${deal.clientName}" مسجل بالفعل في نظام الـ ERP.`);
      return;
    }

    const newCustomer: Customer = {
      id: `CUST-CRM-${deal.id.split("-")[1]}`,
      name: deal.clientName,
      phone: deal.phone || "0100000000",
      email: deal.email || "client@crm.com",
      taxRegistrationNumber: `382-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}`,
      balance: deal.value // Opening outstanding or deal size
    };

    setCustomers([...customers, newCustomer]);
    alert(`✅ تم إدراج وترقية العميل "${deal.clientName}" بنجاح إلى قائمة عملاء الـ ERP المعتمدين.`);
  };

  // Calculations
  const activeDeals = deals.filter(d => d.stage !== "Lost" && d.stage !== "Won");
  const totalValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipeline = activeDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
  const wonValue = deals.filter(d => d.stage === "Won").reduce((sum, d) => sum + d.value, 0);
  const wonCount = deals.filter(d => d.stage === "Won").length;

  const STAGES: { id: CRMDeal["stage"]; label: string; color: string; bg: string; text: string }[] = [
    { id: "Lead", label: "عملاء محتملون", color: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400" },
    { id: "Qualification", label: "تأهيل وتصنيف", color: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400" },
    { id: "Proposal", label: "تقديم العروض المالية", color: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400" },
    { id: "Negotiation", label: "التفاوض والإغلاق", color: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400" },
    { id: "Won", label: "صفقات رابحة (مغلقة)", color: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    { id: "Lost", label: "صفقات مستبعدة", color: "border-slate-800", bg: "bg-slate-900/40", text: "text-slate-500" }
  ];

  // Filters
  const filteredDeals = deals.filter(d => {
    const matchesSearch = d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === "all" || d.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const uniqueSources = Array.from(new Set(deals.map(d => d.source)));

  return (
    <div className="p-6 space-y-6 text-right" dir="rtl" id="crm-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2 justify-start">
            <Target className={`h-6 w-6 ${clr.text}`} /> إدارة علاقات العملاء (CRM Suite)
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            تابع خطوط المبيعات، فرص التعاقد، نسب إغلاق الصفقات، وترقية العملاء إلى الـ ERP مباشرة.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-950 ${clr.accent} hover:opacity-90 active:scale-95 transition-all cursor-pointer`}
        >
          <Plus className="h-4 w-4" /> إضافة فرصة مبيعات جديدة (Lead)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">إجمالي القيمة الفعالة لخطوط المبيعات</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              {totalValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{config.currency}</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">القيمة المحتملة لجميع الصفقات النشطة</p>
          </div>
          <div className={`h-11 w-11 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400`}>
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">التدفق المتوقع الموزون (Weighted Pipeline)</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              {Math.round(weightedPipeline).toLocaleString()} <span className="text-xs font-sans text-slate-400">{config.currency}</span>
            </span>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 justify-start">
              <TrendingUp className="h-3 w-3" /> طبقاً لنسب واحتمالات النجاح
            </p>
          </div>
          <div className={`h-11 w-11 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400`}>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">الصفقات المغلقة والناجحة</span>
            <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">
              {wonValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{config.currency}</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">عدد الصفقات المحققة: {wonCount}</p>
          </div>
          <div className={`h-11 w-11 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0b0f19] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">معدل تحويل الفرص البيعية</span>
            <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
              {deals.length > 0 ? Math.round((wonCount / deals.length) * 100) : 0}%
            </span>
            <p className="text-[10px] text-slate-400 mt-1">من إجمالي {deals.length} فرصة مسجلة</p>
          </div>
          <div className={`h-11 w-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400`}>
            <Percent className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="البحث عن صفقات مبيعات، عملاء، أو عروض تفاوض..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
          />
          <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-500" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5" /> تصفية حسب مصدر القناة:
          </span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="all">كافة مصادر المبيعات</option>
            {uniqueSources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
          const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div 
              key={stage.id} 
              className="bg-[#080c14] border border-slate-800/80 rounded-xl p-4 flex flex-col min-h-[480px] shrink-0 min-w-[200px]"
            >
              {/* Stage Header */}
              <div className="border-b border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 justify-start">
                    <span className={`h-2 w-2 rounded-full ${stage.text}`} /> {stage.label}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                    {stageDeals.length} فرص • {stageValue.toLocaleString()} {config.currency}
                  </span>
                </div>
              </div>

              {/* Stage Deals List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
                {stageDeals.map((deal) => (
                  <div 
                    key={deal.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 p-3.5 rounded-xl transition-all space-y-2.5 shadow-md relative group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[9px] font-mono text-slate-500 font-bold">{deal.id}</span>
                      <button 
                        onClick={() => handleDeleteDeal(deal.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="حذف الفرصة"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-200 line-clamp-1">{deal.title}</h5>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-sans">{deal.clientName}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-2 font-mono">
                      <span className="font-bold text-slate-300">{deal.value.toLocaleString()} {config.currency}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        deal.probability >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        deal.probability >= 50 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>{deal.probability}%</span>
                    </div>

                    {/* Metadata */}
                    <div className="text-[9px] text-slate-500 font-mono flex flex-col gap-1">
                      <span className="flex items-center gap-1 justify-start">
                        <Phone className="h-2.5 w-2.5 text-slate-600" /> {deal.phone || "بلا هاتف"}
                      </span>
                      <span className="flex items-center gap-1 justify-start">
                        <Mail className="h-2.5 w-2.5 text-slate-600" /> {deal.email || "بلا بريد"}
                      </span>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-2 gap-1.5">
                      {/* Drag actions or quick clicks */}
                      <select
                        value={deal.stage}
                        onChange={(e) => handleStageChange(deal.id, e.target.value as CRMDeal["stage"])}
                        className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[9px] text-slate-400 focus:outline-none font-bold w-full"
                      >
                        <option value="Lead">عميل محتمل</option>
                        <option value="Qualification">تأهيل</option>
                        <option value="Proposal">عرض مالي</option>
                        <option value="Negotiation">تفاوض</option>
                        <option value="Won">مغلقة رابحة</option>
                        <option value="Lost">مستبعدة</option>
                      </select>

                      {deal.stage === "Won" && setCustomers && (
                        <button
                          onClick={() => promoteToErpCustomer(deal)}
                          className="px-1.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded border border-emerald-500/30 text-[9px] font-bold shrink-0 flex items-center gap-0.5"
                          title="ترقية إلى عملاء الـ ERP المعتمدين"
                        >
                          <Building2 className="h-2.5 w-2.5" /> ERP
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {stageDeals.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-xl p-4 text-center text-slate-600 font-sans text-[10px] py-10">
                    <Clock className="h-5 w-5 mb-1.5 opacity-40 text-slate-600" />
                    لا توجد صفقات حالياً
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Deals Optimization Insights */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 justify-start">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> التحليلات التنبؤية بالذكاء الاصطناعي (AI Lead Probability)
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
          يقوم خوارزمية الذكاء الاصطناعي التنبؤي بتحليل حجم الصفقة، ومصدر التماس، ومعدلات استجابة العميل. نقترح التركيز على الصفقات التي تتجاوز نسبة نجاحها 60% لتعظيم العائد المالي لهذا الربع، والمبادرة فوراً بتحويل صفقات "مجموعة السويدي" إلى فواتير تشغيلية.
        </p>
      </div>

      {/* Add Deal Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl text-right">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2 justify-start mb-4">
              <Target className={`h-4.5 w-4.5 ${clr.text}`} /> تسجيل فرصة بيع وتأهيل عميل (CRM Lead)
            </h3>

            <form onSubmit={handleAddDeal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">اسم العميل / المنشأة</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: شركة غبور للتصنيع"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">مسمى الصفقة / الخدمة</label>
                  <input
                    type="text"
                    required
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="مثال: توريد تراخيص برمجية"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">قيمة الصفقة المقدرة ({config.currency})</label>
                  <input
                    type="number"
                    required
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">مصدر جذب العميل (Source)</label>
                  <select
                    value={dealSource}
                    onChange={(e) => setDealSource(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                  >
                    <option value="حملة التسويق الرقمي">حملة التسويق الرقمي</option>
                    <option value="طلب مباشر من الموقع">طلب مباشر من الموقع</option>
                    <option value="علاقات عامة ومعارض">علاقات عامة ومعارض</option>
                    <option value="مباشر">اتصال مباشر / مبيعات خارجية</option>
                    <option value="توصية عملاء سابقين">توصية عملاء سابقين</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">هاتف العميل</label>
                  <input
                    type="text"
                    value={dealPhone}
                    onChange={(e) => setDealPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block font-bold mb-1">البريد الإلكتروني للعميل</label>
                  <input
                    type="email"
                    value={dealEmail}
                    onChange={(e) => setDealEmail(e.target.value)}
                    placeholder="procurement@client.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">المرحلة الابتدائية للصفقة</label>
                <select
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value as CRMDeal["stage"])}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
                >
                  <option value="Lead">عميل محتمل (Lead)</option>
                  <option value="Qualification">تأهيل وتصنيف (Qualification)</option>
                  <option value="Proposal">عروض مالية (Proposal)</option>
                  <option value="Negotiation">تفاوض وإغلاق (Negotiation)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-850 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded text-slate-950 font-bold text-xs ${clr.accent}`}
                >
                  حفظ وتسجيل الفرصة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
