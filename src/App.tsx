import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  BrainCircuit, 
  Coins, 
  Globe, 
  Terminal,
  Calculator,
  ShieldCheck,
  Building2,
  Menu,
  Sun,
  Moon,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

import { ERPConfig, Cheque } from "./types";

import Sidebar, { getThemeClass } from "./components/Sidebar";
import BIDashboard from "./components/BIDashboard";
import AccountingModule from "./components/AccountingModule";
import InventoryModule from "./components/InventoryModule";
import HRModule from "./components/HRModule";
import ManufacturingModule from "./components/ManufacturingModule";
import POSModule from "./components/POSModule";
import ArchitectTerminal from "./components/ArchitectTerminal";
import AIAssistant from "./components/AIAssistant";
import ReportsEngine from "./components/ReportsEngine";
import EInvoicingModule from "./components/EInvoicingModule";
import SecurityModule from "./components/SecurityModule";
import OnboardingModule from "./components/OnboardingModule";
import SalesProcurementModule from "./components/SalesProcurementModule";
import ImportExportModule from "./components/ImportExportModule";
import CRMModule from "./components/CRMModule";
import DocManagerModule from "./components/DocManagerModule";
import WorkflowModule from "./components/WorkflowModule";
import FinancialAnalysisModule from "./components/FinancialAnalysisModule";

// Global fetch wrapper to automatically inject JWT access tokens and handle 401 logouts with auto-refresh
const originalFetch = window.fetch.bind(window);
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

Object.defineProperty(window, "fetch", {
  value: async function (input: RequestInfo | URL, init?: RequestInit) {
    const token = localStorage.getItem("apex_access_token");
    if (token) {
      init = init || {};
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        init.headers.set("Authorization", `Bearer ${token}`);
      } else if (Array.isArray(init.headers)) {
        const authIdx = init.headers.findIndex(h => h[0].toLowerCase() === "authorization");
        if (authIdx !== -1) init.headers[authIdx][1] = `Bearer ${token}`;
        else init.headers.push(["Authorization", `Bearer ${token}`]);
      } else {
        (init.headers as any)["Authorization"] = `Bearer ${token}`;
      }
    }
    
    let response = await originalFetch(input, init);
    const urlStr = typeof input === "string" ? input : ("url" in input ? (input as any).url : String(input));
    
    if (response.status === 401 && !urlStr.includes("/api/auth/login") && !urlStr.includes("/api/auth/refresh")) {
      const refreshToken = localStorage.getItem("apex_refresh_token");
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await originalFetch("/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken })
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.success && refreshData.data?.accessToken) {
                const newToken = refreshData.data.accessToken;
                localStorage.setItem("apex_access_token", newToken);
                isRefreshing = false;
                onRefreshed(newToken);
              } else {
                throw new Error("Invalid refresh response");
              }
            } else {
              throw new Error("Refresh failed");
            }
          } catch (e) {
            isRefreshing = false;
            localStorage.removeItem("apex_access_token");
            localStorage.removeItem("apex_refresh_token");
            localStorage.removeItem("apex_user");
            window.dispatchEvent(new Event("apex_unauthorized"));
            return response;
          }
        }
        
        // Wait for the token refresh to finish, then retry the request
        const retryWithNewToken = new Promise<Response>((resolve) => {
          addRefreshSubscriber((newToken) => {
            init = init || {};
            init.headers = init.headers || {};
            if (init.headers instanceof Headers) {
              init.headers.set("Authorization", `Bearer ${newToken}`);
            } else if (Array.isArray(init.headers)) {
              const authIdx = init.headers.findIndex(h => h[0].toLowerCase() === "authorization");
              if (authIdx !== -1) init.headers[authIdx][1] = `Bearer ${newToken}`;
              else init.headers.push(["Authorization", `Bearer ${newToken}`]);
            } else {
              (init.headers as any)["Authorization"] = `Bearer ${newToken}`;
            }
            resolve(originalFetch(input, init));
          });
        });
        
        return retryWithNewToken;
      } else {
        localStorage.removeItem("apex_access_token");
        localStorage.removeItem("apex_refresh_token");
        localStorage.removeItem("apex_user");
        window.dispatchEvent(new Event("apex_unauthorized"));
      }
    }
    
    return response;
  },
  writable: true,
  configurable: true
});

export function getModernBg(theme?: string, mode?: "light" | "dark") {
  if (mode === "light") {
    switch (theme) {
      case "midnight":
        return "bg-[#fdfbf7] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#fdf6ec] via-[#fdfbf7] to-[#f4ebe1]";
      case "cyberpunk":
        return "bg-[#faf5ff] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#fceffe] via-[#faf5ff] to-[#f5e3fc]";
      case "forest":
        return "bg-[#f0fdf4] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#dcfce7] via-[#f0fdf4] to-[#f0fdf4]";
      case "blue":
        return "bg-[#f0f9ff]";
      case "purple":
        return "bg-[#faf5ff]";
      case "amber":
        return "bg-[#fffbeb]";
      case "rose":
        return "bg-[#fff1f2]";
      case "emerald":
      default:
        return "bg-[#f0fdf4]";
    }
  }

  switch (theme) {
    case "midnight":
      return "bg-[#050403] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1d1209] via-[#050403] to-[#010101]";
    case "cyberpunk":
      return "bg-[#030205] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-[#1f092b] via-[#040307] to-[#010103]";
    case "forest":
      return "bg-[#010402] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#051c0f] via-[#010402] to-[#000000]";
    case "blue":
      return "bg-[#050913]";
    case "purple":
      return "bg-[#0a0513]";
    case "amber":
      return "bg-[#130d05]";
    case "rose":
      return "bg-[#130509]";
    case "emerald":
    default:
      return "bg-[#070a13]";
  }
}

export default function App() {
  // Authentication State
  const [user, setUser] = useState<{ id: string; username: string; name: string; role: string; tenantId: string } | null>(() => {
    const saved = localStorage.getItem("apex_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Global Shared ERP States
  const [config, setConfig] = useState<ERPConfig>({
    company: "Apex Levant Corp",
    branch: "Cairo Headquarters",
    warehouse: "WH-CAI-01",
    fiscalYear: "FY 2026/2027",
    currency: "EGP",
    language: "English",
    theme: "emerald",
    mode: "dark"
  });

  const clr = getThemeClass(config.theme);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [profitCenters, setProfitCenters] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);

  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Concurrency Conflict state and handlers
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onReload: () => void;
  } | null>(null);

  const reloadDbState = () => {
    if (!user) return;
    const companiesList = (config as any).companiesList || [
      { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
      { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
      { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
    ];
    const activeCompanyObj = companiesList.find((c: any) => (c.value === config.company || c.name === config.company)) || companiesList[0];
    const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "TEN-APEX-01";

    const token = localStorage.getItem("apex_access_token");
    fetch(`/api/erp/state?tenantId=${activeCompanyId}`, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      }
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("apex_access_token");
          localStorage.removeItem("apex_refresh_token");
          localStorage.removeItem("apex_user");
          setUser(null);
          throw new Error("Session expired or unauthorized");
        }
        if (!res.ok) throw new Error("Could not fetch state");
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.accounts) setAccounts(data.accounts);
          if (data.employees) setEmployees(data.employees);
          if (data.stock) setStock(data.stock);
          if (data.costCenters) setCostCenters(data.costCenters);
          if (data.profitCenters) setProfitCenters(data.profitCenters);
          if (data.boms) setBoms(data.boms);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          if (data.productionOrders) setProductionOrders(data.productionOrders);
          if (data.customers) setCustomers(data.customers);
          if (data.suppliers) setSuppliers(data.suppliers);
          if (data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices);
          if (data.salesInvoices) setSalesInvoices(data.salesInvoices);
          if (data.cheques) setCheques(data.cheques);
        }
      })
      .catch((err) => {
        console.error("Reloading DB state failed:", err);
      });
  };

  const setStockWithOptimisticLock = async (value: any) => {
    const nextStock = typeof value === "function" ? value(stock) : value;
    let changedItem: any = null;
    let oldItem: any = null;
    
    for (const item of nextStock) {
      const match = stock.find((s: any) => s.sku === item.sku && s.warehouseId === item.warehouseId);
      if (!match) continue;
      
      if (match.quantity !== item.quantity || match.unitPrice !== item.unitPrice || match.name !== item.name) {
        changedItem = item;
        oldItem = match;
        break;
      }
    }
    
    if (changedItem) {
      try {
        const token = localStorage.getItem("apex_access_token");
        const response = await fetch(`/api/v1/inventory/stock/${encodeURIComponent(changedItem.sku)}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            sku: changedItem.sku,
            name: changedItem.name,
            warehouseId: changedItem.warehouseId,
            quantity: changedItem.quantity,
            unitPrice: changedItem.unitPrice,
            minLevel: changedItem.minLevel || 0,
            version: oldItem.version || 1
          })
        });
        
        const resData = await response.json();
        
        if (!response.ok || !resData.success) {
          if (response.status === 409 || resData.error === "CONCURRENT_WRITE_CONFLICT") {
            setConflictModal({
              show: true,
              title: "تعارض في الكتابة المتزامنة (المخزون)",
              message: `تعذر تحديث الصنف [${changedItem.name}] لأن مستخدمًا آخر قام بتعديل كميته أو سعره في قاعدة البيانات في نفس الوقت.`,
              onReload: () => reloadDbState()
            });
            return;
          }
          throw new Error(resData.error || "Failed to update stock item");
        }
        
        changedItem.version = (oldItem.version || 1) + 1;
      } catch (err) {
        console.error("Optimistic lock update failed:", err);
      }
    }
    
    setStock(nextStock);
  };

  const setChequesWithOptimisticLock = async (value: any) => {
    const nextCheques = typeof value === "function" ? value(cheques) : value;
    let changedCheque: any = null;
    let oldCheque: any = null;
    
    for (const ch of nextCheques) {
      const match = cheques.find((c: any) => c.id === ch.id);
      if (!match) continue;
      
      if (match.status !== ch.status || match.amount !== ch.amount) {
        changedCheque = ch;
        oldCheque = match;
        break;
      }
    }
    
    if (changedCheque) {
      try {
        const token = localStorage.getItem("apex_access_token");
        const response = await fetch(`/api/v1/accounting/cheques/${encodeURIComponent(changedCheque.id)}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            ...changedCheque,
            version: oldCheque.version || 1
          })
        });
        
        const resData = await response.json();
        
        if (!response.ok || !resData.success) {
          if (response.status === 409 || resData.error === "CONCURRENT_WRITE_CONFLICT") {
            setConflictModal({
              show: true,
              title: "تعارض في الكتابة المتزامنة (الشيكات)",
              message: `تعذر تحديث الشيك [${changedCheque.chequeNumber}] لأن مستخدمًا آخر قام بتحديث حالته في نفس الوقت.`,
              onReload: () => reloadDbState()
            });
            return;
          }
          throw new Error(resData.error || "Failed to update cheque");
        }
        
        changedCheque.version = (oldCheque.version || 1) + 1;
      } catch (err) {
        console.error("Optimistic lock update failed:", err);
      }
    }
    
    setCheques(nextCheques);
  };

  const setJournalEntriesWithOptimisticLock = async (value: any) => {
    const nextEntries = typeof value === "function" ? value(journalEntries) : value;
    let changedEntry: any = null;
    let oldEntry: any = null;
    
    for (const je of nextEntries) {
      const match = journalEntries.find((j: any) => j.id === je.id);
      if (!match) continue;
      
      if (match.description !== je.description || match.status !== je.status) {
        changedEntry = je;
        oldEntry = match;
        break;
      }
    }
    
    if (changedEntry) {
      try {
        const token = localStorage.getItem("apex_access_token");
        const response = await fetch(`/api/v1/accounting/journal-entries/${encodeURIComponent(changedEntry.id)}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            ...changedEntry,
            version: oldEntry.version || 1
          })
        });
        
        const resData = await response.json();
        
        if (!response.ok || !resData.success) {
          if (response.status === 409 || resData.error === "CONCURRENT_WRITE_CONFLICT") {
            setConflictModal({
              show: true,
              title: "تعارض في الكتابة المتزامنة (القيود اليومية)",
              message: `تعذر تعديل القيد [${changedEntry.id}] بسبب تعارض في الكتابة المتزامنة.`,
              onReload: () => reloadDbState()
            });
            return;
          }
          throw new Error(resData.error || "Failed to update journal entry");
        }
        
        changedEntry.version = (oldEntry.version || 1) + 1;
      } catch (err) {
        console.error("Optimistic lock update failed:", err);
      }
    }
    
    setJournalEntries(nextEntries);
  };

  // Loading Indicator for initial Server DB fetch
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Sync state login/logout listener
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener("apex_unauthorized", handleUnauthorized);
    return () => window.removeEventListener("apex_unauthorized", handleUnauthorized);
  }, []);

  // 1. Load entire database state on boot or company switch with exponential backoff retries
  const loadDatabaseState = (retryCount = 0) => {
    if (!user) {
      setIsLoadingDB(false);
      return;
    }
    setIsLoadingDB(true);
    setDbError(null);
    
    const companiesList = (config as any).companiesList || [
      { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
      { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
      { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
    ];
    const activeCompanyObj = companiesList.find((c: any) => (c.value === config.company || c.name === config.company)) || companiesList[0];
    const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "TEN-APEX-01";

    const token = localStorage.getItem("apex_access_token");
    fetch(`/api/erp/state?tenantId=${activeCompanyId}`, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      }
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("apex_access_token");
          localStorage.removeItem("apex_refresh_token");
          localStorage.removeItem("apex_user");
          setUser(null);
          throw new Error("Session expired or unauthorized");
        }
        if (!res.ok) throw new Error("Could not fetch state");
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.accounts) setAccounts(data.accounts);
          if (data.employees) setEmployees(data.employees);
          if (data.stock) setStock(data.stock);
          if (data.costCenters) setCostCenters(data.costCenters);
          if (data.profitCenters) setProfitCenters(data.profitCenters);
          if (data.boms) setBoms(data.boms);
          if (data.journalEntries) setJournalEntries(data.journalEntries);
          if (data.productionOrders) setProductionOrders(data.productionOrders);
          if (data.customers) setCustomers(data.customers);
          if (data.suppliers) setSuppliers(data.suppliers);
          if (data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices);
          if (data.salesInvoices) setSalesInvoices(data.salesInvoices);
          if (data.cheques) setCheques(data.cheques);
          if (data.warehouses) setWarehouses(data.warehouses);
          if (data.config) {
            setConfig(prev => ({
              ...data.config,
              companiesList: (prev as any).companiesList || data.config.companiesList,
              branchesList: (prev as any).branchesList || data.config.branchesList,
              warehousesList: (prev as any).warehousesList || data.config.warehousesList,
              company: prev.company,
              branch: prev.branch,
              warehouse: prev.warehouse,
              theme: prev.theme,
              mode: prev.mode
            }));
          }
        }
        setIsLoadingDB(false);
      })
      .catch((err) => {
        if (err.message === "Session expired or unauthorized") {
          console.warn("Session expired or unauthorized. Redirecting to login.");
          setIsLoadingDB(false);
          return;
        }
        console.error("Server DB loading failed:", err);
        if (retryCount < 3) {
          console.log(`Retrying state fetch... Attempt ${retryCount + 1}`);
          setTimeout(() => loadDatabaseState(retryCount + 1), 1000 * Math.pow(2, retryCount));
        } else {
          setDbError("فشل تحميل قاعدة البيانات السحابية بالكامل. يرجى التحقق من الاتصال بالشبكة.");
          setIsLoadingDB(false);
        }
      });
  };

  useEffect(() => {
    loadDatabaseState();
  }, [user, config.company]);

  // 2. Automated Save state effect to sync all states to server database
  useEffect(() => {
    if (isLoadingDB || !user) return;

    const fullState = {
      accounts,
      employees,
      stock,
      costCenters,
      profitCenters,
      boms,
      journalEntries,
      productionOrders,
      customers,
      suppliers,
      purchaseInvoices,
      salesInvoices,
      cheques,
      config
    };

    const companiesList = (config as any).companiesList || [
      { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
      { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
      { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
    ];
    const activeCompanyObj = companiesList.find((c: any) => (c.value === config.company || c.name === config.company)) || companiesList[0];
    const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "TEN-APEX-01";

    const token = localStorage.getItem("apex_access_token");
    fetch(`/api/erp/state?tenantId=${activeCompanyId}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify(fullState)
    }).catch((err) => console.error("Could not sync state to server:", err));
  }, [
    accounts,
    employees,
    stock,
    costCenters,
    profitCenters,
    boms,
    journalEntries,
    productionOrders,
    customers,
    suppliers,
    purchaseInvoices,
    salesInvoices,
    cheques,
    config.company,
    isLoadingDB,
    user
  ]);

  const handleLogout = () => {
    localStorage.removeItem("apex_access_token");
    localStorage.removeItem("apex_refresh_token");
    localStorage.removeItem("apex_user");
    setUser(null);
  };

  // Navigation States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isFactoryMode, setIsFactoryMode] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Render proper ERP view
  const renderView = () => {
    if (isFactoryMode) {
      return <ArchitectTerminal />;
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <BIDashboard 
            accounts={accounts}
            stock={stock}
            employees={employees}
            costCenters={costCenters}
            profitCenters={profitCenters}
            customers={customers}
            suppliers={suppliers}
            config={config}
          />
        );
      case "accounting":
        return (
          <AccountingModule 
            accounts={accounts}
            setAccounts={setAccounts}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntriesWithOptimisticLock}
            costCenters={costCenters}
            setCostCenters={setCostCenters}
            profitCenters={profitCenters}
            setProfitCenters={setProfitCenters}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
            stock={stock}
            setStock={setStockWithOptimisticLock}
            cheques={cheques}
            setCheques={setChequesWithOptimisticLock}
            config={config}
          />
        );
      case "financial-analysis":
        return (
          <FinancialAnalysisModule
            config={config}
            themeClasses={clr}
          />
        );
      case "inventory":
        return (
          <InventoryModule 
            stock={stock}
            setStock={setStockWithOptimisticLock}
            warehouses={warehouses}
            accounts={accounts}
            setAccounts={setAccounts}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntriesWithOptimisticLock}
            config={config}
            salesInvoices={salesInvoices}
            purchaseInvoices={purchaseInvoices}
          />
        );
      case "hr":
        return (
          <HRModule 
            employees={employees}
            setEmployees={setEmployees}
            accounts={accounts}
            setAccounts={setAccounts}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntries}
            config={config}
          />
        );
      case "manufacturing":
        return (
          <ManufacturingModule 
            boms={boms}
            setBoms={setBoms}
            productionOrders={productionOrders}
            setProductionOrders={setProductionOrders}
            stock={stock}
            setStock={setStock}
            accounts={accounts}
            setAccounts={setAccounts}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntries}
            config={config}
          />
        );
      case "pos":
        return (
          <POSModule 
            stock={stock}
            setStock={setStock}
            accounts={accounts}
            setAccounts={setAccounts}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntries}
            config={config}
          />
        );
      case "reports-engine":
        return (
          <ReportsEngine
            accounts={accounts}
            journalEntries={journalEntries}
            stock={stock}
            employees={employees}
            customers={customers}
            suppliers={suppliers}
            purchaseInvoices={purchaseInvoices}
            salesInvoices={salesInvoices}
            productionOrders={productionOrders}
            cheques={cheques}
            config={config}
          />
        );
      case "e-invoicing":
        return (
          <EInvoicingModule
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
            config={config}
          />
        );
      case "sales-procurement":
        return (
          <SalesProcurementModule
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            stock={stock}
            setStock={setStock}
            accounts={accounts}
            setAccounts={setAccounts}
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            config={config}
          />
        );
      case "security":
        return (
          <SecurityModule
            config={config}
            setConfig={setConfig}
            accounts={accounts}
            setAccounts={setAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            stock={stock}
            setStock={setStock}
          />
        );
      case "onboarding":
        return (
          <OnboardingModule
            config={config}
            setConfig={setConfig}
            accounts={accounts}
            setAccounts={setAccounts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            customers={customers}
            setCustomers={setCustomers}
            stock={stock}
            setStock={setStock}
          />
        );
      case "import-export":
        return (
          <ImportExportModule
            config={config}
            accounts={accounts}
            setAccounts={setAccounts}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            stock={stock}
            setStock={setStock}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntries}
            employees={employees}
            setEmployees={setEmployees}
            purchaseInvoices={purchaseInvoices}
            setPurchaseInvoices={setPurchaseInvoices}
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
          />
        );
      case "crm":
        return (
          <CRMModule
            config={config}
            customers={customers}
            setCustomers={setCustomers}
          />
        );
      case "document-management":
        return (
          <DocManagerModule
            config={config}
          />
        );
      case "workflow":
        return (
          <WorkflowModule
            config={config}
            journalEntries={journalEntries}
            setJournalEntries={setJournalEntriesWithOptimisticLock}
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
          />
        );
      default:
        return <div>Module loading error.</div>;
    }
  };

  if (!user) {
    const handleLogin = async (username: string, password: string) => {
      setIsLoggingIn(true);
      setLoginError("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("apex_access_token", data.data.accessToken);
          localStorage.setItem("apex_refresh_token", data.data.refreshToken);
          localStorage.setItem("apex_user", JSON.stringify(data.data.user));
          setUser(data.data.user);
        } else {
          setLoginError(data.error?.message || "خطأ في تسجيل الدخول. يرجى التحقق من اسم المستخدم وكلمة المرور.");
        }
      } catch (err) {
        setLoginError("فشل الاتصال بالخادم الرئيسي.");
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 font-sans selection:bg-[#10b981]/30 ${getModernBg(config.theme, config.mode)}`} dir="rtl">
        <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-fadeIn">
          {/* Decorative glowing gradient circle */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 mb-4 animate-bounce">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">ApexSaaS ERP</h1>
            <p className="text-xs text-slate-400">بوابة الدخول الموحدة للمؤسسات والشركات التابعة</p>
          </div>

          {/* Quick Pre-fill / DEMO Accounts Panel */}
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>تسجيل الدخول السريع (صلاحيات دقيقة - RBAC)</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => handleLogin("ahlam", "CFOPassword2026!")}
                disabled={isLoggingIn}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-right text-xs text-slate-300 hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col items-start gap-0.5"
              >
                <span className="font-bold text-slate-200">أحلام سلطان</span>
                <span className="text-[10px] text-slate-500 text-left w-full">المدير المالي (CFO)</span>
              </button>
              <button 
                type="button"
                onClick={() => handleLogin("admin", "AdminPassword2026!")}
                disabled={isLoggingIn}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left text-xs text-slate-300 hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col items-start gap-0.5"
              >
                <span className="font-bold text-slate-200">أحمد خضر</span>
                <span className="text-[10px] text-slate-500 text-left w-full">مدير النظام (Admin)</span>
              </button>
            </div>
          </div>

          {/* Normal Login Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const u = (form.elements.namedItem("username") as HTMLInputElement).value;
            const p = (form.elements.namedItem("password") as HTMLInputElement).value;
            handleLogin(u, p);
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">اسم المستخدم</label>
              <input 
                name="username"
                type="text"
                required
                placeholder="مثال: ahlam أو admin"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all text-left font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">كلمة المرور</label>
              <input 
                name="password"
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all text-left font-mono"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/30 text-rose-400 rounded-lg text-xs text-center leading-relaxed">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              ) : "تسجيل الدخول للنظام"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center border-t border-slate-900 pt-6">
            <span className="text-[10px] text-slate-600 font-mono">CONFIDENTIAL // APEX SAAS MULTI-TENANT v1.0.0</span>
          </div>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 font-sans ${getModernBg(config.theme, config.mode)}`} dir="rtl">
        <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-display">◀ فشل مزامنة البيانات السحابية</h2>
          <p className="text-xs text-rose-400 leading-relaxed bg-rose-950/20 p-3.5 rounded-lg border border-rose-500/10 font-mono">
            {dbError}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            انقطع الاتصال بالخادم المالي الرئيسي أو لم نتمكن من ترخيص طلب الخدمة مؤقتاً. يرجى إعادة المحاولة.
          </p>
          <button
            onClick={() => loadDatabaseState()}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-2 font-sans"
          >
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> إعادة المحاولة الفورية
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingDB) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 font-sans ${getModernBg(config.theme, config.mode)}`} dir="rtl">
        <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 animate-spin">
            <RefreshCw className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-display">◀ تهيئة الاتصال السحابي الحي</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            جاري استعلام وتهيئة موارد النظام المالي متعدد المستأجرين من خادم السحاب الموحد. يرجى الانتظار...
          </p>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-pulse rounded-full" style={{ width: "65%" }} />
          </div>
        </div>
      </div>
    );
  }

  const isLight = config.mode === "light";
  const appBgClass = getModernBg(config.theme, config.mode);

  return (
    <div 
      className={`flex h-screen w-screen overflow-hidden ${
        isLight ? "light-mode bg-[#f8fafc] text-slate-800" : `${appBgClass} text-slate-100`
      } font-sans select-none`} 
      id="erp-app-wrapper" 
      dir="rtl"
    >
      
      {/* 1. Left Navigation Sidebar */}
      {isSidebarOpen && (
        <Sidebar 
          config={config}
          setConfig={setConfig}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isFactoryMode={isFactoryMode}
          setIsFactoryMode={setIsFactoryMode}
        />
      )}

      {/* 2. Central Content Space */}
      <main 
        className={`flex-1 flex flex-col min-w-0 ${
          isLight ? "bg-[#f8fafc]" : appBgClass
        } relative overflow-hidden text-right`} 
        id="erp-main-stage"
      >
        
        {/* Top Header Utility Rail */}
        <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between shrink-0 bg-[#0c1222]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 text-xs font-sans">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center mr-1"
              title={isSidebarOpen ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <span className="text-slate-500">سياق العمل:</span>
            <span className="font-bold text-slate-300">
              {config.company === "Apex Levant Corp" 
                ? "شركة قمة الشام والرافدين المحدودة" 
                : config.company === "Apex Gulf International" 
                ? "شركة قمة الخليج الدولية" 
                : config.company === "Apex Africa Distribution" 
                ? "مؤسسة قمة أفريقيا للتوزيع والاستيراد" 
                : config.company}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">
              {config.branch === "Cairo Headquarters" 
                ? "الإدارة العامة بالقاهرة (شيراتون)" 
                : config.branch === "Alex Port Gateway" 
                ? "مكتب ميناء الإسكندرية اللوجستي" 
                : config.branch === "Dubai JAFZA Branch" 
                ? "مكتب جافزا دبي الإقليمي" 
                : config.branch === "all"
                ? "كافة الفروع"
                : config.branch}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">
              {config.warehouse === "all"
                ? "كافة المخازن"
                : config.warehouse === "WH-CAI-01"
                ? "مستودع القاهرة المركزي الرئيسي"
                : config.warehouse === "WH-ALX-02"
                ? "محطة الإسكندرية اللوجستية"
                : config.warehouse === "WH-DXB-03"
                ? "مركز جافزا دبي الدولي"
                : config.warehouse}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats indicator */}
            <div className="hidden md:flex items-center gap-5 text-[11px] font-sans text-slate-400 border-l border-slate-800 pl-5">
              <div>
                رصيد البنك الإجمالي: <strong className={clr.text}>{(accounts[0]?.balance ?? 0).toLocaleString()} {config.currency}</strong>
              </div>
              <div>
                إجمالي قطع المخزن: <strong className="text-cyan-400">{stock.reduce((sum, s) => sum + s.quantity, 0)} وحدة</strong>
              </div>
            </div>

            {/* Logged in User Badge & Sign Out */}
            {user && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                <div className="flex flex-col items-end text-xs">
                  <span className="font-bold text-slate-200">{user.name}</span>
                  <span className={`text-[10px] font-sans ${user.role === "Admin" ? "text-indigo-400" : "text-emerald-400"}`}>
                    {user.role === "Admin" ? "مدير النظام (Admin)" : "المدير المالي (CFO)"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-950/40 rounded-md transition-all cursor-pointer font-sans"
                  title="تسجيل الخروج"
                >
                  خروج
                </button>
              </div>
            )}

            {/* Light / Dark Mode Toggle Selector */}
            <button
              onClick={() => setConfig({ ...config, mode: config.mode === "light" ? "dark" : "light" })}
              className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
              title={config.mode === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع المضيء"}
            >
              {config.mode === "light" ? (
                <Moon className="h-4.5 w-4.5 text-indigo-500" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-yellow-400" />
              )}
            </button>

            {/* AI Floating Trigger inside header */}
            <button
              onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 transition-all shadow-md ${
                isAiDrawerOpen 
                  ? `${clr.accent} text-slate-950 shadow-${config.theme}-500/10` 
                  : `bg-[#141b2d] hover:bg-[#1b253d] ${clr.text} border ${clr.border}`
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>{isAiDrawerOpen ? "إغلاق المستشار الذكي" : "استدعاء المستشار الذكي"}</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Panel Stage */}
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto" dir="rtl">
          {renderView()}
        </div>
      </main>

      {/* 3. Sliding AI Consultant Panel */}
      {isAiDrawerOpen && (
        <div 
          className="w-96 border-r border-slate-800/80 h-full shrink-0 flex flex-col bg-[#0b0f19] animate-slideIn" 
          id="docked-ai-panel"
        >
          <div className="flex-1 overflow-y-auto p-4">
            <AIAssistant 
              config={config}
              accounts={accounts}
              stock={stock}
              employees={employees}
              journalEntries={journalEntries}
            />
          </div>
        </div>
      )}

      {/* 4. Concurrency Warning Modal */}
      {conflictModal && conflictModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" id="concurrency-conflict-modal">
          <div className="w-full max-w-md bg-[#111625] border border-red-500/30 rounded-xl shadow-2xl p-6 text-right" dir="rtl">
            <div className="flex items-center space-x-3 space-x-reverse mb-4 text-red-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold font-sans tracking-tight text-red-400">{conflictModal.title}</h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {conflictModal.message}
            </p>
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  conflictModal.onReload();
                  setConflictModal(null);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-all shadow-md shadow-red-900/30"
              >
                تحديث البيانات وحل التعارض
              </button>
              <button
                onClick={() => setConflictModal(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

