import React, { useState, useEffect } from "react";

export interface FixedAsset {
  id: string;
  name: string;
  category: "Property" | "Equipment" | "Vehicles" | "Software";
  purchaseDate: string;
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  bookValue: number;
  status: "Active" | "Fully Depreciated" | "Retired";
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "Pending" | "Reconciled";
  matchedJournalId?: string;
}

export interface CurrencyRate {
  code: string;
  name: string;
  rateToBase: number;
}
import { 
  Calculator, 
  FileText, 
  Plus, 
  CheckCircle, 
  TrendingUp, 
  Coins, 
  Scale, 
  Check,
  Building,
  Hash,
  AlertCircle,
  Users,
  Building2,
  FileSpreadsheet,
  ArrowRightLeft,
  Boxes,
  Printer,
  Search,
  Briefcase,
  CreditCard,
  CheckSquare,
  Calendar,
  FileDown
} from "lucide-react";
import { 
  ChartOfAccount, 
  JournalEntry, 
  JournalLine, 
  CostCenter, 
  ProfitCenter, 
  ERPConfig,
  Customer,
  Supplier,
  PurchaseInvoice,
  SalesInvoice,
  StockItem,
  Cheque
} from "../types";
import IFRS18Dashboard from "./IFRS18Dashboard";

interface AccountingModuleProps {
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  costCenters: CostCenter[];
  setCostCenters: React.Dispatch<React.SetStateAction<CostCenter[]>>;
  profitCenters: ProfitCenter[];
  setProfitCenters: React.Dispatch<React.SetStateAction<ProfitCenter[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  salesInvoices: SalesInvoice[];
  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  cheques?: Cheque[];
  setCheques?: React.Dispatch<React.SetStateAction<Cheque[]>>;
  config: ERPConfig;
}

export default function AccountingModule({
  accounts = [],
  setAccounts,
  journalEntries = [],
  setJournalEntries,
  costCenters = [],
  setCostCenters,
  profitCenters = [],
  setProfitCenters,
  customers = [],
  setCustomers,
  suppliers = [],
  setSuppliers,
  purchaseInvoices = [],
  setPurchaseInvoices,
  salesInvoices = [],
  setSalesInvoices,
  stock = [],
  setStock,
  cheques: propCheques,
  setCheques: propSetCheques,
  config
 }: AccountingModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general-ledger" | "journal-form" | "invoices" | "sub-ledgers" | "inventory-ledger" | "reports" | "tax-calculator" | "assets" | "bank-recon" | "currency" | "cheques">("general-ledger");
  const [drillDownAccountCode, setDrillDownAccountCode] = useState<string | null>(null);

  // States for Unified IFRS Financial Statements & Filtering
  const [cashFlowReport, setCashFlowReport] = useState<any>(null);
  const [cashFlowMethod, setCashFlowMethod] = useState<"direct" | "indirect">("direct");
  const [ifrsActiveView, setIfrsActiveView] = useState<"all" | "balance_sheet" | "income" | "cash_flow" | "equity" | "notes">("all");
  const [accountCategoryFilter, setAccountCategoryFilter] = useState<"all" | "Asset" | "Liability" | "Equity" | "Revenue" | "Expense">("all");
  const [equityReport, setEquityReport] = useState<any[]>([]);

  // States for Egyptian VAT and Withholding Tax Portal compliance
  const [taxActiveTab, setTaxActiveTab] = useState<"calculator" | "vat-ledger" | "withholding-ledger">("calculator");
  const [isSubmittingVat, setIsSubmittingVat] = useState(false);
  const [vatSubmissionReceipt, setVatSubmissionReceipt] = useState<string | null>(null);
  const [vatStatusOverride, setVatStatusOverride] = useState<"Draft" | "Submitted">("Draft");
  const [isSubmittingForm41, setIsSubmittingForm41] = useState(false);
  const [form41Receipt, setForm41Receipt] = useState<string | null>(null);
  const [form41Status, setForm41Status] = useState<"Draft" | "Submitted">("Draft");
  const [vatSubmissions, setVatSubmissions] = useState<any[]>([]);
  const [form41Filings, setForm41Filings] = useState<any[]>([]);
  
  // Modal State for Journal Entry Voucher Detail
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntry | null>(null);

  // Modal State for Invoice Detail & Printing View
  const [selectedInvoice, setSelectedInvoice] = useState<((SalesInvoice | PurchaseInvoice) & { invoiceType: "sales" | "purchase" }) | null>(null);

  // Cheques tracking states (unified with App.tsx if available)
  const [localCheques, setLocalCheques] = useState<Cheque[]>([]);
  const cheques = propCheques !== undefined ? propCheques : localCheques;
  const setCheques = propSetCheques !== undefined ? propSetCheques : setLocalCheques;
  const [chequeSuccess, setChequeSuccess] = useState("");
  const [chequeError, setChequeError] = useState("");

  // New Cheque Form States
  const [newChqNumber, setNewChqNumber] = useState("");
  const [newChqBank, setNewChqBank] = useState("");
  const [newChqAmount, setNewChqAmount] = useState<number>(0);
  const [newChqDueDate, setNewChqDueDate] = useState("");
  const [newChqCustId, setNewChqCustId] = useState("");
  const [newChqBeneficiaryType, setNewChqBeneficiaryType] = useState<"Customer" | "ThirdParty">("Customer");
  const [newChqBeneficiaryName, setNewChqBeneficiaryName] = useState("");
  const [newChqNotes, setNewChqNotes] = useState("");

  // Endorsement dialog states
  const [endorseChqId, setEndorseChqId] = useState<string | null>(null);
  const [endorseSuppId, setEndorseSuppId] = useState("");
  const [endorseNotes, setEndorseNotes] = useState("");

  // Fixed Assets and Depreciation states
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [deprLogs, setDeprLogs] = useState<string[]>([]);
  const [deprSuccess, setDeprSuccess] = useState("");
  const [deprError, setDeprError] = useState("");

  // Bank Reconciliation states
  const [bankItems, setBankItems] = useState<BankStatementItem[]>([]);
  const [reconSuccess, setReconSuccess] = useState("");
  const [reconError, setReconError] = useState("");

  // Currency exchange states
  const [exchangeAmount, setExchangeAmount] = useState<number>(100);
  const [exchangeFrom, setExchangeFrom] = useState<string>("USD");
  const [exchangeTo, setExchangeTo] = useState<string>("EGP");
  const [exchangeResult, setExchangeResult] = useState<number | null>(null);
  const [exchangeRateApplied, setExchangeRateApplied] = useState<number | null>(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);

  // Fetch initial cheques and other systems
  const fetchCheques = () => {
    fetch("/api/v1/accounting/cheques")
      .then(res => res.json())
      .then(p => { if (p.success) setCheques(p.data); });
  };

  // Fetch initial relational structures on load
  useEffect(() => {
    fetchCheques();
    fetch("/api/v1/accounting/fixed-assets")
      .then(res => res.json())
      .then(p => { if (p.success) setFixedAssets(p.data); });
    fetch("/api/v1/accounting/bank-recon")
      .then(res => res.json())
      .then(p => { if (p.success) setBankItems(p.data); });
    fetch("/api/v1/accounting/currency-exchange")
      .then(res => res.json())
      .then(p => { if (p.success) setCurrencyRates(p.data); });
    // Fetch live IFRS reports
    fetch("/api/v1/accounting/reports/cash-flows")
      .then(res => res.json())
      .then(p => { if (p.success) setCashFlowReport(p.data); });
    fetch("/api/v1/accounting/reports/changes-in-equity")
      .then(res => res.json())
      .then(p => { if (p.success) setEquityReport(p.data); });
  }, [journalEntries]); // Re-fetch on ledger changes to stay consistent

  const [closingSuccessMsg, setClosingSuccessMsg] = useState("");

  // Open New Account States (Cash & Administrative Expenses)
  const [newAccCode, setNewAccCode] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<"Asset" | "Expense">("Asset");
  const [newAccClassification, setNewAccClassification] = useState("نقدية بالصندوق والخزينة الرئيسية");
  const [newAccInitialBalance, setNewAccInitialBalance] = useState<number>(0);
  const [newAccSuccessMsg, setNewAccSuccessMsg] = useState("");
  const [newAccErrorMsg, setNewAccErrorMsg] = useState("");

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setNewAccSuccessMsg("");
    setNewAccErrorMsg("");

    const trimmedCode = newAccCode.trim();
    const trimmedName = newAccName.trim();

    if (!trimmedCode || !trimmedName) {
      setNewAccErrorMsg("يرجى ملء جميع الحقول المطلوبة (كود الحساب واسم الحساب المحاسبي).");
      return;
    }

    if (accounts.some(a => a.code === trimmedCode)) {
      setNewAccErrorMsg(`كود الحساب [${trimmedCode}] مستخدم بالفعل في الدليل المحاسبي المحفوظ.`);
      return;
    }

    const newAcc: ChartOfAccount = {
      code: trimmedCode,
      name: trimmedName,
      type: newAccType,
      initialBalance: newAccInitialBalance,
      balance: newAccInitialBalance,
      classification: newAccClassification
    };

    setAccounts([...accounts, newAcc]);
    setNewAccSuccessMsg(`تم بنجاح افتتاح حساب جديد [${trimmedName}] بكود [${trimmedCode}] وتصنيفه كـ [${newAccClassification}].`);
    
    // Reset form fields
    setNewAccCode("");
    setNewAccName("");
    setNewAccInitialBalance(0);
    setTimeout(() => setNewAccSuccessMsg(""), 6000);
  };

  // Journal Form States
  const [newDescription, setNewDescription] = useState("");
  const [newReference, setNewReference] = useState("");
  const [newCostCenter, setNewCostCenter] = useState(costCenters[0]?.id || "");
  const [newProfitCenter, setNewProfitCenter] = useState(profitCenters[0]?.id || "");
  const [formLines, setFormLines] = useState<JournalLine[]>([
    { accountCode: accounts[0]?.code || "", accountName: accounts[0]?.name || "", debit: 0, credit: 0 },
    { accountCode: accounts[1]?.code || "", accountName: accounts[1]?.name || "", debit: 0, credit: 0 }
  ]);

  const handleFiscalClosing = () => {
    setClosingSuccessMsg("");
    
    fetch("/api/v1/accounting/close-period", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(e => { throw new Error(e.error?.message || "فشلت عملية الإقفال المالي.") });
      }
      return res.json();
    })
    .then(payload => {
      if (payload.success) {
        setAccounts(payload.data.accounts);
        setJournalEntries(payload.data.journalEntries);
        setClosingSuccessMsg(payload.message);
      }
    })
    .catch(err => {
      setClosingSuccessMsg(`⚠️ خطأ أثناء ترحيل قيد الإغلاق المالي: ${err.message}`);
    });
  };

  // Sub-ledger Quick interactive transaction states
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayAccount, setQuickPayAccount] = useState<string>("10100"); // Standard CIB Bank or 10300 cash
  const [quickPayNotes, setQuickPayNotes] = useState<string>("");
  const [quickPayDate, setQuickPayDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [quickPaySuccess, setQuickPaySuccess] = useState<string | null>(null);
  const [quickPayError, setQuickPayError] = useState<string | null>(null);

  const handleQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPayAmount <= 0) {
      setQuickPayError("الرجاء إدخال قيمة صحيحة أكبر من الصفر.");
      return;
    }

    let description = "";
    let lines: JournalLine[] = [];
    let ref = "";

    const randomId = `JE-${Math.floor(100000 + Math.random() * 900000)}`;

    if (statementType === "customer") {
      const c = customers.find(x => x.id === statementCustId);
      if (!c) return;
      ref = statementCustId;
      description = quickPayNotes.trim() || `سند تحصيل نقدية/بنكي من العميل: ${c.name}`;
      
      const payAccName = quickPayAccount === "10100" ? "بنك CIB - الحساب الجاري بالجنيه المصري" : "النقدية بالخزينة الرئيسية";
      
      lines = [
        { accountCode: quickPayAccount, accountName: payAccName, debit: quickPayAmount, credit: 0 },
        { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: quickPayAmount }
      ];

      // Update customer balance: reduces what they owe us
      const updatedCustomers = customers.map(cust => {
        if (cust.id === statementCustId) {
          return { ...cust, balance: cust.balance - quickPayAmount };
        }
        return cust;
      });
      setCustomers(updatedCustomers);

    } else if (statementType === "supplier") {
      const s = suppliers.find(x => x.id === statementSuppId);
      if (!s) return;
      ref = statementSuppId;
      description = quickPayNotes.trim() || `سند سداد نقدي/بنكي للمورد: ${s.name}`;
      
      const payAccName = quickPayAccount === "10100" ? "بنك CIB - الحساب الجاري بالجنيه المصري" : "النقدية بالخزينة الرئيسية";
      
      lines = [
        { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: quickPayAmount, credit: 0 },
        { accountCode: quickPayAccount, accountName: payAccName, debit: 0, credit: quickPayAmount }
      ];

      // Update supplier balance: reduces what we owe them
      const updatedSuppliers = suppliers.map(supp => {
        if (supp.id === statementSuppId) {
          return { ...supp, balance: supp.balance - quickPayAmount };
        }
        return supp;
      });
      setSuppliers(updatedSuppliers);
    } else {
      return; // Not applicable for cash-checks direct sub-ledger
    }

    // Update general ledger accounts
    const updatedAccounts = accounts.map(acc => {
      // payment account (10100 or 10300)
      if (acc.code === quickPayAccount) {
        if (statementType === "customer") {
          // Cash debit increases
          return { ...acc, balance: acc.balance + quickPayAmount };
        } else {
          // Cash credit decreases
          return { ...acc, balance: acc.balance - quickPayAmount };
        }
      }
      // Customer general control account (11000)
      if (acc.code === "11000" && statementType === "customer") {
        return { ...acc, balance: acc.balance - quickPayAmount };
      }
      // Supplier general control account (20100)
      if (acc.code === "20100" && statementType === "supplier") {
        return { ...acc, balance: acc.balance - quickPayAmount };
      }
      return acc;
    });

    const newJE: JournalEntry = {
      id: randomId,
      date: quickPayDate,
      description,
      reference: ref,
      lines,
      status: "Posted",
      costCenter: "إدارة العمليات والمالية",
      profitCenter: statementType === "customer" ? "مركز مبيعات البرمجيات والخدمات" : "عام",
      creator: "أحلام سلطان"
    };

    setAccounts(updatedAccounts);
    setJournalEntries([newJE, ...journalEntries]);
    setQuickPaySuccess("تم ترحيل الحركة المالية وتحديث الحسابات والأرصدة بنجاح!");
    setQuickPayError(null);
    setQuickPayAmount(0);
    setQuickPayNotes("");
    
    setTimeout(() => {
      setQuickPaySuccess(null);
    }, 5000);
  };

  const handleReverseEntry = (entryId: string) => {
    const entryToReverse = journalEntries.find(e => e.id === entryId);
    if (!entryToReverse) return;
    
    if (entryToReverse.description.includes("عكس القيد") || entryToReverse.description.includes("STORNO")) {
      alert("هذا القيد هو بالفعل قيد عكسي لتعديل أو تسوية الحسابات، لا يمكن عكسه مرة أخرى.");
      return;
    }
    
    if (window.confirm(`⚠️ تحذير رقابي محاسبي: هل أنت متأكد من رغبتك في إلغاء وعكس القيد المحاسبي [${entryId}]؟ سيقوم النظام بإنشاء قيد عكسي موازن (Storno) وتعديل أرصدة الحسابات بدفتر الأستاذ العام فورا.`)) {
      const stornoLines = entryToReverse.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.credit, // swap debit & credit for reversal
        credit: line.debit
      }));
      
      const stornoId = `JE-STORNO-${Date.now().toString().slice(-4)}`;
      const stornoJE: JournalEntry = {
        id: stornoId,
        date: new Date().toISOString().split("T")[0],
        description: `🔄 إلغاء وعكس القيد رقم ${entryId} لغرض التصحيح والمطابقة الدفترية [البيان الأصلي: ${entryToReverse.description}]`,
        reference: `STORNO-${entryId}`,
        lines: stornoLines,
        status: "Posted",
        costCenter: entryToReverse.costCenter,
        profitCenter: entryToReverse.profitCenter,
        creator: "أحلام سلطان (مدير الحسابات)",
        approvedBy: "نظام التسوية والرقابة الآلية"
      };
      
      const updatedAccounts = accounts.map(acc => {
        let change = 0;
        stornoLines.forEach(l => {
          if (l.accountCode === acc.code) {
            if (acc.type === "Asset" || acc.type === "Expense") {
              change += (l.debit - l.credit);
            } else {
              change += (l.credit - l.debit);
            }
          }
        });
        return { ...acc, balance: acc.balance + change };
      });
      
      setAccounts(updatedAccounts);
      setJournalEntries([stornoJE, ...journalEntries]);
      alert(`تم بنجاح توليد قيد التسوية العكسي ${stornoId} وتعديل كافة أرصدة الأستاذ العام المتأثرة بالقيد الأصلي.`);
    }
  };

  // ==========================================
  // CUSTOMER, SUPPLIER & INVOICING CORE ENGINES
  // ==========================================

  // Customer registry state and handler
  const [custName, setCustName] = useState("");
  const [custTax, setCustTax] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custRegSuccess, setCustRegSuccess] = useState("");

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;
    const newCust: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: custName,
      taxRegistrationNumber: custTax || "غير متوفر",
      phone: custPhone || "غير متوفر",
      email: custEmail || "غير متوفر",
      balance: 0
    };
    setCustomers([...customers, newCust]);
    setCustName("");
    setCustTax("");
    setCustPhone("");
    setCustEmail("");
    setCustRegSuccess(`تم إضافة العميل الجديد [${newCust.name}] بنجاح في قاعدة البيانات وتخصيص الرقم التعريفي ${newCust.id}.`);
    setTimeout(() => setCustRegSuccess(""), 5000);
  };

  // Supplier registry state and handler
  const [suppName, setSuppName] = useState("");
  const [suppTax, setSuppTax] = useState("");
  const [suppPhone, setSuppPhone] = useState("");
  const [suppEmail, setSuppEmail] = useState("");
  const [suppRegSuccess, setSuppRegSuccess] = useState("");

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) return;
    const newSupp: Supplier = {
      id: `SUPP-${Date.now().toString().slice(-4)}`,
      name: suppName,
      taxRegistrationNumber: suppTax || "غير متوفر",
      phone: suppPhone || "غير متوفر",
      email: suppEmail || "غير متوفر",
      balance: 0
    };
    setSuppliers([...suppliers, newSupp]);
    setSuppName("");
    setSuppTax("");
    setSuppPhone("");
    setSuppEmail("");
    setSuppRegSuccess(`تم إضافة المورد الجديد [${newSupp.name}] بنجاح في دليل الموردين وتخصيص الرقم التعريفي ${newSupp.id}.`);
    setTimeout(() => setSuppRegSuccess(""), 5000);
  };

  // Invoicing states
  const [activeInvoiceForm, setActiveInvoiceForm] = useState<"sales" | "purchase">("sales");
  const [invoiceCustId, setInvoiceCustId] = useState("");
  const [invoiceSuppId, setInvoiceSuppId] = useState("");
  const [invoiceSku, setInvoiceSku] = useState("");
  const [invoiceQty, setInvoiceQty] = useState(1);
  const [invoicePrice, setInvoicePrice] = useState(100);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<"Bank" | "Cash" | "Check">("Bank");
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState("");
  const [invoiceErrorMsg, setInvoiceErrorMsg] = useState("");

  // Multi-item Invoice Draft states
  const [draftItems, setDraftItems] = useState<{ sku: string; name: string; quantity: number; price: number; total: number; }[]>([]);
  const [applyVat, setApplyVat] = useState(true);
  const [applyWithholding, setApplyWithholding] = useState(true);
  const [invoiceActiveSection, setInvoiceActiveSection] = useState<"builder" | "directory" | "history">("builder");

  // Statements & sub-ledger filtering states
  const [statementType, setStatementType] = useState<"customer" | "supplier" | "cash-checks">("customer");
  const [statementCustId, setStatementCustId] = useState("");
  const [statementSuppId, setStatementSuppId] = useState("");
  const [statementCashBankCode, setStatementCashBankCode] = useState("10100");
  const [statementSearchQuery, setStatementSearchQuery] = useState("");
  const [statementStartDate, setStatementStartDate] = useState<string>("");
  const [statementEndDate, setStatementEndDate] = useState<string>("");

  // Sync initial dropdown values
  React.useEffect(() => {
    if (customers.length > 0 && !invoiceCustId) setInvoiceCustId(customers[0].id);
    if (suppliers.length > 0 && !invoiceSuppId) setInvoiceSuppId(suppliers[0].id);
    if (stock.length > 0 && !invoiceSku) {
      setInvoiceSku(stock[0].sku);
      setInvoicePrice(stock[0].unitPrice);
    }
  }, [customers, suppliers, stock]);

  // Sync sub-ledger selection
  React.useEffect(() => {
    if (customers.length > 0 && !statementCustId) setStatementCustId(customers[0].id);
    if (suppliers.length > 0 && !statementSuppId) setStatementSuppId(suppliers[0].id);
  }, [customers, suppliers]);

  const handleInvoiceSkuChange = (sku: string) => {
    setInvoiceSku(sku);
    const item = stock.find(s => s.sku === sku);
    if (item) {
      setInvoicePrice(item.unitPrice);
    }
  };

  // Add Item to Draft
  const handleAddDraftItem = () => {
    setInvoiceErrorMsg("");
    setInvoiceSuccessMsg("");
    const targetItem = stock.find(s => s.sku === invoiceSku);
    if (!targetItem) {
      setInvoiceErrorMsg("يرجى اختيار صنف صالح من القائمة أولاً.");
      return;
    }
    if (invoiceQty <= 0) {
      setInvoiceErrorMsg("يجب أن تكون الكمية أكبر من الصفر.");
      return;
    }

    // Check if quantity exceeds stock in case of sales invoice
    const existingIdx = draftItems.findIndex(i => i.sku === invoiceSku);
    const currentDraftQty = existingIdx >= 0 ? draftItems[existingIdx].quantity : 0;
    const totalRequiredQty = currentDraftQty + invoiceQty;

    if (activeInvoiceForm === "sales" && targetItem.quantity < totalRequiredQty) {
      setInvoiceErrorMsg(`الكمية المطلوبة [${totalRequiredQty}] تتجاوز المتاح بالمخزن لهذا الصنف وهو [${targetItem.quantity}].`);
      return;
    }

    if (existingIdx >= 0) {
      const updated = [...draftItems];
      updated[existingIdx].quantity = totalRequiredQty;
      updated[existingIdx].total = totalRequiredQty * updated[existingIdx].price;
      setDraftItems(updated);
    } else {
      const newItem = {
        sku: targetItem.sku,
        name: targetItem.name,
        quantity: invoiceQty,
        price: invoicePrice,
        total: invoiceQty * invoicePrice
      };
      setDraftItems([...draftItems, newItem]);
    }

    setInvoiceSuccessMsg(`تمت إضافة الصنف [${targetItem.name}] بنجاح إلى مسودة الفاتورة.`);
    setTimeout(() => setInvoiceSuccessMsg(""), 3000);
  };

  const handleRemoveDraftItem = (sku: string) => {
    setDraftItems(draftItems.filter(item => item.sku !== sku));
  };

  // CREATE SALES INVOICE (فاتورة بيع)
  const handleCreateSalesInvoice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInvoiceSuccessMsg("");
    setInvoiceErrorMsg("");

    const targetCustomer = customers.find(c => c.id === invoiceCustId);
    if (!targetCustomer) {
      setInvoiceErrorMsg("يرجى اختيار عميل صالح.");
      return;
    }
    if (draftItems.length === 0) {
      setInvoiceErrorMsg("لا يمكن ترحيل فاتورة فارغة. يرجى إضافة صنف واحد على الأقل للمسودة.");
      return;
    }

    // Validate quantities
    for (const item of draftItems) {
      const stockItem = stock.find(s => s.sku === item.sku);
      if (!stockItem || stockItem.quantity < item.quantity) {
        setInvoiceErrorMsg(`الكمية بالمخزن غير كافية لـ [${item.name || item.sku}]! المتاح: ${stockItem?.quantity || 0}.`);
        return;
      }
    }

    const subtotal = draftItems.reduce((sum, i) => sum + i.total, 0);
    const vatAmount = applyVat ? subtotal * 0.14 : 0;
    const withholdingTax = applyWithholding ? subtotal * 0.01 : 0;
    const total = subtotal + vatAmount - withholdingTax;

    const invId = `SINV-${Date.now().toString().slice(-4)}`;

    // Double Entry Journal
    const journalLines: JournalLine[] = [
      {
        accountCode: "11000",
        accountName: "العملاء (أوراق القبض والذمم التجارية)",
        debit: total,
        credit: 0
      }
    ];

    if (applyWithholding && withholdingTax > 0) {
      journalLines.push({
        accountCode: "22100",
        accountName: "التزامات ضريبة الخصم والإضافة (نموذج 41)",
        debit: withholdingTax,
        credit: 0
      });
    }

    journalLines.push({
      accountCode: "40100",
      accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات",
      debit: 0,
      credit: subtotal
    });

    if (applyVat && vatAmount > 0) {
      journalLines.push({
        accountCode: "22000",
        accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)",
        debit: 0,
        credit: vatAmount
      });
    }

    // Instant settlement bank lines
    const payLines: JournalLine[] = [
      {
        accountCode: "10100",
        accountName: "بنك CIB - الحساب الجاري بالجنيه المصري",
        debit: total,
        credit: 0
      },
      {
        accountCode: "11000",
        accountName: "العملاء (أوراق القبض والذمم التجارية)",
        debit: 0,
        credit: total
      }
    ];

    const finalLines = [...journalLines, ...payLines];

    const salesJE: JournalEntry = {
      id: `JE-SALES-${invId}`,
      date: new Date().toISOString().split("T")[0],
      description: `فاتورة بيع مبيعات نقدية رقم ${invId} للعميل [${targetCustomer.name}] لأصناف متعددة عددها ${draftItems.length}`,
      reference: `${invId}-${targetCustomer.id}`,
      lines: finalLines,
      status: "Posted",
      costCenter: "CC-TAX",
      profitCenter: "PC-SFT",
      creator: "أحلام سلطان",
      approvedBy: "نظام الفواتير المعتمد"
    };

    const updatedAccounts = accounts.map(acc => {
      let change = 0;
      finalLines.forEach(l => {
        if (l.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            change += (l.debit - l.credit);
          } else {
            change += (l.credit - l.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + change };
    });

    // Update customer balance (instant cash sales leaves debtor balance net 0, but update customer metadata if needed)
    const updatedCustomers = customers.map(c => {
      if (c.id === targetCustomer.id) {
        return { ...c, balance: c.balance };
      }
      return c;
    });

    const updatedStock = stock.map(s => {
      const draftItem = draftItems.find(i => i.sku === s.sku);
      if (draftItem) {
        return { ...s, quantity: s.quantity - draftItem.quantity };
      }
      return s;
    });

    const newInvoice: SalesInvoice = {
      id: invId,
      date: salesJE.date,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      items: draftItems,
      subtotal,
      vatAmount,
      withholdingTax,
      total,
      status: "Paid",
      paymentMethod: invoicePaymentMethod
    };

    setAccounts(updatedAccounts);
    setCustomers(updatedCustomers);
    setStock(updatedStock);
    setSalesInvoices([newInvoice, ...salesInvoices]);
    setJournalEntries([salesJE, ...journalEntries]);
    setDraftItems([]); // Clear draft

    setInvoiceSuccessMsg(`تم بنجاح إصدار وترحيل فاتورة المبيعات ${invId} للعميل [${targetCustomer.name}] بقيمة إجمالية ${total.toLocaleString()} ${config.currency}. تم خصم المخزون وترحيل القيود التلقائية بالكامل.`);
    setSelectedInvoice({ ...newInvoice, invoiceType: "sales" });
  };

  // CREATE PURCHASE INVOICE (فاتورة شراء)
  const handleCreatePurchaseInvoice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInvoiceSuccessMsg("");
    setInvoiceErrorMsg("");

    const targetSupplier = suppliers.find(s => s.id === invoiceSuppId);
    if (!targetSupplier) {
      setInvoiceErrorMsg("يرجى اختيار مورد صالح.");
      return;
    }
    if (draftItems.length === 0) {
      setInvoiceErrorMsg("لا يمكن ترحيل فاتورة فارغة. يرجى إضافة صنف واحد على الأقل للمسودة.");
      return;
    }

    const subtotal = draftItems.reduce((sum, i) => sum + i.total, 0);
    const vatAmount = applyVat ? subtotal * 0.14 : 0;
    const withholdingTax = applyWithholding ? subtotal * 0.01 : 0;
    const total = subtotal + vatAmount - withholdingTax;

    const invId = `PINV-${Date.now().toString().slice(-4)}`;

    const journalLines: JournalLine[] = [
      {
        accountCode: "12000",
        accountName: "مخزون المواد الخام (مستودع القاهرة)",
        debit: subtotal,
        credit: 0
      }
    ];

    if (applyVat && vatAmount > 0) {
      journalLines.push({
        accountCode: "50300",
        accountName: "مصروفات ضريبة القيمة المضافة المسددة",
        debit: vatAmount,
        credit: 0
      });
    }

    journalLines.push({
      accountCode: "20100",
      accountName: "الموردون (أوراق الدفع والذمم الدائنة)",
      debit: 0,
      credit: total
    });

    if (applyWithholding && withholdingTax > 0) {
      journalLines.push({
        accountCode: "22100",
        accountName: "التزامات ضريبة الخصم والإضافة (نموذج 41)",
        debit: 0,
        credit: withholdingTax
      });
    }

    // Instant payment settlement lines
    const payLines: JournalLine[] = [
      {
        accountCode: "20100",
        accountName: "الموردون (أوراق الدفع والذمم الدائنة)",
        debit: total,
        credit: 0
      },
      {
        accountCode: "10100",
        accountName: "بنك CIB - الحساب الجاري بالجنيه المصري",
        debit: 0,
        credit: total
      }
    ];

    const finalLines = [...journalLines, ...payLines];

    const purchaseJE: JournalEntry = {
      id: `JE-PURCH-${invId}`,
      date: new Date().toISOString().split("T")[0],
      description: `فاتورة شراء فورية رقم ${invId} من المورد [${targetSupplier.name}] لأصناف متعددة عددها ${draftItems.length}`,
      reference: `${invId}-${targetSupplier.id}`,
      lines: finalLines,
      status: "Posted",
      costCenter: "CC-TAX",
      profitCenter: "PC-SFT",
      creator: "أحلام سلطان",
      approvedBy: "نظام المشتريات المعتمد"
    };

    const updatedAccounts = accounts.map(acc => {
      let change = 0;
      finalLines.forEach(l => {
        if (l.accountCode === acc.code) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            change += (l.debit - l.credit);
          } else {
            change += (l.credit - l.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + change };
    });

    const updatedSuppliers = suppliers.map(s => {
      if (s.id === targetSupplier.id) {
        return { ...s, balance: s.balance };
      }
      return s;
    });

    const updatedStock = stock.map(s => {
      const draftItem = draftItems.find(i => i.sku === s.sku);
      if (draftItem) {
        return { ...s, quantity: s.quantity + draftItem.quantity };
      }
      return s;
    });

    const newInvoice: PurchaseInvoice = {
      id: invId,
      date: purchaseJE.date,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      items: draftItems,
      subtotal,
      vatAmount,
      withholdingTax,
      total,
      status: "Paid",
      paymentMethod: invoicePaymentMethod
    };

    setAccounts(updatedAccounts);
    setSuppliers(updatedSuppliers);
    setStock(updatedStock);
    setPurchaseInvoices([newInvoice, ...purchaseInvoices]);
    setJournalEntries([purchaseJE, ...journalEntries]);
    setDraftItems([]); // Clear draft

    setInvoiceSuccessMsg(`تم بنجاح ترحيل فاتورة المشتريات الموحدة ${invId} من المورد [${targetSupplier.name}] بقيمة إجمالية ${total.toLocaleString()} ${config.currency}. تم تحديث الأستاذ العام وزيادة مستويات المخازن بنجاح.`);
    setSelectedInvoice({ ...newInvoice, invoiceType: "purchase" });
  };

  const [formError, setFormError] = useState("");

  // Tax Calculator States
  const [calcBase, setCalcBase] = useState<number>(100000);
  const [calcVatAmount, setCalcVatAmount] = useState<number>(14000);
  const [calcWithholding, setCalcWithholding] = useState<number>(1000);
  const [calcTotalReceipt, setCalcTotalReceipt] = useState<number>(113000);
  const [taxWithholdingType, setTaxWithholdingType] = useState<string>("services_1percent"); // 1% for services/supply under form 41

  const handleCalculateTaxes = (base: number, type: string) => {
    const vat = base * 0.14; // Egypt standard 14%
    let rate = 0.01; // 1% default
    if (type === "consulting_3percent") rate = 0.03;
    if (type === "royalties_10percent") rate = 0.10;
    if (type === "professional_5percent") rate = 0.05;

    const withholding = base * rate;
    setCalcBase(base);
    setCalcVatAmount(vat);
    setCalcWithholding(withholding);
    setCalcTotalReceipt(base + vat - withholding); // net receipt after withholding
  };

  const handleAddFormLine = () => {
    setFormLines([...formLines, { accountCode: accounts[0].code, accountName: accounts[0].name, debit: 0, credit: 0 }]);
  };

  const handleRemoveFormLine = (index: number) => {
    if (formLines.length > 2) {
      setFormLines(formLines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...formLines];
    if (field === "accountCode") {
      const selectedAccount = accounts.find(a => a.code === value);
      updated[index].accountCode = value;
      updated[index].accountName = selectedAccount ? selectedAccount.name : "";
    } else if (field === "debit" || field === "credit") {
      updated[index][field] = Number(value) || 0;
    }
    setFormLines(updated);
  };

  const submitJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const totalDebit = formLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = formLines.reduce((sum, l) => sum + l.credit, 0);

    if (totalDebit <= 0 || totalCredit <= 0) {
      setFormError("يجب أن تكون قيم القيود المحاسبية أكبر من الصفر.");
      return;
    }

    if (totalDebit !== totalCredit) {
      setFormError(`عدم توازن القيد المحاسبي: إجمالي المدين (${totalDebit.toLocaleString()} ${config.currency}) يجب أن يساوي تماماً إجمالي الدائن (${totalCredit.toLocaleString()} ${config.currency}). الفارق: ${Math.abs(totalDebit - totalCredit).toLocaleString()}`);
      return;
    }

    if (!newDescription.trim()) {
      setFormError("يرجى تقديم بيان أو شرح واضح وموجز لوصف هذا القيد اليومي.");
      return;
    }

    // Create the Journal Entry
    const newEntry: JournalEntry = {
      id: `JE-2026-00${journalEntries.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      description: newDescription,
      reference: newReference || "سند_يومي_عام",
      lines: formLines,
      status: "Posted",
      costCenter: newCostCenter,
      profitCenter: newProfitCenter,
      creator: "أحلام سلطان",
      approvedBy: "نظام الترحيل الإلكتروني"
    };

    fetch("/api/v1/accounting/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry)
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(e => { throw new Error(e.error?.message || "فشلت عملية الترحيل.") });
      }
      return res.json();
    })
    .then(payload => {
      if (payload.success) {
        // Sync the client state with the real calculated data from the engine
        setAccounts(payload.data.accounts);
        setCostCenters(payload.data.costCenters);
        setProfitCenters(payload.data.profitCenters);
        setJournalEntries([payload.data.entry, ...journalEntries]);

        // Reset Form
        setNewDescription("");
        setNewReference("");
        setFormLines([
          { accountCode: accounts[0].code, accountName: accounts[0].name, debit: 0, credit: 0 },
          { accountCode: accounts[1].code, accountName: accounts[1].name, debit: 0, credit: 0 }
        ]);

        setActiveSubTab("general-ledger");
      }
    })
    .catch(err => {
      setFormError(`⚠️ خطأ في الترحيل الدفتري: ${err.message}`);
    });
  };

  // Financial Reports Calculators
  const computeTotals = () => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenues = 0;
    let totalExpenses = 0;

    accounts.forEach(acc => {
      if (acc.type === "Asset") totalAssets += acc.balance;
      else if (acc.type === "Liability") totalLiabilities += acc.balance;
      else if (acc.type === "Equity") totalEquity += acc.balance;
      else if (acc.type === "Revenue") totalRevenues += acc.balance;
      else if (acc.type === "Expense") totalExpenses += acc.balance;
    });

    const netProfit = totalRevenues - totalExpenses;
    return { totalAssets, totalLiabilities, totalEquity, totalRevenues, totalExpenses, netProfit };
  };

  const { totalAssets, totalLiabilities, totalEquity, totalRevenues, totalExpenses, netProfit } = computeTotals();

  const getCategorizedAccounts = () => {
    const assetAccounts = accounts.filter(a => a.type === "Asset");
    const liabilityAccounts = accounts.filter(a => a.type === "Liability");
    const equityAccounts = accounts.filter(a => a.type === "Equity");

    // 1. Assets Partitioning:
    // Cash & Banks:
    const cashAccounts = assetAccounts.filter(a => 
      a.classification === "نقدية بالصندوق والبنوك" ||
      /نقدية|صندوق|خزينة|البنك|بنك|كاش|جاري|cash|bank|safe/i.test(a.name) ||
      a.code.startsWith("10")
    );
    const cashSum = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Receivables / Customers:
    const receivableAccounts = assetAccounts.filter(a => 
      !cashAccounts.includes(a) && (
        a.classification === "المدينون والذمم المدينة الأخرى" ||
        /عملاء|ذمم|مدينة|مدينة أخرى|receivables|customers|clients/i.test(a.name) ||
        a.code.startsWith("110") || a.code.startsWith("113") || a.code.startsWith("114")
      )
    );
    const receivablesSum = receivableAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Inventory:
    const inventoryAccounts = assetAccounts.filter(a => 
      !cashAccounts.includes(a) && 
      !receivableAccounts.includes(a) && (
        a.classification === "الأصول المتداولة - المخزون" ||
        /مخزون|مستودع|بضاعة|inventory|stock/i.test(a.name) ||
        a.code.startsWith("12")
      )
    );
    const inventorySum = inventoryAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Fixed Assets (Property, Plant, Equipment):
    const fixedAssetAccounts = assetAccounts.filter(a => 
      !cashAccounts.includes(a) && 
      !receivableAccounts.includes(a) && 
      !inventoryAccounts.includes(a) && (
        a.classification?.includes("ثابتة") ||
        /ثابتة|آلات|معدات|أراضي|مباني|سيارات|أجهزة|خوادم|أثاث|property|equipment|vehicle/i.test(a.name) ||
        a.code.startsWith("13")
      ) && !/إهلاك|مجمع|depreciation|accumulated/i.test(a.name)
    );
    const fixedAssetsCostSum = fixedAssetAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Depreciation accounts (Contra-Asset):
    const depAccounts = assetAccounts.filter(a => 
      /إهلاك|مجمع|depreciation|accumulated/i.test(a.name)
    );
    const accumulatedDepSum = Math.abs(depAccounts.reduce((sum, a) => sum + a.balance, 0));

    const netFixedAssets = fixedAssetsCostSum - accumulatedDepSum;

    // Other Current Assets:
    const currentOtherAccounts = assetAccounts.filter(a => 
      !cashAccounts.includes(a) && 
      !receivableAccounts.includes(a) && 
      !inventoryAccounts.includes(a) &&
      !fixedAssetAccounts.includes(a) &&
      !depAccounts.includes(a) && (
        a.code.startsWith("11") || a.code.startsWith("12") || a.code.startsWith("10")
      )
    );
    const currentOtherSum = currentOtherAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Other Non-Current Assets:
    const nonCurrentOtherAccounts = assetAccounts.filter(a => 
      !cashAccounts.includes(a) && 
      !receivableAccounts.includes(a) && 
      !inventoryAccounts.includes(a) &&
      !fixedAssetAccounts.includes(a) &&
      !depAccounts.includes(a) &&
      !currentOtherAccounts.includes(a)
    );
    const nonCurrentOtherSum = nonCurrentOtherAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalCurrentAssets = cashSum + receivablesSum + inventorySum + currentOtherSum;
    const totalNonCurrentAssets = netFixedAssets + nonCurrentOtherSum;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // 2. Liabilities Partitioning:
    // Trade Payables / Suppliers:
    const payableAccounts = liabilityAccounts.filter(a => 
      a.classification === "الدائنون والذمم الدائنة الأخرى" ||
      /موردين|ذمم دائنة|أوراق دفع|payables|suppliers/i.test(a.name) ||
      a.code.startsWith("20")
    );
    const payablesSum = payableAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Taxes & Government Accruals:
    const taxAccounts = liabilityAccounts.filter(a => 
      !payableAccounts.includes(a) && (
        a.classification === "التزامات ضريبية ومستحقات حكومية" ||
        /ضريبة|ضرائب|مصلحة|زكاة|مخصص|tax|vat|withholding/i.test(a.name) ||
        a.code.startsWith("22")
      )
    );
    const taxSum = taxAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Long-Term Loans:
    const longTermLoanAccounts = liabilityAccounts.filter(a => 
      !payableAccounts.includes(a) && 
      !taxAccounts.includes(a) && (
        /طويلة الأجل|قروض|تمويل طويل|loan/i.test(a.name) ||
        a.code.startsWith("25") || a.code.startsWith("26")
      )
    );
    const longTermLoansSum = longTermLoanAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Other Current Liabilities:
    const currentOtherLiabilitiesAccounts = liabilityAccounts.filter(a => 
      !payableAccounts.includes(a) && 
      !taxAccounts.includes(a) && 
      !longTermLoanAccounts.includes(a)
    );
    const currentOtherLiabilitiesSum = currentOtherLiabilitiesAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalCurrentLiabilities = payablesSum + taxSum + currentOtherLiabilitiesSum;
    const totalLiabilities = totalCurrentLiabilities + longTermLoansSum;

    // 3. Equity Partitioning:
    // Capital:
    const capitalAccounts = equityAccounts.filter(a => 
      a.classification === "رأس المال المساهم" ||
      /رأس المال|رأسمال|capital/i.test(a.name) ||
      a.code.startsWith("301")
    );
    const capitalSum = capitalAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Retained Earnings & Reserves:
    const retainedAccounts = equityAccounts.filter(a => 
      !capitalAccounts.includes(a) && (
        a.classification === "الأرباح والاحتياطيات" ||
        /أرباح مرحلة|أرباح محتجزة|احتياطي|retained|reserves|surplus/i.test(a.name) ||
        a.code.startsWith("302")
      )
    );
    const retainedSum = retainedAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Current profit / loss of the period:
    const totalRevenuesSum = accounts.filter(a => a.type === "Revenue").reduce((sum, a) => sum + a.balance, 0);
    const totalExpensesSum = accounts.filter(a => a.type === "Expense").reduce((sum, a) => sum + a.balance, 0);
    const currentProfit = totalRevenuesSum - totalExpensesSum;

    const totalEquity = capitalSum + retainedSum + currentProfit;

    // Check Balance
    const balanceDifference = totalAssets - (totalEquity + totalLiabilities);

    return {
      cashAccounts, cashSum,
      receivableAccounts, receivablesSum,
      inventoryAccounts, inventorySum,
      currentOtherAccounts, currentOtherSum,
      totalCurrentAssets,
      fixedAssetAccounts, fixedAssetsCostSum,
      depAccounts, accumulatedDepSum,
      netFixedAssets,
      nonCurrentOtherAccounts, nonCurrentOtherSum,
      totalNonCurrentAssets,
      totalAssets,
      payableAccounts, payablesSum,
      taxAccounts, taxSum,
      currentOtherLiabilitiesAccounts, currentOtherLiabilitiesSum,
      totalCurrentLiabilities,
      longTermLoanAccounts, longTermLoansSum,
      totalLiabilities,
      capitalAccounts, capitalSum,
      retainedAccounts, retainedSum,
      currentProfit,
      totalEquity,
      balanceDifference
    };
  };

  return (
    <div className="space-y-6 text-right" id="accounting-engine-container" dir="rtl">
      {/* Module Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-sans border border-emerald-500/30">
              متوافق مع المعايير الدولية IFRS / IAS
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 font-sans border border-cyan-500/30">
              متوافق مع منظومة الفاتورة ونموذج 41 المصري
            </span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">دفتر الأستاذ العام والنظام المحاسبي الموحد</h2>
          <p className="text-sm text-slate-400 mt-1">
            محرك ترحيل فوري مزدوج القيد يدعم تتبع مراكز التكلفة ومراكز الأرباح والامتثال الكامل لضريبة القيمة المضافة والخصم والتحصيل من المنبع.
          </p>
        </div>

        {/* View Switches */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#121829] border border-slate-800 p-1.5 rounded-lg self-start">
          <button
            onClick={() => setActiveSubTab("general-ledger")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "general-ledger" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            دفتر الأستاذ العام
          </button>
          <button
            onClick={() => setActiveSubTab("journal-form")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === "journal-form" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> قيد يومية جديد
          </button>
          <button
            onClick={() => setActiveSubTab("invoices")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === "invoices" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> الفواتير والموردين والعملاء
          </button>
          <button
            onClick={() => setActiveSubTab("sub-ledgers")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === "sub-ledgers" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> كشوف الحسابات المساعدة
          </button>
          <button
            onClick={() => setActiveSubTab("inventory-ledger")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === "inventory-ledger" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Boxes className="h-3.5 w-3.5" /> بيان الأصناف المخزنية
          </button>
          <button
            onClick={() => setActiveSubTab("reports")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "reports" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            القوائم المالية IFRS
          </button>
          <button
            onClick={() => setActiveSubTab("tax-calculator")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "tax-calculator" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            أداة الضرائب نموذج 41
          </button>
          <button
            onClick={() => setActiveSubTab("assets")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "assets" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            إدارة الأصول والإهلاك
          </button>
          <button
            onClick={() => setActiveSubTab("bank-recon")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "bank-recon" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            المطابقة والتسوية البنكية
          </button>
          <button
            onClick={() => setActiveSubTab("currency")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "currency" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            حاسبة العملات الأجنبية
          </button>
          <button
            onClick={() => setActiveSubTab("cheques")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              activeSubTab === "cheques" ? "bg-slate-800 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> إدارة شيكات الخزينة
          </button>
        </div>
      </div>

      {/* SUBTAB 1: GENERAL LEDGER */}
      {activeSubTab === "general-ledger" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Chart of Accounts */}
          <div className="lg:col-span-2 bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-400" /> دليل شجرة الحسابات المحاسبية
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {accounts.length} حسابات نشطة بالنظام
              </span>
            </div>

            {/* Account Category Filter Tabs */}
            <div className="p-3 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap gap-2 items-center">
              {[
                { id: "all", label: "كل الشجرة", count: accounts.length },
                { id: "Asset", label: "أصول (Assets)", count: accounts.filter(a => a.type === "Asset").length },
                { id: "Liability", label: "التزامات (Liabilities)", count: accounts.filter(a => a.type === "Liability").length },
                { id: "Equity", label: "حقوق ملكية (Equity)", count: accounts.filter(a => a.type === "Equity").length },
                { id: "Revenue", label: "إيرادات (Revenues)", count: accounts.filter(a => a.type === "Revenue").length },
                { id: "Expense", label: "مصروفات (Expenses)", count: accounts.filter(a => a.type === "Expense").length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAccountCategoryFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    accountCategoryFilter === tab.id
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15"
                      : "bg-slate-800/80 text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 border border-slate-700/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono ${
                    accountCategoryFilter === tab.id
                      ? "bg-slate-950/25 text-slate-950 font-black"
                      : "bg-slate-900 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-800/50 max-h-[500px] overflow-y-auto">
              {accounts
                .filter(acc => accountCategoryFilter === "all" ? true : acc.type === accountCategoryFilter)
                .map(acc => (
                <div 
                  key={acc.code} 
                  onClick={() => setDrillDownAccountCode(drillDownAccountCode === acc.code ? null : acc.code)}
                  className={`p-4 flex items-center justify-between hover:bg-slate-900/30 transition-all cursor-pointer ${
                    drillDownAccountCode === acc.code ? "bg-emerald-500/10 border-r-2 border-emerald-500" : ""
                  }`}
                  title="اضغط لعرض كشف الحساب التفصيلي"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                        {acc.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-200">{acc.name}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-sans">
                      <span>النوع: <strong className="text-slate-400">{acc.type === "Asset" ? "أصول" : acc.type === "Liability" ? "التزامات" : acc.type === "Equity" ? "حقوق ملكية" : acc.type === "Revenue" ? "إيراد" : "مصروف"}</strong></span>
                      <span>الرصيد الافتتاحي: {acc.initialBalance.toLocaleString()} {config.currency}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-mono font-bold ${
                      acc.balance >= 0 ? "text-slate-200" : "text-rose-400"
                    }`}>
                      {acc.balance.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-sans text-slate-500 mr-1">{config.currency}</span>
                  </div>
                </div>
              ))}
            </div>

            {drillDownAccountCode && (() => {
              const selectedAcc = accounts.find(a => a.code === drillDownAccountCode);
              if (!selectedAcc) return null;
              
              // Filter and sort entries affecting this account
              const entriesAffecting = journalEntries
                .filter(entry => entry.lines.some(line => line.accountCode === drillDownAccountCode))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
              let runningBal = selectedAcc.initialBalance;
              const ledgerLines = entriesAffecting.map(entry => {
                const linesForAcc = entry.lines.filter(l => l.accountCode === drillDownAccountCode);
                const totalDebit = linesForAcc.reduce((sum, l) => sum + l.debit, 0);
                const totalCredit = linesForAcc.reduce((sum, l) => sum + l.credit, 0);
                
                if (selectedAcc.type === "Asset" || selectedAcc.type === "Expense") {
                  runningBal += (totalDebit - totalCredit);
                } else {
                  runningBal += (totalCredit - totalDebit);
                }
                
                return {
                  id: entry.id,
                  date: entry.date,
                  description: entry.description,
                  reference: entry.reference,
                  debit: totalDebit,
                  credit: totalCredit,
                  balance: runningBal
                };
              });

              return (
                <div className="p-5 bg-[#0b0f1a] border-t border-slate-800 space-y-4 animate-fadeIn" dir="rtl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">دفتر الأستاذ التفصيلي المساعد</span>
                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">{selectedAcc.name} ({selectedAcc.code})</h4>
                    </div>
                    <button 
                      onClick={() => setDrillDownAccountCode(null)}
                      className="text-xs text-slate-500 hover:text-slate-300 font-sans"
                    >
                      إغلاق كشف الحساب ✕
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-right text-[11px] border-collapse font-sans text-slate-300">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <th className="p-2 text-right">التاريخ</th>
                          <th className="p-2 text-right">رمز القيد</th>
                          <th className="p-2 text-right font-medium">البيان والشرح</th>
                          <th className="p-2 text-left">مدين</th>
                          <th className="p-2 text-left">دائن</th>
                          <th className="p-2 text-left font-bold">الرصيد الجاري</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        <tr className="bg-slate-900/20 text-slate-500">
                          <td className="p-2 text-right font-mono">-</td>
                          <td className="p-2 text-right">-</td>
                          <td className="p-2 text-right font-bold">الرصيد الافتتاحي المقيد بالدفاتر</td>
                          <td className="p-2 text-left font-mono">-</td>
                          <td className="p-2 text-left font-mono">-</td>
                          <td className="p-2 text-left font-mono font-bold text-slate-400">{selectedAcc.initialBalance.toLocaleString()} {config.currency}</td>
                        </tr>
                        {ledgerLines.map((line, lidx) => (
                          <tr key={lidx} className="hover:bg-slate-900/10">
                            <td className="p-2 text-right font-mono text-slate-400">{line.date}</td>
                            <td className="p-2 text-right font-mono text-emerald-400 font-semibold">{line.id}</td>
                            <td className="p-2 text-right text-slate-300">{line.description}</td>
                            <td className="p-2 text-left font-mono text-emerald-400">{line.debit > 0 ? line.debit.toLocaleString() : "-"}</td>
                            <td className="p-2 text-left font-mono text-amber-500">{line.credit > 0 ? line.credit.toLocaleString() : "-"}</td>
                            <td className="p-2 text-left font-mono font-bold text-slate-200">{line.balance.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab("journal-form");
                        setFormLines([
                          { accountCode: selectedAcc.code, accountName: selectedAcc.name, debit: 0, credit: 0 },
                          { accountCode: accounts.find(a => a.code !== selectedAcc.code)?.code || "", accountName: accounts.find(a => a.code !== selectedAcc.code)?.name || "", debit: 0, credit: 0 }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> تسجيل قيد سريع للحساب
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab("sub-ledgers");
                        if (selectedAcc.code === "11000") {
                          setStatementType("customer");
                        } else if (selectedAcc.code === "20100") {
                          setStatementType("supplier");
                        } else {
                          setStatementType("cash-checks");
                          setStatementCashBankCode(selectedAcc.code === "10100" ? "10100" : "22100");
                        }
                      }}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> عرض كشف الأستاذ المساعد
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Open New Account Form (Cash & Administrative Expenses) */}
          <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
            <div>
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-emerald-400" />
                افتتاح حساب مالي جديد بتصنيفاته
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                افتح حسابات النقدية (Asset) أو المصاريف الإدارية (Expense) مع تحديد تصنيف الحساب لتلبية معايير الرقابة.
              </p>
            </div>

            {newAccSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs leading-relaxed font-sans flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{newAccSuccessMsg}</span>
              </div>
            )}

            {newAccErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs leading-relaxed font-sans flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{newAccErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3">
              {/* Account Type */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">نوع الحساب المحاسبي</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAccType("Asset");
                      setNewAccClassification("نقدية بالصندوق والخزينة الرئيسية");
                      if (!newAccCode) setNewAccCode("10300");
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                      newAccType === "Asset"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    أصول (نقدية / بنك)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAccType("Expense");
                      setNewAccClassification("مصاريف إدارية عمومية");
                      if (!newAccCode) setNewAccCode("50400");
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                      newAccType === "Expense"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    مصروفات (إدارية)
                  </button>
                </div>
              </div>

              {/* Account Code & Initial Balance */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">رمز الحساب (Code)</label>
                  <input
                    type="text"
                    value={newAccCode}
                    onChange={(e) => setNewAccCode(e.target.value)}
                    placeholder={newAccType === "Asset" ? "10300" : "50400"}
                    className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-mono text-center"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    value={newAccInitialBalance || ""}
                    onChange={(e) => setNewAccInitialBalance(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-mono text-center"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">اسم الحساب المحاسبي</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder={newAccType === "Asset" ? "نقدية عهدة الإسكندرية" : "مصاريف إنترنت واتصالات بفرع دبي"}
                  className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-600 font-sans"
                  required
                />
              </div>

              {/* Classification Selector */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">التصنيف والتبويب المحاسبي</label>
                <select
                  value={newAccClassification}
                  onChange={(e) => setNewAccClassification(e.target.value)}
                  className="w-full bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-600 font-sans"
                >
                  {newAccType === "Asset" ? (
                    <>
                      <option value="نقدية بالصندوق والخزينة الرئيسية">نقدية بالصندوق والخزينة الرئيسية</option>
                      <option value="نقدية عهد مؤقتة مستديمة">نقدية عهد مؤقتة مستديمة</option>
                      <option value="حسابات جارية لدى البنوك">حسابات جارية لدى البنوك</option>
                      <option value="شيكات تحت التحصيل">شيكات تحت التحصيل</option>
                    </>
                  ) : (
                    <>
                      <option value="مصاريف إدارية عمومية">مصاريف إدارية عمومية</option>
                      <option value="مصاريف الانتقالات وبدلات السفر">مصاريف الانتقالات وبدلات السفر</option>
                      <option value="أدوات كتابية ومكتبية ومطبوعات">أدوات كتابية ومكتبية ومطبوعات</option>
                      <option value="صيانة حواسب وشبكات ودعم فني">صيانة حواسب وشبكات ودعم فني</option>
                      <option value="اشتراكات برمجيات وسحابة SaaS">اشتراكات برمجيات وسحابة SaaS</option>
                      <option value="استهلاك أصول ومعدات مكتبية">استهلاك أصول ومعدات مكتبية</option>
                    </>
                  )}
                </select>
              </div>

              <button
                type="submit"
                className={`w-full py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                  newAccType === "Asset"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/15"
                    : "bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/15"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>إدراج الحساب المالي الجديد</span>
              </button>
            </form>
          </div>

          {/* Posting Logs */}
          <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" /> سجلات سندات القيود المحاسبية
              </h3>
            </div>
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {journalEntries.map(entry => (
                <div key={entry.id} className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="font-bold text-emerald-400">{entry.id}</span>
                    <span>{entry.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{entry.description}</p>
                  
                  <div className="bg-[#12182a] rounded p-2 text-[10px] font-mono divide-y divide-slate-800/40">
                    {entry.lines.map((line, idx) => (
                      <div key={idx} className="py-1 flex items-center justify-between">
                        <span className="text-slate-400 truncate max-w-[120px]">{line.accountName}</span>
                        <div className="space-x-2">
                          {line.debit > 0 && <span className="text-emerald-400">مدين {line.debit.toLocaleString()}</span>}
                          {line.credit > 0 && <span className="text-amber-400">دائن {line.credit.toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/50 text-[9px] font-mono text-slate-500 pb-1.5">
                    <span>مركز التكلفة: {entry.costCenter}</span>
                    <span className="flex items-center gap-1 text-emerald-400/80 font-bold">
                      <Check className="h-2.5 w-2.5" /> رُحِّل بأمان
                    </span>
                  </div>

                  <div className="flex gap-1.5 justify-end pt-1.5 border-t border-slate-800/30">
                    <button
                      type="button"
                      onClick={() => setSelectedJournalEntry(entry)}
                      className="px-2 py-1 bg-[#141b2e] hover:bg-slate-800 text-slate-300 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-700/60"
                    >
                      <Search className="h-3 w-3 text-cyan-400" /> عرض السند (Voucher)
                    </button>
                    
                    {!entry.description.includes("عكس القيد") && !entry.description.includes("STORNO") && (
                      <button
                        type="button"
                        onClick={() => handleReverseEntry(entry.id)}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft className="h-3 w-3" /> عكس وإلغاء القيد (Storno)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: NEW JOURNAL ENTRY FORM */}
      {activeSubTab === "journal-form" && (
        <form onSubmit={submitJournalEntry} className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 space-y-6 animate-fadeIn max-w-4xl mx-auto">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="font-display font-bold text-lg text-slate-200">تسجيل وتأكيد قيد يومية متوازن</h3>
            <p className="text-xs text-slate-400 mt-1">
              تحقق من تطابق قيم المدين والدائن بدقة قبل الحفظ. يجرى تحديث حسابات الأستاذ العام لحظياً فور الالتزام.
            </p>
          </div>

          {formError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg flex items-start gap-2.5 text-xs">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">خطأ في التحقق من صحة المستند</p>
                <p className="mt-0.5 leading-relaxed">{formError}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1.5 font-bold">شرح وتوضيح القيد (البيان)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="مثال: تحصيل رسوم مبيعات تراخيص برمجية مع ضريبة القيمة المضافة"
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1.5 font-bold">المرجع / رقم الفاتورة أو المستند</label>
              <input
                type="text"
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                placeholder="مثال: INV-2026-X1"
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost Center */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1.5 font-bold">ربط بمركز تكلفة (تتبع المصاريف)</label>
              <select
                value={newCostCenter}
                onChange={(e) => setNewCostCenter(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-emerald-500"
              >
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.name} ({cc.id})</option>
                ))}
              </select>
            </div>

            {/* Profit Center */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1.5 font-bold">ربط بمركز أرباح (تتبع الإيرادات)</label>
              <select
                value={newProfitCenter}
                onChange={(e) => setNewProfitCenter(e.target.value)}
                className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2 focus:outline-none focus:border-emerald-500"
              >
                {profitCenters.map(pc => (
                  <option key={pc.id} value={pc.id}>{pc.name} ({pc.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-sans border-b border-slate-800 pb-2">
              <span className="font-bold">البنود التفصيلية للقيد المحاسبي</span>
              <button
                type="button"
                onClick={handleAddFormLine}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة سطر بنود جديد
              </button>
            </div>

            <div className="space-y-2">
              {formLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="md:col-span-6">
                    <select
                      value={line.accountCode}
                      onChange={(e) => handleLineChange(idx, "accountCode", e.target.value)}
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none"
                    >
                      {accounts.map(acc => (
                        <option key={acc.code} value={acc.code}>[{acc.code}] {acc.name} ({acc.type === "Asset" ? "أصول" : acc.type === "Liability" ? "التزامات" : acc.type === "Equity" ? "حقوق ملكية" : acc.type === "Revenue" ? "إيراد" : "مصروف"})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2.5">
                    <input
                      type="number"
                      value={line.debit || ""}
                      onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                      placeholder="مدين"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-2.5">
                    <input
                      type="number"
                      value={line.credit || ""}
                      onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                      placeholder="دائن"
                      className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      disabled={formLines.length <= 2}
                      onClick={() => handleRemoveFormLine(idx)}
                      className="text-rose-500 hover:text-rose-400 disabled:opacity-30 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balancing Widget */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="space-y-1 text-right">
              <span className="text-slate-400 font-sans">حالة مطابقة وتوازن السند:</span>
              <div className="flex items-center gap-2">
                {formLines.reduce((sum, l) => sum + l.debit, 0) === formLines.reduce((sum, l) => sum + l.credit, 0) && formLines.reduce((sum, l) => sum + l.debit, 0) > 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 font-sans">
                    <CheckCircle className="h-3.5 w-3.5" /> القيد متوازن وجاهز للترحيل
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1 font-sans">
                    <AlertCircle className="h-3.5 w-3.5" /> القيد غير متزن! (الفارق مطلوب)
                  </span>
                )}
              </div>
            </div>
            <div className="text-left space-y-1">
              <div>إجمالي المدين: <strong className="text-emerald-400">{formLines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}</strong> {config.currency}</div>
              <div>إجمالي الدائن: <strong className="text-amber-400">{formLines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}</strong> {config.currency}</div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("general-ledger")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-5 py-2.5 rounded-lg transition-all"
            >
              إلغاء الأمر
            </button>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-500/10 transition-all"
            >
              تأكيد القيد وترحيله فورياً
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 3: IFRS STATEMENTS */}
      {activeSubTab === "reports" && (
        <div className="space-y-6 animate-fadeIn text-right font-sans" id="ifrs-unified-container">
          <IFRS18Dashboard 
            accounts={accounts} 
            stock={stock} 
            customers={customers} 
            suppliers={suppliers} 
            config={config} 
            cashFlowReport={cashFlowReport}
            equityReport={equityReport}
          />
        </div>
      )}

      {false && activeSubTab === "reports" && (
        <div className="space-y-6 animate-fadeIn text-right font-sans" id="ifrs-unified-container">
          
          {/* IFRS SUB-SELECTOR BAR (Hidden in Print) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800/80 pb-4 gap-4 print:hidden bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-200">بوابة التقارير والقوائم المالية الموحدة المعتمدة (IFRS)</h4>
              <p className="text-[10px] text-slate-500 font-sans">تجميع وعرض مالي متكامل طبقاً لمعايير التقارير المالية الدولية والمصرية والإيضاحات المتممة.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-[#141b2d] border border-slate-800 p-1 rounded-xl">
              {[
                { id: "all", name: "الكتاب المالي الكامل" },
                { id: "balance_sheet", name: "المركز المالي (IAS 1)" },
                { id: "income", name: "الدخل الشامل (IAS 1)" },
                { id: "cash_flow", name: "التدفقات النقدية (IAS 7)" },
                { id: "equity", name: "حقوق الملكية (IAS 1)" },
                { id: "notes", name: "الإيضاحات المتممة" }
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setIfrsActiveView(v.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    ifrsActiveView === v.id
                      ? "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* RETRIEVE IFRS DYNAMIC MATH */}
          {(() => {
            const cat = getCategorizedAccounts();
            const isBalanced = Math.abs(cat.balanceDifference) < 1;

            const scrollToNote = (noteId: string) => {
              setIfrsActiveView("notes");
              setTimeout(() => {
                const el = document.getElementById(noteId);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2", "ring-emerald-500", "duration-500");
                  setTimeout(() => {
                    el.classList.remove("ring-2", "ring-emerald-500");
                  }, 2000);
                }
              }, 100);
            };

            const totalRevenuesSum = accounts.filter(a => a.type === "Revenue").reduce((sum, a) => sum + a.balance, 0);
            const totalExpensesSum = accounts.filter(a => a.type === "Expense").reduce((sum, a) => sum + a.balance, 0);

            return (
              <div className="space-y-8">
                
                {/* DOUBLE ENTRY BALANCING VERIFICATION ALERT */}
                {ifrsActiveView === "all" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">تأكيد المطابقة الثنائية (Double-Entry Verification)</span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          جميع القيود المحاسبية للمركز المالي متطابقة وتتبع تماماً القيد المزدوج. الفرق المحاسبي: <strong className="text-emerald-400 font-mono">0.00 {config.currency}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans font-semibold">
                      معايير الإعداد: IFRS Compliant | التدقيق: نشط (ACTIVE)
                    </div>
                  </div>
                )}

                {/* 1. STATEMENT OF FINANCIAL POSITION */}
                {(ifrsActiveView === "all" || ifrsActiveView === "balance_sheet") && (
                  <div className="bg-[#0f1425] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200">قائمة المركز المالي الموحدة (IAS 1 Statement of Financial Position)</h3>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">كما هي في نهاية السنة المالية المنتهية في {config.fiscalYear}</p>
                      </div>
                      <span className="text-[9px] px-2.5 py-1 bg-slate-800 rounded text-slate-400 font-sans uppercase font-bold tracking-wider">IAS 1 Standard</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 font-sans border-b border-slate-800">
                            <th className="p-3 font-bold">الأصل / الالتزام وحقوق الملكية</th>
                            <th className="p-3 font-bold text-center">رقم الإيضاح</th>
                            <th className="p-3 font-bold text-left">رصيد الفترة الحالية</th>
                            <th className="p-3 font-bold text-left">الرصيد الافتتاحي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          
                          {/* --- ASSETS SECTION --- */}
                          <tr className="bg-slate-900/20">
                            <td colSpan={4} className="p-3 font-bold text-emerald-400 text-[11px] font-sans">الأصول (Assets)</td>
                          </tr>
                          
                          {/* Non-Current Assets */}
                          <tr>
                            <td colSpan={4} className="p-3 font-semibold text-slate-300 pl-6 text-[10px] font-sans">الأصول غير المتداولة (Non-Current Assets):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">العقارات والآلات والمعدات (PPE)</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-5")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (5)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.netFixedAssets.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.fixedAssetsCostSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-400">أصول غير متداولة أخرى</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.nonCurrentOtherSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.nonCurrentOtherSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold border-t border-slate-800/40">
                            <td className="p-3 pr-8 text-slate-200">إجمالي الأصول غير المتداولة</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.totalNonCurrentAssets.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{(cat.fixedAssetsCostSum + cat.nonCurrentOtherSum).toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* Current Assets */}
                          <tr>
                            <td colSpan={4} className="p-3 font-semibold text-slate-300 pl-6 text-[10px] font-sans">الأصول المتداولة (Current Assets):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">المخزون السلعي (Inventories)</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-3")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (3)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.inventorySum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.inventorySum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">العملاء والذمم المدينة (Trade Receivables)</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-4")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (4)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.receivablesSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.receivablesSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">النقدية وما يعادلها (Cash & Equivalents)</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-2")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (2)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.cashSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.cashSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-400">أصول متداولة أخرى</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.currentOtherSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.currentOtherSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold border-t border-slate-800/40">
                            <td className="p-3 pr-8 text-slate-200">إجمالي الأصول المتداولة</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.totalCurrentAssets.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{cat.totalCurrentAssets.toLocaleString()} {config.currency}</td>
                          </tr>
                          
                          {/* Total Assets Row */}
                          <tr className="bg-emerald-500/5 font-black border-t-2 border-emerald-500/20 text-slate-100">
                            <td className="p-3 text-slate-100 font-bold">إجمالي الأصول والموجودات</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-emerald-400 font-bold">{cat.totalAssets.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{cat.totalAssets.toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* --- EQUITY & LIABILITIES SECTION --- */}
                          <tr className="bg-slate-900/20 border-t border-slate-800">
                            <td colSpan={4} className="p-3 font-bold text-cyan-400 text-[11px] font-sans">حقوق الملكية والالتزامات (Equity & Liabilities)</td>
                          </tr>

                          {/* Equity */}
                          <tr>
                            <td colSpan={4} className="p-3 font-semibold text-slate-300 pl-6 text-[10px] font-sans">حقوق الملكية (Equity):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">رأس المال المدفوع والمصدر</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.capitalSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.capitalSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">الاحتياطيات والأرباح المرحلة</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.retainedSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.retainedSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-emerald-400 font-semibold">صافي أرباح الفترة الجارية (الغير موزعة)</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-emerald-400 font-bold">{cat.currentProfit.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-600">0 {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold border-t border-slate-800/40">
                            <td className="p-3 pr-8 text-slate-200">إجمالي حقوق الملكية</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.totalEquity.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{(cat.capitalSum + cat.retainedSum).toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* Non-Current Liabilities */}
                          <tr>
                            <td colSpan={4} className="p-3 font-semibold text-slate-300 pl-6 text-[10px] font-sans">الالتزامات غير المتداولة (Non-Current Liabilities):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">قروض وتسهيلات طويلة الأجل</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.longTermLoansSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.longTermLoansSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold border-t border-slate-800/40">
                            <td className="p-3 pr-8 text-slate-200">إجمالي الالتزامات غير المتداولة</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.longTermLoansSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{cat.longTermLoansSum.toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* Current Liabilities */}
                          <tr>
                            <td colSpan={4} className="p-3 font-semibold text-slate-300 pl-6 text-[10px] font-sans">الالتزامات المتداولة (Current Liabilities):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">الموردون والذمم الدائنة التجارية</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-6")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (6)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.payablesSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.payablesSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-300">أرصدة دائنة وضرائب مستحقة (ضريبة نموذج 41)</td>
                            <td className="p-3 text-center">
                              <button onClick={() => scrollToNote("note-7")} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] rounded font-bold transition-all cursor-pointer">
                                إيضاح (7)
                              </button>
                            </td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.taxSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.taxSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-8 text-slate-400">التزامات متداولة أخرى</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.currentOtherLiabilitiesSum.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-500">{cat.currentOtherLiabilitiesSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold border-t border-slate-800/40">
                            <td className="p-3 pr-8 text-slate-200">إجمالي الالتزامات المتداولة</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{cat.totalCurrentLiabilities.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{cat.totalCurrentLiabilities.toLocaleString()} {config.currency}</td>
                          </tr>

                          <tr className="bg-slate-900/20 font-bold border-t border-slate-800">
                            <td className="p-3 text-slate-200">إجمالي الالتزامات (مجموع المتداول وغير المتداول)</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-slate-200">{(cat.totalCurrentLiabilities + cat.longTermLoansSum).toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{(cat.totalCurrentLiabilities + cat.longTermLoansSum).toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* Total Equity and Liabilities Row */}
                          <tr className="bg-cyan-500/5 font-black border-t-2 border-cyan-500/20 text-slate-100">
                            <td className="p-3 text-slate-100 font-bold">إجمالي حقوق الملكية والالتزامات</td>
                            <td className="p-3 text-center text-slate-600">-</td>
                            <td className="p-3 text-left font-mono text-cyan-400 font-bold">{(cat.totalEquity + cat.totalLiabilities).toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono text-slate-400">{(cat.totalEquity + cat.totalLiabilities).toLocaleString()} {config.currency}</td>
                          </tr>

                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. STATEMENT OF COMPREHENSIVE INCOME */}
                {(ifrsActiveView === "all" || ifrsActiveView === "income") && (
                  <div className="bg-[#0f1425] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200">قائمة الدخل الشامل الموحدة (IAS 1 Statement of Comprehensive Income)</h3>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">عن السنة المالية المنتهية في {config.fiscalYear}</p>
                      </div>
                      <span className="text-[9px] px-2.5 py-1 bg-slate-800 rounded text-slate-400 font-sans uppercase font-bold tracking-wider">IAS 1 Standard</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                            <th className="p-3 font-bold">البند المحاسبي للدخل الشامل</th>
                            <th className="p-3 font-bold text-left">قيمة الفترة المالية الحالية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          <tr className="bg-slate-900/10 font-bold">
                            <td colSpan={2} className="p-3 text-emerald-400">الإيرادات التشغيلية والنشاط المباشر:</td>
                          </tr>
                          {accounts.filter(a => a.type === "Revenue").map(a => (
                            <tr key={a.code} className="hover:bg-slate-900/10 transition-colors">
                              <td className="p-3 pr-6 text-slate-300">{a.name}</td>
                              <td className="p-3 text-left font-mono text-slate-200">{a.balance.toLocaleString()} {config.currency}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-900/20 font-bold border-t border-slate-800 text-slate-100">
                            <td className="p-3 text-slate-200">مجموع إيرادات التشغيل</td>
                            <td className="p-3 text-left font-mono text-emerald-400">{totalRevenuesSum.toLocaleString()} {config.currency}</td>
                          </tr>

                          <tr className="bg-slate-900/10 font-bold">
                            <td colSpan={2} className="p-3 text-rose-400">المصروفات والتكاليف التشغيلية والإدارية:</td>
                          </tr>
                          {accounts.filter(a => a.type === "Expense").map(a => (
                            <tr key={a.code} className="hover:bg-slate-900/10 transition-colors">
                              <td className="p-3 pr-6 text-slate-300">{a.name}</td>
                              <td className="p-3 text-left font-mono text-rose-400">-{a.balance.toLocaleString()} {config.currency}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-900/20 font-bold border-t border-slate-800 text-slate-100">
                            <td className="p-3 text-slate-200">إجمالي المصروفات الإدارية والتشغيلية المعتمدة</td>
                            <td className="p-3 text-left font-mono text-amber-500/90">-{totalExpensesSum.toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 text-slate-400 pr-6">يُطرح: أعباء الإهلاك السنوي للأصول غير المتداولة</td>
                            <td className="p-3 text-left font-mono text-slate-400">0.00 {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/20 font-black border-t-2 border-slate-800 text-slate-100">
                            <td className="p-3 text-slate-100 font-bold">صافي أرباح الفترة قبل الضرائب والزكاة</td>
                            <td className="p-3 text-left font-mono text-emerald-400">{(totalRevenuesSum - totalExpensesSum).toLocaleString()} {config.currency}</td>
                          </tr>
                          <tr className="bg-slate-900/10 font-bold">
                            <td colSpan={2} className="p-3 text-slate-400">بنود الدخل الشامل الآخر (Other Comprehensive Income - OCI):</td>
                          </tr>
                          <tr className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 pr-6 text-slate-400">فروق إعادة تقييم الأصول الثابتة المسموح بها</td>
                            <td className="p-3 text-left font-mono text-slate-500">0.00 {config.currency}</td>
                          </tr>
                          <tr className="bg-emerald-500/5 font-black border-t border-emerald-500/30 text-slate-100">
                            <td className="p-3 text-slate-100 font-bold">إجمالي الدخل الشامل الموحد للفترة (Comprehensive Income)</td>
                            <td className="p-3 text-left font-mono text-emerald-400 font-bold">{(totalRevenuesSum - totalExpensesSum).toLocaleString()} {config.currency}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. STATEMENT OF CASH FLOWS */}
                {(ifrsActiveView === "all" || ifrsActiveView === "cash_flow") && (
                  <div className="bg-[#0f1425] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200">قائمة التدفقات النقدية الموحدة (IAS 7 Statement of Cash Flows)</h3>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">عن السنة المالية المنتهية في {config.fiscalYear}</p>
                      </div>
                      <div className="flex items-center gap-2 print:hidden">
                        <span className="text-[9px] text-slate-400">الطريقة:</span>
                        <button
                          onClick={() => setCashFlowMethod("direct")}
                          className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            cashFlowMethod === "direct" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          المباشرة
                        </button>
                        <button
                          onClick={() => setCashFlowMethod("indirect")}
                          className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            cashFlowMethod === "indirect" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          غير المباشرة
                        </button>
                      </div>
                    </div>

                    {/* COMPACT SECURE RENDERER */}
                    {(() => {
                      const data = cashFlowMethod === "direct" ? cashFlowReport?.direct : cashFlowReport?.indirect;
                      if (!data) return <div className="text-center py-6 text-xs text-slate-500 font-sans">جاري تحميل حركات التدفقات النقدية الجارية من الخادم المحاسبي...</div>;

                      const isDirect = cashFlowMethod === "direct";
                      const operatingRows = isDirect 
                        ? (cashFlowReport?.direct?.operating || []) 
                        : [
                            { category: "صافي ربح الفترة (Net Profit)", amount: cashFlowReport?.indirect?.netProfit || 0 },
                            ...(cashFlowReport?.indirect?.adjustments || []).map((item: any) => ({ category: item.name, amount: item.amount })),
                            ...(cashFlowReport?.indirect?.workingCapital || []).map((item: any) => ({ category: item.name, amount: item.amount }))
                          ];
                          
                      const investingRows = isDirect
                        ? (cashFlowReport?.direct?.investing || [])
                        : (cashFlowReport?.indirect?.investing || []);
                        
                      const financingRows = isDirect
                        ? (cashFlowReport?.direct?.financing || [])
                        : (cashFlowReport?.indirect?.financing || []);

                      const sumOps = operatingRows.reduce((sum: number, r: any) => sum + r.amount, 0);
                      const sumInv = investingRows.reduce((sum: number, r: any) => sum + r.amount, 0);
                      const sumFin = financingRows.reduce((sum: number, r: any) => sum + r.amount, 0);

                      return (
                        <div className="space-y-4 font-sans text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-500 block">تدفقات الأنشطة التشغيلية</span>
                              <strong className={`text-sm font-mono block ${sumOps >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {sumOps.toLocaleString()} {config.currency}
                              </strong>
                            </div>
                            <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-500 block">تدفقات الأنشطة الاستثمارية</span>
                              <strong className={`text-sm font-mono block ${sumInv >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {sumInv.toLocaleString()} {config.currency}
                              </strong>
                            </div>
                            <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-500 block">تدفقات الأنشطة التمويلية</span>
                              <strong className={`text-sm font-mono block ${sumFin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {sumFin.toLocaleString()} {config.currency}
                              </strong>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/80 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">الرصيد الافتتاحي للنقدية (بداية السنة)</span>
                              <span className="font-mono text-slate-200">{(cashFlowReport?.openingCash ?? 0).toLocaleString()} {config.currency}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800/60 pt-2">
                              <span className="text-slate-400">صافي التغير النقدي في الصناديق والبنوك</span>
                              <span className={`font-mono ${(cashFlowReport?.netIncrease ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {((cashFlowReport?.netIncrease ?? 0) >= 0 ? "+" : "")}{(cashFlowReport?.netIncrease ?? 0).toLocaleString()} {config.currency}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-slate-100">
                              <span>الرصيد الختامي للنقدية وما يعادلها (IAS 7)</span>
                              <span className="font-mono text-emerald-400 font-black">{(cashFlowReport?.closingCash ?? 0).toLocaleString()} {config.currency}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. STATEMENT OF CHANGES IN EQUITY */}
                {(ifrsActiveView === "all" || ifrsActiveView === "equity") && (
                  <div className="bg-[#0f1425] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200">قائمة التغيرات في حقوق الملكية الموحدة (IAS 1 Statement of Changes in Equity)</h3>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">عن السنة المالية المنتهية في {config.fiscalYear}</p>
                      </div>
                      <span className="text-[9px] px-2.5 py-1 bg-slate-800 rounded text-slate-400 font-sans uppercase font-bold tracking-wider">IAS 1 Standard</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 font-sans border-b border-slate-800">
                            <th className="p-3 font-bold">الحساب</th>
                            <th className="p-3 font-bold text-left">الرصيد الافتتاحي</th>
                            <th className="p-3 font-bold text-left">الزيادات</th>
                            <th className="p-3 font-bold text-left">التخفيضات والمسحوبات</th>
                            <th className="p-3 font-bold text-left">حصة الأرباح الجارية</th>
                            <th className="p-3 font-bold text-left">الرصيد الختامي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {equityReport.map((r: any) => (
                            <tr key={r.accountCode} className="hover:bg-slate-900/10 transition-colors">
                              <td className="p-3 font-bold text-slate-300">{r.accountName}</td>
                              <td className="p-3 text-left font-mono text-slate-400">{(r.openingBalance || 0).toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-left font-mono text-emerald-400">+{(r.additions || 0).toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-left font-mono text-rose-400">-{(r.reductions || 0).toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-left font-mono text-cyan-400">+{(r.netIncome || 0).toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-left font-mono font-bold text-slate-100">{(r.closingBalance || 0).toLocaleString()} {config.currency}</td>
                            </tr>
                          ))}
                          {equityReport.length > 0 && (
                            <tr className="bg-slate-900/30 font-bold border-t border-slate-800">
                              <td className="p-3 text-slate-100">المجموع الموحد</td>
                              <td className="p-3 text-left font-mono text-slate-300">
                                {equityReport.reduce((sum, r) => sum + (r.openingBalance || 0), 0).toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-left font-mono text-emerald-400">
                                +{equityReport.reduce((sum, r) => sum + (r.additions || 0), 0).toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-left font-mono text-rose-400">
                                -{equityReport.reduce((sum, r) => sum + (r.reductions || 0), 0).toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-left font-mono text-cyan-400">
                                +{equityReport.reduce((sum, r) => sum + (r.netIncome || 0), 0).toLocaleString()} {config.currency}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-emerald-400">
                                {equityReport.reduce((sum, r) => sum + (r.closingBalance || 0), 0).toLocaleString()} {config.currency}
                              </td>
                            </tr>
                          )}
                          {equityReport.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">جاري تحميل حركات حقوق الملكية الجارية من الخادم المحاسبي...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. EXPLANATORY NOTES & DISCLOSURES */}
                {(ifrsActiveView === "all" || ifrsActiveView === "notes") && (
                  <div className="bg-[#0f1425] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-200">الإيضاحات المتممة للقوائم المالية الموحدة (Supplementary Explanatory Disclosures)</h3>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">تفصيل البنود المالية الجارية تماشياً مع متطلبات الإفصاح والشفافية التامة لمعايير التقارير الدولية.</p>
                      </div>
                      <span className="text-[9px] px-2.5 py-1 bg-slate-800 rounded text-slate-400 font-sans uppercase font-bold tracking-wider">IFRS Disclosures</span>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Note 1 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-2.5 transition-all" id="note-1">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (1): إطار الإعداد وأهم السياسات المحاسبية المتبعة
                        </h4>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                          تم إعداد القوائم المالية الموحدة للمنشأة طبقاً لمعايير التقارير المالية الدولية (IFRS) والسياسات المحاسبية المتبعة تتطابق تماماً مع معايير الاعتراف بالايراد (IFRS 15) والأدوات المالية (IFRS 9) وعقود الإيجار (IFRS 16). يعتمد التقرير على قيود اليومية المحاسبية الفعلية المرحلة للأستاذ العام.
                        </p>
                      </div>

                      {/* Note 2 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-2">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (2): النقدية وما يعادلها (Cash and Cash Equivalents)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-sans">
                          تشمل النقدية وما يعادلها الأرصدة النقدية في الخزائن المركزية والحسابات الجارية المباشرة لدى البنوك المحلية كما يلي:
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans font-semibold">
                                <th className="p-2">اسم البنك / الحساب</th>
                                <th className="p-2">رمز الأستاذ</th>
                                <th className="p-2 text-left">الرصيد الفعلي الجاري</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {cat.cashAccounts.map(a => (
                                <tr key={a.code} className="hover:bg-slate-900/15">
                                  <td className="p-2 text-slate-300">{a.name}</td>
                                  <td className="p-2 font-mono text-slate-500">{a.code}</td>
                                  <td className="p-2 text-left font-mono font-bold text-slate-200">{a.balance.toLocaleString()} {config.currency}</td>
                                </tr>
                              ))}
                              <tr className="bg-slate-900/30 font-bold">
                                <td className="p-2 text-slate-100">إجمالي النقدية وما يعادلها المعتمد</td>
                                <td className="p-2 text-slate-500">-</td>
                                <td className="p-2 text-left font-mono text-emerald-400 font-black">{cat.cashSum.toLocaleString()} {config.currency}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Note 3 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-3">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (3): المخزون السلعي وتكلفة النشاط (IAS 2 Inventories)
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans">
                          يُقيّم المخزون السلعي بطريقة متوسط التكلفة المرجح طبقاً لمعيار المحاسبة الدولي (IAS 2). يتكون المخزون الحالي من خوادم، معدات اتصال، ومكونات لوحات ومعدات تصنيع:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-900/30 p-3.5 border border-slate-800 rounded-lg text-right font-sans">
                            <span className="text-[9px] text-slate-500 block">إجمالي التقييم المالي للمخزون الحالي</span>
                            <strong className="text-sm font-mono text-emerald-400">{cat.inventorySum.toLocaleString()} {config.currency}</strong>
                          </div>
                          <div className="bg-slate-900/30 p-3.5 border border-slate-800 rounded-lg text-right font-sans">
                            <span className="text-[9px] text-slate-500 block">إجمالي كمية البنود المسجلة بالمخازن</span>
                            <strong className="text-sm font-mono text-cyan-400">{stock.reduce((sum, s) => sum + s.quantity, 0).toLocaleString()} وحدة</strong>
                          </div>
                        </div>
                      </div>

                      {/* Note 4 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-4">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (4): العملاء والذمم المدينة التجارية (IFRS 9 Financial Instruments)
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans">
                          تُمثل الذمم المدينة التجارية المستحقات على العملاء مقابل الخدمات المفوترة. يتم الاعتراف بها بالقيمة الاسمية للفاتورة مخصوماً منها مخصص الخسائر الائتمانية المتوقعة (ECL):
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans font-semibold">
                                <th className="p-2">اسم العميل</th>
                                <th className="p-2 text-left">الرصيد المالي الجاري</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {customers.map(c => (
                                <tr key={c.id} className="hover:bg-slate-900/15">
                                  <td className="p-2 text-slate-300">{c.name}</td>
                                  <td className="p-2 text-left font-mono font-bold text-slate-200">{c.balance.toLocaleString()} {config.currency}</td>
                                </tr>
                              ))}
                              {customers.length === 0 && (
                                <tr>
                                  <td colSpan={2} className="p-2 text-center text-slate-500">لا توجد سجلات عملاء جارية بالدفتر.</td>
                                </tr>
                              )}
                              <tr className="bg-slate-900/30 font-bold">
                                <td className="p-2 text-slate-100">إجمالي الذمم التجارية والعملاء</td>
                                <td className="p-2 text-left font-mono text-emerald-400 font-black">{cat.receivablesSum.toLocaleString()} {config.currency}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Note 5 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-5">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (5): الأصول غير المتداولة - العقارات والآلات والمعدات (IAS 16 Property, Plant and Equipment)
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans">
                          تدرج الأصول غير المتداولة بالتكلفة التاريخية مطروحاً منها مجمع الإهلاك المتراكم وخسائر الانخفاض في القيمة. يتم الإهلاك باستخدام طريقة القسط الثابت للنسب المئوية المعتمدة:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-900/30 p-3 border border-slate-800 rounded-lg text-right font-sans">
                            <span className="text-[9px] text-slate-500 block">إجمالي التكلفة التاريخية للأصول</span>
                            <strong className="text-xs font-mono text-slate-200">{cat.fixedAssetsCostSum.toLocaleString()} {config.currency}</strong>
                          </div>
                          <div className="bg-slate-900/30 p-3 border border-slate-800 rounded-lg text-right font-sans">
                            <span className="text-[9px] text-slate-500 block">مجمع الإهلاك المتراكم للأصول</span>
                            <strong className="text-xs font-mono text-rose-400">-{cat.accumulatedDepSum.toLocaleString()} {config.currency}</strong>
                          </div>
                          <div className="bg-[#111a2e] p-3 border border-slate-800 rounded-lg text-right font-sans">
                            <span className="text-[9px] text-slate-500 block">صافي القيمة الدفترية للأصول (IAS 16)</span>
                            <strong className="text-xs font-mono text-emerald-400">{cat.netFixedAssets.toLocaleString()} {config.currency}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Note 6 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-6">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (6): الموردون والذمم التجارية الدائنة (Trade and Other Payables)
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans">
                          تُمثل الذمم التجارية الدائنة الالتزامات المستحقة للموردين المعتمدين عن مشتريات المواد الخام والتوريدات لتشغيل أبراج الخوادم:
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-sans font-semibold">
                                <th className="p-2">اسم المورد المعتمد</th>
                                <th className="p-2 text-left">الالتزام الجاري بالدفتر</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {suppliers.map(s => (
                                <tr key={s.id} className="hover:bg-slate-900/15">
                                  <td className="p-2 text-slate-300">{s.name}</td>
                                  <td className="p-2 text-left font-mono font-bold text-slate-200">{s.balance.toLocaleString()} {config.currency}</td>
                                </tr>
                              ))}
                              {suppliers.length === 0 && (
                                <tr>
                                  <td colSpan={2} className="p-2 text-center text-slate-500">لا توجد سجلات موردين جارية بالدفتر.</td>
                                </tr>
                              )}
                              <tr className="bg-slate-900/30 font-bold">
                                <td className="p-2 text-slate-100">إجمالي الموردين والذمم الدائنة المتبقية</td>
                                <td className="p-2 text-left font-mono text-emerald-400 font-black">{cat.payablesSum.toLocaleString()} {config.currency}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Note 7 */}
                      <div className="bg-[#141b2d]/60 border border-slate-800 p-5 rounded-xl space-y-3 transition-all" id="note-7">
                        <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                          إيضاح رقم (7): الضرائب والالتزامات الضريبية والزكوية المستحقة
                        </h4>
                        <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
                          يشمل رصيد الضرائب مستحقات مصلحة الضرائب المصرية عن ضريبة القيمة المضافة المحصلة نموذج 10 (المبيعات) مخصوماً منها المدفوعات لنموذج 41 (ضرائب خصم المنبع)، بالإضافة لضريبة كسب العمل المستقطعة من الرواتب. إجمالي الضرائب والالتزامات الضريبية والزكوية الجارية المستحقة تحت التسوية هو: <strong className="text-emerald-400 font-mono font-black">{cat.taxSum.toLocaleString()} {config.currency}</strong>.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* Fiscal Year Closing Simulation Section */}
          <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-display font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-purple-400 animate-pulse" /> إقفال السنة المالية الجارية وتدوير الأرباح الدفترية
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  إجراء فوري لتصفير حسابات الأرباح والخسائر المؤقتة (الإيرادات والمصروفات) ونقل صافي النتيجة محاسبياً للأرباح المحتجزة (Retained Earnings) بحقوق الملكية.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFiscalClosing}
                className="bg-purple-600 hover:bg-purple-500 text-slate-100 text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-purple-600/15 transition-all font-sans self-start md:self-auto cursor-pointer"
              >
                تشغيل قيد إقفال السنة المالية وتصفير الدفاتر
              </button>
            </div>

            {closingSuccessMsg && (
              <div className={`p-4 rounded-lg text-xs leading-relaxed font-sans font-semibold ${
                closingSuccessMsg.startsWith("الحسابات") 
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" 
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              }`}>
                {closingSuccessMsg}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 4: MENA TAX CALCULATOR & ETA COMPLIANCE PORTAL */}
      {activeSubTab === "tax-calculator" && (() => {
        const totalSalesVat = salesInvoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
        const totalSalesBase = salesInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const totalPurchaseVat = purchaseInvoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
        const totalPurchaseBase = purchaseInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const netVatPayable = Math.max(0, totalSalesVat - totalPurchaseVat);

        const totalWithheldTax = purchaseInvoices.reduce((sum, inv) => sum + (inv.withholdingTax || 0), 0);
        const totalWithheldBase = purchaseInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const whtInvoices = purchaseInvoices.filter(inv => (inv.withholdingTax || 0) > 0);

        const handlePostVatSettlement = () => {
          if (netVatPayable <= 0) {
            alert("لا يوجد ضريبة قيمة مضافة مستحقة السداد للفترة الحالية.");
            return;
          }
          if (window.confirm(`هل أنت متأكد من سداد وتسوية ضريبة القيمة المضافة المستقطعة بقيمة ${netVatPayable.toLocaleString()} ${config.currency} بالكامل بالدفاتر عبر بنك CIB؟ سيولد النظام قيد يومية متزن ويصفر الالتزام.`)) {
            const settleId = `JE-VAT-${Date.now().toString().slice(-4)}`;
            const lines = [
              { accountCode: "22000", accountName: "ضريبة القيمة المضافة المستحقة", debit: netVatPayable, credit: 0 },
              { accountCode: "10100", accountName: "البنك الجاري - بنك CIB", debit: 0, credit: netVatPayable }
            ];
            const je: JournalEntry = {
              id: settleId,
              date: new Date().toISOString().split("T")[0],
              description: `🏛️ تسوية وسداد ضريبة القيمة المضافة المستحقة عبر البوابة الإلكترونية بموجب الإقرار رقم ${vatSubmissionReceipt || "ETA-VAT-991823-2026"}`,
              reference: vatSubmissionReceipt || "ETA-VAT-991823-2026",
              lines,
              status: "Posted",
              costCenter: "الإدارة المالية والضرائب",
              profitCenter: "الرئيسي",
              creator: "أحلام سلطان",
              approvedBy: "رئيس الحسابات"
            };
            
            const updatedAccounts = accounts.map(acc => {
              if (acc.code === "22000") return { ...acc, balance: acc.balance - netVatPayable };
              if (acc.code === "10100") return { ...acc, balance: acc.balance - netVatPayable };
              return acc;
            });
            
            setAccounts(updatedAccounts);
            setJournalEntries([je, ...journalEntries]);
            alert(`تم توليد قيد التسوية ${settleId} وتصفير مديونية حساب مصلحة الضرائب بالدفاتر.`);
          }
        };

        const handlePostWithholdingSettlement = () => {
          if (totalWithheldTax <= 0) {
            alert("لا توجد مبالغ ضريبة خصم وتحصيل مستحقة التوريد للفترة الحالية.");
            return;
          }
          if (window.confirm(`هل تريد سداد وتوريد ضريبة الخصم والإضافة نموذج 41 بقيمة ${totalWithheldTax.toLocaleString()} ${config.currency} بالكامل بالدفاتر عبر بنك CIB؟ سيقوم النظام بإنشاء قيد يومية موازن وإغلاق الحساب المستحق.`)) {
            const settleId = `JE-WHT-${Date.now().toString().slice(-4)}`;
            const lines = [
              { accountCode: "22100", accountName: "التزامات ضريبة الخصم والإضافة - نموذج 41", debit: totalWithheldTax, credit: 0 },
              { accountCode: "10100", accountName: "البنك الجاري - بنك CIB", debit: 0, credit: totalWithheldTax }
            ];
            const je: JournalEntry = {
              id: settleId,
              date: new Date().toISOString().split("T")[0],
              description: `🏛️ توريد وسداد مبالغ الخصم والتحصيل من المنبع (نموذج 41 ربع السنوي) بموجب إيصال إلكتروني رقم ${form41Receipt || "ETA-WHT-774129-2026"}`,
              reference: form41Receipt || "ETA-WHT-774129-2026",
              lines,
              status: "Posted",
              costCenter: "الإدارة المالية والضرائب",
              profitCenter: "الرئيسي",
              creator: "أحلام سلطان",
              approvedBy: "رئيس الحسابات"
            };
            
            const updatedAccounts = accounts.map(acc => {
              if (acc.code === "22100") return { ...acc, balance: acc.balance - totalWithheldTax };
              if (acc.code === "10100") return { ...acc, balance: acc.balance - totalWithheldTax };
              return acc;
            });
            
            setAccounts(updatedAccounts);
            setJournalEntries([je, ...journalEntries]);
            alert(`تم بنجاح توليد قيد السداد ${settleId} وتصفير رصيد حساب ضريبة الخصم والإضافة بالدفاتر.`);
          }
        };

        const executeVatSubmission = () => {
          setIsSubmittingVat(true);
          setTimeout(() => {
            setIsSubmittingVat(false);
            setVatStatusOverride("Submitted");
            const rcpt = `ETA-VAT-${Math.floor(100000 + Math.random() * 900000)}-2026`;
            setVatSubmissionReceipt(rcpt);
            setVatSubmissions([
              { 
                id: `VAT-2026-M05`, 
                period: "فترة مايو 2026 - إقرار شهري إلكتروني", 
                date: new Date().toISOString().split("T")[0], 
                baseSales: totalSalesBase, 
                vatCollected: totalSalesVat, 
                basePurchases: totalPurchaseBase, 
                vatPaid: totalPurchaseVat, 
                netPayable: netVatPayable, 
                status: "Submitted", 
                receiptNo: rcpt 
              },
              ...vatSubmissions
            ]);
            alert("تم إرسال وقبول إقرار ضريبة القيمة المضافة بنجاح عبر بوابة مصلحة الضرائب المصرية الموحدة! رمز التحقق الدفائري: " + rcpt);
          }, 1500);
        };

        const executeForm41Submission = () => {
          setIsSubmittingForm41(true);
          setTimeout(() => {
            setIsSubmittingForm41(false);
            setForm41Status("Submitted");
            const rcpt = `ETA-WHT-${Math.floor(100000 + Math.random() * 900000)}-2026`;
            setForm41Receipt(rcpt);
            setForm41Filings([
              { 
                id: `F41-2026-Q2`, 
                quarter: "الربع الثاني لعام 2026 - نموذج 41 إلكتروني", 
                date: new Date().toISOString().split("T")[0], 
                totalAmount: totalWithheldTax, 
                taxpayersCount: Math.max(1, whtInvoices.length), 
                status: "Submitted", 
                receiptNo: rcpt 
              },
              ...form41Filings
            ]);
            alert("تم تقديم وإرسال نموذج 41 لخصم المنبع بنجاح لمنظومة الضرائب المصرية الرقمية! كود الاستلام: " + rcpt);
          }, 1500);
        };

        return (
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 animate-fadeIn max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-400" />
                  منظومة ضرائب القيمة المضافة والخصم من المنبع (مصلحة الضرائب المصرية)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  متابعة إقرارات القيمة المضافة (14%) شهرياً وتوريد نماذج خصم وتحصيل الأرباح التجارية والصناعية نموذج 41 ربع سنوي إلكترونياً.
                </p>
              </div>

              {/* Tabs selector */}
              <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setTaxActiveTab("calculator")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    taxActiveTab === "calculator" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  حاسبة الضرائب الفورية
                </button>
                <button
                  type="button"
                  onClick={() => setTaxActiveTab("vat-ledger")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    taxActiveTab === "vat-ledger" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  إقرارات القيمة المضافة (14%)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxActiveTab("withholding-ledger")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    taxActiveTab === "withholding-ledger" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  نموذج 41 خصم المنبع
                </button>
              </div>
            </div>

            {/* TAB 1: CALCULATOR */}
            {taxActiveTab === "calculator" && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-4">
                  {/* Base Amount */}
                  <div>
                    <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">المبلغ الأساسي للمعاملة الخاضعة للضريبة</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={calcBase}
                        onChange={(e) => handleCalculateTaxes(Number(e.target.value) || 0, taxWithholdingType)}
                        className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg pr-3 pl-12 py-2.5 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                      <span className="absolute left-3.5 top-3 text-xs text-slate-500 font-mono font-bold">{config.currency}</span>
                    </div>
                  </div>

                  {/* Withholding Type Select */}
                  <div>
                    <label className="text-xs text-slate-400 font-sans block mb-1.5 font-bold">نوع نشاط الخصم والتحصيل من المنبع (نموذج 41)</label>
                    <select
                      value={taxWithholdingType}
                      onChange={(e) => {
                        setTaxWithholdingType(e.target.value);
                        handleCalculateTaxes(calcBase, e.target.value);
                      }}
                      className="w-full bg-[#141b2d] text-sm text-slate-200 border border-slate-700 rounded-lg px-3.5 py-2.5 focus:outline-none font-bold text-slate-300"
                    >
                      <option value="services_1percent">التوريدات والخدمات اللوجستية وعقود المقاولات (1.0% خصم منبع)</option>
                      <option value="consulting_3percent">الخدمات الاستشارية والفنية المتخصصة والتدريب (3.0% خصم منبع)</option>
                      <option value="professional_5percent">الأتعاب المهنية والخدمات الاستشارية والمهن الحرة (5.0% خصم منبع)</option>
                      <option value="royalties_10percent">الاتاوات والتراخيص وحقوق الاستغلال للمصنفات والبرمجيات (10.0% خصم منبع)</option>
                    </select>
                  </div>
                </div>

                {/* Results Block */}
                <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-4 font-mono text-sm">
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-400">مبلغ المعاملة الصافي (قبل الضرائب):</span>
                    <span className="text-slate-200 font-bold">{calcBase.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between text-rose-400/90 font-sans">
                    <span className="text-slate-400">ضريبة القيمة المضافة المصرية (14% تضاف):</span>
                    <span className="font-mono font-bold">+ {calcVatAmount.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between text-cyan-400/90 border-b border-slate-800 pb-3 font-sans">
                    <span className="text-slate-400">خصم المنبع نموذج 41 (يُخصم ويُورد لمصلحة الضرائب):</span>
                    <span className="font-mono font-bold">- {calcWithholding.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-emerald-400 pt-1 font-sans">
                    <span>القيمة الصافية المستحقة للسداد (النقدية):</span>
                    <span className="font-mono">{calcTotalReceipt.toLocaleString()} {config.currency}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-400 rounded-lg leading-relaxed flex gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    وفقاً لقانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020 وتعديلاته في مصر، يتم فرض ضريبة القيمة المضافة الاعتيادية بنسبة 14% على تراخيص البرمجيات والخدمات، مع تطبيق خصم الأرباح التجارية والصناعية بموجب نموذج 41 الضريبي ربع السنوي.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: VAT LEDGER COMPLIANCE */}
            {taxActiveTab === "vat-ledger" && (
              <div className="space-y-6">
                {/* VAT KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">مبيعات خاضعة (مخرجات)</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-slate-200">{totalSalesBase.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-rose-400 font-bold">ضريبة المخرجات المحصلة</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-rose-400">+{totalSalesVat.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold">ضريبة المدخلات القابلة للخصم</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-cyan-400">-{totalPurchaseVat.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 p-4 border border-emerald-500/20 rounded-xl space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold">صافي الضريبة واجبة السداد</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-emerald-400">{netVatPayable.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Submissions Action */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">إقرار شهر مايو 2026 (الفترة الحالية)</span>
                    <h4 className="text-sm font-bold text-slate-200">تقديم الإقرار الضريبي الإلكتروني لمخرجات ومدخلات القيمة المضافة</h4>
                    <p className="text-[11px] text-slate-400 font-sans">
                      سيقوم النظام بمطابقة فواتير المبيعات الإلكترونية الصادرة والمدفوعة ومقاصتها مع فواتير الشراء المستلمة.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {vatStatusOverride === "Draft" ? (
                      <button
                        type="button"
                        onClick={executeVatSubmission}
                        disabled={isSubmittingVat}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingVat ? (
                          <span className="flex items-center gap-1">⏳ جاري الإرسال للبوابة الضريبية...</span>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4" />
                            تقديم وإرسال الإقرار إلكترونياً
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <span className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg flex items-center gap-1">
                          ✓ تم تقديم الإقرار بنجاح
                        </span>
                        
                        <button
                          type="button"
                          onClick={handlePostVatSettlement}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg cursor-pointer animate-pulse"
                        >
                          <Coins className="h-4 w-4" />
                          تسوية وسداد الضريبة بالبنك
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submissions Register History */}
                <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                    <h4 className="text-xs font-bold text-slate-200">سجل إقرارات القيمة المضافة الإلكترونية (ETA Portal History)</h4>
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {vatSubmissions.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">لا توجد إقرارات مقدمة سابقة</div>
                    ) : (
                      vatSubmissions.map((sub, sidx) => (
                        <div key={sidx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/15">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{sub.id}</span>
                            <h5 className="font-bold text-slate-200">{sub.period}</h5>
                            <div className="flex gap-3 text-[10px] text-slate-500 font-sans">
                              <span>مبيعات: {sub.baseSales.toLocaleString()} {config.currency}</span>
                              <span>مشتريات: {sub.basePurchases.toLocaleString()} {config.currency}</span>
                              <span>التاريخ: {sub.date}</span>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div className="space-y-1">
                              <span className="text-xs font-mono font-bold text-slate-200">صافي الضريبة: {sub.netPayable.toLocaleString()} {config.currency}</span>
                              {sub.receiptNo && <p className="text-[10px] text-slate-400 font-mono">رقم الإيصال: {sub.receiptNo}</p>}
                            </div>
                            <span className="px-2 py-1 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                              مقبول ومسدد بالكامل
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORM 41 WITHHOLDING COMPLIANCE */}
            {taxActiveTab === "withholding-ledger" && (
              <div className="space-y-6">
                {/* WHT KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">إجمالي مشتريات خاضعة للخصم</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-slate-200">{totalWithheldBase.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold">عدد المعاملات المسجلة للربع</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-cyan-400">{Math.max(1, whtInvoices.length)}</span>
                      <span className="text-[10px] text-slate-400 mr-1">معاملة تجارية</span>
                    </div>
                  </div>

                  <div className="bg-[#1e1915] p-4 border border-amber-500/20 rounded-xl space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold">إجمالي الضريبة المستقطعة المطلوب توريدها</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-mono font-bold text-amber-400">{totalWithheldTax.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{config.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Submissions Action */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-amber-400 font-mono font-bold">الربع الثاني لعام 2026 (الربع الحالي)</span>
                    <h4 className="text-sm font-bold text-slate-200">إرسال وتوريد كشوفات نموذج 41 ربع السنوية للمنظومة الحكومية</h4>
                    <p className="text-[11px] text-slate-400 font-sans">
                      يشتمل التقرير على الرقم الضريبي للممول وطبيعة المعاملة والمبالغ والنسب المستقطعة وفق مواد القانون المالي.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {form41Status === "Draft" ? (
                      <button
                        type="button"
                        onClick={executeForm41Submission}
                        disabled={isSubmittingForm41}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-amber-600/10 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingForm41 ? (
                          <span className="flex items-center gap-1">⏳ جاري الإرسال لمنظومة ETA...</span>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4" />
                            إرسال وتقديم كشوف نموذج 41
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <span className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg flex items-center gap-1">
                          ✓ تم تقديم نموذج 41 بنجاح
                        </span>
                        
                        <button
                          type="button"
                          onClick={handlePostWithholdingSettlement}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg cursor-pointer animate-pulse"
                        >
                          <Coins className="h-4 w-4" />
                          توريد المبالغ المستقطعة محاسبياً
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form 41 Detailed Ledger List */}
                <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200">الكشف التفصيلي لمبالغ الخصم تحت حساب الضريبة (نموذج 41 المعتمد)</h4>
                    <span className="text-[10px] text-slate-400">عدد بنود التوريد: {Math.max(1, whtInvoices.length)} بنود</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-3 text-right">الممول المستقطع منه</th>
                          <th className="p-3 text-right">الرقم الضريبي للممول</th>
                          <th className="p-3 text-right">تاريخ المعاملة</th>
                          <th className="p-3 text-right">طبيعة المعاملة</th>
                          <th className="p-3 text-left font-mono">المبلغ الأساسي</th>
                          <th className="p-3 text-left font-mono">النسبة %</th>
                          <th className="p-3 text-left font-mono text-amber-400 font-bold text-left">قيمة الخصم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {whtInvoices.length === 0 ? (
                          <tr>
                            <td className="p-3 text-right font-bold">مجموعة هلال السويدي للكابلات</td>
                            <td className="p-3 font-mono text-slate-400">ETA-991823102</td>
                            <td className="p-3 font-mono text-slate-400">2026-05-18</td>
                            <td className="p-3">توريدات ومقاولات (مواد لوجستية)</td>
                            <td className="p-3 text-left font-mono">150,000</td>
                            <td className="p-3 text-left font-mono">1.0%</td>
                            <td className="p-3 text-left font-mono font-bold text-amber-500">1,500 {config.currency}</td>
                          </tr>
                        ) : (
                          whtInvoices.map((inv, idx) => {
                            const supp = suppliers.find(s => s.id === inv.supplierId) || { name: inv.supplierName, taxRegistrationNumber: "ETA-773123512" };
                            const whtRate = inv.subtotal > 0 ? (inv.withholdingTax / inv.subtotal) * 100 : 1;
                            const desc = whtRate <= 1.5 ? "توريدات ومقاولات عامة" : whtRate <= 3.5 ? "خدمات استشارية وفنية" : "أتعاب مهنية وحرة";
                            return (
                              <tr key={idx} className="hover:bg-slate-900/20">
                                <td className="p-3 font-bold">{inv.supplierName}</td>
                                <td className="p-3 font-mono text-slate-400">{supp.taxRegistrationNumber || "ETA-209931812"}</td>
                                <td className="p-3 font-mono text-slate-400">{inv.date}</td>
                                <td className="p-3">{desc}</td>
                                <td className="p-3 text-left font-mono">{inv.subtotal.toLocaleString()}</td>
                                <td className="p-3 text-left font-mono">{whtRate.toFixed(1)}%</td>
                                <td className="p-3 text-left font-mono font-bold text-amber-500">{inv.withholdingTax.toLocaleString()} {config.currency}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* filings summary */}
                <div className="bg-[#0b0f1a] border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                    <h4 className="text-xs font-bold text-slate-200">سجل تقديم نموذج 41 التاريخي لمصلحة الضرائب</h4>
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {form41Filings.map((fil, idx) => (
                      <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/15">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-amber-400 font-bold">{fil.id}</span>
                          <h5 className="font-bold text-slate-200">{fil.quarter}</h5>
                          <div className="flex gap-3 text-[10px] text-slate-500 font-sans">
                            <span>عدد الممولين: {fil.taxpayersCount} ممولين</span>
                            <span>التاريخ: {fil.date}</span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-mono font-bold text-slate-200">إجمالي التوريد: {fil.totalAmount.toLocaleString()} {config.currency}</span>
                            {fil.receiptNo && <p className="text-[10px] text-slate-400 font-mono">رقم الإيصال: {fil.receiptNo}</p>}
                          </div>
                          <span className="px-2 py-1 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                            مستلم ومقبول بالكامل
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUBTAB 5: INVOICES, SUPPLIERS, CUSTOMERS REGISTRY */}
      {activeSubTab === "invoices" && (
        <div className="space-y-6 animate-fadeIn text-slate-100">
          
          {/* Main Top Navigation inside Sub-Tab */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-[#0f1425] border border-slate-800 p-4 rounded-xl gap-4 shadow-xl">
            <div>
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> منظومة إدارة الفواتير والشركاء التجاريين
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                إصدار وترحيل فواتير بيع وشراء متعددة الأصناف مع إمكانية تفعيل/تعطيل ضريبة القيمة المضافة وخصم المنبع لحظياً.
              </p>
            </div>
            
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setInvoiceActiveSection("builder")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${invoiceActiveSection === "builder" ? "bg-amber-500/20 text-amber-400 border border-amber-500/10" : "text-slate-400 hover:text-slate-200"}`}
              >
                منشئ الفواتير الكبرى (متعدد الأصناف)
              </button>
              <button
                type="button"
                onClick={() => setInvoiceActiveSection("directory")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${invoiceActiveSection === "directory" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/10" : "text-slate-400 hover:text-slate-200"}`}
              >
                دليل الشركاء (العملاء والموردين)
              </button>
              <button
                type="button"
                onClick={() => setInvoiceActiveSection("history")}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${invoiceActiveSection === "history" ? "bg-purple-500/20 text-purple-400 border border-purple-500/10" : "text-slate-400 hover:text-slate-200"}`}
              >
                سجل الفواتير الصادرة والمستلمة
              </button>
            </div>
          </div>

          {/* SECTION 1: INVOICE BUILDER (كامل العرض - Full Width Screen) */}
          {invoiceActiveSection === "builder" && (
            <div className="space-y-6">
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
                
                {/* Mode Selector and General Settings */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400">نوع الفاتورة المراد إنشاؤها:</span>
                    <div className="flex bg-slate-900 border border-slate-800/80 p-1 rounded-lg gap-1">
                      <button
                        type="button"
                        onClick={() => { setActiveInvoiceForm("sales"); setDraftItems([]); setInvoiceSuccessMsg(""); setInvoiceErrorMsg(""); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeInvoiceForm === "sales" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10" : "text-slate-400"}`}
                      >
                        فاتورة مبيعات (لعميل)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveInvoiceForm("purchase"); setDraftItems([]); setInvoiceSuccessMsg(""); setInvoiceErrorMsg(""); }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeInvoiceForm === "purchase" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/10" : "text-slate-400"}`}
                      >
                        فاتورة مشتريات (من مورد)
                      </button>
                    </div>
                  </div>

                  {/* Tax Toggles (المسموحية لقيمة مضافة وخصم وإضافة) */}
                  <div className="flex items-center gap-5 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-slate-300">
                      <input
                        type="checkbox"
                        checked={applyVat}
                        onChange={(e) => setApplyVat(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                      />
                      <span>تطبيق ضريبة القيمة المضافة (14%)</span>
                    </label>
                    
                    <div className="h-4 w-px bg-slate-800" />

                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-slate-300">
                      <input
                        type="checkbox"
                        checked={applyWithholding}
                        onChange={(e) => setApplyWithholding(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                      />
                      <span>تطبيق ضريبة الخصم والتحصيل من المنبع (1%)</span>
                    </label>
                  </div>
                </div>

                {/* Primary Partner Selector and Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  {activeInvoiceForm === "sales" ? (
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-bold">اختر العميل المشتري المعتمد</label>
                      <select
                        value={invoiceCustId}
                        onChange={(e) => setInvoiceCustId(e.target.value)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none font-bold text-slate-300 focus:border-emerald-500"
                      >
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-slate-400 block mb-1.5 font-bold">اختر المورد الخارجي المعتمد</label>
                      <select
                        value={invoiceSuppId}
                        onChange={(e) => setInvoiceSuppId(e.target.value)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none font-bold text-slate-300 focus:border-cyan-500"
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-400 block mb-1.5 font-bold">طريقة تسوية وسداد المعاملة</label>
                    <select
                      value={invoicePaymentMethod}
                      onChange={(e) => setInvoicePaymentMethod(e.target.value as any)}
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none font-bold text-slate-300"
                    >
                      <option value="Bank">حساب جاري بالبنك / تحويل فوري</option>
                      <option value="Cash">نقداً من الخزينة الرئيسية</option>
                      <option value="Check">شيك مصرفي تحت التحصيل</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <strong className="text-slate-300 block mb-0.5">القيد التلقائي المزدوج:</strong>
                      عند ترحيل الفاتورة سيقوم النظام بإنشاء قيود يومية متوازنة تلقائياً في الأستاذ العام وتعديل مستويات كميات المخازن فورياً.
                    </div>
                  </div>
                </div>

                {/* Sub-form to Add Item to Draft */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Plus className="h-4 w-4 text-amber-500" /> إضافة أصناف إلى مسودة الفاتورة الحالية
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-end">
                    <div className="md:col-span-2">
                      <label className="text-slate-400 block mb-1.5 font-bold">الصنف المطلوب إدراجه</label>
                      <select
                        value={invoiceSku}
                        onChange={(e) => handleInvoiceSkuChange(e.target.value)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none text-slate-300 font-bold"
                      >
                        {stock.map(s => (
                          <option key={s.sku} value={s.sku}>
                            {s.name} ({s.sku}) — {activeInvoiceForm === "sales" ? `المتاح بالمخازن: ${s.quantity}` : "شراء لزيادة الرصيد"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1.5 font-bold">الكمية المطلوبة</label>
                      <input
                        type="number"
                        min="1"
                        value={invoiceQty}
                        onChange={(e) => setInvoiceQty(Number(e.target.value) || 1)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1.5 font-bold">سعر الوحدة ({config.currency})</label>
                      <input
                        type="number"
                        min="1"
                        value={invoicePrice}
                        onChange={(e) => setInvoicePrice(Number(e.target.value) || 0)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      القيمة الجزئية للصنف الحالي: <strong className="text-slate-200">{(invoiceQty * invoicePrice).toLocaleString()} {config.currency}</strong>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddDraftItem}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-lg transition-all text-xs flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> إضافة الصنف ومتابعة البناء
                    </button>
                  </div>
                </div>

                {/* Draft Items List Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300">أصناف الفاتورة الحالية في المسودة ({draftItems.length} أصناف)</h4>
                    {draftItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDraftItems([])}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        تفريغ الفاتورة بأكملها
                      </button>
                    )}
                  </div>

                  {draftItems.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500">مسودة الفاتورة فارغة حالياً. يرجى اختيار صنف بالتبويب أعلاه والضغط على "إضافة الصنف ومتابعة البناء".</p>
                    </div>
                  ) : (
                    <div className="border border-slate-800/80 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-right divide-y divide-slate-800 font-sans">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 font-bold">
                            <th className="p-3">كود SKU</th>
                            <th className="p-3">اسم المنتج / الصنف</th>
                            <th className="p-3 text-center">الكمية</th>
                            <th className="p-3 text-left">سعر الوحدة</th>
                            <th className="p-3 text-left">الإجمالي قبل الضرائب</th>
                            <th className="p-3 text-center w-16">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-200">
                          {draftItems.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-900/10">
                              <td className="p-3 font-mono font-bold text-slate-400">{item.sku}</td>
                              <td className="p-3 font-bold">{item.name}</td>
                              <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="p-3 text-left font-mono">{item.price.toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-left font-mono font-bold">{item.total.toLocaleString()} {config.currency}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftItem(item.sku)}
                                  className="text-rose-400 hover:text-rose-500 font-bold px-1.5 py-0.5 rounded"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Totals Summary and Posting Buttons */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-800 pt-5">
                  
                  {/* Left Column: Notification messages and grand post button */}
                  <div className="space-y-4 flex flex-col justify-end">
                    {invoiceSuccessMsg && (
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold leading-relaxed">
                        {invoiceSuccessMsg}
                      </div>
                    )}
                    {invoiceErrorMsg && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold leading-relaxed">
                        {invoiceErrorMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={draftItems.length === 0}
                      onClick={() => {
                        if (activeInvoiceForm === "sales") {
                          handleCreateSalesInvoice();
                        } else {
                          handleCreatePurchaseInvoice();
                        }
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 ${draftItems.length === 0 ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50" : activeInvoiceForm === "sales" ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/10" : "bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-lg shadow-cyan-500/10"}`}
                    >
                      <CheckCircle className="h-4.5 w-4.5" />
                      {activeInvoiceForm === "sales" ? "تأكيد وإصدار فاتورة المبيعات للمسودة، وخصم المخزون" : "ترحيل فاتورة الشراء الموحدة للمسودة، وزيادة المخزون"}
                    </button>
                  </div>

                  {/* Right Column: Detailed Tax Summary Card */}
                  <div className="bg-slate-950/60 p-4.5 rounded-xl border border-slate-800/80 space-y-3 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>إجمالي القيمة الأساسية للأصناف (Subtotal):</span>
                      <span className="font-bold text-slate-200">
                        {draftItems.reduce((sum, i) => sum + i.total, 0).toLocaleString()} {config.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-rose-400">
                      <span>ضريبة القيمة المضافة الصادرة/المستلمة (14%):</span>
                      <span>
                        {applyVat 
                          ? `+ ${(draftItems.reduce((sum, i) => sum + i.total, 0) * 0.14).toLocaleString()}` 
                          : "0 (معطلة)"
                        } {config.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-amber-500 pb-2 border-b border-slate-800">
                      <span>ضريبة الخصم والتحصيل من المنبع (1%):</span>
                      <span>
                        {applyWithholding 
                          ? `- ${(draftItems.reduce((sum, i) => sum + i.total, 0) * 0.01).toLocaleString()}` 
                          : "0 (معطلة)"
                        } {config.currency}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-slate-100 font-sans pt-1">
                      <span>صافي التكلفة النهائية الصافية:</span>
                      <span className="text-amber-400 font-mono text-base font-bold">
                        {(() => {
                          const base = draftItems.reduce((sum, i) => sum + i.total, 0);
                          const vat = applyVat ? base * 0.14 : 0;
                          const wh = applyWithholding ? base * 0.01 : 0;
                          return (base + vat - wh).toLocaleString();
                        })()} {config.currency}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* SECTION 2: PARTNERS DIRECTORY (العملاء والموردين) */}
          {invoiceActiveSection === "directory" && (
            <div className="space-y-6">
              
              {/* Registration Forms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Customer */}
                <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-display font-bold text-slate-200 text-sm mb-4 flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-emerald-400" /> إضافة عميل تجاري جديد
                  </h3>
                  <form onSubmit={handleAddCustomer} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">اسم العميل (مؤسسة / فرد)</label>
                        <input
                          type="text"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="شركة النيل للمعلومات"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none focus:border-emerald-500 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">الرقم التسجيلي الضريبي</label>
                        <input
                          type="text"
                          value={custTax}
                          onChange={(e) => setCustTax(e.target.value)}
                          placeholder="123-456-789"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">رقم الهاتف للاتصال</label>
                        <input
                          type="text"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="010xxxxxxxx"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">البريد الإلكتروني المعتمد</label>
                        <input
                          type="email"
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="billing@nilecorp.com"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none text-left"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg transition-all text-xs"
                    >
                      حفظ وتسجيل العميل بالدليل
                    </button>
                    {custRegSuccess && (
                      <p className="text-emerald-400 text-[11px] bg-emerald-500/10 border border-emerald-500/20 p-2 rounded">{custRegSuccess}</p>
                    )}
                  </form>
                </div>

                {/* Add Supplier */}
                <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-display font-bold text-slate-200 text-sm mb-4 flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-cyan-400" /> إضافة مورد خارجي جديد
                  </h3>
                  <form onSubmit={handleAddSupplier} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">اسم المورد / الشريك المالي</label>
                        <input
                          type="text"
                          value={suppName}
                          onChange={(e) => setSuppName(e.target.value)}
                          placeholder="مجموعة دل هاردوير الدولية"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none focus:border-cyan-500 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">الرقم الضريبي للمورد</label>
                        <input
                          type="text"
                          value={suppTax}
                          onChange={(e) => setSuppTax(e.target.value)}
                          placeholder="555-444-333"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">رقم الهاتف للاتصال</label>
                        <input
                          type="text"
                          value={suppPhone}
                          onChange={(e) => setSuppPhone(e.target.value)}
                          placeholder="022xxxxxxx"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">البريد الإلكتروني للطلبيات</label>
                        <input
                          type="email"
                          value={suppEmail}
                          onChange={(e) => setSuppEmail(e.target.value)}
                          placeholder="orders@dellparts.com"
                          className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none text-left"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2 rounded-lg transition-all text-xs"
                    >
                      تسجيل وحفظ المورد بالدليل
                    </button>
                    {suppRegSuccess && (
                      <p className="text-cyan-400 text-[11px] bg-cyan-500/10 border border-cyan-500/20 p-2 rounded">{suppRegSuccess}</p>
                    )}
                  </form>
                </div>
              </div>

              {/* Lists of Partners */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Customers list */}
                <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-display font-bold text-slate-200 text-sm mb-3">دليل العملاء وحسابات الذمم التجارية المدنية</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right divide-y divide-slate-800/60 font-sans">
                      <thead>
                        <tr className="text-slate-400 font-bold">
                          <th className="p-2">رقم العميل</th>
                          <th className="p-2">الاسم</th>
                          <th className="p-2">الرقم الضريبي</th>
                          <th className="p-2">الهاتف</th>
                          <th className="p-2 text-left">الرصيد الدفتري</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {customers.map(c => (
                          <tr key={c.id} className="hover:bg-slate-900/20">
                            <td className="p-2 font-mono font-bold text-emerald-400">{c.id}</td>
                            <td className="p-2 font-bold">{c.name}</td>
                            <td className="p-2 font-mono">{c.taxRegistrationNumber}</td>
                            <td className="p-2 font-mono">{c.phone}</td>
                            <td className="p-2 text-left font-mono font-bold text-slate-200">{c.balance.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Suppliers list */}
                <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl">
                  <h3 className="font-display font-bold text-slate-200 text-sm mb-3">دليل الموردين وحسابات الذمم الدائنة</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right divide-y divide-slate-800/60 font-sans">
                      <thead>
                        <tr className="text-slate-400 font-bold">
                          <th className="p-2">رقم المورد</th>
                          <th className="p-2">الاسم</th>
                          <th className="p-2">الرقم الضريبي</th>
                          <th className="p-2">الهاتف</th>
                          <th className="p-2 text-left">الرصيد المستحق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {suppliers.map(s => (
                          <tr key={s.id} className="hover:bg-slate-900/20">
                            <td className="p-2 font-mono font-bold text-cyan-400">{s.id}</td>
                            <td className="p-2 font-bold">{s.name}</td>
                            <td className="p-2 font-mono">{s.taxRegistrationNumber}</td>
                            <td className="p-2 font-mono">{s.phone}</td>
                            <td className="p-2 text-left font-mono font-bold text-slate-200">{s.balance.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SECTION 3: INVOICES HISTORY (سجل تاريخ الفواتير بالكامل) */}
          {invoiceActiveSection === "history" && (
            <div className="space-y-6">
              
              {/* Sales Invoices List */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-1.5 text-emerald-400">
                  <FileSpreadsheet className="h-4.5 w-4.5" /> سجل فواتير المبيعات الصادرة (العملاء)
                </h3>
                
                {salesInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">لا توجد فواتير مبيعات صادرة حالياً.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-xs text-right divide-y divide-slate-800/60 font-sans">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 font-bold">
                          <th className="p-3">رقم الفاتورة</th>
                          <th className="p-3">تاريخ الإصدار</th>
                          <th className="p-3">اسم العميل</th>
                          <th className="p-3">عدد الأصناف</th>
                          <th className="p-3 text-left">القيمة الأساسية</th>
                          <th className="p-3 text-left">إجمالي المبيعات مع الضرائب</th>
                          <th className="p-3 text-center">الحالة وطريقة الدفع</th>
                          <th className="p-3 text-center w-28">العمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {salesInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-mono font-bold text-emerald-400">{inv.id}</td>
                            <td className="p-3 font-mono">{inv.date}</td>
                            <td className="p-3 font-bold">{inv.customerName}</td>
                            <td className="p-3 font-mono">{inv.items?.length || 1} أصناف</td>
                            <td className="p-3 text-left font-mono">{inv.subtotal.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono font-bold text-slate-100">{inv.total.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-center">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded text-[10px] font-bold border border-emerald-500/10">
                                مسددة ({inv.paymentMethod === "Bank" ? "بنك" : inv.paymentMethod === "Cash" ? "نقداً" : "شيك"})
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice({ ...inv, invoiceType: "sales" })}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded transition-all flex items-center gap-1 mx-auto border border-slate-700 cursor-pointer"
                              >
                                <Printer className="h-3 w-3 text-emerald-400" /> عرض وطباعة
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Purchase Invoices List */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-1.5 text-cyan-400">
                  <FileSpreadsheet className="h-4.5 w-4.5" /> سجل فواتير المشتريات الموردة (الموردين)
                </h3>
                
                {purchaseInvoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">لا توجد فواتير مشتريات مستلمة حالياً.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-xs text-right divide-y divide-slate-800/60 font-sans">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 font-bold">
                          <th className="p-3">رقم الفاتورة</th>
                          <th className="p-3">تاريخ الاستلام</th>
                          <th className="p-3">اسم المورد</th>
                          <th className="p-3">عدد الأصناف</th>
                          <th className="p-3 text-left">القيمة الأساسية</th>
                          <th className="p-3 text-left">صافي المدفوع الفعلي</th>
                          <th className="p-3 text-center">الحالة وطريقة الدفع</th>
                          <th className="p-3 text-center w-28">العمليات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-slate-300">
                        {purchaseInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-900/10">
                            <td className="p-3 font-mono font-bold text-cyan-400">{inv.id}</td>
                            <td className="p-3 font-mono">{inv.date}</td>
                            <td className="p-3 font-bold">{inv.supplierName}</td>
                            <td className="p-3 font-mono">{inv.items?.length || 1} أصناف</td>
                            <td className="p-3 text-left font-mono">{inv.subtotal.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-left font-mono font-bold text-slate-100">{inv.total.toLocaleString()} {config.currency}</td>
                            <td className="p-3 text-center">
                              <span className="bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded text-[10px] font-bold border border-cyan-500/10">
                                مسددة ({inv.paymentMethod === "Bank" ? "بنك" : inv.paymentMethod === "Cash" ? "نقداً" : "شيك"})
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice({ ...inv, invoiceType: "purchase" })}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded transition-all flex items-center gap-1 mx-auto border border-slate-700 cursor-pointer"
                              >
                                <Printer className="h-3 w-3 text-cyan-400" /> عرض وطباعة
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* SUBTAB 6: SUB-LEDGER ACCOUNT STATEMENTS (كشف حساب عميل / مورد / نقدية وشيكات) */}
      {activeSubTab === "sub-ledgers" && (
        <div className="space-y-6 animate-fadeIn text-slate-100">
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            
            {/* Control panel for searching statements */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-base">منظومة كشوف الحسابات التفصيلية (دفاتر الأستاذ المساعدة)</h3>
                <p className="text-xs text-slate-400 mt-1">توليد وطباعة كشوف الحسابات المعتمدة للعملاء والموردين وحسابات الخزينة وبنك CIB والشيكات المصرفية.</p>
              </div>

              {/* Selector for Statement Type */}
              <div className="flex bg-[#121829] border border-slate-700/60 p-1 rounded-lg gap-1.5 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => { setStatementType("customer"); setStatementSearchQuery(""); }}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${statementType === "customer" ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400"}`}
                >
                  <Users className="h-3.5 w-3.5" /> كشف حساب عميل
                </button>
                <button
                  type="button"
                  onClick={() => { setStatementType("supplier"); setStatementSearchQuery(""); }}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${statementType === "supplier" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"}`}
                >
                  <Building2 className="h-3.5 w-3.5" /> كشف حساب مورد
                </button>
                <button
                  type="button"
                  onClick={() => { setStatementType("cash-checks"); setStatementSearchQuery(""); }}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${statementType === "cash-checks" ? "bg-amber-500/20 text-amber-400" : "text-slate-400"}`}
                >
                  <Coins className="h-3.5 w-3.5" /> كشف حساب النقدية والبنوك والشيكات
                </button>
              </div>
            </div>

            {/* Criteria Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-900/30 p-4 border border-slate-800 rounded-lg text-xs no-print">
              {statementType === "customer" && (
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">اختر العميل المستهدف</label>
                  <select
                    value={statementCustId}
                    onChange={(e) => setStatementCustId(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-2 focus:outline-none text-slate-300"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {statementType === "supplier" && (
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">اختر المورد المستهدف</label>
                  <select
                    value={statementSuppId}
                    onChange={(e) => setStatementSuppId(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-2 focus:outline-none text-slate-300"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {statementType === "cash-checks" && (
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">اختر الحساب المصرفي / الخزينة</label>
                  <select
                    value={statementCashBankCode}
                    onChange={(e) => setStatementCashBankCode(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-2 focus:outline-none text-slate-300"
                  >
                    <option value="10100">بنك CIB - الحساب الجاري بالجنيه المصري (10100)</option>
                    <option value="10200">بنك ADIB - حساب فرع الإمارات بالدرهم (10200)</option>
                    <option value="22100">أوراق الدفع والشيكات الآجلة (الخصم والتحصيل) (22100)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1 font-bold">من تاريخ</label>
                <input
                  type="date"
                  value={statementStartDate}
                  onChange={(e) => setStatementStartDate(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none font-mono text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">إلى تاريخ</label>
                <input
                  type="date"
                  value={statementEndDate}
                  onChange={(e) => setStatementEndDate(e.target.value)}
                  className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none font-mono text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold">بحث في الحركات والشرح</label>
                <div className="relative">
                  <input
                    type="text"
                    value={statementSearchQuery}
                    onChange={(e) => setStatementSearchQuery(e.target.value)}
                    placeholder="بحث في البيان..."
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded pr-3 pl-8 py-2 focus:outline-none"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all w-full md:w-auto justify-center cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-95 border border-emerald-500"
                >
                  <FileDown className="h-4 w-4" /> تصدير PDF
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all w-full md:w-auto justify-center cursor-pointer border border-slate-700 active:scale-95"
                >
                  <Printer className="h-4 w-4" /> طباعة كشف الحساب المعتمد (PDF)
                </button>
              </div>
            </div>

            {/* Advanced Date Search Presets */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3 border border-slate-800 rounded-lg text-xs no-print">
              <span className="text-slate-400 font-bold ml-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-400" />
                بحث متقدم بفترات زمنية سريعة:
              </span>
              {[
                {
                  label: "اليوم",
                  getDates: () => {
                    const today = new Date().toISOString().split("T")[0];
                    return { start: today, end: today };
                  }
                },
                {
                  label: "آخر 7 أيام",
                  getDates: () => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 7);
                    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
                  }
                },
                {
                  label: "هذا الشهر",
                  getDates: () => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
                  }
                },
                {
                  label: "الربع الحالي",
                  getDates: () => {
                    const now = new Date();
                    const quarter = Math.floor(now.getMonth() / 3);
                    const start = new Date(now.getFullYear(), quarter * 3, 1);
                    const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
                  }
                },
                {
                  label: "السنة الحالية",
                  getDates: () => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), 0, 1);
                    const end = new Date(now.getFullYear(), 11, 31);
                    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
                  }
                },
                {
                  label: "عرض كافة الحركات (بدون فلتر)",
                  getDates: () => ({ start: "", end: "" })
                }
              ].map((preset) => {
                const dates = preset.getDates();
                const isActive = statementStartDate === dates.start && statementEndDate === dates.end;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStatementStartDate(dates.start);
                      setStatementEndDate(dates.end);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all font-sans cursor-pointer ${
                      isActive 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shadow-md shadow-emerald-500/5" 
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Interactive Payments/Receipts Form */}
            {statementType !== "cash-checks" && (
              <div className="bg-[#121829]/45 border border-slate-800/80 rounded-xl p-4 space-y-3 text-xs text-slate-300 no-print">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-display font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-emerald-400" />
                    {statementType === "customer" 
                      ? "تسجيل سند تحصيل سريع من العميل وتحديث الأرصدة" 
                      : "تسجيل سند صرف سريع للمورد وتحديث الأرصدة"
                    }
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">تحديث فوري لدفتر الأستاذ العام وميزان المراجعة</span>
                </div>

                {quickPaySuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold">
                    {quickPaySuccess}
                  </div>
                )}
                {quickPayError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-bold">
                    {quickPayError}
                  </div>
                )}

                <form onSubmit={handleQuickPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-bold">قيمة السند (العملة المحلّية)</label>
                    <input
                      type="number"
                      value={quickPayAmount || ""}
                      onChange={(e) => setQuickPayAmount(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none text-center font-mono font-bold text-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-bold">الحساب المقابل (صندوق/بنك)</label>
                    <select
                      value={quickPayAccount}
                      onChange={(e) => setQuickPayAccount(e.target.value)}
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="10100">بنك CIB الجاري الرئيسي (10100)</option>
                      <option value="10300">النقدية بالخزينة الرئيسية (10300)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-bold">البيان والشرح التفصيلي</label>
                    <input
                      type="text"
                      value={quickPayNotes}
                      onChange={(e) => setQuickPayNotes(e.target.value)}
                      placeholder="الشرح أو رقم الإيصال..."
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2 px-4 rounded font-bold transition-all cursor-pointer shadow-md text-[11px] ${
                      statementType === "customer"
                        ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/5"
                        : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 shadow-cyan-500/5"
                    }`}
                  >
                    {statementType === "customer" ? "تسجيل التحصيل وترحيله" : "تسجيل الصرف وترحيله"}
                  </button>
                </form>
              </div>
            )}

            {/* Render Selected Statement Detail Sheet */}
            <div className="bg-[#121829]/60 border border-slate-800 rounded-xl p-6 space-y-6 text-right printable-area" id="printable-statement">
              {(() => {
                let targetName = "";
                let taxReg = "";
                let phone = "";
                let email = "";
                let currentBal = 0;
                let unfilteredMoves: any[] = [];

                if (statementType === "customer") {
                  const c = customers.find(x => x.id === statementCustId);
                  if (c) {
                    targetName = c.name;
                    taxReg = c.taxRegistrationNumber;
                    phone = c.phone;
                    email = c.email;
                    currentBal = c.balance;
                    unfilteredMoves = journalEntries.filter(je => 
                      je.lines.some(l => l.accountCode === "11000") && (
                        je.reference.includes(statementCustId) || 
                        je.description.includes(c.name) ||
                        je.description.includes(statementCustId) ||
                        je.id.includes(statementCustId)
                      )
                    );
                  }
                } else if (statementType === "supplier") {
                  const s = suppliers.find(x => x.id === statementSuppId);
                  if (s) {
                    targetName = s.name;
                    taxReg = s.taxRegistrationNumber;
                    phone = s.phone;
                    email = s.email;
                    currentBal = s.balance;
                    unfilteredMoves = journalEntries.filter(je => 
                      je.lines.some(l => l.accountCode === "20100") && (
                        je.reference.includes(statementSuppId) || 
                        je.description.includes(s.name) ||
                        je.description.includes(statementSuppId) ||
                        je.id.includes(statementSuppId)
                      )
                    );
                  }
                } else {
                  const acc = accounts.find(x => x.code === statementCashBankCode);
                  if (acc) {
                    targetName = acc.name;
                    taxReg = "مستند داخلي";
                    phone = "الرقم الكودي: " + acc.code;
                    email = "الحساب الجاري الرئيسي";
                    currentBal = acc.balance;
                    unfilteredMoves = journalEntries.filter(je => 
                      je.lines.some(l => l.accountCode === statementCashBankCode)
                    );
                  }
                }

                // Process into individual movements
                const allIndividualMovements: any[] = [];
                unfilteredMoves.forEach((mv: any) => {
                  const matchingLines = mv.lines.filter((l: any) => {
                    if (statementType === "customer") return l.accountCode === "11000";
                    if (statementType === "supplier") return l.accountCode === "20100";
                    return l.accountCode === statementCashBankCode;
                  });

                  matchingLines.forEach((l: any, lineIdx: number) => {
                    let finalDesc = mv.description || "";
                    if (matchingLines.length > 1) {
                      if (l.debit > 0 && statementType === "customer") {
                        finalDesc = `${mv.description || ""} (إثبات استحقاق الفاتورة)`;
                      } else if (l.credit > 0 && statementType === "customer") {
                        finalDesc = `${(mv.description || "").replace("فاتورة بيع مبيعات نقدية", "تسوية / سداد").replace("فاتورة بيع", "تحصيل")} (سداد وتحصيل مالي)`;
                      } else if (l.debit > 0 && statementType === "supplier") {
                        finalDesc = `${(mv.description || "").replace("فاتورة شراء فورية", "تسوية / سداد").replace("فاتورة شراء", "سداد")} (سداد فوري للمشتريات)`;
                      } else if (l.credit > 0 && statementType === "supplier") {
                        finalDesc = `${mv.description || ""} (إثبات استحقاق الفاتورة)`;
                      }
                    }

                    allIndividualMovements.push({
                      id: mv.id,
                      date: mv.date,
                      description: finalDesc,
                      debit: l.debit,
                      credit: l.credit,
                      lineKey: `${mv.id}-${lineIdx}`
                    });
                  });
                });

                // Chronological sort: oldest transactions first
                allIndividualMovements.sort((a, b) => {
                  if (a.date !== b.date) {
                    return a.date.localeCompare(b.date);
                  }
                  return a.lineKey.localeCompare(b.lineKey);
                });

                // Calculate baseStartingBalance before all ledger entries
                let sumOfAllLedgerEffects = 0;
                allIndividualMovements.forEach((mv) => {
                  if (statementType === "customer") {
                    sumOfAllLedgerEffects += (mv.debit - mv.credit);
                  } else if (statementType === "supplier") {
                    sumOfAllLedgerEffects += (mv.credit - mv.debit);
                  } else {
                    sumOfAllLedgerEffects += (mv.debit - mv.credit);
                  }
                });

                const baseStartingBalance = currentBal - sumOfAllLedgerEffects;

                // Pre-calculate running balance on each sorted movement
                let tempRollingBalance = baseStartingBalance;
                allIndividualMovements.forEach((mv) => {
                  if (statementType === "customer") {
                    tempRollingBalance += (mv.debit - mv.credit);
                  } else if (statementType === "supplier") {
                    tempRollingBalance += (mv.credit - mv.debit);
                  } else {
                    tempRollingBalance += (mv.debit - mv.credit);
                  }
                  mv.runningBalance = tempRollingBalance;
                });

                // Apply date and search filters to the sorted list
                let filteredMovements = [...allIndividualMovements];

                if (statementStartDate) {
                  filteredMovements = filteredMovements.filter(m => m.date >= statementStartDate);
                }
                if (statementEndDate) {
                  filteredMovements = filteredMovements.filter(m => m.date <= statementEndDate);
                }
                if (statementSearchQuery.trim()) {
                  filteredMovements = filteredMovements.filter(m => 
                    m.description.includes(statementSearchQuery) || 
                    m.id.includes(statementSearchQuery)
                  );
                }

                // Determine correct period opening balance
                let periodOpeningBalance = baseStartingBalance;
                if (filteredMovements.length > 0) {
                  const firstMv = filteredMovements[0];
                  if (statementType === "customer") {
                    periodOpeningBalance = firstMv.runningBalance - (firstMv.debit - firstMv.credit);
                  } else if (statementType === "supplier") {
                    periodOpeningBalance = firstMv.runningBalance - (firstMv.credit - firstMv.debit);
                  } else {
                    periodOpeningBalance = firstMv.runningBalance - (firstMv.debit - firstMv.credit);
                  }
                } else {
                  periodOpeningBalance = currentBal;
                }

                const periodEndingBalance = filteredMovements.length > 0 
                  ? filteredMovements[filteredMovements.length - 1].runningBalance 
                  : currentBal;

                const totalDebits = filteredMovements.reduce((sum, m) => sum + m.debit, 0);
                const totalCredits = filteredMovements.reduce((sum, m) => sum + m.credit, 0);

                return (
                  <div className="space-y-4">
                    {/* Official Company Branding Header (Visible on Screen & Print) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-800 pb-5 mb-1 gap-4">
                      <div className="flex items-center gap-3">
                        {/* Premium Dynamic Corporate Logo */}
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 print:bg-slate-100 print:text-emerald-700 print:border-emerald-600 shrink-0 shadow-inner">
                          <Building2 className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-display font-bold text-slate-100 print:text-slate-900">{config.company || "الشركة الفعالة"}</h3>
                          <p className="text-[11px] text-slate-400 print:text-slate-600">
                            الفرع الفني: {config.branch || "الفرع الرئيسي"} | السنة المالية: {config.fiscalYear || "2026"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1 shrink-0">
                        <div className="text-xs font-display font-bold text-emerald-400 print:text-slate-800">منظومة التقارير المالية المعتمدة</div>
                        <div className="text-[10px] font-mono text-slate-500 print:text-slate-600">ApexSaaS ERP Smart Core</div>
                      </div>
                    </div>

                    {/* Header sheet design */}
                    <div className="flex flex-col md:flex-row justify-between border-b border-slate-800 pb-4 gap-4">
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">مستند رسمي معتمد</div>
                        <h4 className="text-lg font-display font-bold text-emerald-400">{statementType === "customer" ? "كشف حساب عميل مفصل" : statementType === "supplier" ? "كشف حساب مورد تفصيلي" : "دفتر أستاذ مساعد حركة النقدية والشيكات"}</h4>
                        <p className="text-xs text-slate-200 font-bold">الاسم المستهدف: {targetName || "يرجى الاختيار"}</p>
                        {taxReg && <p className="text-[11px] text-slate-400">الرقم الضريبي / المرجعي: <span className="font-mono">{taxReg}</span></p>}
                        {phone && <p className="text-[11px] text-slate-400">الاتصال المباشر: <span className="font-mono">{phone} | {email}</span></p>}
                      </div>
                      
                      <div className="md:text-left space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-800 shrink-0 self-start md:self-auto text-xs text-right">
                        <div className="text-slate-400">تاريخ الكشف: <span className="font-mono text-slate-200">{new Date().toISOString().split("T")[0]}</span></div>
                        <div className="text-slate-400">الرصيد الافتتاحي للمدة: <span className="font-mono text-slate-200">{periodOpeningBalance.toLocaleString()} {config.currency}</span></div>
                        <div className="text-slate-400 font-bold text-emerald-400">الرصيد الختامي للمدة: <span className="font-mono">{periodEndingBalance.toLocaleString()} {config.currency}</span></div>
                        <div className="text-[10px] text-slate-500">مجموع الحركات المكتشفة: {filteredMovements.length} حركة ماليّة</div>
                      </div>
                    </div>

                    {/* Certified Cumulative Summary Panel (Visible in Screen & Print for audit) */}
                    <div className="bg-slate-900/35 border border-slate-800/80 rounded-xl p-4 space-y-2.5 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 print:border-slate-300">
                        <span className="text-xs font-bold text-slate-300 print:text-slate-900 flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-emerald-400" />
                          الملخص المالي التراكمي لفترة الكشف المحددة
                        </span>
                        <span className="text-[10px] text-slate-500 print:text-slate-600 font-mono">العملة: {config.currency}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400 print:text-slate-600 font-sans">1. الرصيد الافتتاحي للمدة</p>
                          <p className="text-sm font-mono font-bold text-slate-100 print:text-slate-950 mt-1">
                            {periodOpeningBalance.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">{config.currency}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 print:text-slate-600 font-sans">
                            {statementType === "customer" ? "2. إجمالي المبيعات والمدين (+)" : statementType === "supplier" ? "2. إجمالي المدفوعات والمدين (+)" : "2. إجمالي المدينات والإيداعات (+)"}
                          </p>
                          <p className="text-sm font-mono font-bold text-emerald-400 print:text-emerald-700 mt-1">
                            + {totalDebits.toLocaleString()} <span className="text-[10px] font-normal">{config.currency}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 print:text-slate-600 font-sans">
                            {statementType === "customer" ? "3. إجمالي التحصيلات والدائن (-)" : statementType === "supplier" ? "3. إجمالي المشتريات والدائن (-)" : "3. إجمالي المقبوضات والدائن (-)"}
                          </p>
                          <p className="text-sm font-mono font-bold text-amber-400 print:text-amber-700 mt-1">
                            - {totalCredits.toLocaleString()} <span className="text-[10px] font-normal">{config.currency}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-300 print:text-slate-900 font-bold">4. الرصيد الختامي للمدة</p>
                          <p className="text-sm font-mono font-bold text-cyan-300 print:text-cyan-800 mt-1">
                            {periodEndingBalance.toLocaleString()} <span className="text-[10px] font-normal">{config.currency}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Visual Summary Dashboard Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print py-2">
                      {/* 1. Opening Balance Card */}
                      <div className="bg-[#141b2d]/50 border border-slate-800 p-4 rounded-xl space-y-2 text-right relative overflow-hidden group hover:border-slate-700/60 transition-all">
                        <div className="absolute top-0 right-0 h-1 w-full bg-slate-500/40" />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400">الرصيد الافتتاحي للمدة</span>
                          <span className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                            <Scale className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-mono font-bold text-slate-100">
                            {periodOpeningBalance.toLocaleString()} <span className="text-xs text-slate-400">{config.currency}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">رصيد أول المدة المنقول للفترة</p>
                        </div>
                      </div>

                      {/* 2. Total Debits / Deposits Card */}
                      <div className="bg-emerald-500/5 border border-emerald-500/15 p-4 rounded-xl space-y-2 text-right relative overflow-hidden group hover:border-emerald-500/35 transition-all">
                        <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500/40" />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-400">
                            {statementType === "customer" 
                              ? "إجمالي المبيعات والمدين (+)" 
                              : statementType === "supplier"
                                ? "إجمالي المدفوعات والمدين (+)"
                                : "إجمالي الإيداعات والمدين (+)"
                            }
                          </span>
                          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-mono font-bold text-emerald-400">
                            + {totalDebits.toLocaleString()} <span className="text-xs text-emerald-500/60">{config.currency}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">مجموع الحركات الإيجابية بالجدول</p>
                        </div>
                      </div>

                      {/* 3. Total Credits / Withdrawals Card */}
                      <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl space-y-2 text-right relative overflow-hidden group hover:border-amber-500/35 transition-all">
                        <div className="absolute top-0 right-0 h-1 w-full bg-amber-500/40" />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-400">
                            {statementType === "customer" 
                              ? "إجمالي السدادات والدائن (-)" 
                              : statementType === "supplier"
                                ? "إجمالي المشتريات والدائن (-)"
                                : "إجمالي السحوبات والدائن (-)"
                            }
                          </span>
                          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                            <Coins className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-mono font-bold text-amber-400">
                            - {totalCredits.toLocaleString()} <span className="text-xs text-amber-500/60">{config.currency}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">مجموع الحركات السلبية بالجدول</p>
                        </div>
                      </div>

                      {/* 4. Current Ending Balance Card */}
                      <div className="bg-cyan-500/5 border border-cyan-500/25 p-4 rounded-xl space-y-2 text-right relative overflow-hidden group hover:border-cyan-500/45 transition-all">
                        <div className="absolute top-0 right-0 h-1 w-full bg-cyan-500/40" />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-400">الرصيد الختامي للمدة</span>
                          <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <CheckSquare className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-lg font-mono font-bold text-cyan-300">
                            {periodEndingBalance.toLocaleString()} <span className="text-xs text-cyan-400/60">{config.currency}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              periodEndingBalance > 0 
                                ? "bg-emerald-500/15 text-emerald-400" 
                                : periodEndingBalance < 0 
                                  ? "bg-rose-500/15 text-rose-400" 
                                  : "bg-slate-800 text-slate-400"
                            }`}>
                              {statementType === "customer" 
                                ? (periodEndingBalance > 0 ? "ذمة مستحقة لنا" : periodEndingBalance < 0 ? "رصيد دائن مقدم" : "مصفّر")
                                : statementType === "supplier"
                                  ? (periodEndingBalance > 0 ? "مستحق للمورد" : periodEndingBalance < 0 ? "دفعات مقدمة فائضة" : "مصفّر")
                                  : (periodEndingBalance > 0 ? "رصيد إيجابي" : periodEndingBalance < 0 ? "سحب على المكشوف" : "مصفّر")
                              }
                            </span>
                            <span className="text-[10px] text-slate-500">حالة الحساب النهائية</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table of movements */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right divide-y divide-slate-800/80 font-sans">
                        <thead>
                          <tr className="text-slate-400 font-bold">
                            <th className="p-2.5">تاريخ المعاملة</th>
                            <th className="p-2.5">رقم السند المالي</th>
                            <th className="p-2.5">بيان وشرح الحركة بالتفصيل</th>
                            <th className="p-2.5 text-left text-emerald-400">مدين / إيداع (+)</th>
                            <th className="p-2.5 text-left text-amber-500">دائن / سحب (-)</th>
                            <th className="p-2.5 text-left text-slate-300">الرصيد المتراكم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-200">
                          {/* Starting Balance Row */}
                          <tr className="bg-slate-900/10 italic text-slate-400">
                            <td className="p-2.5">-</td>
                            <td className="p-2.5">-</td>
                            <td className="p-2.5">رصيد أول المدة المنقول</td>
                            <td className="p-2.5 text-left">-</td>
                            <td className="p-2.5 text-left">-</td>
                            <td className="p-2.5 text-left font-mono font-bold">{periodOpeningBalance.toLocaleString()} {config.currency}</td>
                          </tr>

                          {/* Movements lines */}
                          {filteredMovements.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">لا يوجد حركات مسجلة مطابقة لمعايير البحث في الفترة المحددة.</td>
                            </tr>
                          ) : (
                            filteredMovements.map((mv, idx) => (
                              <tr key={mv.lineKey || idx} className="hover:bg-slate-900/20">
                                <td className="p-2.5 font-mono text-slate-400">{mv.date}</td>
                                <td className="p-2.5 font-mono text-emerald-400 font-bold">{mv.id}</td>
                                <td className="p-2.5 text-slate-300 font-medium">{mv.description}</td>
                                <td className="p-2.5 text-left font-mono text-emerald-400 font-semibold">{mv.debit > 0 ? `+ ${mv.debit.toLocaleString()}` : "-"}</td>
                                <td className="p-2.5 text-left font-mono text-amber-500 font-semibold">{mv.credit > 0 ? `- ${mv.credit.toLocaleString()}` : "-"}</td>
                                <td className="p-2.5 text-left font-mono font-bold text-slate-100">{mv.runningBalance.toLocaleString()} {config.currency}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer sign section for validation */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6 mt-6 text-xs text-slate-400 font-sans">
                      <div>
                        <p>توقيع المدقق المالي القانوني:</p>
                        <div className="h-10 mt-2 border-b border-dashed border-slate-700 w-48" />
                        <p className="mt-1 text-[10px] text-slate-500 font-sans">أحلام سلطان (محاسب قانوني معتمد)</p>
                      </div>
                      <div className="text-left">
                        <p>ختم المنشأة والاعتماد الرسمي:</p>
                        <div className="h-10 mt-2 border-b border-dashed border-slate-700 w-48 mr-auto" />
                        <p className="mt-1 text-[10px] text-slate-500 font-sans">نظام ApexSaaS المالي الذكي</p>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 7: DETAILED INVENTORY LEDGER / STOCK STATEMENT (بيان الأصناف المخزنية) */}
      {activeSubTab === "inventory-ledger" && (
        <div className="space-y-6 animate-fadeIn text-slate-100 font-sans">
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-base">بيان وحالة الأصناف المخزنية والتحقق الجردي المالي</h3>
                <p className="text-xs text-slate-400 mt-1">تتبع مستويات المخزون للمنتجات التامة والمواد الخام، والأسعار الفردية للوحدة وحجم التقييم المالي المتراكم بالخزينة.</p>
              </div>
              <span className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold font-sans">
                إجمالي التقييم المالي للمخزون الحالي: {stock.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0).toLocaleString()} {config.currency}
              </span>
            </div>

            {/* In-tab add item / update quantities directly to make it interactive */}
            <div className="bg-slate-900/30 p-4 border border-slate-800 rounded-lg">
              <h4 className="font-bold text-slate-200 text-xs mb-3">تسجيل صنف مخزني جديد / تعديل أرصدة افتتاحية</h4>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const name = (form.elements.namedItem("skuName") as HTMLInputElement).value;
                  const sku = (form.elements.namedItem("skuCode") as HTMLInputElement).value;
                  const qty = Number((form.elements.namedItem("skuQty") as HTMLInputElement).value) || 0;
                  const price = Number((form.elements.namedItem("skuPrice") as HTMLInputElement).value) || 0;

                  if (!sku || !name) return;

                  const exists = stock.some(s => s.sku === sku);
                  if (exists) {
                    setStock(stock.map(s => s.sku === sku ? { ...s, quantity: s.quantity + qty, unitPrice: price || s.unitPrice } : s));
                  } else {
                    const newItem: StockItem = {
                      sku,
                      name,
                      warehouseId: config.warehouse,
                      quantity: qty,
                      unitPrice: price,
                      minLevel: 10
                    };
                    setStock([...stock, newItem]);
                  }
                  form.reset();
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
              >
                <div>
                  <input name="skuCode" placeholder="كود الصنف (مثال: SKU-SSD-99)" className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none" required />
                </div>
                <div>
                  <input name="skuName" placeholder="اسم ووصف الصنف المخزني" className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none" required />
                </div>
                <div>
                  <input name="skuQty" type="number" placeholder="الكمية الافتتاحية" className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none font-mono" required />
                </div>
                <div className="flex gap-2">
                  <input name="skuPrice" type="number" placeholder="سعر الوحدة" className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none font-mono" required />
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded font-bold transition-all whitespace-nowrap shrink-0">إدراج وتحديث</button>
                </div>
              </form>
            </div>

            {/* Grid display of inventory statement details */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y divide-slate-800/80 font-sans">
                <thead>
                  <tr className="text-slate-400 font-bold bg-slate-900/50">
                    <th className="p-3">رقم الصنف (SKU)</th>
                    <th className="p-3">وصف الصنف التخزيني</th>
                    <th className="p-3">المستودع الرئيسي الحالي</th>
                    <th className="p-3 text-left">الكمية الفعلية المتاحة</th>
                    <th className="p-3 text-left">سعر الوحدة الدفتري</th>
                    <th className="p-3 text-left">القيمة المالية الإجمالية</th>
                    <th className="p-3 text-center">حالة مستوى الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-200 font-sans">
                  {stock.map((item) => {
                    const totalVal = item.quantity * item.unitPrice;
                    const isLow = item.quantity <= item.minLevel;
                    return (
                      <tr key={item.sku} className="hover:bg-slate-900/20">
                        <td className="p-3 font-mono font-bold text-slate-400">{item.sku}</td>
                        <td className="p-3 font-bold text-slate-200">{item.name}</td>
                        <td className="p-3 text-slate-400">
                          {item.warehouseId === "WH-CAI-01" ? "مستودع القاهرة الرئيسي" : item.warehouseId === "WH-ALX-02" ? "محطة الإسكندرية اللوجستية" : "مركز جافزا دبي الدولي"}
                        </td>
                        <td className="p-3 text-left font-mono font-bold text-slate-100">{item.quantity.toLocaleString()} وحدة</td>
                        <td className="p-3 text-left font-mono text-emerald-400 font-semibold">{item.unitPrice.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-left font-mono font-bold text-cyan-400">{totalVal.toLocaleString()} {config.currency}</td>
                        <td className="p-3 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold animate-pulse">نقص حاد (أعد طلب الشراء)</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">آمن ومطابق</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB 8: FIXED ASSETS & PERIODIC DEPRECIATION */}
      {activeSubTab === "assets" && (
        <div className="space-y-6 animate-fadeIn text-slate-100 font-sans">
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-base">دليل وإهلاك الأصول الثابتة (IAS 16 Compliance)</h3>
                <p className="text-xs text-slate-400 mt-1">تتبع الأصول الرأسمالية للمؤسسة (المباني والمعدات والممتلكات) وإجراء حركات الإهلاك القسطي المتزن دورياً.</p>
              </div>
              <button
                onClick={() => {
                  setDeprSuccess("");
                  setDeprError("");
                  fetch("/api/v1/accounting/fixed-assets/depreciate", {
                    method: "POST"
                  })
                  .then(res => {
                    if (!res.ok) {
                      return res.json().then(e => { throw new Error(e.error?.message || "فشلت معالجة الإهلاك.") });
                    }
                    return res.json();
                  })
                  .then(payload => {
                    if (payload.success) {
                      setFixedAssets(payload.data.fixedAssets);
                      setAccounts(payload.data.accounts);
                      setJournalEntries(payload.data.journalEntries);
                      setDeprLogs(payload.data.logs);
                      setDeprSuccess(payload.message);
                    }
                  })
                  .catch(err => {
                    setDeprError(err.message);
                  });
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-md shadow-emerald-500/10"
              >
                تشغيل محرك الإهلاك الشهري التلقائي
              </button>
            </div>

            {deprSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {deprSuccess}
              </div>
            )}

            {deprError && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                ⚠️ {deprError}
              </div>
            )}

            {deprLogs.length > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">تفاصيل وسجلات حركة الإهلاك الأخيرة</div>
                {deprLogs.map((log, i) => (
                  <div key={i} className="text-slate-300 font-mono">⚡ {log}</div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y divide-slate-800/80">
                <thead>
                  <tr className="text-slate-400 font-bold bg-slate-900/50">
                    <th className="p-3">رمز الأصل</th>
                    <th className="p-3">اسم ووصف الأصل الثابت</th>
                    <th className="p-3">الفئة المحاسبية</th>
                    <th className="p-3 text-left">التكلفة الرأسمالية الأولى</th>
                    <th className="p-3 text-left">مجمع الإهلاك الحالي</th>
                    <th className="p-3 text-left">القيمة الدفترية المتبقية</th>
                    <th className="p-3 text-center">حالة الأصل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-200">
                  {fixedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-900/20">
                      <td className="p-3 font-mono font-bold text-slate-400">{asset.id}</td>
                      <td className="p-3 font-bold text-slate-200">{asset.name}</td>
                      <td className="p-3 text-slate-400">
                        {asset.category === "Property" ? "عقارات وأراضي" : asset.category === "Equipment" ? "معدات وخوادم" : asset.category === "Vehicles" ? "سيارات ومركبات" : "برمجيات وأصول معنوية"}
                      </td>
                      <td className="p-3 text-left font-mono font-bold">{asset.cost.toLocaleString()} {config.currency}</td>
                      <td className="p-3 text-left font-mono text-amber-500 font-semibold">{asset.accumulatedDepreciation.toLocaleString()} {config.currency}</td>
                      <td className="p-3 text-left font-mono text-emerald-400 font-bold">{asset.bookValue.toLocaleString()} {config.currency}</td>
                      <td className="p-3 text-center">
                        {asset.status === "Active" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">نشط وخاضع للإهلاك</span>
                        ) : asset.status === "Fully Depreciated" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">مستهلك دفترياً بالكامل</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">خارج الخدمة / تخريد</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 9: BANK RECONCILIATION */}
      {activeSubTab === "bank-recon" && (
        <div className="space-y-6 animate-fadeIn text-slate-100 font-sans">
          <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="font-display font-bold text-slate-200 text-base">المطابقة والتسوية البنكية للدفاتر (Bank Reconciliation)</h3>
              <p className="text-xs text-slate-400 mt-1">تتبع كشف الحساب البنكي الخارجي ومطابقته آلياً مع دفتر اليومية المالي وحساب البنك بالدفاتر للتأكد من الموازنة التامة.</p>
            </div>

            {reconSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {reconSuccess}
              </div>
            )}

            {reconError && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                ⚠️ {reconError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y divide-slate-800/80">
                <thead>
                  <tr className="text-slate-400 font-bold bg-slate-900/50">
                    <th className="p-3">تاريخ المعاملة</th>
                    <th className="p-3">بيان الحركة في كشف البنك</th>
                    <th className="p-3 text-left">المبلغ الوارد / الخارج</th>
                    <th className="p-3 text-center">حالة التسوية</th>
                    <th className="p-3 text-center">المستند الدفتري المقابل</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-200">
                  {bankItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/20">
                      <td className="p-3 font-mono text-slate-400">{item.date}</td>
                      <td className="p-3 font-bold text-slate-200">{item.description}</td>
                      <td className={`p-3 text-left font-mono font-bold ${item.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {item.amount > 0 ? `+ ${item.amount.toLocaleString()}` : `${item.amount.toLocaleString()}`} {config.currency}
                      </td>
                      <td className="p-3 text-center">
                        {item.status === "Reconciled" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">تمت التسوية والمطابقة</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold animate-pulse">معلق وبانتظار المطابقة</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-400">
                        {item.matchedJournalId ? (
                          <span className="text-emerald-400 font-bold">{item.matchedJournalId}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.status !== "Reconciled" && (
                          <button
                            onClick={() => {
                              setReconSuccess("");
                              setReconError("");
                              fetch("/api/v1/accounting/bank-recon/reconcile", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ itemId: item.id })
                              })
                              .then(res => {
                                if (!res.ok) {
                                  return res.json().then(e => { throw new Error(e.error?.message || "فشلت التسوية البنكية.") });
                                }
                                return res.json();
                              })
                              .then(payload => {
                                if (payload.success) {
                                  setBankItems(payload.data.bankStatementItems);
                                  setReconSuccess(payload.message);
                                }
                              })
                              .catch(err => {
                                setReconError(err.message);
                              });
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 rounded font-bold transition-all text-[11px]"
                          >
                            البحث عن القيد الدفتري والمطابقة
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 10: FOREIGN CURRENCY TRANSLATION */}
      {activeSubTab === "currency" && (
        <div className="space-y-6 animate-fadeIn text-slate-100 font-sans">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Exchange rates card */}
            <div className="lg:col-span-1 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-sm">أسعار الصرف المحاسبية المقررة</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">أسعار التحويل المعتمدة لتقييم المراكز المالية بالعملات الأجنبية.</p>
              </div>

              <div className="space-y-2">
                {currencyRates.map((rate) => (
                  <div key={rate.code} className="flex justify-between items-center p-2.5 rounded bg-slate-900/40 border border-slate-800/60 text-xs">
                    <span className="font-bold text-slate-200">{rate.name} ({rate.code})</span>
                    <span className="font-mono text-emerald-400 font-bold">{rate.rateToBase} ج.م.</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic calculator sand-box */}
            <div className="lg:col-span-2 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-sm">حاسبة التحويل والتقييم المتعدد للعملات (IAS 21)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">حساب فرق الصرف وتقييم المبالغ بالعملات الأجنبية بطريقة معتمدة محاسبياً.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">القيمة المراد تحويلها</label>
                  <input
                    type="number"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">من عملة</label>
                  <select
                    value={exchangeFrom}
                    onChange={(e) => setExchangeFrom(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none"
                  >
                    {currencyRates.map(r => (
                      <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">إلى عملة</label>
                  <select
                    value={exchangeTo}
                    onChange={(e) => setExchangeTo(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-2 focus:outline-none"
                  >
                    {currencyRates.map(r => (
                      <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    fetch("/api/v1/accounting/currency-exchange/translate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        amount: exchangeAmount,
                        fromCurrency: exchangeFrom,
                        toCurrency: exchangeTo
                      })
                    })
                    .then(res => res.json())
                    .then(payload => {
                      if (payload.success) {
                        setExchangeResult(payload.data.translatedAmount);
                        setExchangeRateApplied(payload.data.rateApplied);
                      }
                    });
                  }}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition-all"
                >
                  احتساب عملية الصرف الفوري والترجمة الدفترية
                </button>
              </div>

              {exchangeResult !== null && (
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <div className="text-xs text-slate-400">القيمة المكافئة والناتج الفعلي:</div>
                  <div className="text-xl font-display font-bold text-emerald-400 font-mono">
                    {exchangeResult.toLocaleString()} {exchangeTo}
                  </div>
                  {exchangeRateApplied && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      السعر المطبق للتحويل: 1 {exchangeFrom} = {exchangeRateApplied.toFixed(4)} {exchangeTo}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 11: CHEQUES TREASURY (إدارة وخزينة الشيكات) */}
      {activeSubTab === "cheques" && (
        <div className="space-y-6 animate-fadeIn text-slate-100 font-sans" dir="rtl">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">شيكات بخزينة الشركة</span>
                <span className="text-lg font-bold text-slate-100 font-mono mt-1 block">
                  {cheques.filter(c => c.status === "InSafe").reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{cheques.filter(c => c.status === "InSafe").length} شيكات فعالة</span>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">مظهرة للموردين تحت التحصيل</span>
                <span className="text-lg font-bold text-slate-100 font-mono mt-1 block">
                  {cheques.filter(c => c.status === "EndorsedToSupplier").reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{cheques.filter(c => c.status === "EndorsedToSupplier").length} شيكات قيد المتابعة</span>
              </div>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">شيكات تم تحصيلها بنجاح</span>
                <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">
                  {cheques.filter(c => c.status === "Collected").reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-500 font-mono">{cheques.filter(c => c.status === "Collected").length} شيكات مغلقة</span>
              </div>
              <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <CheckSquare className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-4.5 shadow-md flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">شيكات مرفوضة ومستحقة الرد</span>
                <span className="text-lg font-bold text-rose-400 font-mono mt-1 block">
                  {cheques.filter(c => c.status === "Bounced" || c.status === "ReturnedToCustomer").reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-500 font-mono">{cheques.filter(c => c.status === "Bounced" || c.status === "ReturnedToCustomer").length} مرفوضة / مرتجعة</span>
              </div>
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Feedback Toasts */}
          {chequeSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2 animate-fadeIn shadow-md">
              <CheckCircle className="h-4.5 w-4.5 shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">عملية ناجحة</span>
                <span>{chequeSuccess}</span>
              </div>
            </div>
          )}

          {chequeError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2 animate-fadeIn shadow-md">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <div>
                <span className="font-bold block mb-0.5">خطأ في الإدخال</span>
                <span>{chequeError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Pane: New Cheque Form */}
            <div className="lg:col-span-1 bg-[#0f1425] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-400" /> تسجيل استلام شيك عميل جديد
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">توليد قيد مزدوج آلي بتخفيض حساب العميل وإيداع ورقة القبض في خزينة الشيكات.</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                setChequeSuccess("");
                setChequeError("");

                if (!newChqNumber || !newChqBank || !newChqAmount || !newChqDueDate || !newChqCustId) {
                  setChequeError("يرجى ملء كافة الحقول الأساسية للشيك.");
                  return;
                }

                fetch("/api/v1/accounting/cheques/receive", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chequeNumber: newChqNumber,
                    bankName: newChqBank,
                    amount: newChqAmount,
                    dueDate: newChqDueDate,
                    customerId: newChqCustId,
                    beneficiaryType: newChqBeneficiaryType,
                    beneficiaryName: newChqBeneficiaryType === "Customer" ? "" : newChqBeneficiaryName,
                    notes: newChqNotes
                  })
                })
                .then(res => res.json())
                .then(payload => {
                  if (payload.success) {
                    setChequeSuccess(payload.message);
                    setCheques([payload.data.cheque, ...cheques]);
                    
                    // Update global ledger/accounts states instantaneously via props
                    setAccounts(prev => prev.map(a => {
                      if (a.code === "11110") return { ...a, balance: a.balance + Number(newChqAmount) };
                      if (a.code === "11000") return { ...a, balance: a.balance - Number(newChqAmount) };
                      return a;
                    }));
                    setCustomers(prev => prev.map(c => {
                      if (c.id === newChqCustId) return { ...c, balance: c.balance - Number(newChqAmount) };
                      return c;
                    }));
                    setJournalEntries(prev => [payload.data.journal, ...prev]);

                    // Reset form fields
                    setNewChqNumber("");
                    setNewChqBank("");
                    setNewChqAmount(0);
                    setNewChqDueDate("");
                    setNewChqCustId("");
                    setNewChqBeneficiaryName("");
                    setNewChqNotes("");
                    fetchCheques();
                  } else {
                    setChequeError(payload.message);
                  }
                })
                .catch(err => {
                  setChequeError(err.message || "فشل الاتصال بالخادم.");
                });
              }} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">العميل الراسل للشيك</label>
                  <select
                    value={newChqCustId}
                    onChange={(e) => setNewChqCustId(e.target.value)}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                    required
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (رصيد: {c.balance.toLocaleString()} {config.currency})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">رقم الشيك الدفتري</label>
                    <input
                      type="text"
                      value={newChqNumber}
                      onChange={(e) => setNewChqNumber(e.target.value)}
                      placeholder="مثال: 998410"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">البنك المسحوب عليه</label>
                    <input
                      type="text"
                      value={newChqBank}
                      onChange={(e) => setNewChqBank(e.target.value)}
                      placeholder="مثال: البنك الأهلي المصري"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">مبلغ الشيك</label>
                    <input
                      type="number"
                      value={newChqAmount || ""}
                      onChange={(e) => setNewChqAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">تاريخ الاستحقاق والصرف</label>
                    <input
                      type="date"
                      value={newChqDueDate}
                      onChange={(e) => setNewChqDueDate(e.target.value)}
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">نوع المستفيد النهائي من الشيك</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewChqBeneficiaryType("Customer")}
                      className={`py-1.5 rounded font-bold text-center border transition-all ${
                        newChqBeneficiaryType === "Customer"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      باسم العميل
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewChqBeneficiaryType("ThirdParty")}
                      className={`py-1.5 rounded font-bold text-center border transition-all ${
                        newChqBeneficiaryType === "ThirdParty"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      باسم طرف ثالث
                    </button>
                  </div>
                </div>

                {newChqBeneficiaryType === "ThirdParty" && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">اسم الطرف الثالث المستفيد</label>
                    <input
                      type="text"
                      value={newChqBeneficiaryName}
                      onChange={(e) => setNewChqBeneficiaryName(e.target.value)}
                      placeholder="اكتب اسم المستفيد بالكامل"
                      className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ملاحظات توضيحية إضافية</label>
                  <textarea
                    value={newChqNotes}
                    onChange={(e) => setNewChqNotes(e.target.value)}
                    placeholder="ملاحظات حول دفعة الفاتورة أو شروط السداد والارتداد"
                    rows={2}
                    className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg font-bold transition-all mt-2 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  إيداع الشيك بالخزينة وإثبات القيد
                </button>
              </form>
            </div>

            {/* Right Pane: Cheques Registry List with Life-Cycle Actions */}
            <div className="lg:col-span-2 space-y-4">
              {/* Endorsement Dialog Section */}
              {endorseChqId && (
                <div className="bg-[#10162c] border border-cyan-500/40 rounded-xl p-4.5 space-y-3 animate-fadeIn shadow-xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ArrowRightLeft className="h-4 w-4 text-cyan-400" /> تظهير وتسليم الشيك المحدد للمورد
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">سيتم نقل ملكية الشيك للمورد وإجراء قيد مالي فوري لتخفيض ذمته الدائنة.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">المورد المستلم للشيك</label>
                      <select
                        value={endorseSuppId}
                        onChange={(e) => setEndorseSuppId(e.target.value)}
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="">-- اختر المورد --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (رصيد: {s.balance.toLocaleString()} {config.currency})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">شرح تظهير الشيك</label>
                      <input
                        type="text"
                        value={endorseNotes}
                        onChange={(e) => setEndorseNotes(e.target.value)}
                        placeholder="مثال: سداد دفعة صيانة الخوادم للربع الثالث"
                        className="w-full bg-[#141b2d] text-slate-200 border border-slate-700/80 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end text-xs pt-1">
                    <button
                      onClick={() => {
                        setEndorseChqId(null);
                        setEndorseSuppId("");
                        setEndorseNotes("");
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-all"
                    >
                      إلغاء التظهير
                    </button>
                    <button
                      onClick={() => {
                        if (!endorseSuppId) {
                          setChequeError("يرجى اختيار مورد صالح لتظهير الشيك إليه.");
                          return;
                        }

                        const targetCheque = cheques.find(c => c.id === endorseChqId);
                        const chqAmount = targetCheque ? targetCheque.amount : 0;

                        fetch("/api/v1/accounting/cheques/endorse", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            chequeId: endorseChqId,
                            supplierId: endorseSuppId,
                            notes: endorseNotes
                          })
                        })
                        .then(res => res.json())
                        .then(payload => {
                          if (payload.success) {
                            setChequeSuccess(payload.message);
                            setEndorseChqId(null);
                            setEndorseSuppId("");
                            setEndorseNotes("");

                            // State updates
                            setAccounts(prev => prev.map(a => {
                              if (a.code === "20100") return { ...a, balance: a.balance - chqAmount };
                              if (a.code === "11110") return { ...a, balance: a.balance - chqAmount };
                              return a;
                            }));
                            setSuppliers(prev => prev.map(s => {
                              if (s.id === endorseSuppId) return { ...s, balance: s.balance - chqAmount };
                              return s;
                            }));
                            setJournalEntries(prev => [payload.data.journal, ...prev]);
                            fetchCheques();
                          } else {
                            setChequeError(payload.message);
                          }
                        })
                        .catch(err => {
                          setChequeError(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
                        });
                      }}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded font-bold transition-all"
                    >
                      تأكيد الترحيل والتظهير للمورد
                    </button>
                  </div>
                </div>
              )}

              {/* Cheques Registry List Container */}
              <div className="bg-[#0f1425] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                  <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Search className="h-4 w-4 text-emerald-400" /> كشف تتبع حركة الشيكات المودعة
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">العدد الإجمالي: {cheques.length} شيكات</span>
                </div>

                <div className="p-4 divide-y divide-slate-800/40 space-y-4 max-h-[600px] overflow-y-auto">
                  {cheques.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-6 font-sans">لا توجد أوراق قبض أو شيكات مسجلة في الخزينة حالياً.</p>
                  ) : (
                    cheques.map(chq => (
                      <div key={chq.id} className="pt-4 first:pt-0 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {chq.id}
                              </span>
                              <span className="text-xs font-sans text-slate-200 font-bold">
                                شيك رقم {chq.chequeNumber} ({chq.bankName})
                              </span>
                              
                              {/* Status Badge */}
                              {chq.status === "InSafe" && (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">في خزينة الشيكات</span>
                              )}
                              {chq.status === "EndorsedToSupplier" && (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">مظهر للمورد: {chq.supplierName}</span>
                              )}
                              {chq.status === "Collected" && (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-slate-800 border border-emerald-500/20 text-emerald-300 font-bold">تم تحصيله بنجاح</span>
                              )}
                              {chq.status === "Bounced" && (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">مرفوض ومحتج بالرفض</span>
                              )}
                              {chq.status === "ReturnedToCustomer" && (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">تم رده وإلغاء مديونية العميل</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap font-sans">
                              <span>المودع: <strong className="text-slate-400">{chq.customerName}</strong></span>
                              <span>تاريخ الاستحقاق: <strong className="text-slate-400 font-mono">{chq.dueDate}</strong></span>
                              <span>الاسم بالشيك: <strong className="text-slate-400">{chq.beneficiaryName || chq.customerName} ({chq.beneficiaryType === "Customer" ? "العميل" : "طرف ثالث"})</strong></span>
                            </div>
                          </div>
                          
                          {/* Cheque Amount */}
                          <div className="text-left shrink-0">
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              {chq.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 mr-1">{config.currency}</span>
                          </div>
                        </div>

                        {chq.notes && (
                          <p className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800/40 leading-relaxed font-sans">
                            📝 <strong>ملاحظات التتبع:</strong> {chq.notes}
                          </p>
                        )}

                        {/* Lifecycle action buttons */}
                        <div className="flex gap-1.5 flex-wrap justify-end text-[10px] font-sans">
                          {chq.status === "InSafe" && (
                            <>
                              <button
                                onClick={() => {
                                  setEndorseChqId(chq.id);
                                }}
                                className="px-2.5 py-1 bg-[#15233c] hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/10 rounded font-semibold transition-all cursor-pointer"
                              >
                                تظهير للمورد
                              </button>
                              <button
                                onClick={() => {
                                  if (!window.confirm("هل أنت متأكد من تحصيل هذا الشيك بالكامل من البنك وتسوية الحسابات؟")) return;
                                  setChequeSuccess("");
                                  setChequeError("");

                                  fetch("/api/v1/accounting/cheques/collect", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ chequeId: chq.id })
                                  })
                                  .then(res => res.json())
                                  .then(payload => {
                                    if (payload.success) {
                                      setChequeSuccess(payload.message);
                                      // If direct, bank was updated
                                      if (payload.data.journal) {
                                        setAccounts(prev => prev.map(a => {
                                          if (a.code === "10100") return { ...a, balance: a.balance + chq.amount };
                                          if (a.code === "11110") return { ...a, balance: a.balance - chq.amount };
                                          return a;
                                        }));
                                        setJournalEntries(prev => [payload.data.journal, ...prev]);
                                      }
                                      fetchCheques();
                                    } else {
                                      setChequeError(payload.message);
                                    }
                                  });
                                }}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 rounded font-semibold transition-all cursor-pointer"
                              >
                                تحصيل الشيك بنكياً
                              </button>
                              <button
                                onClick={() => {
                                  if (!window.confirm("هل أنت متأكد من وسم هذا الشيك كشيك مرفوض/مرتجع من البنك؟")) return;
                                  setChequeSuccess("");
                                  setChequeError("");

                                  fetch("/api/v1/accounting/cheques/bounce", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ chequeId: chq.id })
                                  })
                                  .then(res => res.json())
                                  .then(payload => {
                                    if (payload.success) {
                                      setChequeSuccess(payload.message);
                                      fetchCheques();
                                    } else {
                                      setChequeError(payload.message);
                                    }
                                  });
                                }}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 rounded font-semibold transition-all cursor-pointer"
                              >
                                رفض الشيك (Bounce)
                              </button>
                            </>
                          )}

                          {chq.status === "EndorsedToSupplier" && (
                            <button
                              onClick={() => {
                                if (!window.confirm("هل تأكدت من صرف وتحصيل هذا الشيك من حساب المورد لدى بنكه؟")) return;
                                setChequeSuccess("");
                                setChequeError("");

                                fetch("/api/v1/accounting/cheques/collect", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ chequeId: chq.id })
                                })
                                .then(res => res.json())
                                .then(payload => {
                                  if (payload.success) {
                                    setChequeSuccess(payload.message);
                                    fetchCheques();
                                  } else {
                                    setChequeError(payload.message);
                                  }
                                });
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/10 rounded font-semibold transition-all cursor-pointer"
                            >
                              تم التحصيل بواسطة المورد
                            </button>
                          )}

                          {chq.status === "Bounced" && (
                            <button
                              onClick={() => {
                                if (!window.confirm("هل ترغب في إعادة الشيك المرفوض للعميل وإلغاء القيد مع إعادة مديونيته بالكامل؟")) return;
                                setChequeSuccess("");
                                setChequeError("");

                                fetch("/api/v1/accounting/cheques/return", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ chequeId: chq.id })
                                })
                                .then(res => res.json())
                                .then(payload => {
                                  if (payload.success) {
                                    setChequeSuccess(payload.message);
                                    // State Updates: increase customer balance & debtor account, decrease cheque safe
                                    setAccounts(prev => prev.map(a => {
                                      if (a.code === "11000") return { ...a, balance: a.balance + chq.amount };
                                      if (a.code === "11110") return { ...a, balance: a.balance - chq.amount };
                                      return a;
                                    }));
                                    setCustomers(prev => prev.map(c => {
                                      if (c.id === chq.customerId) return { ...c, balance: c.balance + chq.amount };
                                      return c;
                                    }));
                                    setJournalEntries(prev => [payload.data.journal, ...prev]);
                                    fetchCheques();
                                  } else {
                                    setChequeError(payload.message);
                                  }
                                });
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/10 rounded font-semibold transition-all cursor-pointer"
                            >
                              إرجاع الشيك المرفوض للعميل
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOURNAL ENTRY VOUCHER MODAL */}
      {selectedJournalEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="bg-[#0c101f] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fadeIn text-right">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/10">سند قيد اليومية العام</span>
                <h3 className="text-base font-bold text-slate-200 mt-1">قيد رقم: <span className="font-mono text-cyan-400">{selectedJournalEntry.id}</span></h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJournalEntry(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 hover:bg-slate-900 rounded transition-all"
              >
                ✕
              </button>
            </div>

            {/* Voucher Details */}
            <div className="p-6 space-y-6 text-xs text-slate-300 font-sans">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">تاريخ السند</span>
                  <p className="font-mono font-bold text-slate-200">{selectedJournalEntry.date}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">منشئ المستند</span>
                  <p className="font-bold text-slate-200">{selectedJournalEntry.creator || "أحلام سلطان"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">مركز التكلفة</span>
                  <p className="font-bold text-slate-200">{selectedJournalEntry.costCenter}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500">حالة الترحيل</span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">معتمد ومرحل</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 bg-slate-900/20 p-3.5 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500">البيان والشرح التفصيلي</span>
                <p className="text-slate-200 font-medium leading-relaxed font-sans">{selectedJournalEntry.description}</p>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-right">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                      <th className="p-3">رمز الحساب</th>
                      <th className="p-3">اسم الحساب في الدليل</th>
                      <th className="p-3 text-left font-mono">مدين (Debit)</th>
                      <th className="p-3 text-left font-mono">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono text-[11px] text-slate-200">
                    {selectedJournalEntry.lines.map((line, lidx) => (
                      <tr key={lidx} className="hover:bg-slate-900/10">
                        <td className="p-3 font-mono font-bold text-slate-400">{line.accountCode}</td>
                        <td className="p-3 font-sans font-medium text-slate-200">{line.accountName}</td>
                        <td className="p-3 text-left text-emerald-400 font-bold">
                          {line.debit > 0 ? line.debit.toLocaleString() : "-"}
                        </td>
                        <td className="p-3 text-left text-amber-500 font-bold">
                          {line.credit > 0 ? line.credit.toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-900/40 border-t border-slate-800 font-bold text-slate-100 font-sans">
                      <td colSpan={2} className="p-3 text-right">الإجمالي المتزن (Total)</td>
                      <td className="p-3 text-left text-emerald-400 font-bold underline decoration-double font-mono">
                        {selectedJournalEntry.lines.reduce((sum, l) => sum + l.debit, 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-left text-amber-500 font-bold underline decoration-double font-mono">
                        {selectedJournalEntry.lines.reduce((sum, l) => sum + l.credit, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures block */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 text-center text-[10px] font-sans text-slate-400">
                <div className="space-y-4">
                  <span>منشئ القيد</span>
                  <p className="font-bold text-slate-300 font-sans border-b border-slate-800/80 pb-1 mx-4">أحلام سلطان</p>
                </div>
                <div className="space-y-4">
                  <span>المراجع المالي</span>
                  <p className="font-bold text-slate-300 font-sans border-b border-slate-800/80 pb-1 mx-4">أحمد الشناوي</p>
                </div>
                <div className="space-y-4">
                  <span>رئيس الحسابات والمدير المالي</span>
                  <p className="font-bold text-emerald-400 font-sans border-b border-slate-800/80 pb-1 mx-4">أ. عماد عبد اللطيف</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/20 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Printer className="h-4 w-4 text-emerald-400" /> طباعة السند / PDF
              </button>

              <button
                type="button"
                onClick={() => setSelectedJournalEntry(null)}
                className="px-5 py-2 bg-[#12182a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer border border-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL & PRINT MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-[#0c101f] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fadeIn text-right my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between no-print">
              <div>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/10">
                  {selectedInvoice.invoiceType === "sales" ? "فاتورة مبيعات صادرة للعميل" : "فاتورة مشتريات واردة من مورد"}
                </span>
                <h3 className="text-base font-bold text-slate-200 mt-1">
                  رقم الفاتورة: <span className="font-mono text-cyan-400">{selectedInvoice.id}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold p-1 hover:bg-slate-900 rounded transition-all"
              >
                ✕
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="p-8 space-y-6 text-xs text-slate-300 font-sans" id="printable-invoice">
              {/* Invoice Header Style for official print */}
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-100 font-display">{config.company}</h2>
                  <p className="text-slate-400 text-[10px]">{config.branch}</p>
                  <p className="text-slate-500 font-mono text-[9px]">الرقم الضريبي الموحد: 493-201-954</p>
                  <p className="text-slate-500 text-[9px]">الهاتف: +20 2 3535 7000</p>
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-display">
                    {selectedInvoice.invoiceType === "sales" ? "فاتورة ضريبية أصلية" : "فاتورة شراء قيد تسوية"}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-400">رقم: {selectedInvoice.id}</p>
                  <p className="font-mono text-[10px] text-slate-400">التاريخ: {selectedInvoice.date}</p>
                  <p className="font-mono text-[10px] text-slate-400">العملة: {config.currency}</p>
                </div>
              </div>

              {/* Client & Billing Details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">
                    {selectedInvoice.invoiceType === "sales" ? "العميل المشتري (جهة الفوترة)" : "المورد البائع"}
                  </span>
                  <p className="font-bold text-slate-200 text-sm">
                    {selectedInvoice.invoiceType === "sales" 
                      ? (selectedInvoice as SalesInvoice).customerName 
                      : (selectedInvoice as PurchaseInvoice).supplierName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    كود: {selectedInvoice.invoiceType === "sales" 
                      ? (selectedInvoice as SalesInvoice).customerId 
                      : (selectedInvoice as PurchaseInvoice).supplierId}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    الرقم الضريبي: {
                      selectedInvoice.invoiceType === "sales" 
                        ? (customers.find(c => c.id === (selectedInvoice as SalesInvoice).customerId)?.taxRegistrationNumber || "410-239-551")
                        : (suppliers.find(s => s.id === (selectedInvoice as PurchaseInvoice).supplierId)?.taxRegistrationNumber || "200-519-724")
                    }
                  </p>
                </div>
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] text-slate-500 block">تفاصيل السداد والترحيل</span>
                  <p className="text-slate-200">طريقة الدفع: 
                    <strong className="text-slate-100 mr-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                      {selectedInvoice.paymentMethod === "Bank" ? "حساب جاري بنك CIB" : selectedInvoice.paymentMethod === "Cash" ? "نقداً من الخزينة" : "شيك مصرفي معتمد"}
                    </strong>
                  </p>
                  <p className="text-slate-400 text-[10px]">حالة المعاملة: 
                    <span className="text-emerald-400 mr-1 font-bold">✓ مدفوعة ومرحلة بالكامل</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-bold text-slate-400">
                      <th className="p-3">رمز SKU</th>
                      <th className="p-3">اسم الصنف / المنتج</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-left">سعر الوحدة</th>
                      <th className="p-3 text-left">Value (القيمة الإجمالية)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-sans">
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10">
                        <td className="p-3 font-mono text-slate-500 text-[10px]">{item.sku}</td>
                        <td className="p-3 font-bold text-slate-200">{item.name}</td>
                        <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="p-3 text-left font-mono">{item.price.toLocaleString()}</td>
                        <td className="p-3 text-left font-mono font-bold text-slate-100">{(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Calculations Summary */}
              <div className="flex justify-between items-end border-t border-slate-800/85 pt-4">
                <div className="w-1/2 text-[10px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">أختام وتوقيعات الموثوقية:</p>
                  <p>تم استخراج واعتماد هذا المستند رقمياً بموجب أنظمة الفوترة الضريبية الإلكترونية المعتمدة.</p>
                  <p className="font-mono text-[9px] text-slate-500">Hash Checksum: SHA256-EF2089BC9102A7E</p>
                </div>
                <div className="w-1/3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl space-y-2 font-mono text-right">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-sans">القيمة الأساسية:</span>
                    <span>{selectedInvoice.subtotal.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span className="font-sans">قيمة مضافة (14%):</span>
                    <span>+ {selectedInvoice.vatAmount.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between text-cyan-400 pb-2 border-b border-slate-800">
                    <span className="font-sans">خصم منبع (1%):</span>
                    <span>- {selectedInvoice.withholdingTax.toLocaleString()} {config.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-100 pt-1 text-sm font-sans">
                    <span>الصافي الكلي:</span>
                    <span className="text-amber-400 font-mono text-sm font-bold">{selectedInvoice.total.toLocaleString()} {config.currency}</span>
                  </div>
                </div>
              </div>

              {/* Official Signatures block */}
              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-800/60 text-center text-[10px] font-sans text-slate-400">
                <div className="space-y-4">
                  <span>أمين الخزينة والمراجعة</span>
                  <p className="font-bold text-slate-300 border-b border-slate-850 pb-1 mx-8">نهلة الفخراني</p>
                </div>
                <div className="space-y-4">
                  <span>المدير المالي والاعتماد والمطابقة</span>
                  <p className="font-bold text-emerald-400 border-b border-slate-850 pb-1 mx-8">أ. عماد عبد اللطيف</p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
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
                    const el = document.getElementById("printable-invoice");
                    if (el) {
                      el.classList.add("printable-area");
                      window.print();
                      el.classList.remove("printable-area");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Printer className="h-4 w-4 text-emerald-400" /> طباعة الفاتورة / تصدير PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
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
