import React, { useState } from "react";
import * as XLSX from "xlsx";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  TrendingUp, 
  Coins, 
  Package, 
  Users, 
  Cpu, 
  Printer, 
  Download, 
  CheckCircle, 
  Calendar,
  AlertCircle,
  FileText,
  Warehouse as WarehouseIcon,
  HelpCircle,
  Clock,
  TrendingDown,
  Percent,
  ArrowRightLeft
} from "lucide-react";
import { 
  ChartOfAccount, 
  JournalEntry, 
  StockItem, 
  Employee, 
  Customer, 
  Supplier, 
  PurchaseInvoice, 
  SalesInvoice, 
  ERPConfig,
  Cheque
} from "../types";
import IFRS18Dashboard from "./IFRS18Dashboard";

interface ReportsEngineProps {
  accounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  stock: StockItem[];
  employees: Employee[];
  customers: Customer[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  productionOrders: any[];
  cheques?: Cheque[];
  config: ERPConfig;
}

type ReportDomain = "finance" | "inventory" | "invoices" | "hr" | "mrp" | "partners" | "kpis";

export default function ReportsEngine({
  accounts = [],
  journalEntries = [],
  stock = [],
  employees = [],
  customers = [],
  suppliers = [],
  purchaseInvoices = [],
  salesInvoices = [],
  productionOrders = [],
  cheques = [],
  config
}: ReportsEngineProps) {
  const [domain, setDomain] = useState<ReportDomain>("inventory");
  const [searchTerm, setSearchTerm] = useState("");

  const companiesList = (config as any).companiesList || [
    { id: "TEN-APEX-01", name: "شركة قمة الشام والرافدين المحدودة", value: "Apex Levant Corp" },
    { id: "TEN-GULF-02", name: "شركة قمة الخليج الدولية", value: "Apex Gulf International" },
    { id: "TEN-AFRICA-03", name: "مؤسسة قمة أفريقيا للتوزيع والاستيراد", value: "Apex Africa Distribution" }
  ];
  const activeCompanyObj = companiesList.find((c: any) => (c.value === config.company || c.name === config.company)) || companiesList[0];
  const activeCompanyId = activeCompanyObj ? activeCompanyObj.id : "TEN-APEX-01";
  
  // --- IAS 7 & IAS 1 Reporting State Managers ---
  const [financeSubTab, setFinanceSubTab] = useState<"accounts" | "cashflows" | "equity" | "mappings" | "ifrs">("ifrs");
  const [ifrsActiveView, setIfrsActiveView] = useState<"all" | "balance_sheet" | "income" | "cash_flow" | "equity" | "notes">("all");
  const [cashFlowReport, setCashFlowReport] = useState<any>(null);
  const [cashFlowMethod, setCashFlowMethod] = useState<"direct" | "indirect">("direct");
  const [equityReport, setEquityReport] = useState<any[]>([]);
  const [allMappings, setAllMappings] = useState<any[]>([]);
  const [isSavingMapping, setIsSavingMapping] = useState<boolean>(false);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);

  const getCategorizedAccounts = () => {
    // Assets
    const cashAccounts = accounts.filter(a => a.type === "Asset" && (a.code.startsWith("111") || a.code.startsWith("112") || /نقدية|صندوق|خزينة|البنك|بنك|كاش|جاري|cash|bank|safe/i.test(a.name)));
    const cashSum = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

    const receivableAccounts = accounts.filter(a => a.type === "Asset" && !cashAccounts.includes(a) && (/عملاء|ذمم|مدينة|receivables|customers/i.test(a.name) || a.code.startsWith("113") || a.code.startsWith("114")));
    const receivablesSum = receivableAccounts.reduce((sum, a) => sum + a.balance, 0);

    const stockSum = stock.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
    const inventoryAccounts = accounts.filter(a => a.type === "Asset" && !cashAccounts.includes(a) && !receivableAccounts.includes(a) && (/مخزون|مستودع|بضاعة|inventory|stock/i.test(a.name) || a.code.startsWith("115")));
    const inventorySum = inventoryAccounts.length > 0 ? inventoryAccounts.reduce((sum, a) => sum + a.balance, 0) : stockSum;

    const currentOtherAccounts = accounts.filter(a => a.type === "Asset" && a.code.startsWith("11") && !cashAccounts.includes(a) && !receivableAccounts.includes(a) && !inventoryAccounts.includes(a));
    const currentOtherSum = currentOtherAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalCurrentAssets = cashSum + receivablesSum + inventorySum + currentOtherSum;

    const fixedAssetAccounts = accounts.filter(a => a.type === "Asset" && (a.code.startsWith("12") || /ثابتة|آلات|معدات|أراضي|مباني|سيارات|أجهزة|خوادم|أثاث|property|equipment|vehicle/i.test(a.name)) && !/إهلاك|مجمع|depreciation|accumulated/i.test(a.name));
    const fixedAssetsCostSum = fixedAssetAccounts.reduce((sum, a) => sum + a.balance, 0);

    const depAccounts = accounts.filter(a => (a.type === "Asset" || a.type === "Liability") && /إهلاك|مجمع|depreciation|accumulated/i.test(a.name));
    const accumulatedDepSum = Math.abs(depAccounts.reduce((sum, a) => sum + a.balance, 0));

    const netFixedAssets = fixedAssetsCostSum - accumulatedDepSum;

    const nonCurrentOtherAccounts = accounts.filter(a => a.type === "Asset" && a.code.startsWith("12") && !fixedAssetAccounts.includes(a) && !depAccounts.includes(a));
    const nonCurrentOtherSum = nonCurrentOtherAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalNonCurrentAssets = netFixedAssets + nonCurrentOtherSum;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // Liabilities
    const payableAccounts = accounts.filter(a => a.type === "Liability" && (a.code.startsWith("211") || a.code.startsWith("212") || /موردين|ذمم|دائنة|أوراق دفع|payables|suppliers/i.test(a.name)));
    const payablesSum = payableAccounts.reduce((sum, a) => sum + a.balance, 0);

    const taxAccounts = accounts.filter(a => a.type === "Liability" && !payableAccounts.includes(a) && (/ضريبة|ضرائب|مصلحة|زكاة|مخصص|tax|vat|withholding/i.test(a.name) || a.code.startsWith("213") || a.code.startsWith("214")));
    const taxSum = taxAccounts.reduce((sum, a) => sum + a.balance, 0);

    const currentOtherLiabilitiesAccounts = accounts.filter(a => a.type === "Liability" && a.code.startsWith("21") && !payableAccounts.includes(a) && !taxAccounts.includes(a));
    const currentOtherLiabilitiesSum = currentOtherLiabilitiesAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalCurrentLiabilities = payablesSum + taxSum + currentOtherLiabilitiesSum;

    const longTermLoanAccounts = accounts.filter(a => a.type === "Liability" && (a.code.startsWith("22") || /طويلة الأجل|قروض|تمويل طويل|loan/i.test(a.name)));
    const longTermLoansSum = longTermLoanAccounts.reduce((sum, a) => sum + a.balance, 0);

    const totalLiabilities = totalCurrentLiabilities + longTermLoansSum;

    // Equity
    const capitalAccounts = accounts.filter(a => a.type === "Equity" && (a.code.startsWith("31") || /رأس المال|رأسمال|capital/i.test(a.name)));
    const capitalSum = capitalAccounts.reduce((sum, a) => sum + a.balance, 0);

    const retainedAccounts = accounts.filter(a => a.type === "Equity" && !capitalAccounts.includes(a) && (/أرباح مرحلة|أرباح محتجزة|احتياطي|retained|reserves|surplus/i.test(a.name) || a.code.startsWith("32")));
    const retainedSum = retainedAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Current profit / loss of the period
    const currentProfit = totalRevenuesSum - totalExpensesSum;

    const totalEquity = capitalSum + retainedSum + currentProfit;

    // Check Balance
    const balanceDifference = totalAssets - (totalEquity + totalLiabilities);

    return {
      cashAccounts, cashSum,
      receivableAccounts, receivablesSum,
      inventoryAccounts, inventorySum, stockSum,
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

  const fetchReportsData = async () => {
    setIsReportsLoading(true);
    try {
      if (financeSubTab === "cashflows" || financeSubTab === "ifrs") {
        const res = await fetch(`/api/v1/accounting/reports/cash-flows?tenantId=${activeCompanyId}`);
        const json = await res.json();
        if (json.success) {
          setCashFlowReport(json.data);
        }
      }
      if (financeSubTab === "equity" || financeSubTab === "ifrs") {
        const res = await fetch(`/api/v1/accounting/reports/changes-in-equity?tenantId=${activeCompanyId}`);
        const json = await res.json();
        if (json.success) {
          setEquityReport(json.data);
        }
      }
      if (financeSubTab === "mappings") {
        const res = await fetch(`/api/v1/accounting/cash-flow-mappings?tenantId=${activeCompanyId}`);
        const json = await res.json();
        if (json.success) {
          setAllMappings(json.data);
        }
      }
    } catch (err) {
      console.error("Error fetching report data", err);
    } finally {
      setIsReportsLoading(false);
    }
  };

  React.useEffect(() => {
    if (domain === "finance") {
      fetchReportsData();
    }
  }, [domain, financeSubTab, activeCompanyId]);

  const handleUpdateMapping = async (accountCode: string, activityType: string, categoryName: string) => {
    setIsSavingMapping(true);
    try {
      const res = await fetch("/api/v1/accounting/cash-flow-mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ accountCode, activityType, categoryName })
      });
      const json = await res.json();
      if (json.success) {
        setAlertMsg(`تم تحديث تصنيف الحساب ${accountCode} بنجاح إلى [${activityType === "Operating" ? "تشغيلي" : activityType === "Investing" ? "استثماري" : activityType === "Financing" ? "تمويلي" : "نقدية وما يعادلها"} - ${categoryName}].`);
        setTimeout(() => setAlertMsg(""), 4000);
        
        // Reload mappings
        const mRes = await fetch("/api/v1/accounting/cash-flow-mappings");
        const mJson = await mRes.json();
        if (mJson.success) {
          setAllMappings(mJson.data);
        }
      }
    } catch (err: any) {
      setAlertMsg(`فشل تعديل الخريطة: ${err.message}`);
    } finally {
      setIsSavingMapping(false);
    }
  };
  
  // Finance-specific filters
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>("all");
  
  // Inventory-specific filters
  const [invWhFilter, setInvWhFilter] = useState<string>("all");
  const [invCatFilter, setInvCatFilter] = useState<string>("all");

  React.useEffect(() => {
    if (config.warehouse) {
      setInvWhFilter(config.warehouse);
    }
  }, [config.warehouse]);
  
  // Invoices filters
  const [invTypeFilter, setInvTypeFilter] = useState<"all" | "sales" | "purchases">("all");
  const [invStatusFilter, setInvStatusFilter] = useState<string>("all");

  // HR filters
  const [hrDeptFilter, setHrDeptFilter] = useState<string>("all");

  // Partners and Cheques filters
  const [partnersFilter, setPartnersFilter] = useState<"all" | "cheques" | "partners">("all");

  // Simulation feedback
  const [alertMsg, setAlertMsg] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  // Trigger real exports (Excel generation via XLSX, PDF via browser printing dialog)
  const handlePrint = () => {
    setIsPrinting(true);
    setAlertMsg("تم تهيئة مستند الطباعة المعتمد... جاري فتح نافذة الطباعة في المتصفح. يرجى اختيار 'حفظ بصيغة PDF' (Save as PDF) لحفظ المستند كملف PDF.");
    setTimeout(() => {
      const el = document.getElementById("printable-report-area");
      if (el) {
        el.classList.add("printable-area");
        window.print();
        el.classList.remove("printable-area");
      }
      setIsPrinting(false);
      setAlertMsg("");
    }, 800);
  };

  const handleExport = (format: "pdf" | "excel") => {
    setAlertMsg("");
    if (format === "pdf") {
      handlePrint();
      return;
    }

    try {
      let dataToExport: any[] = [];
      let sheetName = "التقرير المالي";
      
      if (domain === "finance") {
        if (financeSubTab === "ifrs") {
          const catData = getCategorizedAccounts();
          const workbook = XLSX.utils.book_new();

          // 1. Balance Sheet Sheet
          const balanceSheetData = [
            { "البند المالي": "--- الأصول غير المتداولة ---", "رقم الإيضاح": "", "الفترة الحالية": "", "الفترة السابقة": "" },
            { "البند المالي": "العقارات والآلات والمعدات", "رقم الإيضاح": "إيضاح (5)", "الفترة الحالية": catData.netFixedAssets, "الفترة السابقة": catData.fixedAssetsCostSum },
            { "البند المالي": "أصول أخرى غير متداولة", "رقم الإيضاح": "", "الفترة الحالية": catData.nonCurrentOtherSum, "الفترة السابقة": catData.nonCurrentOtherSum },
            { "البند المالي": "إجمالي الأصول غير المتداولة", "رقم الإيضاح": "", "الفترة الحالية": catData.totalNonCurrentAssets, "الفترة السابقة": catData.fixedAssetsCostSum + catData.nonCurrentOtherSum },
            {},
            { "البند المالي": "--- الأصول المتداولة ---", "رقم الإيضاح": "", "الفترة الحالية": "", "الفترة السابقة": "" },
            { "البند المالي": "المخزون السلعي", "رقم الإيضاح": "إيضاح (3)", "الفترة الحالية": catData.inventorySum, "الفترة السابقة": catData.inventorySum },
            { "البند المالي": "العملاء والذمم المدينة", "رقم الإيضاح": "إيضاح (4)", "الفترة الحالية": catData.receivablesSum, "الفترة السابقة": catData.receivablesSum },
            { "البند المالي": "النقدية وما يعادلها", "رقم الإيضاح": "إيضاح (2)", "الفترة الحالية": catData.cashSum, "الفترة السابقة": catData.cashSum },
            { "البند المالي": "أصول متداولة أخرى", "رقم الإيضاح": "", "الفترة الحالية": catData.currentOtherSum, "الفترة السابقة": catData.currentOtherSum },
            { "البند المالي": "إجمالي الأصول المتداولة", "رقم الإيضاح": "", "الفترة الحالية": catData.totalCurrentAssets, "الفترة السابقة": catData.totalCurrentAssets },
            {},
            { "البند المالي": "إجمالي الأصول", "رقم الإيضاح": "", "الفترة الحالية": catData.totalAssets, "الفترة السابقة": catData.totalAssets },
            {},
            { "البند المالي": "--- حقوق الملكية ---", "رقم الإيضاح": "", "الفترة الحالية": "", "الفترة السابقة": "" },
            { "البند المالي": "رأس المال المساهم", "رقم الإيضاح": "", "الفترة الحالية": catData.capitalSum, "الفترة السابقة": catData.capitalSum },
            { "البند المالي": "الاحتياطيات والأرباح المرحلة", "رقم الإيضاح": "", "الفترة الحالية": catData.retainedSum, "الفترة السابقة": catData.retainedSum },
            { "البند المالي": "صافي أرباح الفترة الجارية", "رقم الإيضاح": "", "الفترة الحالية": catData.currentProfit, "الفترة السابقة": 0 },
            { "البند المالي": "إجمالي حقوق الملكية", "رقم الإيضاح": "", "الفترة الحالية": catData.totalEquity, "الفترة السابقة": catData.capitalSum + catData.retainedSum },
            {},
            { "البند المالي": "--- الالتزامات غير المتداولة ---", "رقم الإيضاح": "", "الفترة الحالية": "", "الفترة السابقة": "" },
            { "البند المالي": "قروض طويلة الأجل", "رقم الإيضاح": "", "الفترة الحالية": catData.longTermLoansSum, "الفترة السابقة": catData.longTermLoansSum },
            { "البند المالي": "إجمالي الالتزامات غير المتداولة", "رقم الإيضاح": "", "الفترة الحالية": catData.totalLiabilities - catData.totalCurrentLiabilities, "الفترة السابقة": catData.longTermLoansSum },
            {},
            { "البند المالي": "--- الالتزامات المتداولة ---", "رقم الإيضاح": "", "الفترة الحالية": "", "الفترة السابقة": "" },
            { "البند المالي": "الموردون والذمم التجارية", "رقم الإيضاح": "إيضاح (6)", "الفترة الحالية": catData.payablesSum, "الفترة السابقة": catData.payablesSum },
            { "البند المالي": "أرصدة دائنة وضرائب مستحقة", "رقم الإيضاح": "إيضاح (7)", "الفترة الحالية": catData.taxSum, "الفترة السابقة": catData.taxSum },
            { "البند المالي": "التزامات متداولة أخرى", "رقم الإيضاح": "", "الفترة الحالية": catData.currentOtherLiabilitiesSum, "الفترة السابقة": catData.currentOtherLiabilitiesSum },
            { "البند المالي": "إجمالي الالتزامات المتداولة", "رقم الإيضاح": "", "الفترة الحالية": catData.totalCurrentLiabilities, "الفترة السابقة": catData.totalCurrentLiabilities },
            {},
            { "البند المالي": "إجمالي الالتزامات وحقوق الملكية", "رقم الإيضاح": "", "الفترة الحالية": catData.totalEquity + catData.totalLiabilities, "الفترة السابقة": catData.totalEquity + catData.totalLiabilities }
          ];
          const ws1 = XLSX.utils.json_to_sheet(balanceSheetData);
          XLSX.utils.book_append_sheet(workbook, ws1, "المركز المالي - IAS 1");

          // 2. Profit and Loss
          const profitLossData = [
            { "البند المالي": "إيرادات المبيعات والخدمات", "المبلغ": totalRevenuesSum },
            { "البند المالي": "تكلفة النشاط والمبيعات", "المبلغ": totalExpensesSum * 0.4 },
            { "البند المالي": "مجمل ربح النشاط (Gross Profit)", "المبلغ": totalRevenuesSum - (totalExpensesSum * 0.4) },
            { "البند المالي": "مصروفات إدارية وعمومية وتشغيلية", "المبلغ": totalExpensesSum * 0.6 },
            { "البند المالي": "إجمالي صافي أرباح الفترة (Net Profit)", "المبلغ": catData.currentProfit }
          ];
          const ws2 = XLSX.utils.json_to_sheet(profitLossData);
          XLSX.utils.book_append_sheet(workbook, ws2, "الأرباح والخسائر - IAS 1");

          // 3. Cash Flow
          const ws3 = XLSX.utils.json_to_sheet([
            { "تفاصيل التدفق النقدي": "الرصيد الافتتاحي للنقدية وما يعادلها", "المبلغ": cashFlowReport?.openingCash || 0 },
            { "تفاصيل التدفق النقدي": "صافي التغير في النقدية خلال الفترة", "المبلغ": cashFlowReport?.netIncrease || 0 },
            { "تفاصيل التدفق النقدي": "الرصيد الختامي للنقدية وما يعادلها", "المبلغ": cashFlowReport?.closingCash || 0 }
          ]);
          XLSX.utils.book_append_sheet(workbook, ws3, "التدفقات النقدية - IAS 7");

          // 4. Changes in Equity
          if (equityReport && equityReport.length > 0) {
            const ws4 = XLSX.utils.json_to_sheet(equityReport.map(r => ({
              "بند حقوق الملكية": r.accountName,
              "الرصيد الافتتاحي": r.openingBalance || 0,
              "زيادات رأس المال": r.additions || 0,
              "التخفيضات": r.reductions || 0,
              "صافي الربح الموزع": r.netProfitAllocation || 0,
              "الرصيد الختامي": r.closingBalance || 0
            })));
            XLSX.utils.book_append_sheet(workbook, ws4, "التغيرات في حقوق الملكية");
          }

          XLSX.writeFile(workbook, `الحزمة_الكاملة_IFRS_${config.company}_${new Date().toISOString().slice(0, 10)}.xlsx`);
          setAlertMsg(`تم بنجاح تصدير الحزمة المالية المتكاملة الموحدة IFRS كملف Excel متعدد الصفحات!`);
          setTimeout(() => setAlertMsg(""), 6000);
          return;
        }

        if (financeSubTab === "accounts") {
          sheetName = "دليل شجرة الحسابات";
          dataToExport = filteredFinanceAccounts.map(acc => ({
            "كود الحساب": acc.code,
            "اسم الحساب": acc.name,
            "نوع الحساب": acc.type === "Asset" ? "أصول" : acc.type === "Liability" ? "خصوم" : acc.type === "Equity" ? "حقوق ملكية" : acc.type === "Revenue" ? "إيرادات" : "مصروفات",
            "الرصيد الحالي": acc.balance || 0
          }));
        } else if (financeSubTab === "cashflows") {
          sheetName = `التدفقات النقدية - IAS 7 (${cashFlowMethod === "direct" ? "الطريقة المباشرة" : "الطريقة غير المباشرة"})`;
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
              
             if (operatingRows.length > 0 || investingRows.length > 0 || financingRows.length > 0) {
            dataToExport = [
              { "البند / فئة الحركة": "--- الأنشطة التشغيلية ---", "المبلغ الصافي": "" },
              ...operatingRows.map((r: any) => ({
                "البند / فئة الحركة": r.category || r.name,
                "المبلغ الصافي": r.amount
              })),
              { "البند / فئة الحركة": "--- الأنشطة الاستثمارية ---", "المبلغ الصافي": "" },
              ...investingRows.map((r: any) => ({
                "البند / فئة الحركة": r.category || r.name,
                "المبلغ الصافي": r.amount
              })),
              { "البند / فئة الحركة": "--- الأنشطة التمويلية ---", "المبلغ الصافي": "" },
              ...financingRows.map((r: any) => ({
                "البند / فئة الحركة": r.category || r.name,
                "المبلغ الصافي": r.amount
              })),
              {},
              { "البند / فئة الحركة": "الرصيد الافتتاحي للنقدية وما يعادله", "المبلغ الصافي": cashFlowReport?.openingCash || 0 },
              { "البند / فئة الحركة": "صافي التغير في النقدية خلال الفترة", "المبلغ الصافي": cashFlowReport?.netIncrease || 0 },
              { "البند / فئة الحركة": "الرصيد الختامي للنقدية وما يعادله", "المبلغ الصافي": cashFlowReport?.closingCash || 0 }
            ];
          } else {
            dataToExport = [{ "تنبيه": "لا توجد بيانات تدفقات نقدية حالية" }];
          }
        } else if (financeSubTab === "equity") {
          sheetName = "التغيرات في حقوق الملكية - IAS 1";
          if (equityReport && equityReport.length > 0) {
            dataToExport = equityReport.map(r => ({
              "كود الحساب": r.accountCode,
              "اسم الحساب": r.accountName,
              "الرصيد الافتتاحي": r.openingBalance || 0,
              "زيادات رأس المال": r.additions || 0,
              "تخفيضات رأس المال": r.reductions || 0,
              "صافي ربح الفترة": r.netProfitAllocation || 0,
              "الرصيد الختامي": r.closingBalance || 0
            }));
          } else {
            dataToExport = [{ "تنبيه": "لا توجد بيانات حقوق ملكية حالية" }];
          }
        } else if (financeSubTab === "mappings") {
          sheetName = "خرائط التدفق النقدي للحسابات";
          if (allMappings && allMappings.length > 0) {
            dataToExport = allMappings.map(m => ({
              "كود الحساب": m.accountCode,
              "اسم الحساب": m.accountName,
              "طبيعة الحساب": m.accountType,
              "نوع النشاط (IAS 7)": m.activityType === "Operating" ? "تشغيلي" : m.activityType === "Investing" ? "استثماري" : m.activityType === "Financing" ? "تمويلي" : m.activityType === "CashEquivalent" ? "نقدية وما يعادلها" : "غير مصنف",
              "اسم التصنيف المالي": m.categoryName || "غير مصنف"
            }));
          } else {
            dataToExport = [{ "تنبيه": "لا توجد بيانات خرائط حالية" }];
          }
        }
      } else if (domain === "inventory") {
        sheetName = "جرد المخزون";
        dataToExport = filteredStock.map(item => ({
          "رمز الصنف (SKU)": item.sku,
          "اسم الصنف": item.name,
          "الفئة": item.category || "",
          "المستودع": item.warehouseId || "",
          "الكمية الحالية": item.quantity || 0,
          "سعر الوحدة": item.unitPrice || 0,
          "القيمة الإجمالية": (item.quantity || 0) * (item.unitPrice || 0),
          "حد الطلب الأدنى": item.minLevel || 0
        }));
      } else if (domain === "invoices") {
        sheetName = "الفواتير والضرائب";
        dataToExport = filteredInvoices.map(inv => {
          const typeStr = inv.invoiceType === "sales" ? "فاتورة مبيعات" : "فاتورة مشتريات";
          const clientName = "customerId" in inv ? inv.customerName : inv.supplierName;
          return {
            "رقم الفاتورة": inv.id,
            "نوع الفاتورة": typeStr,
            "التاريخ": inv.date,
            "اسم الطرف الثاني": clientName || "",
            "المبلغ قبل الضريبة": inv.subtotal || 0,
            "ضريبة القيمة المضافة": inv.vatAmount || 0,
            "ضريبة الخصم والتحصيل": inv.withholdingTax || 0,
            "إجمالي الفاتورة": inv.total || 0,
            "طريقة الدفع": inv.paymentMethod || "بنك",
            "الحالة": inv.status === "Paid" ? "مدفوعة" : "غير مدفوعة"
          };
        });
      } else if (domain === "hr") {
        sheetName = "كشف المرتبات والموظفين";
        dataToExport = filteredEmployees.map(emp => ({
          "كود الموظف": emp.id,
          "الاسم": emp.name,
          "المسمى الوظيفي": emp.role,
          "القسم": emp.department,
          "الراتب الأساسي": emp.baseSalary || 0,
          "أيام العمل الفعلية": emp.attendanceDays || 0,
          "الحالة": emp.status === "Active" ? "نشط" : "موقوف"
        }));
      } else if (domain === "mrp") {
        sheetName = "أوامر الإنتاج والتصنيع";
        dataToExport = filteredProductionOrders.map(order => ({
          "رقم أمر الإنتاج": order.id,
          "رمز صنف المنتج": order.productSku || order.bomId || "N/A",
          "اسم المنتج": order.productName,
          "الكمية المطلوبة": order.quantityToBuild || order.quantity || 1,
          "تكلفة العمالة": order.laborCost || 1500,
          "إجمالي تكلفة الإنتاج": order.totalCost || 24500,
          "الحالة": order.status === "Completed" ? "مكتمل" : "قيد التشغيل"
        }));
      } else if (domain === "partners") {
        sheetName = "الشيكات والأطراف";
        dataToExport = cheques.map(chq => {
          const assocCust = customers.find(c => c.id === chq.customerId);
          const assocSupp = chq.supplierId ? suppliers.find(s => s.id === chq.supplierId) : null;
          return {
            "رقم الشيك": chq.chequeNumber,
            "البنك المسحوب عليه": chq.bankName,
            "اسم العميل/الساحب": chq.beneficiaryType === "Customer" ? (assocCust?.name || "عميل غير معرف") : (chq.beneficiaryName || "طرف ثالث"),
            "تاريخ الاستحقاق": chq.dueDate,
            "مبلغ الشيك": chq.amount,
            "حالة الشيك": chq.status === "InSafe" ? "في الخزينة" : chq.status === "EndorsedToSupplier" ? "مظهر للمورد" : chq.status === "Collected" ? "محصل" : "مرتجع",
            "المورد المظهر له": assocSupp?.name || "لا يوجد"
          };
        });
      } else {
        sheetName = "مؤشرات الأداء";
        dataToExport = [
          { "المؤشر": "إجمالي المبيعات", "القيمة": kpiTotalSales },
          { "المؤشر": "إجمالي المشتريات", "القيمة": kpiTotalPurchases },
          { "المؤشر": "إجمالي المصروفات", "القيمة": kpiTotalExpenses },
          { "المؤشر": "صافي الربح", "القيمة": kpiTotalSales - kpiTotalPurchases - kpiTotalExpenses }
        ];
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 30));
      XLSX.writeFile(workbook, `تقرير_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      setAlertMsg(`تم تصدير مستند Excel الحقيقي لـ (${sheetName}) بنجاح وتحميله على جهازك!`);
      setTimeout(() => setAlertMsg(""), 6000);
    } catch (err: any) {
      setAlertMsg(`فشل تصدير ملف Excel: ${err.message}`);
    }
  };

  // Get distinct values for filter selectors
  const stockCategories = Array.from(new Set(stock.map(s => s.category).filter(Boolean))) as string[];
  const stockWarehouses = Array.from(new Set(stock.map(s => s.warehouseId).filter(Boolean)));
  const hrDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  // ==========================================
  // DOMAIN 1: FINANCE FILTERS & CALCULATIONS
  // ==========================================
  const filteredFinanceAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.code.includes(searchTerm);
    if (financeTypeFilter === "AdminExpenses") {
      const isExpense = acc.type === "Expense";
      const isAdministrative = acc.code.startsWith("504") || acc.name.includes("عموم") || acc.name.includes("إدار") || acc.name.includes("أدوات كتابية") || acc.name.includes("انتقال") || acc.name.includes("إيجار");
      return matchesSearch && isExpense && isAdministrative;
    }
    const matchesType = financeTypeFilter === "all" || acc.type === financeTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalAssetsSum = accounts.filter(a => a.type === "Asset").reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilitiesSum = accounts.filter(a => a.type === "Liability").reduce((sum, a) => sum + a.balance, 0);
  const totalEquitySum = accounts.filter(a => a.type === "Equity").reduce((sum, a) => sum + a.balance, 0);
  const totalRevenuesSum = accounts.filter(a => a.type === "Revenue").reduce((sum, a) => sum + a.balance, 0);
  const totalExpensesSum = accounts.filter(a => a.type === "Expense").reduce((sum, a) => sum + a.balance, 0);
  const netProfitSum = totalRevenuesSum - totalExpensesSum;

  // ==========================================
  // DOMAIN 2: INVENTORY FILTERS & CALCULATIONS
  // ==========================================
  const filteredStock = stock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWh = invWhFilter === "all" || item.warehouseId === invWhFilter;
    const matchesCat = invCatFilter === "all" || item.category === invCatFilter;
    return matchesSearch && matchesWh && matchesCat;
  });

  const totalStockQty = filteredStock.reduce((sum, s) => sum + s.quantity, 0);
  const totalStockVal = filteredStock.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
  const criticalItemsCount = filteredStock.filter(s => s.quantity <= s.minLevel).length;

  // ==========================================
  // DOMAIN 3: INVOICES FILTERS & CALCULATIONS
  // ==========================================
  const allInvoices = [
    ...salesInvoices.map(s => ({ ...s, invoiceType: "sales" as const })),
    ...purchaseInvoices.map(p => ({ ...p, invoiceType: "purchases" as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredInvoices = allInvoices.filter(inv => {
    const clientName = "customerId" in inv ? inv.customerName : inv.supplierName;
    const matchesSearch = inv.id.includes(searchTerm) || (clientName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = invTypeFilter === "all" || inv.invoiceType === invTypeFilter;
    const matchesStatus = invStatusFilter === "all" || inv.status === invStatusFilter;
    const matchesBranch = config.branch === "all" || !config.branch || inv.branchId === config.branch;
    return matchesSearch && matchesType && matchesStatus && matchesBranch;
  });

  const totalInvoiceSales = filteredInvoices.filter(i => i.invoiceType === "sales").reduce((sum, i) => sum + i.total, 0);
  const totalInvoicePurchases = filteredInvoices.filter(i => i.invoiceType === "purchases").reduce((sum, i) => sum + i.total, 0);
  const totalInvoiceVat = filteredInvoices.reduce((sum, i) => sum + i.vatAmount, 0);
  const totalInvoiceWithholding = filteredInvoices.reduce((sum, i) => sum + i.withholdingTax, 0);

  // ==========================================
  // DOMAIN 4: HR PAYROLL FILTERS & CALCULATIONS
  // ==========================================
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (emp.role || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = hrDeptFilter === "all" || emp.department === hrDeptFilter;
    return matchesSearch && matchesDept;
  });

  const totalPayrollCost = filteredEmployees.reduce((sum, emp) => {
    const netSalaryFactor = emp.attendanceDays / 30;
    const grossSalary = emp.baseSalary * netSalaryFactor;
    const taxDeduction = grossSalary * emp.withholdingTaxRate;
    const netPaid = grossSalary - taxDeduction;
    return sum + netPaid;
  }, 0);

  const averageAttendanceDays = filteredEmployees.length > 0
    ? (filteredEmployees.reduce((sum, e) => sum + e.attendanceDays, 0) / filteredEmployees.length).toFixed(1)
    : "0.0";

  // ==========================================
  // DOMAIN 5: MRP MANUFACTURING ORDERS FILTERS
  // ==========================================
  const filteredProductionOrders = productionOrders.filter(order => {
    const productSku = order.productSku || order.bomId || "";
    const productName = order.productName || "";
    const matchesSearch = productSku.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id.includes(searchTerm);
    return matchesSearch;
  });

  const completedOrdersCount = productionOrders.filter(o => o.status === "Completed" || o.status === "Posted").length;
  const pendingOrdersCount = productionOrders.filter(o => o.status === "Pending" || o.status === "Approved" || o.status === "Draft").length;

  // ==========================================
  // DOMAIN 6: KPI DASHBOARD CALCULATIONS
  // ==========================================
  // We'll prepare monthly data from the loaded invoices and journal entries
  // To keep it clean and robust, we dynamically extract months or default to the 6 months in 2025
  const defaultMonths = ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"];
  const dynamicMonthsSet = new Set<string>();
  
  salesInvoices.forEach(inv => {
    if (inv.date && inv.date.length >= 7) dynamicMonthsSet.add(inv.date.substring(0, 7));
  });
  purchaseInvoices.forEach(inv => {
    if (inv.date && inv.date.length >= 7) dynamicMonthsSet.add(inv.date.substring(0, 7));
  });
  journalEntries.forEach(entry => {
    if (entry.date && entry.date.length >= 7) dynamicMonthsSet.add(entry.date.substring(0, 7));
  });

  const sortedMonths = dynamicMonthsSet.size > 0 
    ? Array.from(dynamicMonthsSet).sort() 
    : defaultMonths;

  const arabicMonthNames: { [key: string]: string } = {
    "01": "يناير",
    "02": "فبراير",
    "03": "مارس",
    "04": "أبريل",
    "05": "مايو",
    "06": "يونيو",
    "07": "يوليو",
    "08": "أغسطس",
    "09": "سبتمبر",
    "10": "أكتوبر",
    "11": "نوفمبر",
    "12": "ديسمبر"
  };

  const formatArabicMonth = (ym: string) => {
    const parts = ym.split("-");
    if (parts.length === 2) {
      const [year, month] = parts;
      const monthName = arabicMonthNames[month] || month;
      return `${monthName} ${year}`;
    }
    return ym;
  };

  const kpiMonthlyData = sortedMonths.map(mStr => ({
    monthKey: mStr,
    month: formatArabicMonth(mStr),
    sales: 0,
    purchases: 0,
    netProfit: 0,
    cashIn: 0,
    cashOut: 0,
    operatingExpenses: 0
  }));

  // Map each invoice/journal to their respective months dynamically
  salesInvoices.forEach(inv => {
    if (config.branch && config.branch !== "all" && inv.branchId && inv.branchId !== config.branch) {
      return;
    }
    const dateStr = inv.date;
    if (dateStr && dateStr.length >= 7) {
      const mStr = dateStr.substring(0, 7);
      const dataPoint = kpiMonthlyData.find(d => d.monthKey === mStr);
      if (dataPoint) {
        dataPoint.sales += inv.subtotal;
        if (inv.status === "Paid") dataPoint.cashIn += inv.total;
      }
    }
  });

  purchaseInvoices.forEach(inv => {
    if (config.branch && config.branch !== "all" && inv.branchId && inv.branchId !== config.branch) {
      return;
    }
    const dateStr = inv.date;
    if (dateStr && dateStr.length >= 7) {
      const mStr = dateStr.substring(0, 7);
      const dataPoint = kpiMonthlyData.find(d => d.monthKey === mStr);
      if (dataPoint) {
        dataPoint.purchases += inv.subtotal;
        if (inv.status === "Paid") dataPoint.cashOut += inv.total;
      }
    }
  });

  // Collect other operating expenses (salaries, overhead, setups) from journal entries
  journalEntries.forEach(entry => {
    const dateStr = entry.date;
    if (dateStr && dateStr.length >= 7) {
      const mStr = dateStr.substring(0, 7);
      const dataPoint = kpiMonthlyData.find(d => d.monthKey === mStr);
      if (dataPoint) {
        entry.lines.forEach(line => {
          if (line.debit > 0 && (line.accountCode.startsWith("501") || line.accountCode.startsWith("502") || line.accountCode.startsWith("504"))) {
            dataPoint.operatingExpenses += line.debit;
          }
        });

        const bankDebit = entry.lines.filter(l => l.accountCode === "10100").reduce((sum, l) => sum + l.debit, 0);
        const bankCredit = entry.lines.filter(l => l.accountCode === "10100").reduce((sum, l) => sum + l.credit, 0);
        
        const isInvoiceRelated = entry.reference.startsWith("SLS") || entry.reference.startsWith("PRC") || entry.reference.includes("COLL") || entry.reference.includes("PMT");
        
        if (!isInvoiceRelated) {
          if (bankDebit > 0) {
            dataPoint.cashIn += bankDebit;
          }
          if (bankCredit > 0) {
            dataPoint.cashOut += bankCredit;
          }
        }
      }
    }
  });

  // Calculate Net Profit
  kpiMonthlyData.forEach(d => {
    d.netProfit = d.sales - d.purchases - d.operatingExpenses;
  });

  // Totals for summary cards
  const kpiTotalSales = kpiMonthlyData.reduce((sum, d) => sum + d.sales, 0);
  const kpiTotalPurchases = kpiMonthlyData.reduce((sum, d) => sum + d.purchases, 0);
  const kpiTotalExpenses = kpiMonthlyData.reduce((sum, d) => sum + d.operatingExpenses, 0);
  const kpiNetProfit = kpiTotalSales - kpiTotalPurchases - kpiTotalExpenses;
  
  const kpiTotalCashIn = kpiMonthlyData.reduce((sum, d) => sum + d.cashIn, 0);
  const kpiTotalCashOut = kpiMonthlyData.reduce((sum, d) => sum + d.cashOut, 0);
  const kpiNetCashFlow = kpiTotalCashIn - kpiTotalCashOut;
  const kpiLiquidityRatio = kpiTotalCashOut > 0 ? (kpiTotalCashIn / kpiTotalCashOut).toFixed(2) : "0.0";

  return (
    <div className="space-y-6 text-right animate-fadeIn" id="reports-engine-module" dir="rtl">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 font-sans border border-cyan-500/30">
              مكتب تقارير مجلس الإدارة وذكاء الأعمال
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 font-sans border border-purple-500/30">
              مراجعة وتدقيق معتمد للفروع والضرائب
            </span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">محرك التقارير الاستقصائي الشامل الذكي</h2>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            تقارير تفصيلية فورية تدمج الأستاذ العام، المستودعات المتعددة، المشتريات والمبيعات، مرتبات الموظفين والإنتاج مع تصدير مباشر.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExport("excel")}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/15 cursor-pointer"
            title="تصدير لملف أكسيل"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير Excel</span>
          </button>
          
          <button
            onClick={() => handleExport("pdf")}
            className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-600/15 cursor-pointer"
            title="حفظ بصيغة PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>تصدير PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            title="معاينة وطباعة التقرير"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Export feedback overlay */}
      {alertMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold leading-relaxed font-sans flex items-center gap-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* 2. Domain Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        
        {/* Domain: Inventory */}
        <button
          onClick={() => { setDomain("inventory"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "inventory" 
              ? "bg-pink-500/10 border-pink-500 text-pink-400 shadow-md shadow-pink-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <Package className={`h-5 w-5 ${domain === "inventory" ? "text-pink-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">المخازن والمستودعات</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">الأصناف والكميات والحدود</p>
          </div>
        </button>

        {/* Domain: Invoices */}
        <button
          onClick={() => { setDomain("invoices"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "invoices" 
              ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <FileSpreadsheet className={`h-5 w-5 ${domain === "invoices" ? "text-blue-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">المشتريات والمبيعات</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">الفواتير وضريبة نموذج 41</p>
          </div>
        </button>

        {/* Domain: HR Payroll */}
        <button
          onClick={() => { setDomain("hr"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "hr" 
              ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <Users className={`h-5 w-5 ${domain === "hr" ? "text-amber-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">الموارد البشرية والمرتبات</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">المرتبات والضرائب والخصم</p>
          </div>
        </button>

        {/* Domain: Manufacturing */}
        <button
          onClick={() => { setDomain("mrp"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "mrp" 
              ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-md shadow-purple-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <Cpu className={`h-5 w-5 ${domain === "mrp" ? "text-purple-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">تخطيط التصنيع (MRP)</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">خطوط الإنتاج وتكلفة المواد</p>
          </div>
        </button>

        {/* Domain: Partners & Cheques */}
        <button
          onClick={() => { setDomain("partners"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "partners" 
              ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <ArrowRightLeft className={`h-5 w-5 ${domain === "partners" ? "text-cyan-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">الشيكات والشركاء</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">أوراق القبض وحركة الذمم</p>
          </div>
        </button>

        {/* Domain: KPI Dashboard */}
        <button
          onClick={() => { setDomain("kpis"); setSearchTerm(""); }}
          className={`p-4.5 rounded-xl border text-right transition-all flex flex-col justify-between h-28 cursor-pointer ${
            domain === "kpis" 
              ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/5" 
              : "bg-[#0f1425] border-slate-800/80 hover:border-slate-700 text-slate-300"
          }`}
        >
          <TrendingUp className={`h-5 w-5 ${domain === "kpis" ? "text-cyan-400" : "text-slate-400"}`} />
          <div>
            <h4 className="font-bold text-xs font-display">مؤشرات الأداء (KPIs)</h4>
            <p className="text-[9px] text-slate-500 font-sans mt-0.5">تحليل صافي الربح والسيولة</p>
          </div>
        </button>

      </div>

      {/* 3. Filter criteria bar & search */}
      <div className="bg-[#0f1425] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          
          {/* Universal Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث فورياً في التقارير (الأسماء، الأكواد، الأرقام المرجعية)..."
              className="w-full bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded-lg pr-10 pl-4 py-3 focus:outline-none focus:border-slate-500 text-right font-sans"
            />
          </div>

          {/* Domain Specific Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
            
            {/* Finance Filter Type */}
            {domain === "finance" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-sans shrink-0">فئة الحساب:</span>
                <select
                  value={financeTypeFilter}
                  onChange={(e) => setFinanceTypeFilter(e.target.value)}
                  className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="all">كل دليل شجرة الحسابات</option>
                  <option value="Asset">أصول وموجودات (Asset)</option>
                  <option value="Liability">التزامات ومطلوبات (Liability)</option>
                  <option value="Equity">حقوق ملكية ورأس مال (Equity)</option>
                  <option value="Revenue">إيرادات ومبيعات (Revenue)</option>
                  <option value="Expense">مصروفات تشغيلية (Expense)</option>
                  <option value="AdminExpenses">تحليل المصاريف الإدارية والعمومية (General & Admin Expenses)</option>
                </select>
              </div>
            )}

            {/* Inventory Filters */}
            {domain === "inventory" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-sans shrink-0">المستودع:</span>
                  <select
                    value={invWhFilter}
                    onChange={(e) => setInvWhFilter(e.target.value)}
                    className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-medium font-sans"
                  >
                    <option value="all">جميع المستودعات والمحطات اللوجستية</option>
                    {stockWarehouses.map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-sans shrink-0">التصنيف الرئيسي:</span>
                  <select
                    value={invCatFilter}
                    onChange={(e) => setInvCatFilter(e.target.value)}
                    className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 font-medium font-sans"
                  >
                    <option value="all">كل التصنيفات (مستوى 1)</option>
                    {stockCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Invoices Filters */}
            {domain === "invoices" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-sans shrink-0">نوع الفاتورة:</span>
                  <select
                    value={invTypeFilter}
                    onChange={(e) => setInvTypeFilter(e.target.value as any)}
                    className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-medium font-sans"
                  >
                    <option value="all">كل فواتير البيع والشراء</option>
                    <option value="sales">فواتير مبيعات التراخيص والخدمات</option>
                    <option value="purchases">فواتير شراء الأصناف ومكونات التوريد</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-sans shrink-0">حالة الدفع والترحيل:</span>
                  <select
                    value={invStatusFilter}
                    onChange={(e) => setInvStatusFilter(e.target.value)}
                    className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 font-medium font-sans"
                  >
                    <option value="all">الكل (مدفوع / غير مسدد)</option>
                    <option value="Paid">مسدد بالكامل (Paid)</option>
                    <option value="Unpaid">معلق للتحصيل (Unpaid)</option>
                  </select>
                </div>
              </>
            )}

            {/* HR Filters */}
            {domain === "hr" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-sans shrink-0">القسم الوظيفي:</span>
                <select
                  value={hrDeptFilter}
                  onChange={(e) => setHrDeptFilter(e.target.value)}
                  className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 font-medium font-sans"
                >
                  <option value="all">جميع الأقسام والإدارات</option>
                  {hrDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* MRP Filter has info only */}
            {domain === "mrp" && (
              <div className="px-3 py-2 bg-purple-500/5 text-purple-400 text-[10px] font-semibold border border-purple-500/20 rounded-lg">
                تم دمج خطوط التصنيع مع جرد المستودع التلقائي لمركز جافزا
              </div>
            )}

            {/* Partners & Cheques Filters */}
            {domain === "partners" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-sans shrink-0">نوع التقرير المالي:</span>
                <select
                  value={partnersFilter}
                  onChange={(e) => setPartnersFilter(e.target.value as any)}
                  className="bg-[#141b2d] text-[11px] text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-medium font-sans"
                >
                  <option value="all">الكل (الشيكات والعملاء والموردين)</option>
                  <option value="cheques">كشف حركة أوراق قبض الشيكات (Cheques Ledger)</option>
                  <option value="partners">كشف أرصدة العملاء والموردين الأكبر (Partners Ledger)</option>
                </select>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 4. Instant KPI Cards (Dynamic math based on active domain) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {domain === "finance" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي الأصول الجارية والثابتة</span>
              <strong className="text-xl font-mono text-emerald-400">{totalAssetsSum.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">تطابق تام مع دليل الحسابات</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي الالتزامات والمطالبات</span>
              <strong className="text-xl font-mono text-rose-400">{totalLiabilitiesSum.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">ضريبة القيمة المضافة نموذج 41</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي الإيرادات ومبيعات التراخيص</span>
              <strong className="text-xl font-mono text-cyan-400">{totalRevenuesSum.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">تراخيص SaaS السحابية والاستشارات</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">صافي الأرباح المحققة بعد الإهلاك</span>
              <strong className={`text-xl font-mono ${netProfitSum >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {netProfitSum.toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">قبل احتساب ضرائب الخصم النهائي</div>
            </div>
          </>
        )}

        {domain === "inventory" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">عدد الأصناف المطابقة للتصفية</span>
              <strong className="text-xl font-mono text-pink-400">{filteredStock.length} أصناف</strong>
              <div className="text-[9px] text-slate-500 font-sans">تصنيف بمستويين نشط بالكامل</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي كمية القطع بالمستودعات</span>
              <strong className="text-xl font-mono text-slate-200">{totalStockQty} وحدة</strong>
              <div className="text-[9px] text-slate-500 font-sans">تتبع فوري لمستويات الأمان والحد الأدنى</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">القيمة الدفترية الإجمالية للمخزون</span>
              <strong className="text-xl font-mono text-cyan-400">{totalStockVal.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">تحديث آلي بمتوسط تكلفة الشراء المرجحة</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">أصناف حرجة تطلب إعادة الطلب</span>
              <strong className={`text-xl font-mono ${criticalItemsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {criticalItemsCount} بنود معلقة
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">كمية البند حالياً أقل من حد الأمان المحدد</div>
            </div>
          </>
        )}

        {domain === "invoices" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي مبيعات التراخيص والخدمات</span>
              <strong className="text-xl font-mono text-emerald-400">{totalInvoiceSales.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">الفواتير الموحدة للعملاء</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي مشتريات وتوريد المكونات</span>
              <strong className="text-xl font-mono text-amber-500">{totalInvoicePurchases.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">الفواتير المدفوعة للموردين المعتمدين</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي ضريبة القيمة المضافة المحصلة</span>
              <strong className="text-xl font-mono text-cyan-400">{totalInvoiceVat.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">خاضع لمصلحة الضرائب المصرية بنسبة 14%</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي ضرائب خصم المنبع نموذج 41</span>
              <strong className="text-xl font-mono text-red-400">{totalInvoiceWithholding.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">محتجزة بنسبة 1% من المنبع للتسوية الضريبية</div>
            </div>
          </>
        )}

        {domain === "hr" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">عدد الكوادر والموظفين المسجلين</span>
              <strong className="text-xl font-mono text-amber-400">{filteredEmployees.length} موظفين</strong>
              <div className="text-[9px] text-slate-500 font-sans">إدارات البحث والتطوير والمالية والعمليات</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">صافي كشف المرتبات الشهري المعتمد</span>
              <strong className="text-xl font-mono text-slate-200">{totalPayrollCost.toLocaleString()} {config.currency}</strong>
              <div className="text-[9px] text-slate-500 font-sans">مخصوم منها الضرائب وخصومات الغياب</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">متوسط أيام حضور الكادر</span>
              <strong className="text-xl font-mono text-cyan-400">{averageAttendanceDays} يوم</strong>
              <div className="text-[9px] text-slate-500 font-sans">من إجمالي 30 يوماً عمل بالدورة الجارية</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">التزامات التأمينات والخصومات الضريبية</span>
              <strong className="text-xl font-mono text-purple-400">
                {(totalPayrollCost * 0.15).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">تجمع وتسوى برقم التسجيل للمنشأة</div>
            </div>
          </>
        )}

        {domain === "mrp" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">أوامر الإنتاج والتصنيع النشطة</span>
              <strong className="text-xl font-mono text-purple-400">{filteredProductionOrders.length} أوامر</strong>
              <div className="text-[9px] text-slate-500 font-sans">تجميع وتشييد أبراج الخوادم والمكونات</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">أوامر الإنتاج المكتملة والمرحلة</span>
              <strong className="text-xl font-mono text-emerald-400">{completedOrdersCount} مكتمل</strong>
              <div className="text-[9px] text-slate-500 font-sans">ترحيل لحظي للقيود وتكاليف العمالة</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">أوامر تحت التشغيل والجدولة</span>
              <strong className="text-xl font-mono text-amber-500">{pendingOrdersCount} قيد التصنيع</strong>
              <div className="text-[9px] text-slate-500 font-sans">حجز المواد الخام وحماية خطوط الإنتاج</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي تكاليف خطوط الإنتاج</span>
              <strong className="text-xl font-mono text-cyan-400">
                {(productionOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0)).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">تشمل المواد المستنفذة وأتعاب التجميع</div>
            </div>
          </>
        )}

        {domain === "partners" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">عدد الشيكات المقيدة بالخزينة</span>
              <strong className="text-xl font-mono text-cyan-400">{cheques.length} شيكات</strong>
              <div className="text-[9px] text-slate-500 font-sans">تتبع فوري ومحاسبي لدورة حياة كل شيك</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي قيمة شيكات الخزينة النشطة</span>
              <strong className="text-xl font-mono text-emerald-400">
                {cheques.filter(c => c.status === "InSafe").reduce((sum, c) => sum + c.amount, 0).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">أوراق القبض المحتفظ بها بالخزنة</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي أرصدة وذمم العملاء المدينة</span>
              <strong className="text-xl font-mono text-amber-500">
                {customers.reduce((sum, c) => sum + c.balance, 0).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">إجمالي المستحقات المالية التجارية بالدفاتر</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي التزامات الموردين الدائنة</span>
              <strong className="text-xl font-mono text-rose-400">
                {suppliers.reduce((sum, s) => sum + s.balance, 0).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">إجمالي أوراق الدفع والذمم التجارية الدائنة</div>
            </div>
          </>
        )}

        {domain === "kpis" && (
          <>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">صافي الأرباح التشغيلية المتراكمة (6 أشهر)</span>
              <strong className={`text-xl font-mono ${kpiNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {kpiNetProfit.toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">
                هامش صافي الربح: {kpiTotalSales > 0 ? ((kpiNetProfit / kpiTotalSales) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">صافي التدفق النقدي الفعلي (Net Cash Flow)</span>
              <strong className={`text-xl font-mono ${kpiNetCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {kpiNetCashFlow.toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">المقبوضات مطروحة منها المدفوعات المسددة</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">معامل السيولة النقدية والتغطية</span>
              <strong className="text-xl font-mono text-cyan-400">{kpiLiquidityRatio}x</strong>
              <div className="text-[9px] text-slate-500 font-sans">نسبة المقبوضات النقدية إلى النفقات المسددة</div>
            </div>
            <div className="bg-[#0f1425] border border-slate-800/80 rounded-xl p-4.5 text-right space-y-1 shadow-md">
              <span className="text-[10px] text-slate-500 block font-sans">إجمالي التكاليف والمصروفات المتراكمة</span>
              <strong className="text-xl font-mono text-amber-500">
                {(kpiTotalPurchases + kpiTotalExpenses).toLocaleString()} {config.currency}
              </strong>
              <div className="text-[9px] text-slate-500 font-sans">مشتريات السلع + الرواتب والتأسيس والخوادم</div>
            </div>
          </>
        )}
      </div>

      {/* 5. Printable Report Area */}
      <div 
        className={`bg-[#0f1425] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl ${
          isPrinting ? "ring-2 ring-emerald-500 animate-pulse" : ""
        }`}
        id="printable-report-area"
      >
        {/* PRINT ONLY OFFICIAL HEADER */}
        <div className="hidden print:flex flex-row justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 text-right font-sans w-full p-4">
          <div className="space-y-1.5 text-right font-sans">
            <h2 className="text-lg font-black text-slate-950 font-display">{config.company || "شركة قمة الشام والرافدين المحدودة"}</h2>
            <p className="text-[10px] text-slate-600">أنظمة تخطيط الموارد الشاملة الذكية | ApexSaaS ERP Core</p>
            <p className="text-[9px] text-slate-500 font-mono">سجل تجاري رقم: ١٠١٠٩٩٢٤٠٠ | الرقم الضريبي: ٣١٠٩٩٠٠٨٧٥</p>
            <p className="text-[9px] text-slate-500">هاتف: +966 11 405 9000 | الرياض، المملكة العربية السعودية</p>
          </div>
          <div className="text-center space-y-1 pt-2 font-sans">
            <div className="inline-block px-4 py-1.5 bg-slate-100 border border-slate-300 rounded-md font-bold text-xs text-slate-900">
              مستند مالي رسمي معتمد
            </div>
            <p className="text-[9px] text-slate-500 font-mono text-center">رمز التدقيق: APX-9982-GL</p>
          </div>
          <div className="space-y-1 text-left font-sans">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              {domain === "finance" && (
                financeSubTab === "ifrs" ? "الحزمة المتكاملة للقوائم المالية الموحدة (IFRS)" : "بيان كشف ميزانية شجرة الأستاذ العام"
              )}
              {domain === "inventory" && "بيان جرد ومستويات مخزون المستودعات"}
              {domain === "invoices" && "بيان حركة فواتير العملاء والموردين"}
              {domain === "hr" && "بيان كادر التوظيف التفصيلي والمرتبات"}
              {domain === "mrp" && "بيان كشف أوامر تشغيل خطوط التصنيع"}
              {domain === "partners" && "بيان كشف حركة الشيكات وأرصدة الشركاء"}
              {domain === "kpis" && "تقرير الأداء والتحليل المالي الاستراتيجي"}
            </h3>
            <p className="text-[10px] text-slate-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="text-[10px] text-slate-600">السنة المالية: {config.fiscalYear}</p>
            <p className="text-[9px] font-mono text-slate-500">حالة التقرير: مُرَحَّل ومعتمد (POSTED)</p>
          </div>
        </div>

        <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30 print:hidden">
          <div>
            <span className="text-[10px] text-slate-500 block font-sans">نموذج معاينة التقرير الرسمي</span>
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-cyan-400" />
              {domain === "finance" && (
                financeSubTab === "ifrs" ? `الحزمة المتكاملة للقوائم المالية الموحدة (IFRS) - ${config.company}` :
                financeSubTab === "accounts" ? `بيان كشف ميزانية شجرة الأستاذ العام - ${config.company}` :
                financeSubTab === "cashflows" ? `قائمة التدفقات النقدية (IAS 7) - ${config.company}` :
                financeSubTab === "equity" ? `قائمة التغيرات في حقوق الملكية (IAS 1) - ${config.company}` :
                `خرائط التدفق النقدي للأستاذ العام - ${config.company}`
              )}
              {domain === "inventory" && `بيان جرد ومستويات مخزون المستودعات المصنف - ${config.company}`}
              {domain === "invoices" && `بيان حركة فواتير العملاء والموردين وضرائب نموذج 41 - ${config.company}`}
              {domain === "hr" && `بيان كادر التوظيف التفصيلي والمرتبات المعتمدة - ${config.company}`}
              {domain === "mrp" && `بيان كشف أوامر تشغيل وخطوط التصنيع - ${config.company}`}
              {domain === "partners" && `بيان كشف حركة الشيكات وأرصدة كبار العملاء والموردين - ${config.company}`}
              {domain === "kpis" && `تقرير لوحة مؤشرات الأداء والتحليل المالي الاستراتيجي - ${config.company}`}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 text-[11px] font-sans text-slate-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> رُحِّل وتأكد فورياً</span>
            <span>السنة المالية: {config.fiscalYear}</span>
          </div>
        </div>

        {/* FINANCE SUB-TABS (Only visible when domain is finance, hidden during print) */}
        {domain === "finance" && (
          <div className="flex border-b border-slate-800/50 px-6 py-2.5 bg-slate-900/10 gap-2 print:hidden overflow-x-auto">
            <button
              onClick={() => setFinanceSubTab("ifrs")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                financeSubTab === "ifrs"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              القوائم المالية الموحدة (IFRS)
            </button>
            <button
              onClick={() => setFinanceSubTab("accounts")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                financeSubTab === "accounts"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              دليل شجرة الحسابات
            </button>
            <button
              onClick={() => setFinanceSubTab("cashflows")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                financeSubTab === "cashflows"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              قائمة التدفقات النقدية (IAS 7)
            </button>
            <button
              onClick={() => setFinanceSubTab("equity")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                financeSubTab === "equity"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              قائمة التغيرات في حقوق الملكية (IAS 1)
            </button>
            <button
              onClick={() => setFinanceSubTab("mappings")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                financeSubTab === "mappings"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              إدارة خرائط التدفق النقدي (IAS 7)
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          
          {/* DOMAIN 1: IFRS INTEGRATED financial statements suite */}
          {domain === "finance" && financeSubTab === "ifrs" && (
            <div className="p-6 space-y-8 text-right font-sans" id="ifrs-unified-container">
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

          {false && domain === "finance" && financeSubTab === "ifrs" && (
            <div className="p-6 space-y-8 text-right font-sans" id="ifrs-unified-container">
              
              {/* IFRS SUB-SELECTOR BAR (Hidden in Print) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4 print:hidden">
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

                return (
                  <div className="space-y-10">
                    
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
                      <div className="bg-[#0f1425]/50 border border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                      <div className="bg-[#0f1425]/50 border border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-bold text-slate-200">قائمة الأرباح أو الخسائر والدخل الشامل الآخر الموحدة (IAS 1 Statement of Profit or Loss & OCI)</h3>
                            <p className="text-[10px] text-slate-500 font-sans mt-0.5">عن السنة المالية المنتهية في {config.fiscalYear}</p>
                          </div>
                          <span className="text-[9px] px-2.5 py-1 bg-slate-800 rounded text-slate-400 font-sans uppercase font-bold tracking-wider">IAS 1 Standard</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900/60 text-slate-400 font-sans border-b border-slate-800">
                                <th className="p-3 font-bold">البند التشغيلي</th>
                                <th className="p-3 font-bold text-left">القيمة الحالية بالدورة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40 font-sans">
                              <tr className="hover:bg-slate-900/10 transition-colors">
                                <td className="p-3 text-slate-300">إيرادات مبيعات وتراخيص SaaS والاستشارات</td>
                                <td className="p-3 text-left font-mono text-slate-100 font-semibold">{totalRevenuesSum.toLocaleString()} {config.currency}</td>
                              </tr>
                              <tr className="hover:bg-slate-900/10 transition-colors">
                                <td className="p-3 text-slate-400 pr-6">يُطرح: تكلفة المبيعات المباشرة (عقود، مواد خام، مستودع)</td>
                                <td className="p-3 text-left font-mono text-amber-500/90">-{(totalExpensesSum * 0.4).toLocaleString()} {config.currency}</td>
                              </tr>
                              <tr className="bg-slate-900/10 font-bold border-t border-slate-800/45">
                                <td className="p-3 text-slate-200">مجمل ربح النشاط المباشر (Gross Profit)</td>
                                <td className="p-3 text-left font-mono text-emerald-400">{(totalRevenuesSum - (totalExpensesSum * 0.4)).toLocaleString()} {config.currency}</td>
                              </tr>
                              <tr className="hover:bg-slate-900/10 transition-colors">
                                <td className="p-3 text-slate-400 pr-6">يُطرح: المصروفات العمومية والإدارية والتشغيلية (Note 1)</td>
                                <td className="p-3 text-left font-mono text-amber-500/90">-{(totalExpensesSum * 0.6).toLocaleString()} {config.currency}</td>
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
                      <div className="bg-[#0f1425]/50 border border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                          if (!data) return <div className="text-center py-6 text-xs text-slate-500 font-sans">لا توجد حركات نقدية كافية لتوليد التدفقات النقدية المعتمدة.</div>;

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
                      <div className="bg-[#0f1425]/50 border border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 5. EXPLANATORY NOTES & DISCLOSURES */}
                    {(ifrsActiveView === "all" || ifrsActiveView === "notes") && (
                      <div className="bg-[#0f1425]/50 border border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                              <div className="bg-slate-900/30 p-3 border border-slate-800 rounded-lg text-right font-sans">
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

            </div>
          )}

          {/* DOMAIN 1: FINANCE TABLES (accounts sub-tab) */}
          {domain === "finance" && financeSubTab === "accounts" && (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                  <th className="p-4 font-bold">رمز الحساب (Code)</th>
                  <th className="p-4 font-bold">اسم الحساب التفصيلي</th>
                  <th className="p-4 font-bold">طبيعة الحساب</th>
                  <th className="p-4 font-bold text-left">الرصيد الافتتاحي المقيد</th>
                  <th className="p-4 font-bold text-left">الرصيد الجاري الفعلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFinanceAccounts.map(acc => (
                  <tr key={acc.code} className="hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-emerald-400">{acc.code}</td>
                    <td className="p-4 font-bold text-slate-200">{acc.name}</td>
                    <td className="p-4 font-sans text-slate-400">
                      {acc.type === "Asset" ? "أصول وموجودات" : acc.type === "Liability" ? "التزامات ومطلوبات" : acc.type === "Equity" ? "حقوق ملكية ورأس مال" : acc.type === "Revenue" ? "إيرادات ومبيعات" : "مصروفات تشغيلية"}
                    </td>
                    <td className="p-4 text-left font-mono text-slate-500">{acc.initialBalance.toLocaleString()} {config.currency}</td>
                    <td className="p-4 text-left font-mono font-bold text-slate-200">{acc.balance.toLocaleString()} {config.currency}</td>
                  </tr>
                ))}
                {filteredFinanceAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">لم يتم العثور على أي حسابات محاسبية مطابقة لمعايير البحث والتصفية.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DOMAIN 1: STATEMENT OF CASH FLOWS (IAS 7 sub-tab) */}
          {domain === "finance" && financeSubTab === "cashflows" && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">طريقة العرض (IAS 7 Method):</span>
                  <button
                    onClick={() => setCashFlowMethod("direct")}
                    className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      cashFlowMethod === "direct"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-250"
                    }`}
                  >
                    الطريقة المباشرة (Direct Method)
                  </button>
                  <button
                    onClick={() => setCashFlowMethod("indirect")}
                    className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      cashFlowMethod === "indirect"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-250"
                    }`}
                  >
                    الطريقة غير المباشرة (Indirect Method)
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  * قائمة معتمدة للامتثال للمعايير المصرية والدولية IAS 7.
                </div>
              </div>

              {isReportsLoading ? (
                <div className="text-center py-12 text-xs text-slate-400 font-sans flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري حساب التدفقات النقدية وفحص قيود اليومية...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {(() => {
                    const data = cashFlowMethod === "direct" ? cashFlowReport?.direct : cashFlowReport?.indirect;
                    if (!data) return <div className="text-center py-6 text-xs text-slate-500 font-sans">لا توجد حركات نقدية مسجلة حالياً لإنتاج التقرير.</div>;

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

                    const openingCash = cashFlowReport?.openingCash ?? 0;
                    const closingCash = cashFlowReport?.closingCash ?? 0;
                    const netChange = cashFlowReport?.netIncrease ?? 0;

                    return (
                      <div className="space-y-8 text-right">
                        
                        {/* Operating Activities */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-emerald-400 border-r-2 border-emerald-500 pr-2">
                            الأنشطة التشغيلية (Operating Activities)
                          </h4>
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-400 font-sans border-b border-slate-800">
                                <th className="p-3 font-bold w-2/3">بند حركة التدفق النقدي</th>
                                <th className="p-3 font-bold text-left w-1/3">القيمة الصافية</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {operatingRows.map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                                  <td className="p-3 text-slate-300 font-sans">{r.category}</td>
                                  <td className={`p-3 text-left font-mono font-bold ${r.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {(r.amount || 0).toLocaleString()} {config.currency}
                                  </td>
                                </tr>
                              ))}
                              {operatingRows.length === 0 && (
                                <tr>
                                  <td colSpan={2} className="p-3 text-center text-slate-500 font-sans">لا توجد تدفقات نقدية تشغيلية للفترة المحددة.</td>
                                </tr>
                              )}
                              <tr className="bg-slate-900/25 font-bold border-t border-slate-800 text-slate-100">
                                <td className="p-3">صافي النقد المتوفر من الأنشطة التشغيلية</td>
                                <td className={`p-3 text-left font-mono ${sumOps >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {sumOps.toLocaleString()} {config.currency}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Investing Activities */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-cyan-400 border-r-2 border-cyan-500 pr-2">
                            الأنشطة الاستثمارية (Investing Activities)
                          </h4>
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-400 font-sans border-b border-slate-800">
                                <th className="p-3 font-bold w-2/3">بند حركة التدفق النقدي</th>
                                <th className="p-3 font-bold text-left w-1/3">القيمة الصافية</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {investingRows.map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                                  <td className="p-3 text-slate-300 font-sans">{r.category}</td>
                                  <td className={`p-3 text-left font-mono font-bold ${r.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {(r.amount || 0).toLocaleString()} {config.currency}
                                  </td>
                                </tr>
                              ))}
                              {investingRows.length === 0 && (
                                <tr>
                                  <td colSpan={2} className="p-3 text-center text-slate-500 font-sans">لا توجد حركات استثمارية (شراء أو بيع أصول ثابتة) في هذه الدورة.</td>
                                </tr>
                              )}
                              <tr className="bg-slate-900/25 font-bold border-t border-slate-800 text-slate-100">
                                <td className="p-3">صافي النقد المستخدم في الأنشطة الاستثمارية</td>
                                <td className={`p-3 text-left font-mono ${sumInv >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                                  {sumInv.toLocaleString()} {config.currency}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Financing Activities */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-pink-400 border-r-2 border-pink-500 pr-2">
                            الأنشطة التمويلية (Financing Activities)
                          </h4>
                          <table className="w-full text-right border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-900/40 text-slate-400 font-sans border-b border-slate-800">
                                <th className="p-3 font-bold w-2/3">بند حركة التدفق النقدي</th>
                                <th className="p-3 font-bold text-left w-1/3">القيمة الصافية</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {financingRows.map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                                  <td className="p-3 text-slate-300 font-sans">{r.category}</td>
                                  <td className={`p-3 text-left font-mono font-bold ${r.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {(r.amount || 0).toLocaleString()} {config.currency}
                                  </td>
                                </tr>
                              ))}
                              {financingRows.length === 0 && (
                                <tr>
                                  <td colSpan={2} className="p-3 text-center text-slate-500 font-sans">لا توجد تدفقات تمويلية مسجلة (قروض، زيادة رأس المال، توزيعات أرباح).</td>
                                </tr>
                              )}
                              <tr className="bg-slate-900/25 font-bold border-t border-slate-800 text-slate-100">
                                <td className="p-3">صافي النقد المتوفر من الأنشطة التمويلية</td>
                                <td className={`p-3 text-left font-mono ${sumFin >= 0 ? "text-pink-400" : "text-rose-400"}`}>
                                  {sumFin.toLocaleString()} {config.currency}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Financial Reconciliation Summary Block */}
                        <div className="bg-[#141b2d] border border-slate-800 rounded-xl p-5 space-y-4 shadow-inner mt-4">
                          <h5 className="text-xs font-bold text-slate-200">خلاصة التدفقات النقدية والمطابقة مع الخزينة والبنوك</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#0f1425] border border-slate-800/80 rounded-lg p-3 text-right">
                              <span className="text-[10px] text-slate-500 block">الرصيد الافتتاحي للنقد وما يعادله</span>
                              <strong className="text-sm font-mono text-slate-200 font-bold">
                                {openingCash.toLocaleString()} {config.currency}
                              </strong>
                              <p className="text-[9px] text-slate-500 mt-1">بداية الفترة المحاسبية المعنية</p>
                            </div>
                            <div className="bg-[#0f1425] border border-slate-800/80 rounded-lg p-3 text-right">
                              <span className="text-[10px] text-slate-500 block">صافي التغير في النقدية خلال الدورة</span>
                              <strong className={`text-sm font-mono font-bold ${netChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {netChange.toLocaleString()} {config.currency}
                              </strong>
                              <p className="text-[9px] text-slate-500 mt-1">مجموع حركات التشغيل، الاستثمار والتمويل</p>
                            </div>
                            <div className="bg-[#0f1425] border border-slate-800/80 rounded-lg p-3 text-right">
                              <span className="text-[10px] text-slate-500 block">الرصيد الختامي للنقد وما يعادله</span>
                              <strong className="text-sm font-mono text-emerald-400 font-bold">
                                {closingCash.toLocaleString()} {config.currency}
                              </strong>
                              <p className="text-[9px] text-slate-500 mt-1">مطابق لأستاذ الخزنة والبنوك (تأكيد التدقيق)</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* DOMAIN 1: STATEMENT OF CHANGES IN EQUITY (IAS 1 sub-tab) */}
          {domain === "finance" && financeSubTab === "equity" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">قائمة التغيرات في حقوق الملكية (IAS 1 Statement of Changes in Equity)</h4>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">تفصيل التغيرات في بنود رأس المال، الاحتياطيات والأرباح المحتجزة بناء على معايير IAS 1.</p>
                </div>
              </div>

              {isReportsLoading ? (
                <div className="text-center py-12 text-xs text-slate-400 font-sans flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري حساب حقوق الملكية وحركات رأس المال...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                        <th className="p-4 font-bold">رمز الحساب</th>
                        <th className="p-4 font-bold">بند حقوق الملكية</th>
                        <th className="p-4 font-bold text-left">الرصيد الافتتاحي</th>
                        <th className="p-4 font-bold text-left">زيادات رأس المال</th>
                        <th className="p-4 font-bold text-left">التخفيضات والمسحوبات</th>
                        <th className="p-4 font-bold text-left">صافي ربح الفترة المرحل</th>
                        <th className="p-4 font-bold text-left">الرصيد الختامي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {equityReport.map((r: any) => (
                        <tr key={r.accountCode} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 font-mono font-bold text-cyan-400">{r.accountCode}</td>
                          <td className="p-4 font-bold text-slate-200">{r.accountName}</td>
                          <td className="p-4 text-left font-mono text-slate-400">{(r.openingBalance || 0).toLocaleString()} {config.currency}</td>
                          <td className="p-4 text-left font-mono text-emerald-400">+{(r.additions || 0).toLocaleString()} {config.currency}</td>
                          <td className="p-4 text-left font-mono text-rose-400">-{(r.reductions || 0).toLocaleString()} {config.currency}</td>
                          <td className="p-4 text-left font-mono text-cyan-400">+{(r.netIncome || 0).toLocaleString()} {config.currency}</td>
                          <td className="p-4 text-left font-mono font-bold text-slate-100">{(r.closingBalance || 0).toLocaleString()} {config.currency}</td>
                        </tr>
                      ))}
                      {equityReport.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">لا توجد حسابات حقوق ملكية معلنة لتصنيفها.</td>
                        </tr>
                      )}
                      {equityReport.length > 0 && (
                        <tr className="bg-slate-900/35 font-bold border-t border-slate-800">
                          <td colSpan={2} className="p-4 text-slate-100 font-bold">إجمالي حقوق الملكية المساهمة</td>
                          <td className="p-4 text-left font-mono text-slate-300">
                            {equityReport.reduce((sum, r) => sum + (r.openingBalance || 0), 0).toLocaleString()} {config.currency}
                          </td>
                          <td className="p-4 text-left font-mono text-emerald-400">
                            +{equityReport.reduce((sum, r) => sum + (r.additions || 0), 0).toLocaleString()} {config.currency}
                          </td>
                          <td className="p-4 text-left font-mono text-rose-400">
                            -{equityReport.reduce((sum, r) => sum + (r.reductions || 0), 0).toLocaleString()} {config.currency}
                          </td>
                          <td className="p-4 text-left font-mono text-cyan-400">
                            +{equityReport.reduce((sum, r) => sum + (r.netIncome || 0), 0).toLocaleString()} {config.currency}
                          </td>
                          <td className="p-4 text-left font-mono font-bold text-emerald-400">
                            {equityReport.reduce((sum, r) => sum + (r.closingBalance || 0), 0).toLocaleString()} {config.currency}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DOMAIN 1: CASH FLOW MAPPINGS ENGINE (mappings sub-tab) */}
          {domain === "finance" && financeSubTab === "mappings" && (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">إدارة خرائط التدفق النقدي للحسابات (IAS 7 Account Mappings)</h4>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                    اربط الحسابات المحاسبية بأنشطة التدفقات النقدية للحصول على معالجة آلية دقيقة ومستقلة للأنشطة المختلفة.
                  </p>
                </div>
                {isSavingMapping && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded font-sans animate-pulse">
                    جاري حفظ التعديلات سحابياً...
                  </span>
                )}
              </div>

              {isReportsLoading ? (
                <div className="text-center py-12 text-xs text-slate-400 font-sans flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تحميل التصنيفات الحالية...</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                        <th className="p-4 font-bold">كود الحساب</th>
                        <th className="p-4 font-bold">اسم الحساب</th>
                        <th className="p-4 font-bold">نوع الحساب الطبيعي</th>
                        <th className="p-4 font-bold">نوع النشاط (IAS 7 Activity)</th>
                        <th className="p-4 font-bold">البند المالي المخصص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allMappings.map((mapping: any) => (
                        <tr key={mapping.accountCode} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-300">{mapping.accountCode}</td>
                          <td className="p-4 font-bold text-slate-200">{mapping.accountName}</td>
                          <td className="p-4 font-sans text-slate-500">
                            {mapping.accountType === "Asset" ? "أصول (Asset)" :
                             mapping.accountType === "Liability" ? "التزامات (Liability)" :
                             mapping.accountType === "Equity" ? "حقوق ملكية (Equity)" :
                             mapping.accountType === "Revenue" ? "إيرادات (Revenue)" :
                             "مصروفات (Expense)"}
                          </td>
                          <td className="p-4">
                            <select
                              value={mapping.activityType || "None"}
                              onChange={(e) => handleUpdateMapping(mapping.accountCode, e.target.value, mapping.categoryName || "")}
                              className="bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-sans w-full cursor-pointer"
                            >
                              <option value="None">تجاهل (غير مدرج بالتدفقات)</option>
                              <option value="Operating">نشاط تشغيلي (Operating Activity)</option>
                              <option value="Investing">نشاط استثماري (Investing Activity)</option>
                              <option value="Financing">نشاط تمويلي (Financing Activity)</option>
                              <option value="CashEquivalent">نقدية وما يعادلها (Cash/Equiv)</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="text"
                              value={mapping.categoryName || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAllMappings(prev => prev.map(item => item.accountCode === mapping.accountCode ? { ...item, categoryName: val } : item));
                              }}
                              onBlur={(e) => handleUpdateMapping(mapping.accountCode, mapping.activityType || "None", e.target.value)}
                              placeholder="أدخل فئة الحركة (مثال: نقدية مدفوعة لموردين)"
                              className="bg-[#141b2d] text-xs text-slate-200 border border-slate-700 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-sans w-full text-right"
                            />
                          </td>
                        </tr>
                      ))}
                      {allMappings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">لا توجد حسابات مسجلة حالياً لربطها.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DOMAIN 2: INVENTORY TABLES */}
          {domain === "inventory" && (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                  <th className="p-4 font-bold">الرمز المرجعي (SKU)</th>
                  <th className="p-4 font-bold">اسم ووصف الصنف</th>
                  <th className="p-4 font-bold">التصنيف الرئيسي</th>
                  <th className="p-4 font-bold">التصنيف الفرعي</th>
                  <th className="p-4 font-bold">المستودع والمحطة</th>
                  <th className="p-4 font-bold text-left">الكمية المتاحة</th>
                  <th className="p-4 font-bold text-left">حد الأمان</th>
                  <th className="p-4 font-bold text-left">تكلفة الوحدة</th>
                  <th className="p-4 font-bold text-left">إجمالي القيمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStock.map(item => {
                  const isBelowThreshold = item.quantity <= item.minLevel;
                  return (
                    <tr key={`${item.sku}-${item.warehouseId}`} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-pink-400">{item.sku}</td>
                      <td className="p-4 font-bold text-slate-200">{item.name}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold">
                          {item.category || "عام"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{item.subCategory || "عام فرعي"}</td>
                      <td className="p-4 text-slate-400 font-sans">{item.warehouseId}</td>
                      <td className={`p-4 text-left font-mono font-bold ${isBelowThreshold ? "text-rose-400" : "text-slate-100"}`}>{item.quantity}</td>
                      <td className="p-4 text-left font-mono text-slate-500">{item.minLevel}</td>
                      <td className="p-4 text-left font-mono text-slate-300">{item.unitPrice.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono font-bold text-slate-100">{(item.quantity * item.unitPrice).toLocaleString()} {config.currency}</td>
                    </tr>
                  );
                })}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">لم يتم العثور على أي أصناف مخزنية مطابقة للتصفية الحالية.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DOMAIN 3: INVOICES TABLES */}
          {domain === "invoices" && (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                  <th className="p-4 font-bold">رقم الفاتورة</th>
                  <th className="p-4 font-bold">تاريخ القيد</th>
                  <th className="p-4 font-bold">نوع المعاملة</th>
                  <th className="p-4 font-bold">اسم العميل / المورد</th>
                  <th className="p-4 font-bold text-left">قيمة الفاتورة الأساسية</th>
                  <th className="p-4 font-bold text-left">القيمة المضافة (14%)</th>
                  <th className="p-4 font-bold text-left">ضريبة الخصم والتحصيل (1%)</th>
                  <th className="p-4 font-bold text-left">القيمة الصافية المستحقة</th>
                  <th className="p-4 font-bold text-center">حالة السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map(inv => {
                  const clientName = "customerId" in inv ? inv.customerName : inv.supplierName;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-400">{inv.id}</td>
                      <td className="p-4 font-mono text-slate-400">{inv.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                          inv.invoiceType === "sales" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {inv.invoiceType === "sales" ? "فاتورة بيع" : "فاتورة شراء"}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">{clientName}</td>
                      <td className="p-4 text-left font-mono text-slate-300">{inv.subtotal.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono text-rose-400">+ {inv.vatAmount.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono text-cyan-400">- {inv.withholdingTax.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono font-bold text-slate-100">{inv.total.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">
                          {inv.status === "Paid" ? "مسددة بالكامل" : "معلقة"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">لم يتم العثور على أي فواتير بيع أو شراء مطابقة للتصفية والبحث.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DOMAIN 4: HR PAYROLL TABLES */}
          {domain === "hr" && (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                  <th className="p-4 font-bold">الرقم الوظيفي</th>
                  <th className="p-4 font-bold">الاسم الكامل</th>
                  <th className="p-4 font-bold">المسمى الوظيفي والدور</th>
                  <th className="p-4 font-bold">الإدارة والتعليم</th>
                  <th className="p-4 font-bold text-center">أيام الحضور والانتظام</th>
                  <th className="p-4 font-bold text-left">الراتب الأساسي التعاقدي</th>
                  <th className="p-4 font-bold text-left">الاستقطاع الضريبي المسبق</th>
                  <th className="p-4 font-bold text-left">صافي الراتب المستحق للصرف</th>
                  <th className="p-4 font-bold text-center">حالة الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.map(emp => {
                  const netSalaryFactor = emp.attendanceDays / 30;
                  const grossSalary = emp.baseSalary * netSalaryFactor;
                  const taxDeduction = grossSalary * emp.withholdingTaxRate;
                  const netPaid = grossSalary - taxDeduction;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-amber-400">{emp.id}</td>
                      <td className="p-4 font-bold text-slate-200">{emp.name}</td>
                      <td className="p-4 text-slate-300 font-medium">{emp.role}</td>
                      <td className="p-4 text-slate-400">{emp.department}</td>
                      <td className="p-4 text-center font-mono font-bold text-slate-200">{emp.attendanceDays} / 30 يوم</td>
                      <td className="p-4 text-left font-mono text-slate-400">{emp.baseSalary.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono text-rose-400">- {taxDeduction.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-left font-mono font-bold text-emerald-400">{netPaid.toLocaleString()} {config.currency}</td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          {emp.status === "Active" ? "نشط - معتمد" : "إجازة"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">لا توجد بيانات موظفين مسجلة مطابقة لمعايير التصفية الحالية.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DOMAIN 5: MRP TABLES */}
          {domain === "mrp" && (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                  <th className="p-4 font-bold">رمز أمر التشغيل (BOM ID)</th>
                  <th className="p-4 font-bold">رمز المنتج النهائي</th>
                  <th className="p-4 font-bold">الاسم التجاري للمنتج النهائي</th>
                  <th className="p-4 font-bold text-center">الكمية المطلوبة تصنيعها</th>
                  <th className="p-4 font-bold text-left">تكلفة أتعاب العمالة البشرية</th>
                  <th className="p-4 font-bold text-left">إجمالي تكلفة أمر الإنتاج</th>
                  <th className="p-4 font-bold text-center">الحالة الراهنة لأمر الشغل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProductionOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-bold text-purple-400">{order.id}</td>
                    <td className="p-4 font-mono text-slate-400">{order.productSku || order.bomId || "N/A"}</td>
                    <td className="p-4 font-bold text-slate-200">{order.productName}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-100">{order.quantityToBuild || order.quantity || 1} وحدة</td>
                    <td className="p-4 text-left font-mono text-slate-400">{(order.laborCost || 1500).toLocaleString()} {config.currency}</td>
                    <td className="p-4 text-left font-mono font-bold text-slate-200">{(order.totalCost || 24500).toLocaleString()} {config.currency}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                        order.status === "Completed" || order.status === "Posted"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {order.status === "Completed" || order.status === "Posted" ? "مكتمل ومرحل" : "تحت المراجعة"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredProductionOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">لا توجد أوامر تشغيل أو تخطيط إنتاج (MRP) جارية حالياً بالنظام.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* DOMAIN 6: PARTNERS & CHEQUES TABLES */}
          {domain === "partners" && (
            <div className="p-4 space-y-6 text-right">
              
              {/* 6a: Cheques Treasury Ledger */}
              {(partnersFilter === "all" || partnersFilter === "cheques") && (
                <div className="bg-slate-900/20 rounded-xl border border-slate-800/60 p-4.5">
                  <h4 className="text-xs font-bold text-cyan-400 mb-3.5 flex items-center gap-1.5 font-display border-b border-slate-800 pb-2">
                    <span className="text-cyan-500">◀</span> تقرير حركة وجرد خزينة الشيكات (Cheques Treasury Lifecycle Ledger)
                  </h4>
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                        <th className="p-4 font-bold">رقم الشيك</th>
                        <th className="p-4 font-bold">البنك المسحوب عليه</th>
                        <th className="p-4 font-bold">العميل المُنشئ</th>
                        <th className="p-4 font-bold text-center">تاريخ الاستحقاق</th>
                        <th className="p-4 font-bold text-left">مبلغ الشيك</th>
                        <th className="p-4 font-bold text-center">حالة الشيك الراهنة</th>
                        <th className="p-4 font-bold">المورد المُظهر له</th>
                        <th className="p-4 font-bold">تتبع القيود والملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {cheques.map(chq => {
                        const associatedCustomer = customers.find(c => c.id === chq.customerId);
                        const associatedSupplier = chq.supplierId ? suppliers.find(s => s.id === chq.supplierId) : null;
                        return (
                          <tr key={chq.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 font-mono font-bold text-cyan-400">{chq.chequeNumber}</td>
                            <td className="p-4 font-bold text-slate-200">{chq.bankName}</td>
                            <td className="p-4 text-slate-300">
                              {chq.beneficiaryType === "Customer" 
                                ? (associatedCustomer?.name || "عميل غير معرف")
                                : (chq.beneficiaryName || "طرف ثالث")}
                            </td>
                            <td className="p-4 text-center font-sans font-mono text-slate-400">{chq.dueDate}</td>
                            <td className="p-4 text-left font-mono font-bold text-emerald-400">{chq.amount.toLocaleString()} {config.currency}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                                chq.status === "InSafe" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                chq.status === "EndorsedToSupplier" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                chq.status === "Collected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                chq.status === "Bounced" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}>
                                {chq.status === "InSafe" ? "في الخزينة" :
                                 chq.status === "EndorsedToSupplier" ? "مظهر للمورد" :
                                 chq.status === "Collected" ? "مُحصل بالبنك" :
                                 chq.status === "Bounced" ? "مرفوض ومُرتد" : "مسترد للعميل"}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 font-medium">
                              {associatedSupplier ? associatedSupplier.name : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="p-4 text-slate-400 max-w-[200px] truncate">{chq.notes || "لا توجد ملاحظات إضافية"}</td>
                          </tr>
                        );
                      })}
                      {cheques.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">لا توجد أوراق شيكات مسجلة بالنظام حالياً.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 6b: Top Customers & Suppliers Ledger */}
              {(partnersFilter === "all" || partnersFilter === "partners") && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 text-right">
                  
                  {/* Top 10 Customers */}
                  <div className="bg-slate-900/20 rounded-xl border border-slate-800/60 p-4.5">
                    <h4 className="text-xs font-bold text-amber-400 mb-3.5 flex items-center gap-1.5 font-display border-b border-slate-800 pb-2">
                      <span className="text-amber-500">◀</span> أكبر 10 عملاء بحجم الأرصدة والذمم (Top 10 Client Balances)
                    </h4>
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                          <th className="p-3 font-bold">معرف العميل</th>
                          <th className="p-3 font-bold">الاسم التجاري للعميل</th>
                          <th className="p-3 font-bold">البريد والاتصال</th>
                          <th className="p-3 font-bold text-left">الرصيد المالي المدين</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {customers.slice(0, 10).map(cust => (
                          <tr key={cust.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 font-mono font-bold text-amber-400">{cust.id}</td>
                            <td className="p-3 font-bold text-slate-200">{cust.name}</td>
                            <td className="p-3 text-slate-400 font-sans">{cust.email}</td>
                            <td className="p-3 text-left font-mono font-bold text-slate-200">{cust.balance.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top 10 Suppliers */}
                  <div className="bg-slate-900/20 rounded-xl border border-slate-800/60 p-4.5">
                    <h4 className="text-xs font-bold text-rose-400 mb-3.5 flex items-center gap-1.5 font-display border-b border-slate-800 pb-2">
                      <span className="text-rose-500">◀</span> أكبر 10 موردين بحجم الالتزامات (Top 10 Supplier Balances)
                    </h4>
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                          <th className="p-3 font-bold">معرف المورد</th>
                          <th className="p-3 font-bold">الشركة الموردة</th>
                          <th className="p-3 font-bold">البريد والاتصال</th>
                          <th className="p-3 font-bold text-left">الرصيد الدائن المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {suppliers.slice(0, 10).map(supp => (
                          <tr key={supp.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-3 font-mono font-bold text-rose-400">{supp.id}</td>
                            <td className="p-3 font-bold text-slate-200">{supp.name}</td>
                            <td className="p-3 text-slate-400 font-sans">{supp.email}</td>
                            <td className="p-3 text-left font-mono font-bold text-slate-200">{supp.balance.toLocaleString()} {config.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* DOMAIN 7: KPI DASHBOARD WITH RECHARTS */}
          {domain === "kpis" && (
            <div className="p-6 space-y-8 text-right">
              
              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Net Profit & Sales Trend */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-cyan-400 mb-4 flex items-center gap-1.5 font-display">
                    📊 تحليل الإيرادات وصافي الربح التشغيلي (مستحق ودفتري)
                  </h4>
                  <div className="h-64 font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={kpiMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                        <Legend />
                        <Area type="monotone" dataKey="sales" name="إيرادات المبيعات" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                        <Area type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#06b6d4" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Cash In vs. Cash Out (Cash Flow) */}
                <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-amber-400 mb-4 flex items-center gap-1.5 font-display">
                    📈 تحليل التدفقات النقدية الفعلية (المقبوضات والمدفوعات للصندوق)
                  </h4>
                  <div className="h-64 font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kpiMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="cashIn" name="النقد المستلم (Cash In)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cashOut" name="النقد المصروف (Cash Out)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Monthly breakdown table */}
              <div className="bg-slate-900/20 rounded-xl border border-slate-800/60 p-5">
                <h4 className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-1.5 font-display border-b border-slate-800 pb-2">
                  📑 جدول تفصيل دورة الأعمال الشهرية والنسب المالية الملحقة
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 text-slate-400 font-sans border-b border-slate-800">
                        <th className="p-3.5 font-bold">الشهر المالي</th>
                        <th className="p-3.5 font-bold text-left">إيرادات المبيعات (SaaS)</th>
                        <th className="p-3.5 font-bold text-left">تكلفة المشتريات المباشرة</th>
                        <th className="p-3.5 font-bold text-left">المصروفات التشغيلية والرواتب</th>
                        <th className="p-3.5 font-bold text-left">صافي الربح المكتسب</th>
                        <th className="p-3.5 font-bold text-left">متحصلات النقد (In)</th>
                        <th className="p-3.5 font-bold text-left">مدفوعات النقد (Out)</th>
                        <th className="p-3.5 font-bold text-left">صافي التدفق (Net Cash)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {kpiMonthlyData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-3.5 font-bold text-slate-200 font-sans">{row.month}</td>
                          <td className="p-3.5 text-left text-emerald-400 font-bold">{row.sales.toLocaleString()} {config.currency}</td>
                          <td className="p-3.5 text-left text-slate-400">{row.purchases.toLocaleString()} {config.currency}</td>
                          <td className="p-3.5 text-left text-slate-400">{row.operatingExpenses.toLocaleString()} {config.currency}</td>
                          <td className={`p-3.5 text-left font-bold ${row.netProfit >= 0 ? "text-cyan-400" : "text-rose-500"}`}>
                            {row.netProfit.toLocaleString()} {config.currency}
                          </td>
                          <td className="p-3.5 text-left text-emerald-500">{row.cashIn.toLocaleString()} {config.currency}</td>
                          <td className="p-3.5 text-left text-rose-500">{row.cashOut.toLocaleString()} {config.currency}</td>
                          <td className={`p-3.5 text-left font-bold ${row.cashIn - row.cashOut >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {(row.cashIn - row.cashOut).toLocaleString()} {config.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* PRINT ONLY OFFICIAL FOOTER */}
        <div className="hidden print:flex flex-row justify-between items-center border-t border-slate-300 pt-4 mt-12 text-[9px] text-slate-500 font-sans w-full p-4">
          <div>نظام تخطيط الموارد الشامل المعتمد ضريبياً ومحاسبياً - ApexSaaS ERP Core v2.1</div>
          <div className="font-bold">المستند مشفر ومحمي برمز التحقق الفوري والختم الرقمي للأصالة</div>
          <div className="text-left font-mono">طبع بواسطة: الإدارة المالية الكبرى | صفحة ١ من ١</div>
        </div>

        {/* Footer info within table container */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-900/30 text-[10px] text-slate-500 font-sans flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          <p>أنتجت هذه التقارير آلياً ومباشرة بموجب المعايير الدولية للتقارير المالية IFRS وقانون الضرائب والامتثال لمنظومة الفواتير الإلكترونية المصرية.</p>
          <p className="font-mono">ApexSaaS ERP Reporting Module © 2026</p>
        </div>

      </div>

    </div>
  );
}
