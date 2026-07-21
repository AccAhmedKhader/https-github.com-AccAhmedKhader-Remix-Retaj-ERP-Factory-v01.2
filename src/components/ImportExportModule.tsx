import React, { useState, useRef } from "react";
import { 
  Printer, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Database, 
  Copy, 
  Check, 
  FileJson,
  PlusCircle,
  Eye,
  Trash2,
  FileDown,
  Sparkles,
  Search
} from "lucide-react";
import * as XLSX from "xlsx";
import { ERPConfig, ChartOfAccount, Customer, Supplier, StockItem, JournalEntry, Employee, SalesInvoice, PurchaseInvoice } from "../types";

interface ImportExportProps {
  config: ERPConfig;
  accounts: ChartOfAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<ChartOfAccount[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  stock: StockItem[];
  setStock: React.Dispatch<React.SetStateAction<StockItem[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  purchaseInvoices?: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  salesInvoices?: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
}

type CategoryType = "accounts" | "customers" | "suppliers" | "stock" | "journalEntries" | "employees" | "salesInvoices" | "purchaseInvoices";

export default function ImportExportModule({
  config,
  accounts,
  setAccounts,
  customers,
  setCustomers,
  suppliers,
  setSuppliers,
  stock,
  setStock,
  journalEntries,
  setJournalEntries,
  employees,
  setEmployees,
  purchaseInvoices = [],
  setPurchaseInvoices,
  salesInvoices = [],
  setSalesInvoices
}: ImportExportProps) {
  const [activeTab, setActiveTab] = useState<"import-export" | "print-hub">("import-export");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("accounts");
  
  // Import section states
  const [importMethod, setImportMethod] = useState<"file" | "paste">("file");
  const [pastedData, setPastedData] = useState("");
  const [pastedFormat, setPastedFormat] = useState<"json" | "csv">("json");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<{ row: number; status: "valid" | "invalid"; errors: string[]; data: any }[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Print section states
  const [selectedDocType, setSelectedDocType] = useState<"sales-invoice" | "purchase-invoice" | "journal-entry" | "payslip" | "trial-balance">("sales-invoice");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [printTheme, setPrintTheme] = useState<"dark-preview" | "classic-light">("dark-preview");

  // Dynamic list getters
  const currentCategoryCount = () => {
    switch (selectedCategory) {
      case "accounts": return accounts.length;
      case "customers": return customers.length;
      case "suppliers": return suppliers.length;
      case "stock": return stock.length;
      case "journalEntries": return journalEntries.length;
      case "employees": return employees.length;
      case "salesInvoices": return salesInvoices.length;
      case "purchaseInvoices": return purchaseInvoices.length;
    }
  };

  const getCategoryTitle = (cat: CategoryType) => {
    switch (cat) {
      case "accounts": return "شجرة الحسابات والدليل المالي";
      case "customers": return "سجل العملاء وضريبة المبيعات";
      case "suppliers": return "سجل الموردين والمشتريات";
      case "stock": return "كتالوج الأصناف والمنتجات والمخزون";
      case "journalEntries": return "دفتر قيود اليومية العامة والترحيل";
      case "employees": return "مسجل رواتب الموظفين والاتش آر";
      case "salesInvoices": return "فواتير المبيعات الإلكترونية وضريبة المخرجات";
      case "purchaseInvoices": return "فواتير المشتريات وضريبة المدخلات";
    }
  };

  // Helper: Copy template text
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  // Generate CSV data manually
  const convertToCSV = (data: any[], fields: string[]) => {
    const header = fields.join(",");
    const rows = data.map(row => 
      fields.map(fieldName => {
        const value = row[fieldName];
        if (value === undefined || value === null) return "";
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        const valueStr = String(value);
        if (valueStr.includes(",") || valueStr.includes("\n") || valueStr.includes('"')) {
          return `"${valueStr.replace(/"/g, '""')}"`;
        }
        return valueStr;
      }).join(",")
    );
    return [header, ...rows].join("\n");
  };

  // Parse CSV data manually
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Parse header row
    const headers = lines[0].split(",").map(h => h.trim());
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle standard commas and commas inside quotes
      const values: string[] = [];
      let insideQuote = false;
      let currentVal = "";

      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const char = line[charIdx];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentVal.trim());
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const obj: any = {};
      headers.forEach((header, index) => {
        let value: any = values[index] || "";
        // Clean outer quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }
        
        // Parse nested JSON if it looks like array or object
        if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if parsing fails
          }
        } else if (!isNaN(Number(value)) && value !== "") {
          value = Number(value);
        } else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        }
        obj[header] = value;
      });
      results.push(obj);
    }
    return results;
  };

  // Get Sample templates for import and copy testing
  const getTemplates = (cat: CategoryType) => {
    switch (cat) {
      case "accounts":
        const accJson = [
          { code: "101001", name: "خزينة الفرع الرئيسي بالقاهرة", type: "Asset", balance: 150000, initialBalance: 150000, classification: "النقدية بالصندوق" },
          { code: "201001", name: "مخصص مستحقات ضريبة القيمة المضافة", type: "Liability", balance: 45000, initialBalance: 45000, classification: "الالتزامات المتداولة" },
          { code: "501003", name: "مصروف إيجارات مستودعات جدة", type: "Expense", balance: 8000, initialBalance: 8000, classification: "المصروفات الإدارية والعمومية" }
        ];
        return {
          json: JSON.stringify(accJson, null, 2),
          csv: "code,name,type,balance,initialBalance,classification\n101001,خزينة الفرع الرئيسي بالقاهرة,Asset,150000,150000,النقدية بالصندوق\n201001,مخصص مستحقات ضريبة القيمة المضافة,Liability,45000,45000,الالتزامات المتداولة\n501003,مصروف إيجارات مستودعات جدة,Expense,8000,8000,المصروفات الإدارية والعمومية",
          fields: ["code", "name", "type", "balance", "initialBalance", "classification"]
        };
      case "customers":
        const custJson = [
          { id: "CUST-999", name: "شركة الخليج للتوريدات والحلول الرقمية", taxRegistrationNumber: "344-998-112", phone: "01009876543", email: "info@gulfsolutions.com", balance: 25000 },
          { id: "CUST-888", name: "شركة الأهرام للتطوير والاستثمار العقاري", taxRegistrationNumber: "112-445-981", phone: "0233445566", email: "finance@ahram-group.eg", balance: 0 }
        ];
        return {
          json: JSON.stringify(custJson, null, 2),
          csv: "id,name,taxRegistrationNumber,phone,email,balance\nCUST-999,شركة الخليج للتوريدات والحلول الرقمية,344-998-112,01009876543,info@gulfsolutions.com,25000\nCUST-888,شركة الأهرام للتطوير والاستثمار العقاري,112-445-981,0233445566,finance@ahram-group.eg,0",
          fields: ["id", "name", "taxRegistrationNumber", "phone", "email", "balance"]
        };
      case "suppliers":
        const suppJson = [
          { id: "SUPP-501", name: "مصنع تكنولوجيا النخبة الآسيوي", taxRegistrationNumber: "900-112-554", phone: "+861389900221", email: "export@elite-tech-cn.com", balance: 135000 },
          { id: "SUPP-502", name: "المؤسسة العربية للورق والكرتون", taxRegistrationNumber: "310-998-444", phone: "0234125567", email: "sales@arabicpaper.com", balance: 12000 }
        ];
        return {
          json: JSON.stringify(suppJson, null, 2),
          csv: "id,name,taxRegistrationNumber,phone,email,balance\nSUPP-501,مصنع تكنولوجيا النخبة الآسيوي,900-112-554,+861389900221,export@elite-tech-cn.com,135000\nSUPP-502,المؤسسة العربية للورق والكرتون,310-998-444,0234125567,sales@arabicpaper.com,12000",
          fields: ["id", "name", "taxRegistrationNumber", "phone", "email", "balance"]
        };
      case "stock":
        const stockJson = [
          { sku: "ITEM-901", name: "شريحة ذكية استشعارية v4.2", warehouseId: "WH-CAI-01", quantity: 500, unitPrice: 420, minLevel: 50, category: "إلكترونيات", subCategory: "الشرائح الذكية" },
          { sku: "ITEM-902", name: "كابل فايبر جلاس مصفح 50 متر", warehouseId: "WH-DXB-03", quantity: 80, unitPrice: 1250, minLevel: 10, category: "توصيلات وشبكات", subCategory: "الفايبر" }
        ];
        return {
          json: JSON.stringify(stockJson, null, 2),
          csv: "sku,name,warehouseId,quantity,unitPrice,minLevel,category,subCategory\nITEM-901,شريحة ذكية استشعارية v4.2,WH-CAI-01,500,420,50,إلكترونيات,الشرائح الذكية\nITEM-902,كابل فايبر جلاس مصفح 50 متر,WH-DXB-03,80,1250,10,توصيلات وشبكات,الفايبر",
          fields: ["sku", "name", "warehouseId", "quantity", "unitPrice", "minLevel", "category", "subCategory"]
        };
      case "journalEntries":
        const jnlJson = [
          { id: "JV-2026-901", date: "2026-07-12", description: "شراء قرطاسية ومطبوعات للفرع الرئيسي بالقاهرة نقداً", reference: "PUR-110", status: "Posted", costCenter: "CC-ADMIN", profitCenter: "PC-GULF", creator: "أحمد خضر", lines: [{ accountCode: "501003", accountName: "مصروف إيجارات", debit: 450, credit: 0 }, { accountCode: "101001", accountName: "الصندوق", debit: 0, credit: 450 }] },
          { id: "JV-2026-902", date: "2026-07-12", description: "إثبات سداد دفعة مقدمة لمورد خارجي", reference: "TRF-9012", status: "Draft", costCenter: "CC-MKT", profitCenter: "PC-LEVANT", creator: "علي خضر", lines: [{ accountCode: "101001", accountName: "الصندوق", debit: 12000, credit: 0 }, { accountCode: "201001", accountName: "مستحقات ضريبة", debit: 0, credit: 12000 }] }
        ];
        return {
          json: JSON.stringify(jnlJson, null, 2),
          csv: 'id,date,description,reference,status,costCenter,profitCenter,creator\nJV-2026-901,2026-07-12,شراء قرطاسية ومطبوعات للفرع الرئيسي بالقاهرة نقداً,PUR-110,Posted,CC-ADMIN,PC-GULF,أحمد خضر\nJV-2026-902,2026-07-12,إثبات سداد دفعة مقدمة لمورد خارجي,TRF-9012,Draft,CC-MKT,PC-LEVANT,علي خضر',
          fields: ["id", "date", "description", "reference", "status", "costCenter", "profitCenter", "creator"]
        };
      case "employees":
        const empJson = [
          { id: "EMP-20", name: "محمود يوسف السكري", role: "كبير مستشاري الأنظمة المالية", department: "المالية والحسابات", baseSalary: 28000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" },
          { id: "EMP-21", name: "مي السعيد الشناوي", role: "أخصائي موارد بشرية وتوظيف", department: "الموارد البشرية", baseSalary: 12500, attendanceDays: 28, withholdingTaxRate: 0.10, vatRate: 0.14, status: "Active" }
        ];
        return {
          json: JSON.stringify(empJson, null, 2),
          csv: "id,name,role,department,baseSalary,attendanceDays,withholdingTaxRate,vatRate,status\nEMP-20,محمود يوسف السكري,كبير مستشاري الأنظمة المالية,المالية والحسابات,28000,30,0.15,0.14,Active\nEMP-21,مي السعيد الشناوي,أخصائي موارد بشرية وتوظيف,الموارد البشرية,12500,28,0.10,0.14,Active",
          fields: ["id", "name", "role", "department", "baseSalary", "attendanceDays", "withholdingTaxRate", "vatRate", "status"]
        };
      case "salesInvoices":
        const salesInvJson = [
          { id: "INV-2026-101", date: "2026-07-12", customerId: "CUST-999", customerName: "شركة الخليج للتوريدات والحلول الرقمية", subtotal: 10000, vatAmount: 1400, withholdingTax: 100, total: 11300, status: "Paid", paymentMethod: "Bank", items: [{ sku: "ITEM-901", name: "شريحة ذكية استشعارية v4.2", quantity: 2, price: 5000, total: 10000 }] },
          { id: "INV-2026-102", date: "2026-07-12", customerId: "CUST-888", customerName: "شركة الأهرام للتطوير والاستثمار العقاري", subtotal: 2500, vatAmount: 350, withholdingTax: 25, total: 2825, status: "Unpaid", paymentMethod: "Cash", items: [{ sku: "ITEM-902", name: "كابل فايبر جلاس مصفح 50 متر", quantity: 2, price: 1250, total: 2500 }] }
        ];
        return {
          json: JSON.stringify(salesInvJson, null, 2),
          csv: "id,date,customerId,customerName,subtotal,vatAmount,withholdingTax,total,status,paymentMethod,items\nINV-2026-101,2026-07-12,CUST-999,شركة الخليج للتوريدات والحلول الرقمية,10000,1400,100,11300,Paid,Bank,\"[{\\\"sku\\\":\\\"ITEM-901\\\",\\\"name\\\":\\\"شريحة ذكية استشعارية v4.2\\\",\\\"quantity\\\":2,\\\"price\\\":5000,\\\"total\\\":10000}]\"\nINV-2026-102,2026-07-12,CUST-888,شركة الأهرام للتطوير والاستثمار العقاري,2500,350,25,2825,Unpaid,Cash,\"[{\\\"sku\\\":\\\"ITEM-902\\\",\\\"name\\\":\\\"كابل فايبر جلاس مصفح 50 متر\\\",\\\"quantity\\\":2,\\\"price\\\":1250,\\\"total\\\":2500}]\"",
          fields: ["id", "date", "customerId", "customerName", "subtotal", "vatAmount", "withholdingTax", "total", "status", "paymentMethod", "items"]
        };
      case "purchaseInvoices":
        const purchInvJson = [
          { id: "PINV-2026-101", date: "2026-07-12", supplierId: "SUPP-501", supplierName: "مصنع تكنولوجيا النخبة الآسيوي", subtotal: 20000, vatAmount: 2800, withholdingTax: 200, total: 22600, status: "Paid", paymentMethod: "Bank", items: [{ sku: "ITEM-901", name: "شريحة ذكية استشعارية v4.2", quantity: 4, price: 5000, total: 20000 }] },
          { id: "PINV-2026-102", date: "2026-07-12", supplierId: "SUPP-502", supplierName: "المؤسسة العربية للورق والكرتون", subtotal: 5000, vatAmount: 700, withholdingTax: 50, total: 5650, status: "Draft", paymentMethod: "Check", items: [{ sku: "ITEM-902", name: "كابل فايبر جلاس مصفح 50 متر", quantity: 4, price: 1250, total: 5000 }] }
        ];
        return {
          json: JSON.stringify(purchInvJson, null, 2),
          csv: "id,date,supplierId,supplierName,subtotal,vatAmount,withholdingTax,total,status,paymentMethod,items\nPINV-2026-101,2026-07-12,SUPP-501,مصنع تكنولوجيا النخبة الآسيوي,20000,2800,200,22600,Paid,Bank,\"[{\\\"sku\\\":\\\"ITEM-901\\\",\\\"name\\\":\\\"شريحة ذكية استشعارية v4.2\\\",\\\"quantity\\\":4,\\\"price\\\":5000,\\\"total\\\":20000}]\"\nPINV-2026-102,2026-07-12,SUPP-502,المؤسسة العربية للورق والكرتون,5000,700,50,5650,Draft,Check,\"[{\\\"sku\\\":\\\"ITEM-902\\\",\\\"name\\\":\\\"كابل فايبر جلاس مصفح 50 متر\\\",\\\"quantity\\\":4,\\\"price\\\":1250,\\\"total\\\":5000}]\"",
          fields: ["id", "date", "supplierId", "supplierName", "subtotal", "vatAmount", "withholdingTax", "total", "status", "paymentMethod", "items"]
        };
    }
  };

  // Mapping Arabic headers to English keys for user-friendly imports
  const mapArabicKeysToEnglish = (item: any): any => {
    const mapping: Record<string, string> = {
      "كود الحساب": "code",
      "اسم الحساب": "name",
      "نوع الحساب": "type",
      "الرصيد الحالي": "balance",
      "الرصيد الافتتاحي": "initialBalance",
      "التصنيف": "classification",
      
      "المعرف": "id",
      "الرقم الضريبي": "taxRegistrationNumber",
      "الهاتف": "phone",
      "البريد الإلكتروني": "email",
      
      "رمز الصنف (SKU)": "sku",
      "رمز الصنف": "sku",
      "كود المستودع": "warehouseId",
      "الكمية": "quantity",
      "سعر الوحدة": "unitPrice",
      "الحد الأدنى": "minLevel",
      "الفئة الرئيسية": "category",
      "الفئة الفرعية": "subCategory",
      
      "التاريخ": "date",
      "شرح القيد": "description",
      "المرجع": "reference",
      "الحالة": "status",
      "مركز التكلفة": "costCenter",
      "مركز الربحية": "profitCenter",
      "منشئ القيد": "creator",
      
      "المسمى الوظيفي": "role",
      "القسم": "department",
      "الراتب الأساسي": "baseSalary",
      "أيام الحضور": "attendanceDays",
      "معدل ضريبة الاستقطاع": "withholdingTaxRate",
      "معدل القيمة المضافة": "vatRate",

      // Invoices
      "رقم الفاتورة": "id",
      "كود الفاتورة": "id",
      "تاريخ الفاتورة": "date",
      "كود العميل": "customerId",
      "اسم العميل": "customerName",
      "كود المورد": "supplierId",
      "اسم المورد": "supplierName",
      "المجموع الفرعي": "subtotal",
      "ضريبة الاستقطاع": "withholdingTax",
      "إجمالي الفاتورة": "total",
      "الإجمالي": "total",
      "حالة الفاتورة": "status",
      "طريقة السداد": "paymentMethod",
      "طريقة الدفع": "paymentMethod",
      "الأصناف والتفاصيل": "items",
      "تفاصيل الأصناف": "items",
      "الأصناف": "items"
    };

    const newItem: any = {};
    Object.keys(item).forEach(key => {
      const trimmedKey = key.trim();
      const mappedKey = mapping[trimmedKey] || trimmedKey;
      newItem[mappedKey] = item[key];
    });
    return newItem;
  };

  // Function to download an Excel template (either completely empty or pre-filled with sample data)
  const handleDownloadExcelTemplate = (isEmpty: boolean) => {
    try {
      const templateInfo = getTemplates(selectedCategory);
      let dataToExport: any[] = [];
      
      if (!isEmpty) {
        // Sample data
        dataToExport = JSON.parse(templateInfo.json);
      } else {
        // Create a single empty row with the keys/headers as columns
        const emptyRow: any = {};
        templateInfo.fields.forEach(field => {
          emptyRow[field] = "";
        });
        dataToExport = [emptyRow];
      }

      // Convert keys to Arabic headers
      const arabicHeaders: Record<string, string> = {
        code: "كود الحساب",
        name: "اسم الحساب",
        type: "نوع الحساب",
        balance: "الرصيد الحالي",
        initialBalance: "الرصيد الافتتاحي",
        classification: "التصنيف",
        
        id: "رقم الفاتورة", // mapped nicely
        taxRegistrationNumber: "الرقم الضريبي",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        
        sku: "رمز الصنف (SKU)",
        warehouseId: "كود المستودع",
        quantity: "الكمية",
        unitPrice: "سعر الوحدة",
        minLevel: "الحد الأدنى",
        category: "الفئة الرئيسية",
        subCategory: "الفئة الفرعية",
        
        date: "التاريخ",
        description: "شرح القيد/الفاتورة",
        reference: "المرجع",
        status: "الحالة",
        costCenter: "مركز التكلفة",
        profitCenter: "مركز الربحية",
        creator: "منشئ القيد",
        
        role: "المسمى الوظيفي",
        department: "القسم",
        baseSalary: "الراتب الأساسي",
        attendanceDays: "أيام الحضور",
        withholdingTaxRate: "معدل ضريبة الاستقطاع",
        vatRate: "معدل القيمة المضافة",

        customerId: "كود العميل",
        customerName: "اسم العميل",
        supplierId: "كود المورد",
        supplierName: "اسم المورد",
        subtotal: "المجموع الفرعي",
        vatAmount: "ضريبة القيمة المضافة",
        withholdingTax: "ضريبة الاستقطاع",
        total: "الإجمالي",
        paymentMethod: "طريقة الدفع",
        items: "الأصناف والتفاصيل"
      };

      const formattedData = dataToExport.map(row => {
        const formattedRow: any = {};
        Object.keys(row).forEach(key => {
          if (key === "lines") return; // exclude journal/invoice nested sub-items from a simple flat excel structure
          const arabicKey = arabicHeaders[key] || key;
          // If items is an object/array, stringify it
          if (key === "items" && typeof row[key] === "object") {
            formattedRow[arabicKey] = JSON.stringify(row[key]);
          } else {
            formattedRow[arabicKey] = row[key];
          }
        });
        return formattedRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      const sheetName = (isEmpty ? "فارغ - " : "عينة - ") + getCategoryTitle(selectedCategory).split(" ")[0].slice(0, 15);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `نموذج_${selectedCategory}_${isEmpty ? "فارغ" : "عينة"}.xlsx`);
      
      setSuccessMsg(`تم تحميل نموذج إكسيل (${isEmpty ? "فارغ" : "محشو بعينة"}) لـ ${getCategoryTitle(selectedCategory)} بنجاح!`);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      setErrorMsg(`فشل تحميل نموذج إكسيل: ${err.message}`);
    }
  };

  // Export handler: Excel download
  const handleExportExcel = () => {
    let dataToExport: any[] = [];
    switch (selectedCategory) {
      case "accounts": dataToExport = accounts; break;
      case "customers": dataToExport = customers; break;
      case "suppliers": dataToExport = suppliers; break;
      case "stock": dataToExport = stock; break;
      case "journalEntries": dataToExport = journalEntries; break;
      case "employees": dataToExport = employees; break;
      case "salesInvoices": dataToExport = salesInvoices; break;
      case "purchaseInvoices": dataToExport = purchaseInvoices; break;
    }

    const arabicHeaders: Record<string, string> = {
      code: "كود الحساب",
      name: "اسم الحساب",
      type: "نوع الحساب",
      balance: "الرصيد الحالي",
      initialBalance: "الرصيد الافتتاحي",
      classification: "التصنيف",
      
      id: "رقم الفاتورة",
      taxRegistrationNumber: "الرقم الضريبي",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      
      sku: "رمز الصنف (SKU)",
      warehouseId: "كود المستودع",
      quantity: "الكمية",
      unitPrice: "سعر الوحدة",
      minLevel: "الحد الأدنى",
      category: "الفئة الرئيسية",
      subCategory: "الفئة الفرعية",
      
      date: "التاريخ",
      description: "شرح القيد",
      reference: "المرجع",
      status: "الحالة",
      costCenter: "مركز التكلفة",
      profitCenter: "مركز الربحية",
      creator: "منشئ القيد",
      
      role: "المسمى الوظيفي",
      department: "القسم",
      baseSalary: "الراتب الأساسي",
      attendanceDays: "أيام الحضور",
      withholdingTaxRate: "معدل ضريبة الاستقطاع",
      vatRate: "معدل القيمة المضافة",

      customerId: "كود العميل",
      customerName: "اسم العميل",
      supplierId: "كود المورد",
      supplierName: "اسم المورد",
      subtotal: "المجموع الفرعي",
      vatAmount: "ضريبة القيمة المضافة",
      withholdingTax: "ضريبة الاستقطاع",
      total: "الإجمالي",
      paymentMethod: "طريقة الدفع",
      items: "الأصناف والتفاصيل"
    };

    const formattedData = dataToExport.map(row => {
      const formattedRow: any = {};
      Object.keys(row).forEach(key => {
        if (key === "lines") return;
        const arabicKey = arabicHeaders[key] || key;
        const val = row[key];
        if (key === "items" && typeof val === "object") {
          formattedRow[arabicKey] = JSON.stringify(val);
        } else {
          formattedRow[arabicKey] = val;
        }
      });
      return formattedRow;
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, getCategoryTitle(selectedCategory).slice(0, 30));
      XLSX.writeFile(workbook, `apex_erp_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      setSuccessMsg(`تم تصدير سجلات الـ ${getCategoryTitle(selectedCategory)} بالكامل إلى ملف إكسيل (.xlsx) بنجاح وتحميل الملف!`);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      setErrorMsg(`فشل تصدير ملف إكسيل: ${err.message}`);
    }
  };

  // Export handler: JSON download
  const handleExportJSON = () => {
    let dataToExport: any[] = [];
    switch (selectedCategory) {
      case "accounts": dataToExport = accounts; break;
      case "customers": dataToExport = customers; break;
      case "suppliers": dataToExport = suppliers; break;
      case "stock": dataToExport = stock; break;
      case "journalEntries": dataToExport = journalEntries; break;
      case "employees": dataToExport = employees; break;
      case "salesInvoices": dataToExport = salesInvoices; break;
      case "purchaseInvoices": dataToExport = purchaseInvoices; break;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `apex_erp_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg(`تم تصدير سجلات الـ ${getCategoryTitle(selectedCategory)} بالكامل بصيغة JSON بنجاح وتحميل الملف!`);
    setTimeout(() => setSuccessMsg(""), 6000);
  };

  // Export handler: CSV download
  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let fields: string[] = [];
    
    switch (selectedCategory) {
      case "accounts":
        dataToExport = accounts;
        fields = ["code", "name", "type", "balance", "initialBalance", "classification"];
        break;
      case "customers":
        dataToExport = customers;
        fields = ["id", "name", "taxRegistrationNumber", "phone", "email", "balance"];
        break;
      case "suppliers":
        dataToExport = suppliers;
        fields = ["id", "name", "taxRegistrationNumber", "phone", "email", "balance"];
        break;
      case "stock":
        dataToExport = stock;
        fields = ["sku", "name", "warehouseId", "quantity", "unitPrice", "minLevel", "category", "subCategory"];
        break;
      case "journalEntries":
        dataToExport = journalEntries;
        fields = ["id", "date", "description", "reference", "status", "costCenter", "profitCenter", "creator"];
        break;
      case "employees":
        dataToExport = employees;
        fields = ["id", "name", "role", "department", "baseSalary", "attendanceDays", "withholdingTaxRate", "vatRate", "status"];
        break;
      case "salesInvoices":
        dataToExport = salesInvoices;
        fields = ["id", "date", "customerId", "customerName", "subtotal", "vatAmount", "withholdingTax", "total", "status", "paymentMethod", "items"];
        break;
      case "purchaseInvoices":
        dataToExport = purchaseInvoices;
        fields = ["id", "date", "supplierId", "supplierName", "subtotal", "vatAmount", "withholdingTax", "total", "status", "paymentMethod", "items"];
        break;
    }

    const csvContent = convertToCSV(dataToExport, fields);
    const csvString = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(csvContent)}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvString);
    downloadAnchor.setAttribute("download", `apex_erp_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg(`تم تصدير سجلات الـ ${getCategoryTitle(selectedCategory)} بالكامل بصيغة CSV بنجاح وتحميل الملف!`);
    setTimeout(() => setSuccessMsg(""), 6000);
  };

  // File selection or Paste action processor
  const handleAnalyzeData = (rawDataToParse?: string, forceFormat?: "json" | "csv") => {
    setErrorMsg("");
    setSuccessMsg("");
    const dataString = rawDataToParse || pastedData;
    const format = forceFormat || pastedFormat;

    if (!dataString.trim()) {
      setErrorMsg("الرجاء توفير البيانات للاستيراد أولاً (عن طريق لصق الكود أو اختيار ملف).");
      return;
    }

    let parsedList: any[] = [];
    try {
      if (format === "json") {
        const parsed = JSON.parse(dataString);
        parsedList = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        parsedList = parseCSV(dataString);
      }
    } catch (e: any) {
      setErrorMsg(`خطأ في قراءة أو تحليل بنية الملف بصيغة ${format.toUpperCase()}: ${e.message}`);
      return;
    }

    if (parsedList.length === 0) {
      setErrorMsg("لم يتم العثور على أي صفوف أو بيانات صالحة في الملف المرفق.");
      return;
    }

    // Automatically convert any Arabic headers to English database keys
    const mappedList = parsedList.map(row => mapArabicKeysToEnglish(row));
    validateAndPreviewData(mappedList);
  };

  // File Upload listener
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");
    
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length === 0) {
            setErrorMsg("لم يتم العثور على أي صفوف أو بيانات صالحة في ملف الإكسيل المرفق.");
            return;
          }

          // Automatically convert any Arabic headers to English keys
          const mappedData = jsonData.map(row => mapArabicKeysToEnglish(row));
          
          // Show preview
          validateAndPreviewData(mappedData);
          setSuccessMsg(`تم تحميل ملف الإكسيل "${file.name}" وتحليل السجلات بنجاح!`);
          setTimeout(() => setSuccessMsg(""), 6000);
        } catch (err: any) {
          setErrorMsg(`خطأ في قراءة ملف الإكسيل: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      const formatSelected: "json" | "csv" = isCsv ? "csv" : "json";
      
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedData(text);
        setPastedFormat(formatSelected);
        handleAnalyzeData(text, formatSelected);
      };
      reader.readAsText(file);
    }
  };

  // Perform interactive validation on parsed items
  const validateAndPreviewData = (items: any[]) => {
    const results = items.map((item, index) => {
      const errors: string[] = [];
      let status: "valid" | "invalid" = "valid";

      // Category-based validation rules
      if (selectedCategory === "accounts") {
        if (!item.code) errors.push("كود الحساب العام مطلوب.");
        if (!item.name) errors.push("اسم الحساب مطلوب.");
        if (item.type && !["Asset", "Liability", "Equity", "Revenue", "Expense"].includes(item.type)) {
          errors.push("نوع الحساب غير صالح. المسموح به: Asset, Liability, Equity, Revenue, Expense");
        }
        // Duplicate check with current active state
        const exists = accounts.some(a => a.code === String(item.code));
        if (exists) {
          errors.push(`تنبيه: كود الحساب (${item.code}) موجود مسبقاً في الدليل الحالي. سيتم تحديث رصيده وبياناته.`);
        }
      }

      else if (selectedCategory === "customers") {
        if (!item.id) errors.push("معرف العميل (id) مطلوب.");
        if (!item.name) errors.push("اسم العميل بالكامل مطلوب.");
        const exists = customers.some(c => c.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: كود العميل (${item.id}) مكرر، سيتم تحديث السجل الحالي.`);
        }
      }

      else if (selectedCategory === "suppliers") {
        if (!item.id) errors.push("معرف المورد (id) مطلوب.");
        if (!item.name) errors.push("اسم المورد بالكامل مطلوب.");
        const exists = suppliers.some(s => s.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: كود المورد (${item.id}) مكرر، سيتم تحديث السجل الحالي.`);
        }
      }

      else if (selectedCategory === "stock") {
        if (!item.sku) errors.push("رمز المنتج (sku) مطلوب.");
        if (!item.name) errors.push("اسم صنف المخزون مطلوب.");
        const exists = stock.some(s => s.sku === String(item.sku));
        if (exists) {
          errors.push(`تنبيه: رمز SKU (${item.sku}) مسجل بالدليل، سيتم تحديث الكمية والسعر الصافي.`);
        }
      }

      else if (selectedCategory === "journalEntries") {
        if (!item.id) errors.push("رقم قيد اليومية (id) مطلوب.");
        if (!item.date) errors.push("تاريخ تحرير القيد مطلوب.");
        if (!item.description) errors.push("شرح القيد مطلوب.");
        const exists = journalEntries.some(j => j.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: رقم السند المحاسبي (${item.id}) مكرر، سيتم تجديد وتحديث أطراف القيد.`);
        }
      }

      else if (selectedCategory === "employees") {
        if (!item.id) errors.push("الرقم الوظيفي (id) مطلوب.");
        if (!item.name) errors.push("اسم الموظف مطلوب.");
        if (item.baseSalary && isNaN(Number(item.baseSalary))) errors.push("الراتب الأساسي يجب أن يكون قيمة رقمية.");
        const exists = employees.some(e => e.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: الرقم الوظيفي للموظف (${item.id}) مسجل بكشوف المرتبات، سيتم التحديث.`);
        }
      }

      else if (selectedCategory === "salesInvoices") {
        if (!item.id) errors.push("رقم فاتورة المبيعات (id) مطلوب.");
        if (!item.customerName) errors.push("اسم العميل مطلوب للفاتورة.");
        if (item.total && isNaN(Number(item.total))) errors.push("إجمالي الفاتورة يجب أن يكون قيمة رقمية.");
        const exists = salesInvoices.some(s => s.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: فاتورة المبيعات (${item.id}) مكررة، سيتم التحديث وتعديل قيم الفاتورة.`);
        }
      }

      else if (selectedCategory === "purchaseInvoices") {
        if (!item.id) errors.push("رقم فاتورة المشتريات (id) مطلوب.");
        if (!item.supplierName) errors.push("اسم المورد مطلوب للفاتورة.");
        if (item.total && isNaN(Number(item.total))) errors.push("إجمالي الفاتورة يجب أن يكون قيمة رقمية.");
        const exists = purchaseInvoices.some(p => p.id === String(item.id));
        if (exists) {
          errors.push(`تنبيه: فاتورة المشتريات (${item.id}) مكررة، سيتم التحديث وتعديل قيم الفاتورة.`);
        }
      }

      // Check severe errors versus warnings
      const isCritical = errors.some(err => !err.startsWith("تنبيه:"));
      if (isCritical) {
        status = "invalid";
      }

      return {
        row: index + 1,
        status,
        errors,
        data: item
      };
    });

    setParsedData(items);
    setValidationResults(results);
    setSuccessMsg(`تم قراءة وتحليل عدد ${items.length} صفًا بنجاح. يرجى مراجعة حالة التحقق أدناه لتأكيد الاستيراد.`);
  };

  // Final Action: Merge data with global state
  const handleCommitImport = () => {
    if (parsedData.length === 0) {
      setErrorMsg("لا توجد بيانات صالحة ومحللة للاستيراد في الوقت الحالي.");
      return;
    }

    const invalidRows = validationResults.filter(r => r.status === "invalid");
    if (invalidRows.length > 0) {
      setErrorMsg(`فشل دمج البيانات. هناك عدد ${invalidRows.length} صفًا غير صالح بالملف ويحتوي على أخطاء حرجة.`);
      return;
    }

    let updatedCount = 0;
    let addedCount = 0;

    if (selectedCategory === "accounts") {
      setAccounts(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.code === String(item.code));
          const normalized: ChartOfAccount = {
            code: String(item.code),
            name: String(item.name),
            type: (item.type || "Asset") as any,
            balance: Number(item.balance) || 0,
            initialBalance: Number(item.initialBalance) || Number(item.balance) || 0,
            classification: item.classification || "أصول متداولة"
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "customers") {
      setCustomers(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          const normalized: Customer = {
            id: String(item.id),
            name: String(item.name),
            taxRegistrationNumber: item.taxRegistrationNumber || "310-900-221",
            phone: item.phone || "غير متوفر",
            email: item.email || "غير متوفر",
            balance: Number(item.balance) || 0
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "suppliers") {
      setSuppliers(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          const normalized: Supplier = {
            id: String(item.id),
            name: String(item.name),
            taxRegistrationNumber: item.taxRegistrationNumber || "400-112-990",
            phone: item.phone || "غير متوفر",
            email: item.email || "غير متوفر",
            balance: Number(item.balance) || 0
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "stock") {
      setStock(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.sku === String(item.sku));
          const normalized: StockItem = {
            sku: String(item.sku),
            name: String(item.name),
            warehouseId: item.warehouseId || config.warehouse || "WH-CAI-01",
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            minLevel: Number(item.minLevel) || 5,
            category: item.category || "أصناف عامة",
            subCategory: item.subCategory || "منتج رئيسي"
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "journalEntries") {
      setJournalEntries(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          const normalized: JournalEntry = {
            id: String(item.id),
            date: item.date || new Date().toISOString().slice(0, 10),
            description: String(item.description),
            reference: item.reference || "سند استيراد خارجي",
            lines: Array.isArray(item.lines) ? item.lines : [],
            status: item.status || "Posted",
            costCenter: item.costCenter || "CC-ADMIN",
            profitCenter: item.profitCenter || "PC-CAIRO",
            creator: item.creator || "مدير النظام"
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "employees") {
      setEmployees(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          const normalized: Employee = {
            id: String(item.id),
            name: String(item.name),
            role: item.role || "موظف مالي",
            department: item.department || "المالية",
            baseSalary: Number(item.baseSalary) || 5000,
            attendanceDays: Number(item.attendanceDays) || 30,
            withholdingTaxRate: Number(item.withholdingTaxRate) || 0.10,
            vatRate: Number(item.vatRate) || 0.14,
            status: (item.status || "Active") as any
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "salesInvoices") {
      if (!setSalesInvoices) {
        setErrorMsg("النظام لا يدعم تحديث فواتير المبيعات في الوقت الحالي.");
        return;
      }
      setSalesInvoices(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          let invoiceItems = [];
          if (item.items) {
            try {
              invoiceItems = typeof item.items === "string" ? JSON.parse(item.items) : item.items;
            } catch (e) {
              invoiceItems = [{ sku: "ITEM-GEN", name: "صنف مستورد", quantity: 1, price: Number(item.total) || 0, total: Number(item.total) || 0 }];
            }
          } else {
            invoiceItems = [{ sku: "ITEM-GEN", name: "صنف عام", quantity: 1, price: Number(item.total) || 0, total: Number(item.total) || 0 }];
          }

          const normalized: SalesInvoice = {
            id: String(item.id),
            date: item.date || new Date().toISOString().slice(0, 10),
            customerId: item.customerId || "CUST-GEN",
            customerName: item.customerName || "عميل عام مستورد",
            items: invoiceItems,
            subtotal: Number(item.subtotal) || Number(item.total) || 0,
            vatAmount: Number(item.vatAmount) || 0,
            withholdingTax: Number(item.withholdingTax) || 0,
            total: Number(item.total) || Number(item.subtotal) || 0,
            status: item.status || "Unpaid",
            paymentMethod: item.paymentMethod || "Cash"
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    else if (selectedCategory === "purchaseInvoices") {
      if (!setPurchaseInvoices) {
        setErrorMsg("النظام لا يدعم تحديث فواتير المشتريات في الوقت الحالي.");
        return;
      }
      setPurchaseInvoices(prev => {
        const next = [...prev];
        parsedData.forEach(item => {
          const idx = next.findIndex(x => x.id === String(item.id));
          let invoiceItems = [];
          if (item.items) {
            try {
              invoiceItems = typeof item.items === "string" ? JSON.parse(item.items) : item.items;
            } catch (e) {
              invoiceItems = [{ sku: "ITEM-GEN", name: "صنف مستورد", quantity: 1, price: Number(item.total) || 0, total: Number(item.total) || 0 }];
            }
          } else {
            invoiceItems = [{ sku: "ITEM-GEN", name: "صنف عام", quantity: 1, price: Number(item.total) || 0, total: Number(item.total) || 0 }];
          }

          const normalized: PurchaseInvoice = {
            id: String(item.id),
            date: item.date || new Date().toISOString().slice(0, 10),
            supplierId: item.supplierId || "SUPP-GEN",
            supplierName: item.supplierName || "مورد عام مستورد",
            items: invoiceItems,
            subtotal: Number(item.subtotal) || Number(item.total) || 0,
            vatAmount: Number(item.vatAmount) || 0,
            withholdingTax: Number(item.withholdingTax) || 0,
            total: Number(item.total) || Number(item.subtotal) || 0,
            status: item.status || "Unpaid",
            paymentMethod: item.paymentMethod || "Cash"
          };
          if (idx !== -1) {
            next[idx] = normalized;
            updatedCount++;
          } else {
            next.push(normalized);
            addedCount++;
          }
        });
        return next;
      });
    }

    setSuccessMsg(`نجحت عملية معالجة البيانات! تم إضافة عدد ${addedCount} سجل جديد، وتحديث عدد ${updatedCount} سجل مسبق وتثبيتهم بنجاح بقاعدة البيانات.`);
    setParsedData([]);
    setValidationResults([]);
    setPastedData("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setTimeout(() => setSuccessMsg(""), 10000);
  };

  // Custom print-specific view helpers
  const getDocumentForPrinting = () => {
    switch (selectedDocType) {
      case "sales-invoice":
        const currentSales = salesInvoices.length > 0 ? salesInvoices : [
          { id: "INV-2026-001", date: "2026-07-12", customerId: "CUST-001", customerName: "شركة مصر للطيران والخدمات اللوجستية", items: [{ sku: "ITEM-001", name: "خادم شبكي رئيسي معالج ثماني النواة", quantity: 2, price: 12500, total: 25000 }, { sku: "ITEM-002", name: "جهاز راوتر فايبر تكتيكي عسكري دبل", quantity: 1, price: 4500, total: 4500 }], subtotal: 29500, vatAmount: 4130, withholdingTax: 147.5, total: 33482.5, status: "Paid", paymentMethod: "Bank" }
        ];
        const saleDoc = currentSales.find(s => s.id === selectedDocId) || currentSales[0];
        return {
          title: "فاتورة مبيعات ضريبية مدمجة",
          subTitle: "Tax Sales Invoice",
          id: saleDoc.id,
          date: saleDoc.date,
          toName: saleDoc.customerName,
          toId: saleDoc.customerId,
          toTaxId: "344-990-213",
          items: saleDoc.items,
          subtotal: saleDoc.subtotal,
          vat: saleDoc.vatAmount,
          wht: saleDoc.withholdingTax,
          total: saleDoc.total,
          method: saleDoc.paymentMethod,
          status: saleDoc.status
        };
      case "purchase-invoice":
        const currentPurchases = purchaseInvoices.length > 0 ? purchaseInvoices : [
          { id: "PINV-2026-902", date: "2026-07-10", supplierId: "SUPP-001", supplierName: "مجموعة لينوفو الإقليمية لحلول التكنولوجيا", items: [{ sku: "ITEM-201", name: "شاشات حاسوبية فائقة الدقة 4K", quantity: 5, price: 3200, total: 16000 }], subtotal: 16000, vatAmount: 2240, withholdingTax: 80, total: 18160, status: "Paid", paymentMethod: "Check" }
        ];
        const purchDoc = currentPurchases.find(p => p.id === selectedDocId) || currentPurchases[0];
        return {
          title: "فاتورة مشتريات وتوريد بضائع",
          subTitle: "Tax Purchase Invoice",
          id: purchDoc.id,
          date: purchDoc.date,
          toName: purchDoc.supplierName,
          toId: purchDoc.supplierId,
          toTaxId: "112-455-900",
          items: purchDoc.items,
          subtotal: purchDoc.subtotal,
          vat: purchDoc.vatAmount,
          wht: purchDoc.withholdingTax,
          total: purchDoc.total,
          method: purchDoc.paymentMethod,
          status: purchDoc.status
        };
      case "journal-entry":
        const currentJournals = journalEntries.length > 0 ? journalEntries : [
          { id: "JV-2026-001", date: "2026-07-12", description: "إثبات سداد إيجار المكتب الإداري الرئيسي بالقاهرة نقداً", reference: "REF-REC-01", status: "Posted", costCenter: "CC-ADMIN", profitCenter: "PC-CAIRO", creator: "علي خضر", lines: [{ accountCode: "501001", accountName: "مصاريف إيجارات المكاتب", debit: 12000, credit: 0 }, { accountCode: "101001", accountName: "صندوق الخزينة الرئيسي", debit: 0, credit: 12000 }] }
        ];
        const jnlDoc = currentJournals.find(j => j.id === selectedDocId) || currentJournals[0];
        return {
          title: "سند قيد محاسبي معتمد",
          subTitle: "Journal Entry Voucher",
          id: jnlDoc.id,
          date: jnlDoc.date,
          toName: jnlDoc.creator,
          toId: jnlDoc.costCenter,
          toTaxId: jnlDoc.profitCenter,
          isJournal: true,
          description: jnlDoc.description,
          reference: jnlDoc.reference,
          lines: jnlDoc.lines,
          status: jnlDoc.status,
          total: jnlDoc.lines.reduce((acc, l) => acc + (l.debit || 0), 0)
        };
      case "payslip":
        const currentEmployees = employees.length > 0 ? employees : [
          { id: "EMP-01", name: "أحمد خضر خليل السكندري", role: "المدير المالي التنفيذي", department: "الإدارة المالية", baseSalary: 32000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" }
        ];
        const empDoc = currentEmployees.find(e => e.id === selectedDocId) || currentEmployees[0];
        const grossSalary = empDoc.baseSalary;
        const taxWithholding = Math.round(grossSalary * empDoc.withholdingTaxRate);
        const netSalary = grossSalary - taxWithholding;
        return {
          title: "بيان مرتبات وقسيمة صرف شهرية",
          subTitle: "Employee Monthly Payslip Voucher",
          id: empDoc.id,
          date: new Date().toISOString().slice(0, 7) + " (صرف مالي)",
          toName: empDoc.name,
          toId: empDoc.role,
          toTaxId: empDoc.department,
          isPayslip: true,
          attendance: empDoc.attendanceDays,
          taxRate: empDoc.withholdingTaxRate * 100,
          gross: grossSalary,
          tax: taxWithholding,
          total: netSalary,
          status: empDoc.status
        };
      case "trial-balance":
        return {
          title: "تقرير ميزان المراجعة والأرصدة المحاسبية",
          subTitle: "Trial Balance Statement",
          id: "TB-REPORT-" + new Date().getFullYear(),
          date: new Date().toISOString().slice(0, 10),
          toName: "الإدارة العامة للحسابات",
          toId: config.fiscalYear,
          toTaxId: config.branch,
          isTrialBalance: true,
          accountsList: accounts,
          totalDebit: accounts.reduce((sum, a) => sum + (a.type === "Asset" || a.type === "Expense" ? a.balance : 0), 0),
          totalCredit: accounts.reduce((sum, a) => sum + (a.type === "Liability" || a.type === "Equity" || a.type === "Revenue" ? a.balance : 0), 0),
          total: accounts.reduce((sum, a) => sum + a.balance, 0)
        };
    }
  };

  // Convert numbers to beautiful Arabic Tafqeet text
  const getArabicTafqeet = (num: number): string => {
    if (num === 0) return "صفر جنيه مصري";
    
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
    const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
    const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
    const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
    
    const readSegment = (n: number): string => {
      let parts = [];
      const h = Math.floor(n / 100);
      const rem = n % 100;
      
      if (h > 0) {
        parts.push(hundreds[h]);
      }
      
      if (rem > 0) {
        if (rem < 11) {
          parts.push(units[rem]);
        } else if (rem < 20) {
          parts.push(teens[rem - 10]);
        } else {
          const u = rem % 10;
          const t = Math.floor(rem / 10);
          if (u > 0) {
            parts.push(`${units[u]} و${tens[t]}`);
          } else {
            parts.push(tens[t]);
          }
        }
      }
      return parts.join(" و ");
    };

    let text = "";
    if (integerPart < 1000) {
      text = readSegment(integerPart);
    } else if (integerPart < 1000000) {
      const thousands = Math.floor(integerPart / 1000);
      const remainder = integerPart % 1000;
      const thWord = thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : thousands <= 10 ? `${readSegment(thousands)} آلاف` : `${readSegment(thousands)} ألفاً`;
      text = remainder > 0 ? `${thWord} و${readSegment(remainder)}` : thWord;
    } else {
      text = `${integerPart} جنيهاً`;
    }

    let currency = "جنيه مصري";
    if (config.currency === "SAR") currency = "ريال سعودي";
    else if (config.currency === "AED") currency = "درهم إماراتي";
    else if (config.currency === "USD") currency = "دولار أمريكي";

    let result = `فقط ${text} ${currency}`;
    if (decimalPart > 0) {
      result += ` و${decimalPart} قرشاً لا غير`;
    } else {
      result += " لا غير";
    }

    return result;
  };

  // Trigger A4 Document browser printing
  const handlePrintDocument = () => {
    const el = document.getElementById("printable-a4-invoice");
    if (!el) {
      alert("خطأ: تعذر العثور على منطقة الطباعة.");
      return;
    }
    
    el.classList.add("printable-area");
    window.print();
    el.classList.remove("printable-area");
  };

  const activeDoc = getDocumentForPrinting();

  return (
    <div className="space-y-6 text-right">
      
      {/* Upper Module header */}
      <div className="bg-[#101625]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-display font-black text-white">بوابة الاستيراد والتصدير وطباعة المستندات الشاملة</h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            نظام متكامل لمراجعة واختبار ترحيل البيانات من وإلى نظام <span className="font-mono text-emerald-400">ApexSaaS ERP</span>. يتيح لك تصدير واستيراد دليل الحسابات، الموردين، العملاء، الأصناف، وقيود اليومية والرواتب بنقرة واحدة مع تحليل فوري والتحقق من سلامة البنية ومحاكاة الطباعة الضريبية الرسمية A4.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto no-print">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">Ready & Integrated</span>
        </div>
      </div>

      {/* Main Mode Switch Tab bar */}
      <div className="flex border-b border-slate-800/60 pb-px gap-1 overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab("import-export")}
          className={`px-5 py-3 text-xs font-bold font-display transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "import-export" 
              ? "border-emerald-500 text-emerald-400 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          منصة الاستيراد والتصدير ومعالجة السجلات
        </button>
        <button
          onClick={() => setActiveTab("print-hub")}
          className={`px-5 py-3 text-xs font-bold font-display transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "print-hub" 
              ? "border-emerald-500 text-emerald-400 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Printer className="h-4 w-4" />
          بوابة المعاينة وطباعة المستندات (A4 Print Preview)
        </button>
      </div>

      {/* SUCCESS & ERROR MESSAGE OUTLETS */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn no-print">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">عملية ناجحة</p>
            <p className="leading-relaxed font-sans">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn no-print">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">تنبيه بالتحقق من البيانات</p>
            <p className="leading-relaxed font-sans">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* VIEW 1: IMPORT & EXPORT CENTER */}
      {activeTab === "import-export" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
          
          {/* Side Selector - Left Sidebar equivalent inside tab */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#101625]/85 border border-slate-800/80 rounded-xl p-4 shadow-lg">
              <h2 className="text-xs font-bold text-slate-300 mb-3 border-b border-slate-800/80 pb-2">أقسام وجداول البيانات القابلة للنقل</h2>
              <div className="space-y-1.5">
                {(["accounts", "customers", "suppliers", "stock", "journalEntries", "employees", "salesInvoices", "purchaseInvoices"] as CategoryType[]).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setParsedData([]);
                        setValidationResults([]);
                      }}
                      className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${
                        isActive 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/35" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"}`} />
                        <span>{getCategoryTitle(cat).split(" ")[0]} {getCategoryTitle(cat).split(" ")[1] || ""}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                        {cat === "accounts" && accounts.length}
                        {cat === "customers" && customers.length}
                        {cat === "suppliers" && suppliers.length}
                        {cat === "stock" && stock.length}
                        {cat === "journalEntries" && journalEntries.length}
                        {cat === "employees" && employees.length}
                        {cat === "salesInvoices" && salesInvoices.length}
                        {cat === "purchaseInvoices" && purchaseInvoices.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Helper Widget */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 leading-relaxed space-y-2.5">
              <p className="font-bold text-slate-200">💡 تعليمات هيكل الاستيراد:</p>
              <ul className="list-disc list-inside space-y-1.5 font-sans">
                <li>يقوم النظام بمطابقة أعمدة الـ CSV تلقائياً مع خواص الكود الداخلي.</li>
                <li>تنزيل النموذج يضمن لك تجنب أخطاء المطابقة.</li>
                <li>يتم الكشف عن المعرفات المكررة تلقائياً، وإجراء "تحديث" للصفوف المكررة و"إضافة" للجديدة.</li>
              </ul>
            </div>
          </div>

          {/* Core Transfer Work Area - Right side */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Category summary and Download section */}
            <div className="bg-[#101625]/85 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/35 rounded text-[10px] text-emerald-400 font-bold">نشط بالخادم</span>
                    <h2 className="text-sm font-bold text-slate-100">{getCategoryTitle(selectedCategory)}</h2>
                  </div>
                  <p className="text-xs text-slate-400">إجمالي السجلات الحالية في قاعدة البيانات المحلية: <span className="text-emerald-400 font-mono font-bold">{currentCategoryCount()}</span> سجل</p>
                </div>

                {/* Primary Export Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] border border-emerald-500/30 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-white animate-pulse" />
                    تصدير Excel (.xlsx) بالكامل
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    تصدير CSV بالكامل
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileJson className="h-3.5 w-3.5 text-orange-400" />
                    تصدير JSON بالكامل
                  </button>
                </div>
              </div>

              {/* Template Download & Copy area */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileDown className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                    نموذج وهيكل البيانات الجاهز للاختبار السريع (Template Sheets):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownloadExcelTemplate(true)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-[10px] font-extrabold rounded border border-emerald-500/35 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                      title="تحميل نموذج إكسيل فارغ وجاهز لتعبئة بياناتك مباشرة وإعادة الرفع"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                      تحميل نموذج إكسيل فارغ (.xlsx)
                    </button>
                    <button
                      onClick={() => handleDownloadExcelTemplate(false)}
                      className="px-3 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/25 text-cyan-300 text-[10px] font-extrabold rounded border border-cyan-500/25 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                      title="تحميل نموذج إكسيل محشو ببيانات وأصناف تجريبية استرشادية"
                    >
                      <FileDown className="h-3.5 w-3.5 text-cyan-400" />
                      تحميل نموذج إكسيل عينة (.xlsx)
                    </button>
                    <button
                      onClick={() => handleCopyText(getTemplates(selectedCategory).csv, "csv-tmpl")}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded border border-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      {isCopied === "csv-tmpl" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      نسخ نموذج CSV
                    </button>
                    <button
                      onClick={() => handleCopyText(getTemplates(selectedCategory).json, "json-tmpl")}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded border border-slate-700 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      {isCopied === "json-tmpl" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      نسخ نموذج JSON
                    </button>
                  </div>
                </div>
                
                {/* Visual view of the template */}
                <div className="bg-[#0b0f19] p-3 rounded border border-slate-800/90 font-mono text-[10px] text-slate-400 overflow-x-auto max-h-24 scrollbar-thin">
                  <pre className="text-right whitespace-pre">{getTemplates(selectedCategory).csv}</pre>
                </div>
              </div>

              {/* Dynamic Interactive Import wizard Form */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200">خطوة 2: معالج الاستيراد ورفع الملفات الجديد</h3>
                  
                  {/* Import method toggler */}
                  <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px]">
                    <button
                      onClick={() => setImportMethod("file")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer font-bold ${importMethod === "file" ? "bg-emerald-500/20 text-emerald-300 font-extrabold" : "text-slate-500"}`}
                    >
                      رفع ملف من الحاسوب
                    </button>
                    <button
                      onClick={() => setImportMethod("paste")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer font-bold ${importMethod === "paste" ? "bg-emerald-500/20 text-emerald-300 font-extrabold" : "text-slate-500"}`}
                    >
                      لصق نص مباشر
                    </button>
                  </div>
                </div>

                {importMethod === "file" ? (
                  /* File uploader component */
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/20 hover:bg-slate-950/50 p-6 rounded-xl transition-all cursor-pointer text-center space-y-2 group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv,.json"
                      className="hidden" 
                    />
                    <div className="mx-auto h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-all text-slate-400 group-hover:text-emerald-400">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">قم بسحب وإفلات ملف Excel (.xlsx) / CSV / JSON هنا، أو انقر للتصفح</p>
                    <p className="text-[10px] text-slate-500">يقبل ملفات إكسيل المباشرة (.xlsx, .xls) مع دعم لأسماء الأعمدة باللغة العربية أو الإنجليزية، أو ملفات CSV و JSON القياسية</p>
                  </div>
                ) : (
                  /* Pasted Text Area */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400">ألصق كود JSON أو CSV هنا مباشرة:</label>
                      <div className="flex gap-2">
                        <label className="inline-flex items-center text-[10px] text-slate-400 cursor-pointer">
                          <input 
                            type="radio" 
                            name="format" 
                            checked={pastedFormat === "json"} 
                            onChange={() => setPastedFormat("json")}
                            className="ml-1 accent-emerald-500" 
                          />
                          JSON
                        </label>
                        <label className="inline-flex items-center text-[10px] text-slate-400 cursor-pointer">
                          <input 
                            type="radio" 
                            name="format" 
                            checked={pastedFormat === "csv"} 
                            onChange={() => setPastedFormat("csv")}
                            className="ml-1 accent-emerald-500" 
                          />
                          CSV
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                      placeholder={pastedFormat === "json" ? "[\n  {\n    \"code\": \"101001\",\n    \"name\": \"الحساب التجريبي\"\n  }\n]" : "code,name\n101001,الحساب التجريبي"}
                      className="w-full h-32 bg-[#0b0f19] text-xs font-mono text-slate-300 p-3 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-left ltr"
                    />
                    <button
                      onClick={() => handleAnalyzeData()}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 transition-all text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      تحليل البيانات الملصقة ومعاينتها فوراً
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Table & Preview Area */}
            {parsedData.length > 0 && (
              <div className="bg-[#101625]/85 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-200">جدول مراجعة البيانات والتحقق الفوري قبل التثبيت</h3>
                    <p className="text-[10px] text-slate-400">إجمالي السجلات التي تم قراءتها: <span className="font-bold font-mono text-cyan-400">{parsedData.length}</span> صفوف. الرجاء مراجعة الملاحظات وتأكيد الإدراج بالأسفل.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setParsedData([]);
                      setValidationResults([]);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded text-[10px]"
                    title="تفريغ المعاينة"
                  >
                    إلغاء المعاينة
                  </button>
                </div>

                {/* Table container */}
                <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-800/80">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                        <th className="p-2.5 font-bold text-center">السطر</th>
                        <th className="p-2.5 font-bold">المعرف / المفتاح</th>
                        <th className="p-2.5 font-bold">الاسم / الوصف المكتشف</th>
                        <th className="p-2.5 font-bold">الحقول المصاحبة</th>
                        <th className="p-2.5 font-bold">حالة سلامة البنية بالخادم</th>
                        <th className="p-2.5 font-bold">ملاحظات و تنبيهات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                      {validationResults.map((res) => {
                        const keyVal = res.data.code || res.data.id || res.data.sku || "N/A";
                        const nameVal = res.data.name || res.data.description || "بلا اسم";
                        
                        return (
                          <tr key={res.row} className="hover:bg-slate-900/30">
                            <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">{res.row}</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-200 font-bold">{keyVal}</td>
                            <td className="p-2.5 font-medium text-slate-300">{nameVal}</td>
                            <td className="p-2.5 text-[10px] text-slate-400 font-mono">
                              {Object.entries(res.data)
                                .filter(([k]) => !["code", "id", "sku", "name", "description", "lines"].includes(k))
                                .map(([k, v]) => `${k}: ${typeof v === "object" ? "JSON" : v}`)
                                .join(" | ") || "لا توجد"}
                            </td>
                            <td className="p-2.5">
                              {res.status === "valid" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  سليم وجاهز
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                  خطأ حرج بالبنية
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-[10px]">
                              {res.errors.length === 0 ? (
                                <span className="text-slate-500">بنية مثالية لمطابقة المخطط</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {res.errors.map((err, errIdx) => (
                                    <p 
                                      key={errIdx} 
                                      className={err.startsWith("تنبيه:") ? "text-amber-400 font-sans" : "text-rose-400 font-bold font-sans"}
                                    >
                                      • {err}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Confirm Import Trigger */}
                <div className="pt-2 flex items-center justify-between bg-slate-900/30 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    💡 يرجى الملاحظة أن النقر على تأكيد الدمج سيقوم بالكتابة والتعديل الفوري على شجرة الحسابات والبيانات بالـ ERP.
                  </div>
                  <button
                    onClick={handleCommitImport}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 transition-all text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    تأكيد معالجة ودمج المستندات المستوردة مع قاعدة البيانات
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: HIGH-FIDELITY PRINTING HUB */}
      {activeTab === "print-hub" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls - Left side (no-print) */}
          <div className="lg:col-span-4 space-y-4 no-print">
            <div className="bg-[#101625]/85 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-400" />
                معالج وتخصيص طباعة المستندات
              </h3>

              {/* Document selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">اختر تصنيف المستند المراد مراجعته:</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSelectedDocType(val);
                    // Reset to first record if available
                    if (val === "sales-invoice") {
                      setSelectedDocId(salesInvoices[0]?.id || "INV-2026-001");
                    } else if (val === "purchase-invoice") {
                      setSelectedDocId(purchaseInvoices[0]?.id || "PINV-2026-902");
                    } else if (val === "journal-entry") {
                      setSelectedDocId(journalEntries[0]?.id || "JV-2026-001");
                    } else if (val === "payslip") {
                      setSelectedDocId(employees[0]?.id || "EMP-01");
                    } else {
                      setSelectedDocId("TRIAL-BALANCE-MAIN");
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="sales-invoice">فاتورة مبيعات عميل (Sales Invoice)</option>
                  <option value="purchase-invoice">فاتورة مشتريات وتوريد (Purchase Invoice)</option>
                  <option value="journal-entry">سند قيد محاسبي يومي (Journal Entry)</option>
                  <option value="payslip">قسيمة راتب شهري لموظف (Payslip)</option>
                  <option value="trial-balance">كشف ميزان المراجعة والأرصدة (Trial Balance)</option>
                </select>
              </div>

              {/* Record Selector */}
              {selectedDocType !== "trial-balance" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">اختر السند أو السجل من قاعدة البيانات الحالية:</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {selectedDocType === "sales-invoice" && (
                      salesInvoices.length > 0 ? (
                        salesInvoices.map(s => (
                          <option key={s.id} value={s.id}>{s.id} - {s.customerName} ({s.total} {config.currency})</option>
                        ))
                      ) : (
                        <option value="INV-2026-001">نموذج فاتورة مبيعات تجريبية (33,482.5 {config.currency})</option>
                      )
                    )}

                    {selectedDocType === "purchase-invoice" && (
                      purchaseInvoices.length > 0 ? (
                        purchaseInvoices.map(p => (
                          <option key={p.id} value={p.id}>{p.id} - {p.supplierName} ({p.total} {config.currency})</option>
                        ))
                      ) : (
                        <option value="PINV-2026-902">نموذج فاتورة توريد تجريبية (18,160.0 {config.currency})</option>
                      )
                    )}

                    {selectedDocType === "journal-entry" && (
                      journalEntries.length > 0 ? (
                        journalEntries.map(j => (
                          <option key={j.id} value={j.id}>{j.id} - {j.description.slice(0, 30)}...</option>
                        ))
                      ) : (
                        <option value="JV-2026-001">نموذج قيد يومية محاسبي تجريبي (12,000 {config.currency})</option>
                      )
                    )}

                    {selectedDocType === "payslip" && (
                      employees.length > 0 ? (
                        employees.map(e => (
                          <option key={e.id} value={e.id}>{e.id} - {e.name} (راتب: {e.baseSalary})</option>
                        ))
                      ) : (
                        <option value="EMP-01">أحمد خضر خليل السكندري (32,000 {config.currency})</option>
                      )
                    )}
                  </select>
                </div>
              )}

              {/* Print Preview Mode Styles Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400">مظهر شاشة المعاينة التفاعلية:</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setPrintTheme("dark-preview")}
                    className={`py-1.5 rounded-md cursor-pointer font-bold ${printTheme === "dark-preview" ? "bg-slate-800 text-slate-100" : "text-slate-500"}`}
                  >
                    مظلم لوحة التحكم
                  </button>
                  <button
                    onClick={() => setPrintTheme("classic-light")}
                    className={`py-1.5 rounded-md cursor-pointer font-bold ${printTheme === "classic-light" ? "bg-emerald-500/20 text-emerald-300 font-extrabold" : "text-slate-500"}`}
                  >
                    مطابق لورقة الطباعة (أبيض)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handlePrintDocument}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 transition-all text-slate-950 font-black rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer className="h-4 w-4 animate-bounce" />
                  أمر الطباعة الفورية للمستند (A4)
                </button>
                
                <button
                  onClick={() => {
                    setSuccessMsg("محاكاة: تم إرسال نسخة رقمية مشفرة لدفتر الأرشيف الضريبي ومعالجة ملف الـ PDF بنجاح!");
                    setTimeout(() => setSuccessMsg(""), 4000);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs border border-slate-700 cursor-pointer flex items-center justify-center gap-1 transition-all"
                >
                  تصدير المستند الحالي إلى PDF
                </button>
              </div>
            </div>

            {/* Print tips */}
            {typeof window !== "undefined" && window.self !== window.top && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400 space-y-2 leading-relaxed font-sans">
                <h4 className="font-bold">⚠️ تنبيه طباعة تجريبية:</h4>
                <p>
                  الطباعة المباشرة محجوبة حالياً بواسطة المتصفح بسبب تشغيل النظام داخل إطار تجريبي مدمج (Iframe Sandbox). 
                </p>
                <p className="font-bold">
                  💡 الحل السريع: يرجى الضغط على زر "فتح في نافذة جديدة" (Open in new tab) بأعلى يمين أو يسار شاشة المعاينة، لتتمكن من الطباعة والتصدير لـ PDF فوراً وبنجاح 100%!
                </p>
              </div>
            )}

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2 leading-relaxed">
              <h4 className="font-bold text-slate-300">💡 إرشادات طباعة التقارير المحاسبية:</h4>
              <p className="font-sans">
                عند ظهور نافذة الطباعة الخاصة بمتصفح الإنترنت (Google Chrome/Edge/Firefox)، يوصى بضبط الإعدادات التالية للحصول على مظهر ممتاز:
              </p>
              <ul className="list-disc list-inside space-y-1 font-sans">
                <li>الاتجاه (Layout): رأسي (Portrait)</li>
                <li>حجم الورق: A4</li>
                <li>الهوامش (Margins): بلا أو افتراضي</li>
                <li>تفعيل خيار <b>"رسومات الخلفية" (Background Graphics)</b> لإظهار ترويسة الجداول والألوان.</li>
              </ul>
            </div>
          </div>

          {/* Real simulated Printable A4 Paper - Right side (becomes .printable-area on print) */}
          <div className="lg:col-span-8 flex justify-center">
            
            <div 
              id="printable-a4-invoice"
              className={`w-full max-w-[210mm] min-h-[297mm] rounded-xl shadow-2xl p-8 border transition-all text-right ${
                printTheme === "classic-light" 
                  ? "bg-white text-slate-950 border-slate-300" 
                  : "bg-[#101625]/85 text-slate-200 border-slate-800/80"
              }`}
            >
              {/* Document Header Area */}
              <div className="flex items-start justify-between border-b pb-6 border-slate-200/80 print:border-slate-300">
                
                {/* Right side: Company Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 font-black text-lg shadow-inner shrink-0">
                      AP
                    </div>
                    <div>
                      <h2 className="text-base font-display font-black tracking-tight">{config.company || "شركة قمة الشام والرافدين المحدودة"}</h2>
                      <p className="text-[10px] text-slate-500 font-sans">أنظمة تخطيط الموارد الشاملة الذكية | ApexSaaS ERP Core</p>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-500 font-sans space-y-0.5 pt-1.5">
                    <p><b>الفرع النشط:</b> {config.branch || "الإدارة العامة بالقاهرة (شيراتون)"}</p>
                    <p><b>المستودع الرئيسي:</b> {config.warehouse || "المخزن رقم 1 مرکزی"}</p>
                    <p><b>السنة المالية الحالية:</b> {config.fiscalYear || "FY 2026/2027"}</p>
                    <p><b>الرقم الضريبي الموحد (VAT ID):</b> 311-544-902-EG</p>
                  </div>
                </div>

                {/* Left side: System verification stamp */}
                <div className="text-left space-y-2">
                  <div className="inline-block border border-dashed p-1 px-3 border-emerald-500 text-emerald-500 rounded text-[9px] font-mono font-bold tracking-wider">
                    E-INVOICING CERTIFIED
                  </div>
                  <div className="text-[10.5px] text-slate-500 font-sans space-y-1">
                    <p><b>التاريخ:</b> {activeDoc.date}</p>
                    <p><b>الرقم المرجعي:</b> <span className="font-mono font-bold text-slate-400 print:text-black">{activeDoc.id}</span></p>
                    <p><b>نوع المستند:</b> <span className="font-bold text-emerald-400 print:text-black">{activeDoc.title}</span></p>
                  </div>
                </div>
              </div>

              {/* Centered Document Title */}
              <div className="my-6 text-center space-y-1">
                <h1 className="text-lg font-display font-black tracking-wide border-b-2 border-slate-200/50 pb-2 inline-block px-10 print:text-black">
                  {activeDoc.title}
                </h1>
                <p className="text-[9.5px] font-mono text-slate-500 uppercase tracking-widest">{activeDoc.subTitle}</p>
              </div>

              {/* Sub-Header / Client Details or Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/30 p-4 rounded-lg border border-slate-800/60 mb-6 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                <div className="space-y-1.5 text-xs">
                  {activeDoc.isTrialBalance ? (
                    <>
                      <p className="text-slate-500 font-bold">معلومات نطاق التقرير المحاسبي:</p>
                      <p><b>المجموعة المالية:</b> {activeDoc.toName}</p>
                      <p><b>الفترة المستهدفة:</b> {activeDoc.toId}</p>
                      <p><b>جهة الإصدار المعتمدة:</b> {activeDoc.toTaxId}</p>
                    </>
                  ) : activeDoc.isPayslip ? (
                    <>
                      <p className="text-slate-500 font-bold">بيانات استحقاق الموظف:</p>
                      <p><b>اسم الموظف بالكامل:</b> {activeDoc.toName}</p>
                      <p><b>المسمى الوظيفي والدرجة:</b> {activeDoc.toId}</p>
                      <p><b>الإدارة التابع لها:</b> {activeDoc.toTaxId}</p>
                    </>
                  ) : activeDoc.isJournal ? (
                    <>
                      <p className="text-slate-500 font-bold">تفاصيل مرجع القيد اليومي:</p>
                      <p><b>بيان شرح السند:</b> {activeDoc.description}</p>
                      <p><b>السند المحاسبي:</b> {activeDoc.reference}</p>
                      <p><b>حرر بواسطة المحاسب:</b> {activeDoc.toName}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 font-bold">صرف واستحقاق إلى / من الطرف الآخر:</p>
                      <p><b>اسم العميل / المورد:</b> {activeDoc.toName}</p>
                      <p><b>الرقم الضريبي للجهة:</b> {activeDoc.toTaxId}</p>
                      <p><b>كود الحساب في الدفتر:</b> {activeDoc.toId}</p>
                    </>
                  )}
                </div>

                <div className="space-y-1 text-xs text-left md:text-left self-end">
                  <p><b>الحالة التشغيلية:</b> <span className="font-bold text-emerald-400 print:text-black">{activeDoc.status || "Posted / معتمد"}</span></p>
                  {!activeDoc.isTrialBalance && !activeDoc.isJournal && !activeDoc.isPayslip && (
                    <p><b>طريقة الدفع والتسوية:</b> {activeDoc.method || "حساب جار بالبنك"}</p>
                  )}
                  <p><b>العملة المطبقة:</b> {config.currency || "EGP"}</p>
                </div>
              </div>

              {/* Table details (Conditional based on doc type) */}
              <div className="mb-6">
                
                {/* 1. Trial Balance Specific Table */}
                {activeDoc.isTrialBalance && (
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 print:bg-slate-100 text-slate-200 print:text-black border-b border-slate-300">
                        <th className="p-2 border-l border-slate-300">رقم الحساب</th>
                        <th className="p-2 border-l border-slate-300">اسم الحساب العام في الدليل</th>
                        <th className="p-2 border-l border-slate-300 text-center">نوع الحساب</th>
                        <th className="p-2 border-l border-slate-300 text-left">رصيد مدين ({config.currency})</th>
                        <th className="p-2 text-left">رصيد دائن ({config.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDoc.accountsList?.map((acc: any) => {
                        const isDebit = acc.type === "Asset" || acc.type === "Expense";
                        return (
                          <tr key={acc.code} className="hover:bg-slate-100/35">
                            <td className="p-2 font-mono border-l border-slate-200">{acc.code}</td>
                            <td className="p-2 font-bold border-l border-slate-200">{acc.name}</td>
                            <td className="p-2 text-center border-l border-slate-200">{acc.type}</td>
                            <td className="p-2 font-mono text-left border-l border-slate-200">{isDebit ? acc.balance.toLocaleString() : "0.00"}</td>
                            <td className="p-2 font-mono text-left">{!isDebit ? acc.balance.toLocaleString() : "0.00"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* 2. Journal Entry Specific Table */}
                {activeDoc.isJournal && (
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 print:bg-slate-100 text-slate-200 print:text-black border-b border-slate-300">
                        <th className="p-2 border-l border-slate-300">كود الحساب المدين / الدائن</th>
                        <th className="p-2 border-l border-slate-300">اسم الحساب المحاسبي</th>
                        <th className="p-2 border-l border-slate-300 text-left">الجانب المدين (Debit)</th>
                        <th className="p-2 text-left">الجانب الدائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDoc.lines?.map((line: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/35">
                          <td className="p-2 font-mono border-l border-slate-200">{line.accountCode}</td>
                          <td className="p-2 font-bold border-l border-slate-200">{line.accountName}</td>
                          <td className="p-2 font-mono text-left border-l border-slate-200">{line.debit > 0 ? line.debit.toLocaleString() : "-"}</td>
                          <td className="p-2 font-mono text-left">{line.credit > 0 ? line.credit.toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. Employee Salary Payslip Specific Table */}
                {activeDoc.isPayslip && (
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 print:bg-slate-100 text-slate-200 print:text-black border-b border-slate-300">
                        <th className="p-2 border-l border-slate-300">بند الاستحقاق المالي</th>
                        <th className="p-2 border-l border-slate-300 text-left">الاستحقاقات المدفوعة (+)</th>
                        <th className="p-2 border-l border-slate-300">بند الاستقطاع الضريبي</th>
                        <th className="p-2 text-left">الاستقطاعات والضرائب (-)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-l border-slate-200 font-bold">الراتب الأساسي الشهرى</td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">{activeDoc.gross?.toLocaleString()} {config.currency}</td>
                        <td className="p-2 border-l border-slate-200 font-bold">ضريبة كسب العمل المستقطعة ({activeDoc.taxRate}%)</td>
                        <td className="p-2 font-mono text-left text-rose-500">{activeDoc.tax?.toLocaleString()} {config.currency}</td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td className="p-2 border-l border-slate-200">أيام حضور فعلية ({activeDoc.attendance}/30)</td>
                        <td className="p-2 font-mono text-left border-l border-slate-200">مكتمل</td>
                        <td className="p-2 border-l border-slate-200">مجموع استقطاعات التأمين الاجتماعي</td>
                        <td className="p-2 font-mono text-left text-slate-500">-</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 4. Normal Sales/Purchase Invoice Specific Table */}
                {!activeDoc.isTrialBalance && !activeDoc.isJournal && !activeDoc.isPayslip && (
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 print:bg-slate-100 text-slate-200 print:text-black border-b border-slate-300">
                        <th className="p-2 border-l border-slate-300 text-center">م</th>
                        <th className="p-2 border-l border-slate-300">كود الصنف (SKU)</th>
                        <th className="p-2 border-l border-slate-300">بيان الصنف والمواصفات الفنية</th>
                        <th className="p-2 border-l border-slate-300 text-center">الكمية</th>
                        <th className="p-2 border-l border-slate-300 text-left">سعر الوحدة</th>
                        <th className="p-2 text-left">الإجمالي الصافي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeDoc.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100/35">
                          <td className="p-2 text-center border-l border-slate-200 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-2 font-mono border-l border-slate-200">{item.sku}</td>
                          <td className="p-2 font-bold border-l border-slate-200">{item.name}</td>
                          <td className="p-2 text-center border-l border-slate-200 font-mono">{item.quantity}</td>
                          <td className="p-2 font-mono text-left border-l border-slate-200">{item.price.toLocaleString()}</td>
                          <td className="p-2 font-mono text-left">{item.total ? item.total.toLocaleString() : (item.quantity * item.price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Financial Summary & VAT Calculations block */}
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                
                {/* Right block: Tafqeet written numbers */}
                <div className="flex-1 p-4 rounded-lg bg-slate-900/10 border border-dashed border-slate-300/60 flex items-center justify-center text-xs font-bold font-sans">
                  {getArabicTafqeet(activeDoc.total || 0)}
                </div>

                {/* Left block: Totals summary breakdown */}
                <div className="w-full md:w-80 space-y-1.5 text-xs">
                  {activeDoc.subtotal !== undefined && (
                    <div className="flex items-center justify-between border-b pb-1 border-slate-200/50">
                      <span className="text-slate-500">مجموع المبالغ الخاضعة للضريبة:</span>
                      <span className="font-mono font-bold">{activeDoc.subtotal.toLocaleString()} {config.currency}</span>
                    </div>
                  )}
                  {activeDoc.vat !== undefined && (
                    <div className="flex items-center justify-between border-b pb-1 border-slate-200/50">
                      <span className="text-slate-500">ضريبة القيمة المضافة المضافة (14%):</span>
                      <span className="font-mono font-bold text-emerald-400 print:text-black">+{activeDoc.vat.toLocaleString()} {config.currency}</span>
                    </div>
                  )}
                  {activeDoc.wht !== undefined && (
                    <div className="flex items-center justify-between border-b pb-1 border-slate-200/50">
                      <span className="text-slate-500">خصم ضريبة كسب العمل / أ.ت.ص (0.5%):</span>
                      <span className="font-mono font-bold text-rose-400 print:text-black">-{activeDoc.wht.toLocaleString()} {config.currency}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-slate-900/30 p-2 rounded border border-slate-300 print:bg-slate-100 text-sm font-bold">
                    <span>الصافي الإجمالي النهائي للمستند:</span>
                    <span className="font-mono font-black text-cyan-400 print:text-slate-950">{(activeDoc.total || 0).toLocaleString()} {config.currency}</span>
                  </div>
                </div>
              </div>

              {/* Official Seal and Signatures footer section */}
              <div className="grid grid-cols-3 gap-4 text-center mt-12 text-xs pt-4 border-t border-slate-200/80">
                <div className="space-y-12">
                  <p className="text-slate-500 font-bold">توقيع المحاسب المسئول</p>
                  <p className="font-sans font-medium text-slate-400">..............................</p>
                </div>
                
                {/* System Seal circle vector decoration */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-full border-2 border-emerald-500/40 border-dashed flex items-center justify-center p-1.5 shrink-0 opacity-80 select-none">
                    <div className="h-full w-full rounded-full border border-emerald-500/20 flex flex-col items-center justify-center text-[6.5px] font-mono leading-none text-emerald-400 font-black">
                      <p>APEX ERP</p>
                      <p className="my-0.5">★ ★ ★</p>
                      <p>SEAL STAMP</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">ختم المنظومة الإلكتروني المعتمد</p>
                </div>

                <div className="space-y-12">
                  <p className="text-slate-500 font-bold">المدير العام المعتمد للمنشأة</p>
                  <p className="font-sans font-medium text-slate-400">..............................</p>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="mt-10 text-center text-[9.5px] text-slate-500 font-sans leading-relaxed pt-2 border-t border-slate-200/50 print:border-slate-300">
                <p>تم تحرير وطباعة هذا السند المالي بشكل آلي عبر خادم نظام ApexSaaS ERP المعتمد للربط الحكومي والفوترة الضريبية الإلكترونية.</p>
                <p>أي قشط أو تعديل يدوي في محتويات هذا السند يجعله ملغياً تماماً من الدفاتر المحاسبية الرسمية.</p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
