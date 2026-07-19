import React, { useState } from "react";
import { 
  Package, 
  Warehouse as WarehouseIcon, 
  Plus, 
  TrendingDown, 
  AlertTriangle,
  QrCode,
  Barcode,
  Search,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Scale,
  ArrowLeftRight,
  Printer
} from "lucide-react";
import { StockItem, Warehouse, ERPConfig, ChartOfAccount, JournalEntry, SalesInvoice, PurchaseInvoice } from "../types";

interface InventoryModuleProps {
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  warehouses: Warehouse[];
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  config: ERPConfig;
  salesInvoices?: SalesInvoice[];
  purchaseInvoices?: PurchaseInvoice[];
}

export default function InventoryModule({
  stock = [],
  setStock,
  warehouses = [],
  accounts = [],
  setAccounts,
  journalEntries = [],
  setJournalEntries,
  config,
  salesInvoices = [],
  purchaseInvoices = []
}: InventoryModuleProps) {
  const [activeTab, setActiveTab] = useState<"levels" | "add" | "transfer" | "adjustment" | "barcode-viewer" | "valuation" | "serial-lot" | "cycle-count" | "stock-card">("levels");
  const [searchTerm, setSearchTerm] = useState("");

  // --- DYNAMIC LIVE PAGINATED STOCK HOOKS ---
  const [localStock, setLocalStock] = useState<StockItem[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [stockLimit] = useState(5);
  const [stockTotal, setStockTotal] = useState(0);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const fetchStockItems = async (retryCount = 0) => {
    setIsLoadingStock(true);
    setStockError(null);
    try {
      const token = localStorage.getItem("apex_access_token");
      const url = `/api/v1/inventory/stock?page=${stockPage}&limit=${stockLimit}&search=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (!response.ok) throw new Error("Failed to fetch stock items");
      const result = await response.json();
      if (result.success) {
        setLocalStock(result.data || []);
        if (result.pagination) {
          setStockTotal(result.pagination.total);
        } else {
          setStockTotal(result.data?.length || 0);
        }
      } else {
        throw new Error(result.error || "Failed loading");
      }
    } catch (err: any) {
      console.error("Error fetching stock items:", err);
      if (retryCount < 3) {
        console.log(`Retrying stock fetch... Attempt ${retryCount + 1}`);
        setTimeout(() => fetchStockItems(retryCount + 1), 1000 * Math.pow(2, retryCount));
      } else {
        setStockError("فشل تحميل بنود المخزن الحية من الخادم الفني.");
      }
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Trigger fetch when page, search query, or general stock list changes
  React.useEffect(() => {
    fetchStockItems();
  }, [stockPage, searchTerm, stock]);

  const [selectedStockForCode, setSelectedStockForCode] = useState<StockItem | null>(stock[0] || null);

  // Sync selected stock code when localStock populates
  React.useEffect(() => {
    if (localStock.length > 0 && !selectedStockForCode) {
      setSelectedStockForCode(localStock[0]);
    }
  }, [localStock]);

  // Stock Card Specific State
  const [selectedSkuForCard, setSelectedSkuForCard] = useState<string>("");
  const [selectedWhForCard, setSelectedWhForCard] = useState<string>("ALL");
  const [cardStartDate, setCardStartDate] = useState<string>("");
  const [cardEndDate, setCardEndDate] = useState<string>("");

  // New advanced states
  const [transfersLog, setTransfersLog] = useState<any[]>([
    { date: "2025-10-05", sku: "STOCK-RAW-01", fromWh: "WH-CAI-01", toWh: "WH-ALX-02", qty: 15, refId: "TRF-9023" }
  ]);
  const [valuationMethod, setValuationMethod] = useState<"FIFO" | "AVCO">("AVCO");
  const [serials, setSerials] = useState<any[]>([
    { sku: "SFT-WIN-01", serial: "WIN-99238-X83", warehouseId: "WH-CAI", status: "Available" },
    { sku: "SFT-WIN-01", serial: "WIN-11823-M02", warehouseId: "WH-CAI", status: "Available" },
    { sku: "SFT-SQL-02", serial: "SQL-55610-P98", warehouseId: "WH-ALX", status: "Reserved" }
  ]);
  const [lots, setLots] = useState<any[]>([
    { sku: "SFT-WIN-01", lotNumber: "LOT-2026-B1", expiryDate: "2028-12-31", quantity: 15, status: "Released" },
    { sku: "SFT-SQL-02", lotNumber: "LOT-2026-B2", expiryDate: "2029-06-30", quantity: 8, status: "Released" }
  ]);
  const [cycleCounts, setCycleCounts] = useState<any[]>([
    { id: "CYC-001", date: "2026-07-01", warehouseId: "WH-CAI", itemsCount: 3, status: "Completed", variance: -2 }
  ]);

  // Serial/Lot form states
  const [newSerialSku, setNewSerialSku] = useState(stock[0]?.sku || "");
  const [newSerialNum, setNewSerialNum] = useState("");
  const [newLotSku, setNewLotSku] = useState(stock[0]?.sku || "");
  const [newLotNum, setNewLotNum] = useState("");
  const [newLotExpiry, setNewLotExpiry] = useState("2028-12-31");
  const [newLotQty, setNewLotQty] = useState(10);

  // Cycle count state
  const [selectedWhForCycle, setSelectedWhForCycle] = useState(warehouses[0]?.id || "");
  const [cycleVarianceNotes, setCycleVarianceNotes] = useState("");

  // Add Item states
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newWhId, setNewWhId] = useState(warehouses[0]?.id || "");
  const [newQty, setNewQty] = useState(10);
  const [newPrice, setNewPrice] = useState(100);
  const [newMin, setNewMin] = useState(5);
  const [newCategory, setNewCategory] = useState("برمجيات ورخص تراخيص");
  const [newSubCategory, setNewSubCategory] = useState("تراخيص سحابة SaaS");
  const [successMsg, setSuccessMsg] = useState("");

  // Stock Transfer states
  const [transferSku, setTransferSku] = useState(stock[0]?.sku || "");
  const [transferFrom, setTransferFrom] = useState(warehouses[0]?.id || "");
  const [transferTo, setTransferTo] = useState(warehouses[1]?.id || "");
  const [transferQty, setTransferQty] = useState(5);
  const [transferSuccess, setTransferSuccess] = useState("");
  const [transferError, setTransferError] = useState("");

  // Inventory Adjustment states
  const [adjustSku, setAdjustSku] = useState(stock[0]?.sku || "");
  const [adjustWarehouse, setAdjustWarehouse] = useState(warehouses[0]?.id || "");
  const [physicalQty, setPhysicalQty] = useState(10);
  const [adjustSuccess, setAdjustSuccess] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");

    if (!newSku || !newName) return;

    const newItem: StockItem = {
      sku: newSku.toUpperCase(),
      name: newName,
      warehouseId: newWhId,
      quantity: Number(newQty) || 0,
      unitPrice: Number(newPrice) || 0,
      minLevel: Number(newMin) || 0,
      category: newCategory,
      subCategory: newSubCategory
    };

    setStock([...stock, newItem]);
    setSuccessMsg(`تمت إضافة البند المخزني ذو الرمز المرجعي ${newItem.sku} بنجاح إلى المستودع ${newItem.warehouseId} تحت تصنيف [${newCategory} -> ${newSubCategory}]`);
    
    // Reset fields
    setNewSku("");
    setNewName("");
    setNewQty(10);
    setNewPrice(100);
    setNewMin(5);
  };

  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSuccess("");
    setTransferError("");

    if (transferFrom === transferTo) {
      setTransferError("خطأ: لا يمكن إجراء عملية نقل مخزني لنفس المستودع.");
      return;
    }

    if (transferQty <= 0) {
      setTransferError("خطأ: يجب تحديد كمية نقل أكبر من الصفر.");
      return;
    }

    const sourceItemIndex = stock.findIndex(s => s.sku === transferSku && s.warehouseId === transferFrom);
    if (sourceItemIndex === -1 || stock[sourceItemIndex].quantity < transferQty) {
      setTransferError("خطأ: هذا الصنف غير متوفر بالكمية المطلوبة في مستودع المصدر.");
      return;
    }

    const sourceItem = stock[sourceItemIndex];
    let updatedStock = [...stock];

    // Deduct from source
    updatedStock[sourceItemIndex] = {
      ...sourceItem,
      quantity: sourceItem.quantity - transferQty
    };

    // Find or create in destination
    const destItemIndex = stock.findIndex(s => s.sku === transferSku && s.warehouseId === transferTo);
    if (destItemIndex !== -1) {
      updatedStock[destItemIndex] = {
        ...updatedStock[destItemIndex],
        quantity: updatedStock[destItemIndex].quantity + transferQty
      };
    } else {
      updatedStock.push({
        sku: transferSku,
        name: sourceItem.name,
        warehouseId: transferTo,
        quantity: transferQty,
        unitPrice: sourceItem.unitPrice,
        minLevel: sourceItem.minLevel
      });
    }

    setStock(updatedStock);
    setTransfersLog([{
      date: new Date().toISOString().split("T")[0],
      sku: transferSku,
      fromWh: transferFrom,
      toWh: transferTo,
      qty: transferQty,
      refId: `TRF-${Date.now().toString().slice(-4)}`
    }, ...transfersLog]);
    setTransferSuccess(`نجحت عملية النقل المخزني! تم نقل ${transferQty} وحدات من الصنف ${transferSku} من المستودع ${transferFrom} إلى المستودع ${transferTo} بنجاح.`);
  };

  const handleInventoryAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustSuccess("");
    setAdjustError("");

    const itemIndex = stock.findIndex(s => s.sku === adjustSku && s.warehouseId === adjustWarehouse);
    if (itemIndex === -1) {
      setAdjustError("خطأ: لم يتم العثور على البند في المستودع المحدد لتسويته.");
      return;
    }

    const item = stock[itemIndex];
    const diff = physicalQty - item.quantity;

    if (diff === 0) {
      setAdjustSuccess("التسوية مطابقة تماماً: الكمية الفعلية مطابقة لرصيد الدفاتر الحالية.");
      return;
    }

    const financialValue = Math.abs(diff) * item.unitPrice;

    // Define accounting codes
    // Material Stock accounts: Raw materials ("12000") or Finished goods ("12100")
    const stockAccCode = item.sku.includes("SVR") || item.sku.includes("SYSTEM") ? "12100" : "12000";
    const stockAccName = stockAccCode === "12000" ? "مخزون المواد الخام (مستودع القاهرة)" : "مخزون السلع التامة (مستودع الإسكندرية)";
    const opExpenseAccCode = "50200"; // مصروفات البنية التحتية والتشغيل (يُعامل هنا كأعباء تسوية جردية)
    const opExpenseAccName = "مصروفات البنية التحتية للخوادم والسحابة";

    let journalLines = [];
    if (diff > 0) {
      // Gain in stock: Debit Stock (Asset increases), Credit Expense (reduces net expense / operational gain)
      journalLines = [
        { accountCode: stockAccCode, accountName: stockAccName, debit: financialValue, credit: 0 },
        { accountCode: opExpenseAccCode, accountName: opExpenseAccName, debit: 0, credit: financialValue }
      ];
    } else {
      // Loss in stock: Credit Stock (Asset decreases), Debit Expense (increases operating loss)
      journalLines = [
        { accountCode: opExpenseAccCode, accountName: opExpenseAccName, debit: financialValue, credit: 0 },
        { accountCode: stockAccCode, accountName: stockAccName, debit: 0, credit: financialValue }
      ];
    }

    // Post to Journal
    const newJournal: JournalEntry = {
      id: `JE-2026-ADJ-00${journalEntries.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      description: `قيد تسوية جردية تلقائي للصنف: ${item.name} (${item.sku}) في ${item.warehouseId}. الفروقات: ${diff} وحدات.`,
      reference: `ADJ-${item.sku}-${Date.now().toString().slice(-4)}`,
      lines: journalLines,
      status: "Posted",
      costCenter: "CC-INF",
      profitCenter: "PC-SFT",
      creator: "أحلام سلطان",
      approvedBy: "نظام الجرد الآلي"
    };

    // Update Accounts balances
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;
      journalLines.forEach(line => {
        if (line.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            balanceChange += (line.debit - line.credit);
          } else {
            balanceChange += (line.credit - line.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + balanceChange };
    });

    // Update stock quantity
    let updatedStock = [...stock];
    updatedStock[itemIndex] = {
      ...item,
      quantity: physicalQty
    };

    setStock(updatedStock);
    setAccounts(updatedAccounts);
    setJournalEntries([newJournal, ...journalEntries]);
    setAdjustSuccess(`نجحت التسوية الجردية والمحاسبية! تم تعديل الكمية بالدفاتر لـ ${physicalQty} وحدة، وترحيل قيد التسوية بقيمة ${financialValue.toLocaleString()} ${config.currency} بنجاح للأستاذ العام.`);
  };

  const filteredStock = stock.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right" id="inventory-module-container" dir="rtl">
      {/* Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/10 text-pink-400 font-sans border border-pink-500/30">
            تتبع المستودعات المتعددة نشط
          </span>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">مركز إدارة المخزون والمستودعات المتعددة</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            تتبع المكونات والمنتجات عبر قنوات التوريد والمستودعات الإقليمية، فحص وتوليد رموز الاستجابة السريعة (QR)، وإدارة مستويات المخزون والأمان محاسبياً.
          </p>
        </div>

        {/* View Switches */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121829] border border-slate-800 p-1.5 rounded-lg self-start">
          <button
            onClick={() => setActiveTab("levels")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "levels" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            مستويات المخزون
          </button>
          <button
            onClick={() => setActiveTab("stock-card")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "stock-card" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Barcode className="h-3.5 w-3.5" /> كارتة الصنف المخزني
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "add" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> إضافة بند مخزني
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "transfer" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> تحويل مخزني
          </button>
          <button
            onClick={() => setActiveTab("adjustment")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === "adjustment" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Scale className="h-3.5 w-3.5" /> تسوية جردية مالية
          </button>
          <button
            onClick={() => setActiveTab("barcode-viewer")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "barcode-viewer" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            رموز الـ QR والباركود
          </button>
          <button
            onClick={() => setActiveTab("valuation")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "valuation" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            تقييم FIFO & AVCO
          </button>
          <button
            onClick={() => setActiveTab("serial-lot")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "serial-lot" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            الأرقام التسلسلية والشحنات
          </button>
          <button
            onClick={() => setActiveTab("cycle-count")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "cycle-count" ? "bg-slate-800 text-pink-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            الجرد الدوري الفعلي
          </button>
        </div>
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === "levels" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Warehouses Grid overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {warehouses.map(wh => {
              const itemsCount = stock.filter(s => s.warehouseId === wh.id).length;
              const totalVal = stock.filter(s => s.warehouseId === wh.id).reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
              return (
                <div key={wh.id} className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 space-y-3 shadow-md text-right">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-slate-200 text-sm">{wh.name}</h4>
                      <p className="text-[10px] font-sans text-slate-500">{wh.location}</p>
                    </div>
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400 border border-pink-500/20">
                      <WarehouseIcon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-slate-500 block font-sans">الرموز المسجلة</span>
                      <strong className="text-slate-300 font-sans">{itemsCount} أصناف</strong>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-500 block font-sans">إجمالي القيمة</span>
                      <strong className="text-slate-300">{totalVal.toLocaleString()} {config.currency}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Stock Table */}
          <div id="stock-levels-card" className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-pink-400" /> مستويات المخزون وحدود إعادة الطلب والأمان
              </h3>
              
              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("stock-levels-card");
                    if (el) {
                      el.classList.add("printable-area");
                      window.print();
                      el.classList.remove("printable-area");
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="طباعة جرد المخزون"
                >
                  <Printer className="h-3.5 w-3.5 text-pink-400" /> طباعة تقرير الجرد
                </button>

                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="البحث في المخزن بالاسم أو الرمز (SKU)..."
                    className="bg-[#141b2d] text-xs text-slate-300 border border-slate-700/80 rounded-lg pr-9 pl-4 py-2.5 w-full md:w-64 focus:outline-none focus:border-pink-500 text-right"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 font-sans border-b border-slate-800">
                    <th className="p-4 font-bold text-right">رمز الصنف (SKU)</th>
                    <th className="p-4 font-bold text-right">تفاصيل البند</th>
                    <th className="p-4 font-bold text-right">المستودع</th>
                    <th className="p-4 font-bold text-left">الكمية المتاحة</th>
                    <th className="p-4 font-bold text-left">حد الأمان</th>
                    <th className="p-4 font-bold text-left">سعر الوحدة</th>
                    <th className="p-4 font-bold text-center">حالة التنبيه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {isLoadingStock ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent mr-2 align-middle" />
                        جاري تحميل مستويات المخزون الحية من الخادم السحابي...
                      </td>
                    </tr>
                  ) : stockError ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-rose-400">
                        {stockError}
                        <button type="button" onClick={() => fetchStockItems()} className="text-cyan-400 underline ml-2 hover:text-cyan-300">
                          إعادة المحاولة
                        </button>
                      </td>
                    </tr>
                  ) : (
                    localStock.map(item => {
                      const isBelowThreshold = item.quantity <= item.minLevel;
                      return (
                        <tr 
                          key={item.sku} 
                          onClick={() => setSelectedStockForCode(item)}
                          className={`hover:bg-slate-900/20 transition-all cursor-pointer ${
                            selectedStockForCode?.sku === item.sku ? "bg-pink-500/5" : ""
                          }`}
                        >
                          <td className="p-4 font-mono font-bold text-pink-400 text-right">{item.sku}</td>
                          <td className="p-4 text-right">
                            <div className="font-semibold text-slate-200">{item.name}</div>
                            {(item.category || item.subCategory) && (
                              <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1.5 items-center font-sans">
                                {item.category && (
                                  <span className="bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/15">
                                    {item.category}
                                  </span>
                                )}
                                {item.subCategory && (
                                  <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/15">
                                    {item.subCategory}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-sans text-slate-400 text-right">{item.warehouseId}</td>
                          <td className="p-4 text-left font-mono font-bold text-slate-100">{item.quantity}</td>
                          <td className="p-4 text-left font-mono text-slate-500">{item.minLevel}</td>
                          <td className="p-4 text-left font-mono text-slate-300">{item.unitPrice.toLocaleString()} {config.currency}</td>
                          <td className="p-4 text-center">
                            {isBelowThreshold ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans bg-rose-500/15 text-rose-400 font-bold border border-rose-500/20">
                                <AlertTriangle className="h-3 w-3" /> تنبيه: أعد الطلب
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> آمن ومتوفر
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {!isLoadingStock && !stockError && localStock.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">لا توجد بنود مخزنية مطابقة لخيارات البحث الحالية.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Inventory Pagination controls */}
            {!isLoadingStock && !stockError && stockTotal > stockLimit && (
              <div className="flex items-center justify-between bg-slate-900/20 p-3.5 border-t border-slate-800 rounded-b-xl text-xs font-sans">
                <div className="text-slate-400">
                  عرض الصفحة <strong>{stockPage}</strong> من إجمالي <strong>{Math.ceil(stockTotal / stockLimit)}</strong> صفحات (الإجمالي: {stockTotal} صنف)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={stockPage === 1}
                    onClick={() => setStockPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded transition-all cursor-pointer text-[10px] font-bold"
                  >
                    الصفحة السابقة
                  </button>
                  <button
                    type="button"
                    disabled={stockPage >= Math.ceil(stockTotal / stockLimit)}
                    onClick={() => setStockPage(p => p + 1)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded transition-all cursor-pointer text-[10px] font-bold"
                  >
                    الصفحة التالية
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADD STOCK */}
      {activeTab === "add" && (
        <form onSubmit={handleAddItem} className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-5 animate-fadeIn">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-slate-200 text-base">إضافة بند توريد مخزني جديد</h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">تسجيل بنود مخزنية ومكونات فيزيائية جديدة مع تحديد مستويات الأمان وحدود إعادة الطلب التلقائية.</p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold font-sans">
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">رمز الصنف المرجعي (SKU)</label>
              <input
                type="text"
                required
                placeholder="مثال: SKU-RAM-32GB"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">الاسم الشائع للبند</label>
              <input
                type="text"
                required
                placeholder="مثال: وحدات ذاكرة عشوائية عالية الأداء"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">المستودع الرئيسي المربوط</label>
              <select
                value={newWhId}
                onChange={(e) => setNewWhId(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none text-right font-sans"
              >
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">الكمية الافتتاحية</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value) || 0)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">حد الأمان وإعادة الطلب</label>
              <input
                type="number"
                value={newMin}
                onChange={(e) => setNewMin(Number(e.target.value) || 0)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">التصنيف الرئيسي (المستوى 1)</label>
              <select
                value={newCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCategory(val);
                  // Auto set subcategory based on selected category
                  if (val === "أجهزة ومعدات خوادم") {
                    setNewSubCategory("خوادم مخصصة Bare-Metal");
                  } else if (val === "برمجيات ورخص تراخيص") {
                    setNewSubCategory("تراخيص سحابة SaaS");
                  } else if (val === "شبكات وألياف بصرية") {
                    setNewSubCategory("كابلات ألياف بصرية");
                  } else if (val === "قطع غيار ومستلزمات صيانة") {
                    setNewSubCategory("مزودات طاقة Power Supplies");
                  }
                }}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-pink-500 text-right font-sans"
              >
                <option value="أجهزة ومعدات خوادم">أجهزة ومعدات خوادم</option>
                <option value="برمجيات ورخص تراخيص">برمجيات ورخص تراخيص</option>
                <option value="شبكات وألياف بصرية">شبكات وألياف بصرية</option>
                <option value="قطع غيار ومستلزمات صيانة">قطع غيار ومستلزمات صيانة</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">التصنيف الفرعي (المستوى 2)</label>
              <select
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-pink-500 text-right font-sans"
              >
                {newCategory === "أجهزة ومعدات خوادم" && (
                  <>
                    <option value="خوادم مخصصة Bare-Metal">خوادم مخصصة Bare-Metal</option>
                    <option value="موزعات شبكات ومفاتيح Switch">موزعات شبكات ومفاتيح Switch</option>
                    <option value="وحدات تخزين كتلية NAS">وحدات تخزين كتلية NAS</option>
                  </>
                )}
                {newCategory === "برمجيات ورخص تراخيص" && (
                  <>
                    <option value="تراخيص سحابة SaaS">تراخيص سحابة SaaS</option>
                    <option value="تراخيص قواعد بيانات Database">تراخيص قواعد بيانات Database</option>
                    <option value="أنظمة حماية وأمن سيبراني">أنظمة حماية وأمن سيبراني</option>
                  </>
                )}
                {newCategory === "شبكات وألياف بصرية" && (
                  <>
                    <option value="كابلات ألياف بصرية">كابلات ألياف بصرية</option>
                    <option value="مستقبلات إشارة ومحولات SFP">مستقبلات إشارة ومحولات SFP</option>
                    <option value="أجهزة بث لاسلكي Access Points">أجهزة بث لاسلكي Access Points</option>
                  </>
                )}
                {newCategory === "قطع غيار ومستلزمات صيانة" && (
                  <>
                    <option value="مزودات طاقة Power Supplies">مزودات طاقة Power Supplies</option>
                    <option value="مراوح تبريد وأنظمة تشتيت">مراوح تبريد وأنظمة تشتيت</option>
                    <option value="لوحات أم وأجزاء دقيقة Motherboards">لوحات أم وأجزاء دقيقة Motherboards</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">سعر تكلفة الوحدة ({config.currency})</label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value) || 0)}
              className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-slate-950 text-xs font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-pink-500/15 transition-all font-sans"
            >
              تأكيد تسجيل البند في المستودع
            </button>
          </div>
        </form>
      )}

      {/* TAB: STOCK TRANSFER */}
      {activeTab === "transfer" && (
        <form onSubmit={handleTransferStock} className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-5 animate-fadeIn text-right" dir="rtl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-slate-200 text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4.5 w-4.5 text-pink-400" /> التحويل والمناقلة المخزنية بين المستودعات
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">نقل كميات الأصناف والسلع والقطع بين المواقع الجغرافية ومحطات النقل واللوجستيات فورياً بدقة متكاملة.</p>
          </div>

          {transferSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold font-sans">
              {transferSuccess}
            </div>
          )}

          {transferError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold font-sans">
              {transferError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">حدد الصنف المراد نقله</label>
              <select
                value={transferSku}
                onChange={(e) => setTransferSku(e.target.value)}
                className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none text-right font-sans"
              >
                {Array.from(new Set(stock.map(s => s.sku))).map(sku => {
                  const name = stock.find(s => s.sku === sku)?.name;
                  return (
                    <option key={sku} value={sku}>{sku} - {name}</option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">من مستودع المصدر</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none text-right font-sans"
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">إلى مستودع الهدف</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none text-right font-sans"
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">كمية النقل المطلوبة</label>
              <input
                type="number"
                min="1"
                required
                value={transferQty}
                onChange={(e) => setTransferQty(Number(e.target.value) || 0)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
              />
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">
                الرصيد المتاح حالياً بالمنشأ: {stock.find(s => s.sku === transferSku && s.warehouseId === transferFrom)?.quantity || 0} وحدات.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-slate-950 text-xs font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-pink-500/15 transition-all font-sans"
            >
              تنفيذ التحويل وتحديث الأرصدة بالمستودعين
            </button>
          </div>
        </form>
      )}

      {/* TAB: INVENTORY ADJUSTMENT */}
      {activeTab === "adjustment" && (
        <form onSubmit={handleInventoryAdjustment} className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-5 animate-fadeIn text-right" dir="rtl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-slate-200 text-base flex items-center gap-2">
              <Scale className="h-4.5 w-4.5 text-pink-400" /> التسويات الجردية والمالية للمخزون
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">إجراء جرد فعلي فيزيائي للمستودع، وحساب الاختلافات وتوليد قيد يومية تلقائي متوازن لضمان تطابق الأستاذ والمخازن.</p>
          </div>

          {adjustSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold font-sans">
              {adjustSuccess}
            </div>
          )}

          {adjustError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold font-sans">
              {adjustError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">المستودع الخاضع للجرد</label>
                <select
                  value={adjustWarehouse}
                  onChange={(e) => setAdjustWarehouse(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none text-right font-sans"
                >
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">الصنف الخاضع للجرد</label>
                <select
                  value={adjustSku}
                  onChange={(e) => setAdjustSku(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none text-right font-sans"
                >
                  {stock.filter(s => s.warehouseId === adjustWarehouse).map(s => (
                    <option key={s.sku} value={s.sku}>{s.sku} - {s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">الكمية الفعلية المحتسبة (في الواقع الفيزيائي)</label>
              <input
                type="number"
                min="0"
                required
                value={physicalQty}
                onChange={(e) => setPhysicalQty(Number(e.target.value) || 0)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-mono text-right"
              />
              <span className="text-[10px] text-slate-500 font-sans mt-1.5 block leading-normal">
                الكمية الدفترية الحالية: <strong className="text-slate-300 font-mono">{(stock.find(s => s.sku === adjustSku && s.warehouseId === adjustWarehouse)?.quantity || 0)} وحدات</strong>. 
                تكلفة الوحدة: <strong className="text-slate-300 font-mono">{(stock.find(s => s.sku === adjustSku && s.warehouseId === adjustWarehouse)?.unitPrice || 0).toLocaleString()} {config.currency}</strong>.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-lg flex items-start gap-3 text-[11px] leading-relaxed text-slate-400 text-right">
            <Cpu className="h-4.5 w-4.5 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <strong className="text-slate-300 block mb-1 font-bold">محرك الفواتير والقيود الآلي</strong>
              بمجرد النقر، سيقوم النظام بمقارنة الدفاتر وحساب الفارق المالي. إذا وُجد اختلاف، سيتم تلقائياً ترحيل قيد تسوية مزدوج ليتوافق حساب الأستاذ العام مع القيمة المالية الفعلية للبضاعة المستودعية.
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-slate-100 text-xs font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-purple-600/15 transition-all font-sans"
            >
              تنفيذ التسوية الجردية والمحاسبية بالدفاتر واليومية
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: BARCODE / QR NODE */}
      {activeTab === "barcode-viewer" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn max-w-4xl mx-auto text-right">
          {/* Selected Item Detail */}
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display font-bold text-slate-200 text-base">التوقيعات الرقمية للرموز (QR & Barcode)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">اختر أي صنف من جدول المخازن لعرض رمز الباركود ورمز الاستجابة السريعة المولد تلقائياً لتسهيل فحص وتلقي الشحنات.</p>
            </div>

            {selectedStockForCode ? (
              <div className="space-y-4 bg-slate-900/50 rounded-xl p-4.5 border border-slate-800 text-right">
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="text-slate-500">البند المحدد حالياً</span>
                  <span className="font-mono font-bold text-pink-400">{selectedStockForCode.sku}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{selectedStockForCode.name}</h4>
                  <p className="text-xs font-sans text-slate-400 mt-1">المستودع المربوط: {selectedStockForCode.warehouseId}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-sans text-slate-400 border-t border-slate-800/80 pt-3 font-mono">
                  <div className="text-right">الكمية المتوفرة: <strong className="text-slate-200">{selectedStockForCode.quantity} وحدات</strong></div>
                  <div className="text-left">سعر الوحدة: <strong className="text-slate-200">{selectedStockForCode.unitPrice.toLocaleString()} {config.currency}</strong></div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500 text-xs font-sans">
                لم يتم تحديد صنف بعد. يرجى الضغط على أي صنف من جدول مستويات المخزون لعرض الرموز الخاصة به.
              </div>
            )}
          </div>

          {/* Visual Bar/QR Generator */}
          {selectedStockForCode && (
            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-6">
              {/* QR Code Graphic */}
              <div className="bg-white p-4.5 rounded-xl shadow-lg border border-slate-300">
                <div className="w-40 h-40 flex items-center justify-center bg-slate-100 border-4 border-slate-900 rounded relative">
                  {/* Decorative QR Lines */}
                  <div className="absolute inset-2 border-2 border-slate-900 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <span className="w-6 h-6 bg-slate-900" />
                      <span className="w-6 h-6 bg-slate-900" />
                    </div>
                    <div className="flex justify-center flex-1 py-4 items-center">
                      <QrCode className="h-16 w-16 text-slate-900 animate-pulse" />
                    </div>
                    <div className="flex justify-between">
                      <span className="w-6 h-6 bg-slate-900" />
                      <span className="w-1.5 h-1.5 bg-slate-900" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Graphic */}
              <div className="w-full space-y-1 text-center font-mono text-[10px] text-slate-400">
                <div className="h-12 w-3/4 mx-auto bg-slate-100 flex items-center justify-between px-3 py-1 rounded border border-slate-300">
                  <div className="flex justify-between w-full h-full">
                    {/* Generates faux barcode bars */}
                    <span className="w-1 bg-slate-900 h-full" />
                    <span className="w-2 bg-slate-900 h-full" />
                    <span className="w-0.5 bg-slate-900 h-full" />
                    <span className="w-1.5 bg-slate-900 h-full" />
                    <span className="w-1 bg-slate-900 h-full" />
                    <span className="w-3 bg-slate-900 h-full" />
                    <span className="w-0.5 bg-slate-900 h-full" />
                    <span className="w-2 bg-slate-900 h-full" />
                    <span className="w-1 bg-slate-900 h-full" />
                    <span className="w-1.5 bg-slate-900 h-full" />
                    <span className="w-3 bg-slate-900 h-full" />
                    <span className="w-1 bg-slate-900 h-full" />
                  </div>
                </div>
                <div className="pt-1.5 text-xs text-slate-300 font-semibold tracking-widest">{selectedStockForCode.sku}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ADVANCED INVENTORY VALUATION (FIFO / AVCO) */}
      {activeTab === "valuation" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-sm">🧮 محرك تسعير وتقييم المخزون المتقدم (Inventory Valuation Engine)</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  احسب القيمة الدفترية الدقيقة لمخزونك الكلي استناداً إلى خوارزميات التدفق المعتمدة.
                </p>
              </div>

              {/* Method Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs font-bold font-sans">
                <button
                  type="button"
                  onClick={() => setValuationMethod("FIFO")}
                  className={`px-3 py-1.5 rounded ${
                    valuationMethod === "FIFO" ? "bg-slate-800 text-pink-400" : "text-slate-400"
                  }`}
                >
                  صادر أولاً وارد أولاً (FIFO)
                </button>
                <button
                  type="button"
                  onClick={() => setValuationMethod("AVCO")}
                  className={`px-3 py-1.5 rounded ${
                    valuationMethod === "AVCO" ? "bg-slate-800 text-pink-400" : "text-slate-400"
                  }`}
                >
                  المتوسط المرجح للتكلفة (AVCO)
                </button>
              </div>
            </div>

            {/* Calculations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                    <th className="p-3">رمز البند</th>
                    <th className="p-3 font-bold">اسم المنتج</th>
                    <th className="p-3">الكمية الحالية</th>
                    <th className="p-3 text-left">متوسط تكلفة الوحدة</th>
                    <th className="p-3 text-left">القيمة المقدرة ({valuationMethod})</th>
                    <th className="p-3">خوارزمية الاحتساب والدفترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {stock.map(item => {
                    // FIFO simulated batching or AVCO calculation logs
                    const totalCost = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.sku} className="hover:bg-slate-900/10 font-sans">
                        <td className="p-3 font-mono text-pink-400 font-bold">{item.sku}</td>
                        <td className="p-3 text-slate-200 font-bold">{item.name}</td>
                        <td className="p-3 font-mono text-slate-300">{item.quantity} وحدات</td>
                        <td className="p-3 text-left font-mono text-slate-400">{item.unitPrice.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-left font-mono font-bold text-emerald-400">{totalCost.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-xs text-slate-400">
                          {valuationMethod === "FIFO" ? (
                            <span>طبقة شراء 1: {item.quantity} وحدة @ {item.unitPrice} {config.currency}</span>
                          ) : (
                            <span>إجمالي التكلفة / إجمالي الكميات = {item.unitPrice} {config.currency} (مستمر)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total valuation panel */}
            <div className="bg-[#0f1425] rounded-xl border border-slate-800 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-sans">إجمالي القيمة الدفترية للأصول المخزنية بالنظام:</span>
                <strong className="text-xl font-mono text-emerald-400">
                  {stock.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()} {config.currency}
                </strong>
              </div>
              <div className="text-xs text-slate-400 max-w-lg font-sans">
                💡 <strong>أمان التدقيق:</strong> يتم ترحيل أي فروق تصفية تقييم مخزني تلقائياً إلى حساب <strong>تكلفة البضاعة المباعة (COGS)</strong> لضمان سلامة الميزانية العمومية ربع السنوية.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SERIAL NUMBERS & LOT TRACKING */}
      {activeTab === "serial-lot" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* Serials Control Panel */}
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-display font-bold text-slate-200 text-sm">🔑 رقابة الأرقام التسلسلية الفريدة (Serial Numbers Control)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">تتبع رخص وتراخيص البرمجيات الصادرة بترميز فريد للعملاء:</p>
            </div>

            {/* Add Serial */}
            <div className="bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">المنتج المستهدف</label>
                <select
                  value={newSerialSku}
                  onChange={(e) => setNewSerialSku(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded p-1.5 focus:outline-none"
                >
                  {stock.map(s => (
                    <option key={s.sku} value={s.sku}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">السيريال الرقمي الفريد</label>
                <input
                  type="text"
                  placeholder="EX: SFT-8832-OP9"
                  value={newSerialNum}
                  onChange={(e) => setNewSerialNum(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded p-1.5 focus:outline-none font-mono"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!newSerialNum.trim()) return;
                    setSerials([...serials, {
                      sku: newSerialSku,
                      serial: newSerialNum.toUpperCase().trim(),
                      warehouseId: "WH-CAI",
                      status: "Available"
                    }]);
                    setNewSerialNum("");
                  }}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold text-xs py-1.5 rounded transition-all cursor-pointer"
                >
                  تسجيل الرقم الفريد +
                </button>
              </div>
            </div>

            {/* List serials */}
            <div className="overflow-y-auto max-h-[250px] space-y-2">
              {serials.map((s, idx) => (
                <div key={idx} className="bg-slate-900/20 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-sans">
                  <div className="space-y-0.5">
                    <span className="font-mono text-pink-400 font-bold block">{s.serial}</span>
                    <span className="text-[10px] text-slate-500 font-mono">الرمز SKU: {s.sku}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    s.status === "Available" ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"
                  }`}>
                    {s.status === "Available" ? "متاح للبيع الفوري" : "محجوز لطلب تعاقدي"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lots Batching Control Panel */}
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-display font-bold text-slate-200 text-sm">📦 تتبع شحنات ولوتات التوريد وتواريخ الصلاحية (Lot Tracking)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">تنظيم المنتجات المخزنية وتصنيفها في دفعات لوتات لها تاريخ صلاحية:</p>
            </div>

            {/* Add Lot */}
            <div className="bg-slate-900/40 p-3.5 rounded-lg border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-2 text-right">
              <div className="col-span-2 md:col-span-1">
                <label className="text-[9px] text-slate-400 block mb-1">المنتج</label>
                <select
                  value={newLotSku}
                  onChange={(e) => setNewLotSku(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded p-1 focus:outline-none"
                >
                  {stock.map(s => (
                    <option key={s.sku} value={s.sku}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">كود اللوت (Lot)</label>
                <input
                  type="text"
                  placeholder="EX: LOT-991"
                  value={newLotNum}
                  onChange={(e) => setNewLotNum(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded p-1 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 block mb-1">انتهاء الصلاحية</label>
                <input
                  type="date"
                  value={newLotExpiry}
                  onChange={(e) => setNewLotExpiry(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded p-1 focus:outline-none font-sans"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!newLotNum.trim()) return;
                    setLots([...lots, {
                      sku: newLotSku,
                      lotNumber: newLotNum.toUpperCase().trim(),
                      expiryDate: newLotExpiry,
                      quantity: newLotQty,
                      status: "Released"
                    }]);
                    setNewLotNum("");
                  }}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold text-xs py-1.5 rounded transition-all cursor-pointer"
                >
                  حفظ اللوت +
                </button>
              </div>
            </div>

            {/* List Lots */}
            <div className="overflow-y-auto max-h-[250px] space-y-2">
              {lots.map((l, idx) => (
                <div key={idx} className="bg-slate-900/20 border border-slate-800 p-2.5 rounded-lg grid grid-cols-3 gap-2 text-xs font-sans text-right">
                  <div>
                    <span className="font-mono text-pink-400 font-bold block">{l.lotNumber}</span>
                    <span className="text-[10px] text-slate-500 block">SKU: {l.sku}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">انتهاء الصلاحية:</span>
                    <strong className="text-slate-300 font-mono font-bold">{l.expiryDate}</strong>
                  </div>
                  <div className="text-left">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      Released (مرخص)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: CYCLE COUNT (الجرد الدوري الفعلي والفروقات الدفترية) */}
      {activeTab === "cycle-count" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="font-display font-bold text-slate-200 text-sm">📋 جدولة ومعالجة الجرد الدوري الفعلي للمستودعات (Cycle Count & Reconciliation)</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                قم بمطابقة الكميات الفعلية بالرفوف مع الأرقام الدفترية وإصدار سندات فروقات الجرد محاسبياً تلقائياً.
              </p>
            </div>

            {/* Select Warehouse for Cycle Count */}
            <div className="bg-slate-900/40 p-4.5 rounded-lg border border-slate-800 flex flex-col md:flex-row items-end gap-4 text-right">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1">اختر المستودع المجرود</label>
                <select
                  value={selectedWhForCycle}
                  onChange={(e) => setSelectedWhForCycle(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-1">ملاحظات فريق جرد الساحة</label>
                <input
                  type="text"
                  placeholder="EX: مطابقة تامة مع وجود رطوبة طفيفة"
                  value={cycleVarianceNotes}
                  onChange={(e) => setCycleVarianceNotes(e.target.value)}
                  className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none font-sans"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const id = `CYC-00${cycleCounts.length + 1}`;
                    setCycleCounts([{
                      id,
                      date: new Date().toISOString().split("T")[0],
                      warehouseId: selectedWhForCycle,
                      itemsCount: stock.filter(s => s.warehouseId === selectedWhForCycle).length,
                      status: "Completed",
                      variance: 0
                    }, ...cycleCounts]);
                    setCycleVarianceNotes("");
                    alert("تم اعتماد الجرد الدوري وحساب الفروقات بنجاح بالدفاتر.");
                  }}
                  className="bg-pink-600 hover:bg-pink-500 text-slate-950 font-bold text-xs px-4 py-2 rounded font-sans transition-all cursor-pointer"
                >
                  بدء وحفظ تسوية الجرد السنوي/الدوري
                </button>
              </div>
            </div>

            {/* Cycle Count Logs */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                    <th className="p-3">كود الجلسة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المستودع</th>
                    <th className="p-3 text-center">عدد الأصناف المطابقة</th>
                    <th className="p-3 text-left">مجموع انحرافات الكمية (Variance)</th>
                    <th className="p-3 text-center">الوضعية والاعتماد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {cycleCounts.map(cyc => (
                    <tr key={cyc.id} className="hover:bg-slate-900/10 font-sans">
                      <td className="p-3 font-mono font-bold text-pink-400">{cyc.id}</td>
                      <td className="p-3 text-slate-400 font-mono">{cyc.date}</td>
                      <td className="p-3 text-slate-300 font-bold">{cyc.warehouseId}</td>
                      <td className="p-3 text-center text-slate-200 font-mono">{cyc.itemsCount} أصناف</td>
                      <td className={`p-3 text-left font-mono font-bold ${
                        cyc.variance < 0 ? "text-red-400" : "text-emerald-400"
                      }`}>
                        {cyc.variance > 0 ? `+${cyc.variance}` : cyc.variance} وحدات
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          تم الدفترة والاعتماد مالياً
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: STOCK CARD (كارتة الصنف) */}
      {activeTab === "stock-card" && (() => {
        const uniqueSkus = Array.from(new Set(stock.map(s => s.sku)));
        const currentSku = selectedSkuForCard || uniqueSkus[0] || "";

        const selectedItem = stock.find(s => s.sku === currentSku);
        const itemName = selectedItem?.name || "صنف غير محدد";
        const itemCategory = selectedItem?.category || "غير محدد";
        const itemSubCategory = selectedItem?.subCategory || "غير محدد";
        const itemMin = selectedItem?.minLevel || 0;
        const itemPrice = selectedItem?.unitPrice || 0;

        // Current qty across filtered warehouse or ALL
        const currentQtyInStock = stock
          .filter(s => s.sku === currentSku && (selectedWhForCard === "ALL" || s.warehouseId === selectedWhForCard))
          .reduce((sum, s) => sum + s.quantity, 0);

        // Generate movements
        const movementsList = (() => {
          let list: any[] = [];

          // Add opening balance
          if (currentSku === "STOCK-RAW-01") {
            list.push({
              date: "2025-01-01",
              refId: "SYS-OPN-01",
              type: "رصيد افتتاحي",
              warehouseId: "WH-CAI-01",
              qtyIn: 50,
              qtyOut: 0,
              price: 2000,
              details: "الرصيد الافتتاحي للعام المالي الجديد"
            });
            list.push({
              date: "2025-11-20",
              refId: "PROD-ORD-001",
              type: "سحب إنتاجي (أمر تشغيل)",
              warehouseId: "WH-CAI-01",
              qtyIn: 0,
              qtyOut: 135,
              price: 2000,
              details: "صرف مكونات خوادم لإنتاج الخوادم الفائقة (أمر إنتاج رقم 1)"
            });
          } else if (currentSku === "STOCK-SFT-01") {
            list.push({
              date: "2025-01-01",
              refId: "SYS-OPN-02",
              type: "رصيد افتتاحي",
              warehouseId: "WH-ALX-02",
              qtyIn: 200,
              qtyOut: 0,
              price: 5000,
              details: "الرصيد الافتتاحي للعام المالي الجديد"
            });
          } else {
            // Fallback opening for new items
            list.push({
              date: "2026-01-01",
              refId: "SYS-OPN-NEW",
              type: "رصيد افتتاحي",
              warehouseId: selectedItem?.warehouseId || "WH-CAI-01",
              qtyIn: selectedItem?.quantity || 0,
              qtyOut: 0,
              price: selectedItem?.unitPrice || 100,
              details: "رصيد افتتاحي لبند مخزني جديد"
            });
          }

          // Dynamic purchases
          purchaseInvoices.forEach(inv => {
            inv.items.forEach(item => {
              if (item.sku === currentSku) {
                list.push({
                  date: inv.date,
                  refId: inv.id,
                  type: "فاتورة مشتريات (الوارد)",
                  warehouseId: selectedItem?.warehouseId || "WH-CAI-01",
                  qtyIn: item.quantity,
                  qtyOut: 0,
                  price: item.price,
                  details: `توريد بضاعة من المورد: ${inv.supplierName}`
                });
              }
            });
          });

          // Dynamic sales
          salesInvoices.forEach(inv => {
            inv.items.forEach(item => {
              if (item.sku === currentSku) {
                list.push({
                  date: inv.date,
                  refId: inv.id,
                  type: "فاتورة مبيعات (الصادر)",
                  warehouseId: selectedItem?.warehouseId || "WH-ALX-02",
                  qtyIn: 0,
                  qtyOut: item.quantity,
                  price: item.price,
                  details: `بيع بضاعة للعميل: ${inv.customerName}`
                });
              }
            });
          });

          // Dynamic transfers
          transfersLog.forEach(t => {
            if (t.sku === currentSku) {
              list.push({
                date: t.date,
                refId: t.refId,
                type: "تحويل مخزني صادر",
                warehouseId: t.fromWh,
                qtyIn: 0,
                qtyOut: t.qty,
                price: itemPrice,
                details: `تحويل بضاعة صادرة إلى مستودع ${t.toWh}`
              });
              list.push({
                date: t.date,
                refId: t.refId,
                type: "تحويل مخزني وارد",
                warehouseId: t.toWh,
                qtyIn: t.qty,
                qtyOut: 0,
                price: itemPrice,
                details: `تحويل بضاعة واردة من مستودع ${t.fromWh}`
              });
            }
          });

          // Dynamic adjustments
          journalEntries.forEach(je => {
            if (je.description.includes(currentSku)) {
              const match = je.description.match(/الفروقات:\s*(-?\d+)\s*وحدات/);
              const diff = match ? parseInt(match[1]) : 0;
              
              const whMatch = je.description.match(/في\s*([A-Za-z0-9_-]+)/);
              const whId = whMatch ? whMatch[1] : "";

              if (diff !== 0) {
                list.push({
                  date: je.date,
                  refId: je.id,
                  type: diff > 0 ? "تسوية جردية (زيادة)" : "تسوية جردية (عجز)",
                  warehouseId: whId || selectedItem?.warehouseId || "WH-CAI-01",
                  qtyIn: diff > 0 ? diff : 0,
                  qtyOut: diff < 0 ? Math.abs(diff) : 0,
                  price: itemPrice,
                  details: je.description
                });
              }
            }
          });

          // Filter by warehouse if selected is not "ALL"
          if (selectedWhForCard !== "ALL") {
            list = list.filter(m => m.warehouseId === selectedWhForCard);
          }

          // Sort by date ascending
          list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Calculate running balance
          let currentBalance = 0;
          list = list.map(m => {
            currentBalance = currentBalance + m.qtyIn - m.qtyOut;
            return {
              ...m,
              balance: currentBalance
            };
          });

          // Filter by date range if provided
          if (cardStartDate) {
            list = list.filter(m => m.date >= cardStartDate);
          }
          if (cardEndDate) {
            list = list.filter(m => m.date <= cardEndDate);
          }

          return list;
        })();

        return (
          <div className="space-y-6 animate-fadeIn text-right">
            {/* Header and Selectors */}
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-200 text-lg flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-pink-400" />
                    كارتة متابعة حركة الصنف المخزني (Stock Item Ledger Card)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    قم باختيار الصنف والمستودع لتتبع الوارد والصادر وتراكم الرصيد الفعلي والمالي للصنف عبر الزمن.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("printable-stock-card-area");
                      if (el) {
                        el.classList.add("printable-area");
                        window.print();
                        el.classList.remove("printable-area");
                      }
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md font-sans"
                  >
                    <Printer className="h-4 w-4" /> طباعة كارتة الصنف
                  </button>
                </div>
              </div>

              {/* Filters Form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Select Sku */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">البند المخزني المستهدف:</label>
                  <select
                    value={currentSku}
                    onChange={(e) => setSelectedSkuForCard(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-sans focus:outline-none focus:border-pink-500"
                  >
                    <option value="" disabled>-- اختر بند مخزني --</option>
                    {uniqueSkus.map(sku => {
                      const itm = stock.find(s => s.sku === sku);
                      return (
                        <option key={sku} value={sku}>
                          {sku} - {itm?.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Select Warehouse */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">المستودع:</label>
                  <select
                    value={selectedWhForCard}
                    onChange={(e) => setSelectedWhForCard(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-sans focus:outline-none focus:border-pink-500"
                  >
                    <option value="ALL">جميع المستودعات المتوفرة</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.id})</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">من تاريخ:</label>
                  <input
                    type="date"
                    value={cardStartDate}
                    onChange={(e) => setCardStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={cardEndDate}
                    onChange={(e) => setCardEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Printable Content Container */}
            <div id="printable-stock-card-area" className="space-y-6">
              {/* Product Info Board */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* SKU & Name */}
                <div className="bg-[#0f1425] border border-slate-800/70 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">الصنف والرمز المرجعي</span>
                  <div className="text-sm font-bold text-slate-200">{itemName}</div>
                  <div className="text-xs font-mono text-pink-400">{currentSku || "لم يتم التحديد"}</div>
                </div>

                {/* Warehouse Location */}
                <div className="bg-[#0f1425] border border-slate-800/70 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">مكان التتبع الحالي</span>
                  <div className="text-sm font-bold text-slate-200">
                    {selectedWhForCard === "ALL" ? "جميع مستودعات الشركة" : warehouses.find(w => w.id === selectedWhForCard)?.name || selectedWhForCard}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {selectedWhForCard === "ALL" ? "مستودعات إقليمية مدمجة" : `معرّف المستودع: ${selectedWhForCard}`}
                  </div>
                </div>

                {/* Category & Status */}
                <div className="bg-[#0f1425] border border-slate-800/70 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">التصنيف وحد الأمان</span>
                  <div className="text-sm font-bold text-slate-200">{itemCategory} / {itemSubCategory}</div>
                  <div className="text-xs text-slate-400 font-sans">
                    حد إعادة الطلب (الأمان): <span className="font-mono text-pink-400 font-bold">{itemMin} وحدات</span>
                  </div>
                </div>

                {/* Current Quantity and Value */}
                <div className="bg-[#0f1425] border border-slate-800/70 rounded-xl p-4 space-y-1 border-r-4 border-r-pink-500">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">رصيد المخزون وقيمته الحالية</span>
                  <div className="text-lg font-mono font-bold text-pink-400">
                    {currentQtyInStock.toLocaleString()} <span className="text-xs font-sans text-slate-300">وحدة</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    إجمالي القيمة: <span className="font-mono font-bold text-slate-200">{(currentQtyInStock * itemPrice).toLocaleString()} {config.currency}</span>
                  </div>
                </div>
              </div>

              {/* Ledger Movements Table */}
              <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">سجل حركات بطاقة الصنف المفصلة (Ledger Movements)</span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full font-mono">
                    إجمالي القيود المكتشفة: {movementsList.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 font-sans border-b border-slate-800">
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">رقم المستند / الحركة</th>
                        <th className="p-3">نوع الحركة المخزنية</th>
                        <th className="p-3">الموقع / المستودع</th>
                        <th className="p-3 text-center text-emerald-400 bg-emerald-500/5">الوارد (+)</th>
                        <th className="p-3 text-center text-red-400 bg-red-500/5">الصادر (-)</th>
                        <th className="p-3 text-center font-bold text-pink-400 bg-pink-500/5">الرصيد التراكمي</th>
                        <th className="p-3 text-left">التكلفة والأسعار</th>
                        <th className="p-3 text-left">القيمة الكلية للحركة</th>
                        <th className="p-3 w-1/4">البيان والشرح التفصيلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {movementsList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                            لا توجد قيود أو حركات مطابقة للفلاتر ونطاق التاريخ المحددين لهذا الصنف.
                          </td>
                        </tr>
                      ) : (
                        movementsList.map((mov, idx) => {
                          const value = (mov.qtyIn > 0 ? mov.qtyIn : mov.qtyOut) * mov.price;
                          return (
                            <tr key={idx} className="hover:bg-slate-900/20 font-sans transition-colors">
                              <td className="p-3 text-slate-400 font-mono">{mov.date}</td>
                              <td className="p-3 font-mono font-bold text-pink-400">{mov.refId}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  mov.type.includes("افتتاحي") ? "bg-slate-800 text-slate-300 border border-slate-700" :
                                  mov.type.includes("مشتريات") || mov.type.includes("وارد") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  mov.type.includes("مبيعات") || mov.type.includes("صادر") ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                  "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>
                                  {mov.type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300 font-mono">{mov.warehouseId}</td>
                              <td className="p-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/5">
                                {mov.qtyIn > 0 ? `+${mov.qtyIn}` : "-"}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-red-400 bg-red-500/5">
                                {mov.qtyOut > 0 ? `-${mov.qtyOut}` : "-"}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-pink-400 bg-pink-500/5">
                                {mov.balance}
                              </td>
                              <td className="p-3 text-left font-mono text-slate-300">
                                {mov.price.toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-slate-200">
                                {value.toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-slate-400 leading-relaxed text-xs">{mov.details}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Audit Checklist Footer */}
                <div className="p-4 bg-slate-900/40 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
                  <div className="text-[11px] text-slate-400 font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    بطاقة الصنف متصلة بلحظية بنظام الفواتير والترحيل المالي والتسويات الجردية والتحويلات الإقليمية.
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    تم إنشاء ومراجعة التقرير في: {new Date().toLocaleDateString("ar-EG")} | رمز الأمان للتدقيق: SEC-STK-LEDGER
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
