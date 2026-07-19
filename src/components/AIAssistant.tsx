import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Bot, 
  User, 
  HelpCircle, 
  Calculator, 
  FileCheck2, 
  Coins 
} from "lucide-react";
import { ERPConfig, ChartOfAccount, StockItem, Employee, JournalEntry } from "../types";

interface AIAssistantProps {
  config: ERPConfig;
  accounts: ChartOfAccount[];
  stock: StockItem[];
  employees: Employee[];
  journalEntries: JournalEntry[];
}

export default function AIAssistant({
  config,
  accounts = [],
  stock = [],
  employees = [],
  journalEntries = []
}: AIAssistantProps) {
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { 
      sender: "ai", 
      text: "مرحباً بك! أنا مستشارك المالي والتقني الذكي، والمتخصص في معايير المحاسبة الدولية IFRS/IAS، القوانين واللوائح الضريبية في مصر والشرق الأوسط (كضريبة القيمة المضافة ونموذج 41 خصم وتحصيل)، والبنية البرمجية السحابية للمؤسسات. كيف يمكنني مساعدتك في تدقيق وفحص حسابات عملك اليوم؟" 
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendQuery = async (customPrompt?: string) => {
    const queryText = customPrompt || inputText;
    if (!queryText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: "user", text: queryText }]);
    if (!customPrompt) setInputText("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("apex_access_token");
      const response = await fetch("/api/gemini/query", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          prompt: queryText
        })
      });

      const data = await response.json();
      if (data.error) {
        setMessages(prev => [...prev, { sender: "ai", text: `عذراً، حدث خطأ أثناء الاتصال بالخادم: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: data.text || "لم يتم إنتاج مخرجات من الذكاء الاصطناعي." }]);
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { sender: "ai", text: `فشل في الاتصال بالمستشار الذكي: ${err.message || "لا يمكن الوصول إلى الخادم الخلفي."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTED_PROMPTS = [
    { 
      label: "تدقيق مطابقة ضريبة القيمة المضافة", 
      icon: FileCheck2,
      prompt: "قم بإجراء تدقيق للمطابقة الضريبية على نظام الحسابات. تحقق مما إذا كانت أرصدة ضريبة القيمة المضافة 14% متطابقة ومطابقة محاسبياً مع المبيعات المحققة واستقطاعات الخصم والتحصيل نموذج 41." 
    },
    { 
      label: "تشغيل استشراف التدفق المالي", 
      icon: Coins,
      prompt: "قم بتشغيل استشراف التدفق المالي للربع الثالث بناءً على قيمة بضاعة المخزون، الأرصدة البنكية الحالية، والمصاريف التشغيلية ومصاريف الأجور. وزودني بـ 3 توصيات ملموسة لتعظيم الإيرادات وصافي الربح." 
    },
    { 
      label: "شرح القانون الضريبي الموحد رقم 206", 
      icon: HelpCircle,
      prompt: "اشرح المتطلبات الجوهرية لمنظومة الفاتورة الإلكترونية طبقاً لقانون الإجراءات الضريبية الموحد المصري رقم 206 لسنة 2020. وكيف ينبغي هيكلة قيود اليومية لضمان المطابقة الكاملة؟" 
    }
  ];

  return (
    <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[560px] flex flex-col justify-between text-right" id="ai-assistant-container" dir="rtl">
      {/* Header */}
      <div className="p-4.5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-200 text-sm">المستشار الذكي ومستشرف الضرائب بالذكاء الاصطناعي</h3>
            <p className="text-[10px] font-mono text-emerald-400">متصل بنموذج ذكاء اصطناعي (Gemini 3.5)</p>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const isAI = msg.sender === "ai";
          return (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${isAI ? "" : "mr-auto flex-row-reverse"}`}>
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border text-xs ${
                isAI 
                  ? "bg-slate-900 border-emerald-500/30 text-emerald-400" 
                  : "bg-purple-500/10 border-purple-500/30 text-purple-400"
              }`}>
                {isAI ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
              </div>

              {/* Text Bubble */}
              <div className={`p-4 rounded-xl text-xs leading-relaxed font-sans ${
                isAI 
                  ? "bg-slate-900/50 border border-slate-800/80 text-slate-200" 
                  : "bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 text-slate-100"
              }`}>
                <div className="space-y-2 whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="h-8 w-8 rounded-lg bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-xs text-emerald-400 font-sans flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>جاري تحليل قواعد بيانات النظام وفحص سجلات المطابقة الضريبية والمحاسبية...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Suggestions and input */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-800 space-y-4">
        {/* Chips */}
        {messages.length === 1 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-sans text-slate-500 uppercase tracking-wider font-bold block text-right">موضوعات مقترحة للفحص والتدقيق</span>
            <div className="flex flex-wrap gap-2 justify-start">
              {SUGGESTED_PROMPTS.map((chip, idx) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(chip.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141b2d] hover:bg-[#192138] border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-300 transition-all text-right"
                  >
                    <Icon className="h-3 w-3 text-emerald-400" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
            placeholder="اسأل المستشار الذكي عن المعايير الدولية، الضرائب المصرية، أو تدقيق الأرصدة..."
            className="flex-1 bg-[#141b2d] text-xs text-slate-200 border border-slate-700/80 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-right"
          />
          <button
            onClick={() => handleSendQuery()}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
          >
            <Send className="h-4 w-4 transform rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
