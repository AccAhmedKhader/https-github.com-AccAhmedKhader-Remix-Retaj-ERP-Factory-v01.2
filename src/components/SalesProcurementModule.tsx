import React, { useState } from "react";
import { 
  ShoppingCart, 
  FileText, 
  Plus, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Printer, 
  Boxes, 
  RotateCcw, 
  DollarSign, 
  User, 
  Layers, 
  CheckCircle2, 
  Percent, 
  Truck, 
  ChevronRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { 
  Customer, 
  Supplier, 
  StockItem, 
  ChartOfAccount, 
  SalesInvoice, 
  PurchaseInvoice, 
  ERPConfig 
} from "../types";
import { getThemeClass } from "./Sidebar";

interface SalesProcurementModuleProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  salesInvoices: SalesInvoice[];
  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  config: ERPConfig;
}

interface QuotationItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export default function SalesProcurementModule({
  customers = [],
  setCustomers,
  suppliers = [],
  setSuppliers,
  stock = [],
  setStock,
  accounts = [],
  setAccounts,
  salesInvoices = [],
  setSalesInvoices,
  purchaseInvoices = [],
  setPurchaseInvoices,
  config
}: SalesProcurementModuleProps) {
  const clr = getThemeClass(config.theme);

  const [activeTab, setActiveTab] = useState<"sales" | "purchases">("sales");
  const [salesSubTab, setSalesSubTab] = useState<"quotations" | "orders" | "delivery" | "returns" | "credit-control">("quotations");
  const [purchaseSubTab, setPurchaseSubTab] = useState<"requests" | "rfq" | "orders" | "receipt" | "returns">("requests");

  // Pricing engine helper states
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const VAT_RATE = 0.14; // Egypt 14% VAT Standard
  const WHT_RATE = 0.01; // Egypt 1% WHT on Goods

  // Customer credit limit standard
  const CREDIT_LIMITS: Record<string, number> = {
    "CUST-001": 50000,
    "CUST-002": 150000,
    "CUST-003": 25000
  };

  // --- SALES ENGINE STATES ---
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || "");
  const [cartItems, setCartItems] = useState<QuotationItem[]>([]);
  const [selectedSku, setSelectedSku] = useState(stock[0]?.sku || "");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(stock[0]?.unitPrice || 100);

  // Lists of records
  const [quotations, setQuotations] = useState<any[]>([
    {
      id: "QUOT-2026-001",
      customerId: "CUST-001",
      customerName: "الشركة المصرية للاتصالات",
      date: "2026-07-01",
      items: [{ sku: "SFT-WIN-01", name: "رخصة ويندوز سيرفر 2026", quantity: 5, price: 4500 }],
      subtotal: 22500,
      discount: 2250,
      vat: 2835,
      wht: 202.5,
      total: 22882.5,
      status: "Approved"
    }
  ]);

  const [salesOrders, setSalesOrders] = useState<any[]>([
    {
      id: "SORD-2026-001",
      customerId: "CUST-002",
      customerName: "بتروجيت للمقاولات",
      date: "2026-07-02",
      items: [{ sku: "SFT-SQL-02", name: "رخصة SQL Server Enterprise", quantity: 2, price: 18000 }],
      total: 41040,
      status: "Confirmed",
      isDelivered: true,
      isInvoiced: true
    }
  ]);

  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([
    {
      id: "DELV-2026-001",
      salesOrderId: "SORD-2026-001",
      customerName: "بتروجيت للمقاولات",
      date: "2026-07-03",
      items: [{ sku: "SFT-SQL-02", name: "رخصة SQL Server Enterprise", quantity: 2 }],
      status: "Dispatched"
    }
  ]);

  const [salesReturns, setSalesReturns] = useState<any[]>([]);

  // --- PURCHASES ENGINE STATES ---
  const [selectedSuppId, setSelectedSuppId] = useState(suppliers[0]?.id || "");
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([
    {
      id: "PREQ-2026-001",
      department: "البحث والتطوير (RND)",
      requestedBy: "م. محمد كمال",
      date: "2026-07-04",
      items: [{ sku: "SFT-SQL-02", name: "رخصة SQL Server Enterprise", quantity: 1 }],
      status: "Approved"
    }
  ]);

  const [rfqs, setRfqs] = useState<any[]>([
    {
      id: "RFQ-2026-001",
      requestId: "PREQ-2026-001",
      date: "2026-07-05",
      suppliers: ["SUPP-001", "SUPP-002"],
      status: "Completed",
      lowestBid: 17500
    }
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([
    {
      id: "PORD-2026-001",
      supplierId: "SUPP-001",
      supplierName: "الشركة العربية للحواسب",
      date: "2026-07-06",
      items: [{ sku: "SFT-SQL-02", name: "رخصة SQL Server Enterprise", quantity: 1, price: 17500 }],
      total: 19950,
      status: "Dispatched",
      isReceived: false
    }
  ]);

  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);

  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Print Document State for sales/procurement lifecycle
  const [selectedPrintDoc, setSelectedPrintDoc] = useState<{ docType: "quotation" | "sales_order" | "delivery_note" | "purchase_order" | "goods_receipt"; data: any } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 6000);
  };

  // --- DYNAMIC LIVE PAGINATED STATE HOOKS ---
  const [localSalesInvoices, setLocalSalesInvoices] = useState<any[]>([]);
  const [salesInvoicesPage, setSalesInvoicesPage] = useState(1);
  const [salesInvoicesLimit] = useState(5);
  const [salesInvoicesTotal, setSalesInvoicesTotal] = useState(0);
  const [isLoadingSalesInvoices, setIsLoadingSalesInvoices] = useState(false);
  const [salesInvoicesError, setSalesInvoicesError] = useState<string | null>(null);

  const fetchSalesInvoices = async (retryCount = 0) => {
    setIsLoadingSalesInvoices(true);
    setSalesInvoicesError(null);
    try {
      const token = localStorage.getItem("apex_access_token");
      const response = await fetch(`/api/v1/inventory/sales-invoices?page=${salesInvoicesPage}&limit=${salesInvoicesLimit}`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      if (!response.ok) throw new Error("Failed to fetch sales invoices");
      const result = await response.json();
      if (result.success) {
        setLocalSalesInvoices(result.data || []);
        if (result.pagination) {
          setSalesInvoicesTotal(result.pagination.total);
        } else {
          setSalesInvoicesTotal(result.data?.length || 0);
        }
      } else {
        throw new Error(result.error || "Failed loading");
      }
    } catch (err: any) {
      console.error("Error fetching sales invoices:", err);
      if (retryCount < 3) {
        console.log(`Retrying sales invoices fetch... Attempt ${retryCount + 1}`);
        setTimeout(() => fetchSalesInvoices(retryCount + 1), 1000 * Math.pow(2, retryCount));
      } else {
        setSalesInvoicesError("فشل تحميل الفواتير من الخادم الفني.");
      }
    } finally {
      setIsLoadingSalesInvoices(false);
    }
  };

  React.useEffect(() => {
    fetchSalesInvoices();
  }, [salesInvoicesPage, salesInvoices]);

  // Pricing Engine calculations helper
  const calculatePricing = (items: QuotationItem[]) => {
    const rawSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discountAmount = rawSubtotal * (discountPercent / 100);
    const subtotal = rawSubtotal - discountAmount;
    const vatAmount = subtotal * VAT_RATE;
    const whtAmount = subtotal * WHT_RATE;
    const total = subtotal + vatAmount - whtAmount;
    return { rawSubtotal, discountAmount, subtotal, vatAmount, whtAmount, total };
  };

  const activeCartPrices = calculatePricing(cartItems);

  // Add Item to Quotation/Order Cart
  const handleAddToCart = () => {
    const stockItem = stock.find(s => s.sku === selectedSku);
    if (!stockItem) return;

    const existing = cartItems.find(item => item.sku === selectedSku);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.sku === selectedSku 
          ? { ...item, quantity: item.quantity + itemQty } 
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        sku: selectedSku,
        name: stockItem.name,
        quantity: itemQty,
        price: itemPrice
      }]);
    }
    showNotification("تمت إضافة الصنف إلى مسودة الفاتورة/العرض بنجاح.");
  };

  // Remove from cart
  const handleRemoveFromCart = (sku: string) => {
    setCartItems(cartItems.filter(item => item.sku !== sku));
  };

  // Change Sku resets price default
  const handleSkuChange = (sku: string) => {
    setSelectedSku(sku);
    const stockItem = stock.find(s => s.sku === sku);
    if (stockItem) {
      setItemPrice(stockItem.unitPrice);
    }
  };

  // --- ACTIONS: SALES CYCLE ---
  
  // 1. Create Quotation
  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showNotification("يرجى إضافة سلع أولاً لعرض السعر!", "error");
      return;
    }
    const customer = customers.find(c => c.id === selectedCustId);
    if (!customer) return;

    const prices = calculatePricing(cartItems);
    const newQuotation = {
      id: `QUOT-2026-00${quotations.length + 1}`,
      customerId: selectedCustId,
      customerName: customer.name,
      date: new Date().toISOString().split("T")[0],
      items: [...cartItems],
      subtotal: prices.subtotal,
      discount: prices.discountAmount,
      vat: prices.vatAmount,
      wht: prices.whtAmount,
      total: prices.total,
      status: "Pending"
    };

    setQuotations([newQuotation, ...quotations]);
    setCartItems([]);
    showNotification(`تم إنشاء عرض السعر ${newQuotation.id} بنجاح للعميل ${customer.name}.`);
  };

  // Convert Quotation to Sales Order with Customer Credit Control!
  const handleApproveQuotation = (quot: any) => {
    const customer = customers.find(c => c.id === quot.customerId);
    if (!customer) return;

    // CREDIT CONTROL CHECK: Check if Customer balance + new order total exceeds credit limit
    const creditLimit = CREDIT_LIMITS[quot.customerId] || 50000;
    if (customer.balance + quot.total > creditLimit) {
      showNotification(`حظر ائتماني! تجاوز العميل للحد الائتماني المسموح به (${creditLimit.toLocaleString()} ${config.currency}). الرصيد الحالي: ${customer.balance.toLocaleString()} ${config.currency}.`, "error");
      return;
    }

    const newOrder = {
      id: `SORD-2026-00${salesOrders.length + 1}`,
      customerId: quot.customerId,
      customerName: quot.customerName,
      date: new Date().toISOString().split("T")[0],
      items: quot.items,
      total: quot.total,
      status: "Confirmed",
      isDelivered: false,
      isInvoiced: false
    };

    setSalesOrders([newOrder, ...salesOrders]);
    setQuotations(quotations.map(q => q.id === quot.id ? { ...q, status: "Approved" } : q));
    showNotification(`تم ترقية عرض السعر بنجاح إلى أمر مبيعات مؤكد ${newOrder.id} بعد فحص الضوابط الائتمانية.`);
  };

  // 2. Dispatch Delivery Note (سند التسليم - deducts stock)
  const handleDispatchDelivery = (order: any) => {
    // Check if we have enough stock items before dispatching
    let stockValid = true;
    order.items.forEach((item: any) => {
      const sItem = stock.find(s => s.sku === item.sku);
      if (!sItem || sItem.quantity < item.quantity) {
        stockValid = false;
      }
    });

    if (!stockValid) {
      showNotification("فشل التسليم! كمية المخزون غير كافية لواحد أو أكثر من بنود الطلبية.", "error");
      return;
    }

    // Create delivery note
    const newDelivery = {
      id: `DELV-2026-00${deliveryNotes.length + 1}`,
      salesOrderId: order.id,
      customerName: order.customerName,
      date: new Date().toISOString().split("T")[0],
      items: order.items,
      status: "Dispatched"
    };

    // Deduct stock
    const updatedStock = stock.map(s => {
      const match = order.items.find((item: any) => item.sku === s.sku);
      if (match) {
        return { ...s, quantity: Math.max(0, s.quantity - match.quantity) };
      }
      return s;
    });

    setStock(updatedStock);
    setDeliveryNotes([newDelivery, ...deliveryNotes]);
    setSalesOrders(salesOrders.map(o => o.id === order.id ? { ...o, isDelivered: true } : o));
    showNotification(`تم صرف وإصدار إذن التسليم ${newDelivery.id} وتخفيض كميات المنتجات من المخازن.`);
  };

  // 3. Issue Sales Invoice (إصدار الفاتورة - increases customer debt & accounts receivable)
  const handleIssueInvoice = (order: any) => {
    const prices = calculatePricing(order.items);
    
    const newInvoice: SalesInvoice = {
      id: `SINV-2026-00${salesInvoices.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      customerId: order.customerId,
      customerName: order.customerName,
      items: order.items.map((it: any) => ({
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        total: it.quantity * it.price
      })),
      subtotal: prices.subtotal,
      vatAmount: prices.vatAmount,
      withholdingTax: prices.whtAmount,
      total: order.total,
      status: "Unpaid",
      paymentMethod: "Bank"
    };

    // Update customer debt balance
    const updatedCustomers = customers.map(c => 
      c.id === order.customerId 
        ? { ...c, balance: c.balance + order.total } 
        : c
    );

    // Dynamic double entry posting for Accounts Ledger
    const journalLines = [
      { accountCode: "11100", accountName: "العملاء والذمم المدينة التجارية", debit: order.total, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات رخص البرمجيات", debit: 0, credit: prices.subtotal },
      { accountCode: "21500", accountName: "التزامات ضريبة القيمة المضافة مخرجات", debit: 0, credit: prices.vatAmount }
    ];

    const newJournal = {
      id: `JE-2026-SLS-00${Date.now().toString().slice(-3)}`,
      date: new Date().toISOString().split("T")[0],
      description: `قيد استحقاق فاتورة مبيعات رقم ${newInvoice.id} لعميل: ${order.customerName}`,
      reference: newInvoice.id,
      lines: journalLines,
      status: "Posted" as const,
      costCenter: "CC-TAX",
      profitCenter: "PC-SFT",
      creator: "محرك مبيعات ERP"
    };

    // Update global state
    setCustomers(updatedCustomers);
    setSalesInvoices([newInvoice, ...salesInvoices]);
    setSalesOrders(salesOrders.map(o => o.id === order.id ? { ...o, isInvoiced: true } : o));

    // Post to accounting accounts
    const updatedAccounts = accounts.map(acc => {
      let change = 0;
      journalLines.forEach(l => {
        if (l.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") change += (l.debit - l.credit);
          else change += (l.credit - l.debit);
        }
      });
      return { ...acc, balance: acc.balance + change };
    });
    setAccounts(updatedAccounts);

    showNotification(`تم توليد الفاتورة الضريبية الرسمية ${newInvoice.id} للعميل ودفترتها باليومية العامة للأستاذ.`);
  };

  // 4. Sales Return & Credit Note (مرتجع مبيعات وإشعار دائن)
  const handleProcessSalesReturn = (invoice: SalesInvoice) => {
    const returnId = `SRET-2026-00${salesReturns.length + 1}`;
    
    const newReturn = {
      id: returnId,
      invoiceId: invoice.id,
      customerName: invoice.customerName,
      date: new Date().toISOString().split("T")[0],
      total: invoice.total,
      status: "Processed"
    };

    // Reverse Stock: re-add returned quantity to inventory
    const updatedStock = stock.map(s => {
      const match = invoice.items.find(item => item.sku === s.sku);
      if (match) {
        return { ...s, quantity: s.quantity + match.quantity };
      }
      return s;
    });

    // Reverse Accounts Ledger: deduct customer balance
    const updatedCustomers = customers.map(c => 
      c.id === invoice.customerId 
        ? { ...c, balance: Math.max(0, c.balance - invoice.total) } 
        : c
    );

    // Double entry for Credit Note
    const journalLines = [
      { accountCode: "40100", accountName: "إيرادات مبيعات رخص البرمجيات", debit: invoice.subtotal, credit: 0 },
      { accountCode: "21500", accountName: "التزامات ضريبة القيمة المضافة مخرجات", debit: invoice.vatAmount, credit: 0 },
      { accountCode: "11100", accountName: "العملاء والذمم المدينة التجارية", debit: 0, credit: invoice.total }
    ];

    // Update global state
    setStock(updatedStock);
    setCustomers(updatedCustomers);
    setSalesReturns([newReturn, ...salesReturns]);
    setSalesInvoices(salesInvoices.filter(i => i.id !== invoice.id)); // Remove or mark returned

    const updatedAccounts = accounts.map(acc => {
      let change = 0;
      journalLines.forEach(l => {
        if (l.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") change += (l.debit - l.credit);
          else change += (l.credit - l.debit);
        }
      });
      return { ...acc, balance: acc.balance + change };
    });
    setAccounts(updatedAccounts);

    showNotification(`تم إعداد الإشعار الدائن لمرتجع المبيعات ${returnId} وإرجاع كميات المنتجات للمستودع وإلغاء القيد المالي.`);
  };

  // --- ACTIONS: PROCUREMENT CYCLE ---

  // 1. Create Purchase Request
  const handleCreatePurchaseRequest = (sku: string, qty: number) => {
    const sItem = stock.find(s => s.sku === sku);
    if (!sItem) return;

    const newRequest = {
      id: `PREQ-2026-00${purchaseRequests.length + 1}`,
      department: "البنية التحتية والشبكات",
      requestedBy: "م. أحمد عاصم",
      date: new Date().toISOString().split("T")[0],
      items: [{ sku, name: sItem.name, quantity: qty }],
      status: "Approved"
    };

    setPurchaseRequests([newRequest, ...purchaseRequests]);
    showNotification(`تم تسجيل طلب الشراء الداخلي بنجاح بالرمز: ${newRequest.id}`);
  };

  // 2. Launch RFQ for approved requests
  const handleCreateRFQ = (req: any) => {
    const newRfq = {
      id: `RFQ-2026-00${rfqs.length + 1}`,
      requestId: req.id,
      date: new Date().toISOString().split("T")[0],
      suppliers: ["SUPP-001", "SUPP-002"],
      status: "Completed",
      lowestBid: 16800
    };

    setRfqs([newRfq, ...rfqs]);
    setPurchaseRequests(purchaseRequests.map(r => r.id === req.id ? { ...r, status: "RFQ Issued" } : r));
    showNotification(`تم تعميم طلب التسعير الموردين ${newRfq.id} للحصول على أفضل عطاء تكلفة للشحنة.`);
  };

  // 3. Purchase Order (RFQ -> Purchase Order)
  const handleCreatePurchaseOrder = (rfq: any) => {
    const req = purchaseRequests.find(r => r.id === rfq.requestId);
    if (!req) return;

    const supplier = suppliers[0]; // Arab Computers
    const totalWithVat = rfq.lowestBid * 1.14; // simplified pricing

    const newPO = {
      id: `PORD-2026-00${purchaseOrders.length + 1}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().split("T")[0],
      items: req.items.map((it: any) => ({ ...it, price: rfq.lowestBid })),
      total: totalWithVat,
      status: "Dispatched",
      isReceived: false
    };

    setPurchaseOrders([newPO, ...purchaseOrders]);
    setRfqs(rfqs.map(r => r.id === rfq.id ? { ...r, status: "Order Placed" } : r));
    showNotification(`تم إبرام وتعميم أمر الشراء المعتمد ${newPO.id} إلى المورد ${supplier.name}.`);
  };

  // 4. Goods Receipt & Stock Increment (إذن استلام السلع)
  const handleReceiveGoods = (po: any) => {
    const receiptId = `RECP-2026-00${goodsReceipts.length + 1}`;
    
    const newReceipt = {
      id: receiptId,
      purchaseOrderId: po.id,
      supplierName: po.supplierName,
      date: new Date().toISOString().split("T")[0],
      items: po.items,
      status: "Received"
    };

    // Increment Stock
    const updatedStock = stock.map(s => {
      const match = po.items.find((item: any) => item.sku === s.sku);
      if (match) {
        return { ...s, quantity: s.quantity + match.quantity };
      }
      return s;
    });

    setStock(updatedStock);
    setGoodsReceipts([newReceipt, ...goodsReceipts]);
    setPurchaseOrders(purchaseOrders.map(o => o.id === po.id ? { ...o, isReceived: true } : o));
    showNotification(`تم إعداد سند استلام البضائع ${receiptId} وإدراج الكميات المشتراة بالمخازن كأصول جارية.`);
  };

  return (
    <div className="space-y-6" id="sales-procurement-main">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5 text-right">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${clr.bg} ${clr.text} border ${clr.border}`}>
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-100">محرك دورة المبيعات والمشتريات المتكامل</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            دورة مستندات محاسبية ومخزنية متكاملة من عروض الأسعار والطلب حتى التسليم ومرتجع المشتريات والمبيعات مع تتبع الضوابط الائتمانية.
          </p>
        </div>

        {/* Global tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-800 font-sans font-bold text-xs">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "sales" ? "bg-slate-800 text-cyan-400 border border-slate-700/60" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            إدارة المبيعات (Sales Ledger)
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`px-4 py-2 rounded-md transition-all cursor-pointer ${
              activeTab === "purchases" ? "bg-slate-800 text-cyan-400 border border-slate-700/60" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            إدارة المشتريات (Procurement Engine)
          </button>
        </div>
      </div>

      {/* Live notification message */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn text-right ${
          notification.type === "success" 
            ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" 
            : "bg-red-950/20 border-red-500/20 text-red-400"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span className="text-xs font-semibold">{notification.text}</span>
        </div>
      )}

      {/* SALES ENGINE MODULE CONTAINER */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          {/* Sub menu tabs for Sales */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/60 pb-px text-right">
            <button
              onClick={() => setSalesSubTab("quotations")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                salesSubTab === "quotations" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              عروض الأسعار (Quotations)
            </button>
            <button
              onClick={() => setSalesSubTab("orders")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                salesSubTab === "orders" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              أوامر المبيعات (Sales Orders)
            </button>
            <button
              onClick={() => setSalesSubTab("delivery")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                salesSubTab === "delivery" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              إذن صرف مخزن وتسليم (Delivery Notes)
            </button>
            <button
              onClick={() => setSalesSubTab("returns")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                salesSubTab === "returns" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              مرتجع المبيعات (Credit Notes)
            </button>
            <button
              onClick={() => setSalesSubTab("credit-control")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                salesSubTab === "credit-control" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              الرقابة على حد الائتمان (Credit Control)
            </button>
          </div>

          {/* QUOTATIONS ENGINE CONTROLS */}
          {salesSubTab === "quotations" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Form to build quotation */}
              <div className="xl:col-span-1 bg-[#0b0f19]/80 border border-slate-800/80 rounded-xl p-5 space-y-4 text-right">
                <h3 className="text-xs font-bold text-cyan-400 uppercase font-display border-b border-slate-800 pb-2">◀ إنشاء عرض سعر ذكي</h3>
                
                {/* Client selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">العميل المستهدف</label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Add Item to Cart */}
                <div className="bg-slate-900/30 p-3.5 rounded-lg border border-slate-800 space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold block">إضافة بند مالي وتسعيره</span>
                  
                  <div>
                    <select
                      value={selectedSku}
                      onChange={(e) => handleSkuChange(e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none"
                    >
                      {stock.map(s => (
                        <option key={s.sku} value={s.sku}>{s.name} ({s.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">الكمية</label>
                      <input
                        type="number"
                        value={itemQty}
                        min={1}
                        onChange={(e) => setItemQty(Number(e.target.value))}
                        className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">السعر الاسمي</label>
                      <input
                        type="number"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(Number(e.target.value))}
                        className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700 rounded-md px-2.5 py-1 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs py-1.5 rounded-md font-bold transition-all cursor-pointer"
                  >
                    + إضافة للمسودة
                  </button>
                </div>

                {/* Pricing settings */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">نسبة الخصم التجاري (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700 rounded-md pl-8 pr-2.5 py-1.5 focus:outline-none"
                    />
                    <Percent className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>

                {/* Complete Quotation */}
                <button
                  type="button"
                  onClick={handleCreateQuotation}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" /> إصدار وحفظ عرض السعر
                </button>
              </div>

              {/* Live pricing display and current items */}
              <div className="xl:col-span-2 bg-[#0b0f19]/80 border border-slate-800/80 rounded-xl p-5 space-y-4 text-right flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-slate-300 font-display">🛒 المسودة النشطة والبنود</h3>
                    <span className="text-[10px] text-slate-500 font-mono">السلع المرفقة: {cartItems.length}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                          <th className="p-2.5 font-bold">المنتج</th>
                          <th className="p-2.5 font-mono">SKU</th>
                          <th className="p-2.5 text-center">الكمية</th>
                          <th className="p-2.5 text-left">السعر</th>
                          <th className="p-2.5 text-left">الإجمالي</th>
                          <th className="p-2.5 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-sans">
                        {cartItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-900/10">
                            <td className="p-2.5 text-slate-200 font-bold">{item.name}</td>
                            <td className="p-2.5 font-mono text-slate-400">{item.sku}</td>
                            <td className="p-2.5 text-center text-slate-200">{item.quantity}</td>
                            <td className="p-2.5 text-left text-slate-300 font-mono">{item.price.toLocaleString()}</td>
                            <td className="p-2.5 text-left text-emerald-400 font-bold font-mono">{(item.quantity * item.price).toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleRemoveFromCart(item.sku)}
                                className="text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                        {cartItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">لا توجد سلع بالمسودة حالياً.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary panel (Pricing Engine) */}
                <div className="bg-[#0f1425] rounded-xl border border-slate-800 p-4.5 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-sans">
                  <div>
                    <span className="text-slate-500 block">الإجمالي قبل الخصم</span>
                    <strong className="text-slate-200 font-mono font-bold">{activeCartPrices.rawSubtotal.toLocaleString()} {config.currency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">قيمة الخصم ({discountPercent}%)</span>
                    <strong className="text-amber-500 font-mono font-bold">-{activeCartPrices.discountAmount.toLocaleString()} {config.currency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ضريبة القيمة المضافة (14%)</span>
                    <strong className="text-rose-400 font-mono font-bold">+{activeCartPrices.vatAmount.toLocaleString()} {config.currency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ضريبة الخصم والتحصيل (1%)</span>
                    <strong className="text-emerald-400 font-mono font-bold">-{activeCartPrices.whtAmount.toLocaleString()} {config.currency}</strong>
                  </div>
                  <div className="border-r border-slate-800 pr-3 font-display">
                    <span className="text-cyan-400 font-bold block">صافي القيمة النهائية</span>
                    <strong className="text-cyan-400 font-mono text-sm font-bold">{activeCartPrices.total.toLocaleString()} {config.currency}</strong>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* LIST OF SAVED QUOTATIONS */}
          {salesSubTab === "quotations" && quotations.length > 0 && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h4 className="text-xs font-bold text-slate-300 font-display border-b border-slate-800 pb-2">◀ عروض الأسعار الصادرة بنظام الأرشفة</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                      <th className="p-3">رقم العرض</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-left">قيمة العرض</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {quotations.map(q => (
                      <tr key={q.id} className="hover:bg-slate-900/10 font-sans">
                        <td className="p-3 font-bold text-cyan-400 font-mono">{q.id}</td>
                        <td className="p-3 text-slate-200 font-bold">{q.customerName}</td>
                        <td className="p-3 text-slate-400 font-mono">{q.date}</td>
                        <td className="p-3 text-left font-bold text-emerald-400 font-mono">{q.total.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            q.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {q.status === "Approved" ? "مؤكد وموافق عليه" : "بانتظار الاعتماد"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPrintDoc({ docType: "quotation", data: q })}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded border border-slate-700 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                              title="عرض وطباعة عرض السعر"
                            >
                              <Printer className="h-3 w-3 text-cyan-400" /> طباعة
                            </button>
                            {q.status !== "Approved" && (
                              <button
                                onClick={() => handleApproveQuotation(q)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                              >
                                ترقية لأمر بيع تأكيدي ◀
                              </button>
                            )}
                            {q.status === "Approved" && (
                              <span className="text-[10px] text-slate-500 font-bold">تم التحويل بنجاح</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SALES ORDERS TAB */}
          {salesSubTab === "orders" && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ سجل أوامر البيع والتعاقدات المؤكدة (Sales Orders Book)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                      <th className="p-3">رقم الأمر</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">تاريخ التعاقد</th>
                      <th className="p-3 text-left">قيمة التعاقد</th>
                      <th className="p-3 text-center">التسليم للمخازن</th>
                      <th className="p-3 text-center">إصدار الفاتورة الضريبية</th>
                      <th className="p-3 text-center">إجراءات الدورة المستندية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {salesOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold text-cyan-400 font-mono">{o.id}</td>
                        <td className="p-3 text-slate-200 font-bold">{o.customerName}</td>
                        <td className="p-3 text-slate-400 font-mono">{o.date}</td>
                        <td className="p-3 text-left font-bold text-slate-100 font-mono">{o.total.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${o.isDelivered ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {o.isDelivered ? "تم التسليم بالكامل" : "معلق لم يصرف بعد"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${o.isInvoiced ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {o.isInvoiced ? "فاتورة ضريبية منشأة" : "معلق لم يفوتر"}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPrintDoc({ docType: "sales_order", data: o })}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded border border-slate-700 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                            title="طباعة أمر البيع"
                          >
                            <Printer className="h-3 w-3 text-emerald-400" /> طباعة
                          </button>
                          {!o.isDelivered && (
                            <button
                              onClick={() => handleDispatchDelivery(o)}
                              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Truck className="h-3 w-3" /> صرف وتسليم شحنة
                            </button>
                          )}
                          {o.isDelivered && !o.isInvoiced && (
                            <button
                              onClick={() => handleIssueInvoice(o)}
                              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" /> توليد الفاتورة الضريبية
                            </button>
                          )}
                          {o.isDelivered && o.isInvoiced && (
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> مكتمل
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DELIVERY NOTES */}
          {salesSubTab === "delivery" && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ أرشيف أذونات صرف السلع والتسليم للمخازن (Delivery Notes)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                      <th className="p-3">رقم إذن التسليم</th>
                      <th className="p-3">أمر المبيعات المرتبط</th>
                      <th className="p-3">العميل المستلم</th>
                      <th className="p-3">تاريخ الصرف والترحيل</th>
                      <th className="p-3">أصناف الشحنة المصروفة</th>
                      <th className="p-3 text-center">الوضعية اللوجستية</th>
                      <th className="p-3 text-center no-print">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {deliveryNotes.map(d => (
                      <tr key={d.id} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold text-pink-400 font-mono">{d.id}</td>
                        <td className="p-3 font-mono text-cyan-400">{d.salesOrderId}</td>
                        <td className="p-3 text-slate-200 font-bold">{d.customerName}</td>
                        <td className="p-3 text-slate-400 font-mono">{d.date}</td>
                        <td className="p-3 text-slate-300">
                          {d.items.map((it: any) => `${it.name} (${it.quantity})`).join("، ")}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-purple-500/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            Dispatched (منقول)
                          </span>
                        </td>
                        <td className="p-3 text-center no-print">
                          <button
                            type="button"
                            onClick={() => setSelectedPrintDoc({ docType: "delivery_note", data: d })}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded border border-slate-700 cursor-pointer flex items-center justify-center gap-1 mx-auto text-[9px] font-bold"
                            title="طباعة إذن التسليم"
                          >
                            <Printer className="h-3 w-3 text-pink-400" /> طباعة إذن الصرف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RETURNS & CREDIT NOTES */}
          {salesSubTab === "returns" && (
            <div className="space-y-6">
              
              {/* Select active invoice to return */}
              <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
                <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ معالجة مرتجع مبيعات وإصدار إشعار دائن مالياً (Credit Note Management)</h3>
                <p className="text-[11px] text-slate-400 font-sans">حدد الفاتورة المراد استردادها لإلغاء القيد المالي المحاسبي وإرجاع المنتجات المخزنية تلقائياً للأستاذ:</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                        <th className="p-3">رقم الفاتورة</th>
                        <th className="p-3">العميل</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3 text-left">قيمة الفاتورة الإجمالية</th>
                        <th className="p-3 text-center">إجراء مرتجع مالي ومخزني</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {isLoadingSalesInvoices ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mr-2 align-middle" />
                            جاري تحميل الفواتير الحية من قاعدة البيانات السحابية...
                          </td>
                        </tr>
                      ) : salesInvoicesError ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-rose-400">
                            {salesInvoicesError} 
                            <button type="button" onClick={() => fetchSalesInvoices()} className="text-cyan-400 underline ml-2 hover:text-cyan-300">
                              إعادة المحاولة
                            </button>
                          </td>
                        </tr>
                      ) : (
                        localSalesInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-900/10 font-sans">
                            <td className="p-3 font-bold text-cyan-400 font-mono">{inv.id}</td>
                            <td className="p-3 text-slate-200 font-bold">{inv.customerName}</td>
                            <td className="p-3 text-slate-400 font-mono">{inv.date}</td>
                            <td className="p-3 text-left font-bold text-emerald-400 font-mono">{inv.total.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleProcessSalesReturn(inv)}
                                className="bg-rose-950/40 text-rose-400 border border-rose-500/30 hover:bg-rose-900/30 font-bold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                              >
                                إصدار إشعار دائن مالي لمرتجع مبيعات ✕
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                      {!isLoadingSalesInvoices && !salesInvoicesError && localSalesInvoices.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد فواتير مبيعات نشطة حالياً بالنظام لإرجاعها.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sales Invoices Pagination controls */}
                {!isLoadingSalesInvoices && !salesInvoicesError && salesInvoicesTotal > salesInvoicesLimit && (
                  <div className="flex items-center justify-between bg-slate-900/20 p-3.5 border-t border-slate-800 rounded-b-xl text-xs font-sans mt-2">
                    <div className="text-slate-400">
                      عرض الصفحة <strong>{salesInvoicesPage}</strong> من إجمالي <strong>{Math.ceil(salesInvoicesTotal / salesInvoicesLimit)}</strong> صفحات (الإجمالي: {salesInvoicesTotal} فاتورة)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={salesInvoicesPage === 1}
                        onClick={() => setSalesInvoicesPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded transition-all cursor-pointer text-[10px] font-bold"
                      >
                        الصفحة السابقة
                      </button>
                      <button
                        type="button"
                        disabled={salesInvoicesPage >= Math.ceil(salesInvoicesTotal / salesInvoicesLimit)}
                        onClick={() => setSalesInvoicesPage(p => p + 1)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded transition-all cursor-pointer text-[10px] font-bold"
                      >
                        الصفحة التالية
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ARCHIVE RETURNS */}
              {salesReturns.length > 0 && (
                <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 font-display border-b border-slate-800 pb-2">◀ أرشيف مرتجعات المبيعات المسجلة بالدليل (Credit Notes Log)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                          <th className="p-3">رقم الإشعار الدائن</th>
                          <th className="p-3">كود الفاتورة الأصلية</th>
                          <th className="p-3">اسم العميل</th>
                          <th className="p-3">تاريخ الاسترداد</th>
                          <th className="p-3 text-left">مبلغ التصفية المرتجع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {salesReturns.map(ret => (
                          <tr key={ret.id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-bold text-rose-400 font-mono">{ret.id}</td>
                            <td className="p-3 font-mono text-cyan-400">{ret.invoiceId}</td>
                            <td className="p-3 text-slate-200 font-bold">{ret.customerName}</td>
                            <td className="p-3 text-slate-400 font-mono">{ret.date}</td>
                            <td className="p-3 text-left font-bold text-rose-400 font-mono">{ret.total.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* CREDIT CONTROL PANELS */}
          {salesSubTab === "credit-control" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              
              <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">📊 مؤشرات حدود الائتمان ومستويات المديونية المسموحة للعملاء</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  يقوم محرك الرقابة الائتمانية بمنع وترشيح أي فواتير أو أوامر مبيعات آجلة إذا تجاوز إجمالي مديونية العميل المتبقية السقف المحدد محاسبياً.
                </p>

                <div className="space-y-4">
                  {customers.map(c => {
                    const limit = CREDIT_LIMITS[c.id] || 50000;
                    const percent = Math.min(100, (c.balance / limit) * 100);
                    return (
                      <div key={c.id} className="bg-slate-900/40 border border-slate-800 p-3.5 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-xs font-sans">
                          <span className="font-bold text-slate-200">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">الرمز: {c.id}</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${percent}%` }}
                            className={`h-full rounded-full ${
                              percent > 80 ? "bg-red-500" : percent > 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] font-sans text-slate-400">
                          <div>الرصيد المدين: <strong className="text-slate-200">{c.balance.toLocaleString()} {config.currency}</strong></div>
                          <div>سقف الائتمان: <strong className="text-slate-200">{limit.toLocaleString()} {config.currency}</strong></div>
                          <div className="text-left">استهلاك الحد: <strong className={percent > 80 ? "text-red-400 font-bold" : "text-emerald-400"}>{percent.toFixed(1)}%</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informative Credit Policy Box */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-cyan-400 font-display">⚠️ معايير الأمان للسياسات الائتمانية</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    للوقاية من تراكم الديون المعدومة وتعطيل التدفقات النقدية الجارية، يتم تفعيل القواعد الآتية:
                  </p>
                  <ul className="list-disc pr-4 space-y-1.5 text-[10px] text-slate-400 font-sans">
                    <li>لا يمكن ترحيل أو تدوين أي قيد استحقاق بيع آجل لعميل يتعدى استهلاك ائتمانه 100%.</li>
                    <li>العملاء بنسبة تفوق 80% يتم إطلاق تحذير بريدي وأوتوماتيكي لقسم الائتمان لمتابعة المبالغ المستحقة.</li>
                    <li>يرتبط تحصيل الشيكات الصادرة من العملاء بتصفية وتخفيض فوري لتلك الموازين.</li>
                  </ul>
                </div>
                <div className="bg-cyan-950/20 text-cyan-400 border border-cyan-500/20 p-3 rounded text-[11px] font-sans mt-4">
                  💡 <strong>إجراء محاسبي آلي:</strong> يحمي هذا الأمان الذاتي الميزانية ويمنع المبيعات العشوائية غير الآمنة بنظام الفروع المتعددة.
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* PROCUREMENT ENGINE TAB */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          {/* Sub menu tabs for Purchases */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/60 pb-px text-right">
            <button
              onClick={() => setPurchaseSubTab("requests")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                purchaseSubTab === "requests" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              طلبات الشراء الداخلية (Purchase Requests)
            </button>
            <button
              onClick={() => setPurchaseSubTab("rfq")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                purchaseSubTab === "rfq" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              عروض أسعار الموردين (RFQ)
            </button>
            <button
              onClick={() => setPurchaseSubTab("orders")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                purchaseSubTab === "orders" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              أوامر الشراء الرسمية (Purchase Orders)
            </button>
            <button
              onClick={() => setPurchaseSubTab("receipt")}
              className={`px-3 py-2 text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
                purchaseSubTab === "receipt" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              استلام البضائع والمستندات (Goods Receipt)
            </button>
          </div>

          {/* PURCHASE REQUESTS */}
          {purchaseSubTab === "requests" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start text-right">
                
                <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ تقديم طلب توريد داخلي</h3>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">السلعة المطلوبة من دليل المخزن</label>
                    <select
                      id="proc-request-sku"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none"
                    >
                      {stock.map(s => (
                        <option key={s.sku} value={s.sku}>{s.name} ({s.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">الكمية المطلوبة لتجديد مستويات الأمان</label>
                    <input
                      type="number"
                      id="proc-request-qty"
                      defaultValue={10}
                      className="w-full bg-[#141b2d] text-xs font-mono text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const skuEl = document.getElementById("proc-request-sku") as HTMLSelectElement;
                      const qtyEl = document.getElementById("proc-request-qty") as HTMLInputElement;
                      if (skuEl && qtyEl) {
                        handleCreatePurchaseRequest(skuEl.value, Number(qtyEl.value));
                      }
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    + تقديم طلب الشراء
                  </button>
                </div>

                {/* List of Requests */}
                <div className="md:col-span-2 bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 font-display border-b border-slate-800 pb-2">📋 كشوف طلبات التوريد والشراء المرفوعة</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans">
                          <th className="p-2.5">رقم الطلب</th>
                          <th className="p-2.5">القسم الطالب</th>
                          <th className="p-2.5">المنشئ</th>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">البنود</th>
                          <th className="p-2.5 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {purchaseRequests.map(r => (
                          <tr key={r.id} className="hover:bg-slate-900/10 font-sans">
                            <td className="p-2.5 font-bold text-cyan-400 font-mono">{r.id}</td>
                            <td className="p-2.5 text-slate-200 font-bold">{r.department}</td>
                            <td className="p-2.5 text-slate-300">{r.requestedBy}</td>
                            <td className="p-2.5 text-slate-400 font-mono">{r.date}</td>
                            <td className="p-2.5 text-slate-300">
                              {r.items.map((it: any) => `${it.name} (${it.quantity})`).join(", ")}
                            </td>
                            <td className="p-2.5 text-center">
                              {r.status === "Approved" ? (
                                <button
                                  onClick={() => handleCreateRFQ(r)}
                                  className="bg-purple-950/40 text-purple-400 border border-purple-500/30 hover:bg-purple-900/40 text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                                >
                                  طرح طلب عروض أسعار (RFQ) ◀
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500">تم تعميم طلب السعر</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* RFQs */}
          {purchaseSubTab === "rfq" && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ إدارة طلبات تسعير الموردين ومقارنة العطاءات العادلة (RFQ Matrix)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                      <th className="p-3">رقم الـ RFQ</th>
                      <th className="p-3">طلب الشراء المرتبط</th>
                      <th className="p-3">تاريخ الطرح بالمنصة</th>
                      <th className="p-3">الموردين المستجيبين</th>
                      <th className="p-3 text-left">أقل عرض سعر مستلم</th>
                      <th className="p-3 text-center">ترقية المعاملة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {rfqs.map(r => (
                      <tr key={r.id} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold text-purple-400 font-mono">{r.id}</td>
                        <td className="p-3 font-mono text-cyan-400">{r.requestId}</td>
                        <td className="p-3 text-slate-400 font-mono">{r.date}</td>
                        <td className="p-3 text-slate-300">الشركة العربية للحواسب، شركة القاهرة للاستيراد والتكنولوجيا</td>
                        <td className="p-3 text-left font-bold text-emerald-400 font-mono">{r.lowestBid.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-center">
                          {r.status === "Completed" ? (
                            <button
                              onClick={() => handleCreatePurchaseOrder(r)}
                              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                            >
                              اعتماد وإصدار أمر الشراء (PO) ◀
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold">تم إطلاق أمر الشراء</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PURCHASE ORDERS */}
          {purchaseSubTab === "orders" && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ أوامر الشراء الرسمية المعتمدة (Purchase Orders Book)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                      <th className="p-3">رقم أمر الشراء</th>
                      <th className="p-3">الشركة الموردة</th>
                      <th className="p-3">تاريخ الإصدار</th>
                      <th className="p-3 text-left">التكلفة والالتزام المالي</th>
                      <th className="p-3 text-center">الوضعية اللوجستية شحن</th>
                      <th className="p-3 text-center">إجراءات لوجستية ومستودعية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-slate-900/10">
                        <td className="p-3 font-bold text-cyan-400 font-mono">{po.id}</td>
                        <td className="p-3 text-slate-200 font-bold">{po.supplierName}</td>
                        <td className="p-3 text-slate-400 font-mono">{po.date}</td>
                        <td className="p-3 text-left font-bold text-emerald-400 font-mono">{po.total.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${po.isReceived ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"}`}>
                            {po.isReceived ? "تم الاستلام وتخزينه" : "قيد الشحن والتصدير"}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5 mx-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedPrintDoc({ docType: "purchase_order", data: po })}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded border border-slate-700 cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                            title="طباعة أمر الشراء"
                          >
                            <Printer className="h-3 w-3 text-cyan-400" /> طباعة
                          </button>
                          {!po.isReceived ? (
                            <button
                              onClick={() => handleReceiveGoods(po)}
                              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                            >
                              تخزين واستلام الشحنة مخزنياً ◀
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold">تم إدراج الشحنة بنجاح</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GOODS RECEIPTS */}
          {purchaseSubTab === "receipt" && (
            <div className="bg-[#0b0f19]/80 border border-slate-800 rounded-xl p-5 text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-200 font-display border-b border-slate-800 pb-2">◀ سندات استلام البضائع بالساحة الجمركية والمخازن (Goods Receipts Log)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                      <th className="p-3">رقم سند الاستلام</th>
                      <th className="p-3">أمر الشراء الأصلي</th>
                      <th className="p-3">المورد المورّد للسلع</th>
                      <th className="p-3">تاريخ الفحص والترصيد</th>
                      <th className="p-3">البنود المستلمة وموازينها</th>
                      <th className="p-3 text-center">حالة الفحص اللوجستي</th>
                      <th className="p-3 text-center no-print">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {goodsReceipts.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-900/10 font-sans">
                        <td className="p-3 font-bold text-pink-400 font-mono">{rec.id}</td>
                        <td className="p-3 font-mono text-cyan-400">{rec.purchaseOrderId}</td>
                        <td className="p-3 text-slate-200 font-bold">{rec.supplierName}</td>
                        <td className="p-3 text-slate-400 font-mono">{rec.date}</td>
                        <td className="p-3 text-slate-300">
                          {rec.items.map((it: any) => `${it.name} (${it.quantity})`).join(", ")}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            تطابق كامل وفحص ناجح 100%
                          </span>
                        </td>
                        <td className="p-3 text-center no-print">
                          <button
                            type="button"
                            onClick={() => setSelectedPrintDoc({ docType: "goods_receipt", data: rec })}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded border border-slate-700 cursor-pointer flex items-center justify-center gap-1 mx-auto text-[9px] font-bold"
                            title="طباعة سند الاستلام"
                          >
                            <Printer className="h-3 w-3 text-pink-400" /> طباعة السند
                          </button>
                        </td>
                      </tr>
                    ))}
                    {goodsReceipts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">لا توجد أذونات استلام سلع مسجلة حالياً بالساحة.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SALES / PROCUREMENT DOCUMENT PRINT MODAL */}
      {selectedPrintDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-[#0c101f] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fadeIn text-right my-8">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between no-print">
              <div>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/10">
                  معاينة وطباعة المستند المستندي الرسمي
                </span>
                <h3 className="text-base font-bold text-slate-200 mt-1">
                  {selectedPrintDoc.docType === "quotation" ? "عرض سعر صادرة" :
                   selectedPrintDoc.docType === "sales_order" ? "أمر مبيعات معتمد" :
                   selectedPrintDoc.docType === "delivery_note" ? "إذن تسليم بضاعة للمخازن" :
                   selectedPrintDoc.docType === "purchase_order" ? "أمر شراء وتوريد رسمي" : "إذن فحص واستلام بضائع"} : <span className="font-mono text-cyan-400">{selectedPrintDoc.data.id}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrintDoc(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 hover:bg-slate-900 rounded transition-all"
              >
                ✕
              </button>
            </div>

            {/* Document Body */}
            <div className="p-8 space-y-6 text-xs text-slate-300 font-sans" id="printable-sales-doc">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-100 font-display">{config.company}</h2>
                  <p className="text-slate-400 text-[10px]">{config.branch}</p>
                  <p className="text-slate-500 font-mono text-[9px]">الرقم الضريبي الموحد: 493-201-954</p>
                  <p className="text-slate-500 text-[9px]">قطاع الخدمات التكنولوجية والبرمجيات المتقدمة</p>
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider font-display">
                    {selectedPrintDoc.docType === "quotation" ? "عرض سعر فني ومالي" :
                     selectedPrintDoc.docType === "sales_order" ? "أمر مبيعات معمد" :
                     selectedPrintDoc.docType === "delivery_note" ? "إذن صرف بضائع خارجي" :
                     selectedPrintDoc.docType === "purchase_order" ? "أمر شراء وتوريد رسمي" : "سند استلام وفحص بضائع"}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400">رقم: {selectedPrintDoc.data.id}</p>
                  <p className="font-mono text-[10px] text-slate-400">التاريخ: {selectedPrintDoc.data.date}</p>
                  <p className="font-mono text-[10px] text-slate-400">العملة الأساسية: {config.currency}</p>
                </div>
              </div>

              {/* Stakeholder details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">
                    {["quotation", "sales_order", "delivery_note"].includes(selectedPrintDoc.docType) ? "العميل المستهدف" : "المورد / الجهة البائعة"}
                  </span>
                  <p className="font-bold text-slate-200 text-sm">
                    {["quotation", "sales_order", "delivery_note"].includes(selectedPrintDoc.docType) 
                      ? selectedPrintDoc.data.customerName 
                      : selectedPrintDoc.data.supplierName || "المورد المعتمد"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    كود التعريف: {selectedPrintDoc.data.customerId || selectedPrintDoc.data.supplierId || "PARTNER-901"}
                  </p>
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-slate-500 block">تفاصيل المستند والأمن</span>
                  <p className="text-[10px] text-slate-400">تاريخ الطباعة: {new Date().toISOString().split("T")[0]}</p>
                  <p className="text-[10px] text-slate-400">حالة المستند بالمنظومة: <span className="text-emerald-400 font-bold">معتمد ومؤرشف ✓</span></p>
                </div>
              </div>

              {/* Table of Items */}
              {selectedPrintDoc.data.items && selectedPrintDoc.data.items.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                        <th className="p-3">رمز SKU</th>
                        <th className="p-3">تفاصيل الصنف / المنتج</th>
                        <th className="p-3 text-center">الكمية</th>
                        {selectedPrintDoc.data.items[0].price !== undefined && (
                          <>
                            <th className="p-3 text-left">سعر الوحدة</th>
                            <th className="p-3 text-left">الإجمالي الفرعي</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {selectedPrintDoc.data.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/10 font-sans">
                          <td className="p-3 font-mono text-[10px] text-slate-500">{item.sku}</td>
                          <td className="p-3 font-bold text-slate-200">{item.name || "رخصة برمجية ممتازة"}</td>
                          <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                          {item.price !== undefined && (
                            <>
                              <td className="p-3 text-left font-mono">{item.price.toLocaleString()}</td>
                              <td className="p-3 text-left font-mono font-bold text-slate-100">{(item.quantity * item.price).toLocaleString()}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl text-center text-slate-500 text-[10px]">لا توجد بنود تفصيلية مدرجة بهذا المستند.</div>
              )}

              {/* Pricing breakdown for financial docs */}
              {selectedPrintDoc.data.total !== undefined && (
                <div className="flex justify-between items-end border-t border-slate-800/85 pt-4">
                  <div className="w-1/2 text-[10px] text-slate-400 space-y-1 text-right">
                    <p className="font-bold text-slate-300">شروط وأحكام الاعتماد:</p>
                    <p>يسري هذا المستند لمدة 14 يوماً من تاريخ الإصدار ويخضع لقوانين ضريبة الدخل والخصم نموذج 41.</p>
                  </div>
                  <div className="w-1/3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2 font-mono text-right">
                    <div className="flex justify-between text-slate-400">
                      <span className="font-sans">القيمة الفرعية:</span>
                      <span>{(selectedPrintDoc.data.subtotal || selectedPrintDoc.data.total).toLocaleString()} {config.currency}</span>
                    </div>
                    {selectedPrintDoc.data.discount !== undefined && selectedPrintDoc.data.discount > 0 && (
                      <div className="flex justify-between text-amber-500">
                        <span className="font-sans">خصم تجاري:</span>
                        <span>- {selectedPrintDoc.data.discount.toLocaleString()} {config.currency}</span>
                      </div>
                    )}
                    {selectedPrintDoc.data.vat !== undefined && selectedPrintDoc.data.vat > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span className="font-sans">ضريبة قيمة مضافة (14%):</span>
                        <span>+ {selectedPrintDoc.data.vat.toLocaleString()} {config.currency}</span>
                      </div>
                    )}
                    {selectedPrintDoc.data.wht !== undefined && selectedPrintDoc.data.wht > 0 && (
                      <div className="flex justify-between text-cyan-400 pb-2 border-b border-slate-800">
                        <span className="font-sans">خصم منبع (1%):</span>
                        <span>- {selectedPrintDoc.data.wht.toLocaleString()} {config.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-100 pt-1 text-sm font-sans">
                      <span>الصافي النهائي:</span>
                      <span className="text-cyan-400 font-mono text-sm font-bold">{selectedPrintDoc.data.total.toLocaleString()} {config.currency}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Approvals Block */}
              <div className="grid grid-cols-3 gap-4 pt-10 border-t border-slate-800/60 text-center text-[10px] font-sans text-slate-400">
                <div className="space-y-4">
                  <span>المعد والمستخرج</span>
                  <p className="font-bold text-slate-300 border-b border-slate-800/30 pb-1 mx-4">المهندس المسؤول</p>
                </div>
                <div className="space-y-4">
                  <span>المطابقة الفنية والمستودعية</span>
                  <p className="font-bold text-slate-300 border-b border-slate-800/30 pb-1 mx-4">مدير الحركة والمخازن</p>
                </div>
                <div className="space-y-4">
                  <span>الاعتماد والختم الرسمي</span>
                  <p className="font-bold text-emerald-400 border-b border-slate-800/30 pb-1 mx-4">أ. عماد عبد اللطيف</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex flex-col gap-3 no-print">
              {typeof window !== "undefined" && window.self !== window.top && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10.5px] text-amber-400 text-right leading-normal">
                  ⚠️ <b>تنبيه فني:</b> قيود الأمان في المتصفحات تمنع نافذة الطباعة من الظهور داخل الإطارات المدمجة (Iframe). يرجى الضغط على زر <b>"فتح في نافذة جديدة" (Open in new tab)</b> أعلى يسار/يمين الشاشة للتمتع بالطباعة الكاملة وحفظ التقارير بصيغة PDF بنجاح 100%.
                </div>
              )}
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("printable-sales-doc");
                    if (el) {
                      el.classList.add("printable-area");
                      window.print();
                      el.classList.remove("printable-area");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Printer className="h-4 w-4 text-cyan-400" /> طباعة المستند / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPrintDoc(null)}
                  className="px-5 py-2 bg-[#12182a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer border border-slate-800"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
