import React, { useState, useRef } from "react";
import { 
  BarChart3, 
  FileText, 
  Percent, 
  TrendingUp, 
  GitCommit, 
  Clock, 
  Building2, 
  Sliders, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ListFilter
} from "lucide-react";

import { ERPConfig } from "../types";
import { ExecutiveSummaryTab } from "./financial-analysis/ExecutiveSummaryTab";
import { FinancialStatementsTab } from "./financial-analysis/FinancialStatementsTab";
import { FinancialRatiosTab } from "./financial-analysis/FinancialRatiosTab";
import { TrendHorizontalTab } from "./financial-analysis/TrendHorizontalTab";
import { DuPontTab } from "./financial-analysis/DuPontTab";
import { AgingTab } from "./financial-analysis/AgingTab";
import { CostCenterProfitabilityTab } from "./financial-analysis/CostCenterProfitabilityTab";
import { WhatIfSimulatorTab } from "./financial-analysis/WhatIfSimulatorTab";
import { AltmanZScoreTab } from "./financial-analysis/AltmanZScoreTab";

interface FinancialAnalysisModuleProps {
  config: ERPConfig;
  themeClasses: any;
}

export const FinancialAnalysisModule: React.FC<FinancialAnalysisModuleProps> = ({ config, themeClasses }) => {
  const [activeTab, setActiveTab] = useState<
    "executive" | "statements" | "ratios" | "trend" | "dupont" | "aging" | "cost_centers" | "what_if" | "altman_z"
  >("executive");

  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: "executive", label: "الملخص التنفيذي", icon: BarChart3 },
    { id: "statements", label: "القوائم المالية (IFRS 18)", icon: FileText },
    { id: "ratios", label: "النسب المالية (16+)", icon: Percent },
    { id: "trend", label: "التحليل الأفقي والرأسي", icon: TrendingUp },
    { id: "dupont", label: "تحليل ديبونت (DuPont)", icon: GitCommit },
    { id: "aging", label: "أعمار الديون", icon: Clock },
    { id: "cost_centers", label: "ربحية المراكز", icon: Building2 },
    { id: "what_if", label: "محاكي السيناريوهات (What-If)", icon: Sliders },
    { id: "altman_z", label: "مؤشر Z-Score للإفلاس", icon: ShieldCheck }
  ];

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl p-4 md:p-6">
      {/* Module Title Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              وحدة التحليل المالي المتقدم والتقرير التنفيذي
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">التحليل المالي المتقدم والتقارير التنفيذية (Advanced Financial Analysis)</h1>
          <p className="text-xs text-slate-400">
            نظام متكامل لتحليل الأداء المالي، النسب المالية، تفكيك ديبونت، القوائم المعيارية IFRS 18، وأعمار الديون مع محاكي السيناريوهات.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">حتى تاريخ:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Navigation Controls Bar: Quick Dropdown + Scrollable Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Select Dropdown for Easy Access */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <ListFilter className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-400 font-medium whitespace-nowrap">الانتقال السريع للقسم:</span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-slate-950 text-slate-100 font-bold border border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 transition-colors w-full sm:w-auto cursor-pointer"
            >
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scroll Navigation Arrows */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-400">التنقل بين الأقسام:</span>
            <button
              onClick={() => scrollTabs("right")}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              title="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTabs("left")}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              title="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs Bar with Smooth Horizontal Scroll */}
        <div
          ref={tabsRef}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 backdrop-blur-md flex items-center gap-1.5 overflow-x-auto shadow-xl scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
                    : "text-slate-400 hover:bg-slate-800/90 hover:text-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Render Body */}
      <div className="pt-2">
        {activeTab === "executive" && (
          <ExecutiveSummaryTab
            asOfDate={asOfDate}
            theme={config.theme || "blue"}
            themeClasses={themeClasses}
            onNavigateTab={(tabId) => setActiveTab(tabId as any)}
          />
        )}
        {activeTab === "statements" && (
          <FinancialStatementsTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "ratios" && (
          <FinancialRatiosTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "trend" && (
          <TrendHorizontalTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "dupont" && (
          <DuPontTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "aging" && (
          <AgingTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "cost_centers" && (
          <CostCenterProfitabilityTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "what_if" && (
          <WhatIfSimulatorTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
        {activeTab === "altman_z" && (
          <AltmanZScoreTab asOfDate={asOfDate} theme={config.theme || "blue"} themeClasses={themeClasses} />
        )}
      </div>
    </div>
  );
};

export default FinancialAnalysisModule;
