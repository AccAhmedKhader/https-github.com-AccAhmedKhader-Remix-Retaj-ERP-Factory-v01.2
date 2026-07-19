import { ChartOfAccount, Employee, Warehouse, StockItem, CostCenter, ProfitCenter, BillOfMaterials, JournalEntry, Customer, Supplier, PurchaseInvoice, SalesInvoice } from "./types";

export const INITIAL_ACCOUNTS: ChartOfAccount[] = [
  { code: "10100", name: "بنك CIB - الحساب الجاري بالجنيه المصري", type: "Asset", balance: 5318800, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
  { code: "10200", name: "بنك ADIB - حساب فرع الإمارات بالدرهم", type: "Asset", balance: 0, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
  { code: "10300", name: "النقدية بالخزينة الرئيسية", type: "Asset", balance: 0, initialBalance: 0, classification: "نقدية بالصندوق والبنوك" },
  { code: "11000", name: "العملاء (أوراق القبض والذمم التجارية)", type: "Asset", balance: 1708000, initialBalance: 0, classification: "المدينون والذمم المدينة الأخرى" },
  { code: "12000", name: "مخزون المواد الخام (مستودع القاهرة)", type: "Asset", balance: 1480000, initialBalance: 0, classification: "الأصول المتداولة - المخزون" },
  { code: "12100", name: "مخزون السلع التامة (مستودع الإسكندرية)", type: "Asset", balance: 0, initialBalance: 0, classification: "الأصول المتداولة - المخزون" },
  { code: "20100", name: "الموردون (أوراق الدفع والذمم الدائنة)", type: "Liability", balance: 498000, initialBalance: 0, classification: "الدائنون والذمم الدائنة الأخرى" },
  { code: "22000", name: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", type: "Liability", balance: 616000, initialBalance: 0, classification: "التزامات ضريبية ومستحقات حكومية" },
  { code: "22100", name: "التزامات ضريبة الخصم والإضافة (نموذج 41)", type: "Liability", balance: 0, initialBalance: 0, classification: "التزامات ضريبية ومستحقات حكومية" },
  { code: "30100", name: "رأس المال المدفوع", type: "Equity", balance: 5000000, initialBalance: 0, classification: "رأس المال المساهم" },
  { code: "30200", name: "الأرباح المحتجزة", type: "Equity", balance: 0, initialBalance: 0, classification: "الأرباح والاحتياطيات" },
  { code: "40100", name: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", type: "Revenue", balance: 4400000, initialBalance: 0, classification: "إيرادات النشاط التشغيلي الرئيسي" },
  { code: "40200", name: "خدمات الاستشارات والتخصيص الفني", type: "Revenue", balance: 0, initialBalance: 0, classification: "إيرادات الخدمات الفنية" },
  { code: "50100", name: "مصروفات الرواتب ومزايا الموظفين", type: "Expense", balance: 1200000, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
  { code: "50200", name: "مصروفات البنية التحتية للخوادم والسحابة", type: "Expense", balance: 450000, initialBalance: 0, classification: "تكلفة الخدمة المستضافة" },
  { code: "50300", name: "مصروفات ضريبة القيمة المضافة المسددة", type: "Expense", balance: 207200, initialBalance: 0, classification: "مصروفات حكومية وضريبية" },
  { code: "50400", name: "المصروفات العمومية والإدارية", type: "Expense", balance: 150000, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
  { code: "50410", name: "مصروفات أدوات كتابية ومطبوعات", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
  { code: "50420", name: "مصروفات انتقال وبنزين وضيافة", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" },
  { code: "50430", name: "مصروفات إيجار ومرافق المقر الرئيسي", type: "Expense", balance: 0, initialBalance: 0, classification: "مصروفات تشغيلية وإدارية" }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: "EMP-01", name: "صالح محمود", role: "CFO", department: "Accounting", baseSalary: 50000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" },
  { id: "EMP-02", name: "هدى عبد الرحمن", role: "HR Manager", department: "HR", baseSalary: 35000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" },
  { id: "EMP-03", name: "سامر البرغوثي", role: "Tech Lead", department: "IT", baseSalary: 45000, attendanceDays: 30, withholdingTaxRate: 0.15, vatRate: 0.14, status: "Active" }
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: "WH-CAI-01", name: "مستودع القاهرة المركزي الرئيسي", location: "القاهرة, مصر" },
  { id: "WH-ALX-02", name: "محطة الإسكندرية اللوجستية", location: "الإسكندرية, مصر" }
];

export const INITIAL_STOCK: StockItem[] = [
  { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", warehouseId: "WH-CAI-01", quantity: 200, unitPrice: 2000, minLevel: 10, category: "Raw Materials" },
  { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", warehouseId: "WH-ALX-02", quantity: 100, unitPrice: 5000, minLevel: 5, category: "Finished Products" }
];

export const INITIAL_COST_CENTERS: CostCenter[] = [
  { id: "CC-RND", name: "مركز أبحاث وتطوير نظم التشغيل", spent: 0, budget: 1500000 },
  { id: "CC-OPS", name: "إدارة العمليات والخدمات اللوجستية", spent: 0, budget: 1000000 },
  { id: "CC-TAX", name: "إدارة التسويات الضريبية", spent: 0, budget: 500000 }
];

export const INITIAL_PROFIT_CENTERS: ProfitCenter[] = [
  { id: "PC-SFT", name: "إيرادات تراخيص البرمجيات السحابية", actual: 1000000, target: 5000000 },
  { id: "PC-CNS", name: "إيرادات الاستشارات التقنية والتنفيذ", actual: 0, target: 2000000 }
];

export const INITIAL_BOMS: BillOfMaterials[] = [
  { id: "BOM-SFT-01", productSku: "STOCK-SFT-01", productName: "تجميع الخوادم الفائقة", components: [{ sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantityRequired: 2 }], laborCost: 500 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: "CUST-SHERIF", name: "مجموعة الشريف للاتصالات", taxRegistrationNumber: "123-456-789", phone: "0100123456", email: "info@sherif-telecom.com", balance: 340000 },
  { id: "CUST-NILE", name: "بنك النيل الاستثماري", taxRegistrationNumber: "987-654-321", phone: "0225112233", email: "corporate@nilebank.eg", balance: 1368000 }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "SUPP-MANSOUR", name: "المنصور للالكترونيات", taxRegistrationNumber: "111-222-333", phone: "0122987654", email: "sales@mansour-electronics.com", balance: 498000 },
  { id: "SUPP-SISCO", name: "سيسكو الشرق الأوسط", taxRegistrationNumber: "444-555-666", phone: "0229911223", email: "emea@cisco.com", balance: 0 }
];

export const INITIAL_PURCHASE_INVOICES: PurchaseInvoice[] = [
  {
    id: "INV-PRC-000",
    date: "2025-07-15",
    supplierId: "SUPP-SISCO",
    supplierName: "سيسكو الشرق الأوسط",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 100, price: 2000, total: 200000 }
    ],
    subtotal: 200000,
    vatAmount: 28000,
    withholdingTax: 0,
    total: 228000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-PRC-001",
    date: "2025-08-12",
    supplierId: "SUPP-MANSOUR",
    supplierName: "المنصور للالكترونيات",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 200, price: 2000, total: 400000 }
    ],
    subtotal: 400000,
    vatAmount: 56000,
    withholdingTax: 0,
    total: 456000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-PRC-002",
    date: "2025-09-10",
    supplierId: "SUPP-SISCO",
    supplierName: "سيسكو الشرق الأوسط",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 75, price: 2000, total: 150000 }
    ],
    subtotal: 150000,
    vatAmount: 21000,
    withholdingTax: 0,
    total: 171000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-PRC-003",
    date: "2025-10-15",
    supplierId: "SUPP-MANSOUR",
    supplierName: "المنصور للالكترونيات",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 90, price: 2000, total: 180000 }
    ],
    subtotal: 180000,
    vatAmount: 25200,
    withholdingTax: 0,
    total: 205200,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-PRC-004",
    date: "2025-11-18",
    supplierId: "SUPP-SISCO",
    supplierName: "سيسكو الشرق الأوسط",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 125, price: 2000, total: 250000 }
    ],
    subtotal: 250000,
    vatAmount: 35000,
    withholdingTax: 0,
    total: 285000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-PRC-005",
    date: "2025-12-12",
    supplierId: "SUPP-MANSOUR",
    supplierName: "المنصور للالكترونيات",
    items: [
      { sku: "STOCK-RAW-01", name: "مكونات خوادم ولوحات أم", quantity: 150, price: 2000, total: 300000 }
    ],
    subtotal: 300000,
    vatAmount: 42000,
    withholdingTax: 0,
    total: 342000,
    status: "Unpaid",
    paymentMethod: "Bank"
  }
];

export const INITIAL_SALES_INVOICES: SalesInvoice[] = [
  {
    id: "INV-SLS-000",
    date: "2025-07-20",
    customerId: "CUST-NILE",
    customerName: "بنك النيل الاستثماري",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 100, price: 5000, total: 500000 }
    ],
    subtotal: 500000,
    vatAmount: 70000,
    withholdingTax: 0,
    total: 570000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-SLS-002",
    date: "2025-08-25",
    customerId: "CUST-SHERIF",
    customerName: "مجموعة الشريف للاتصالات",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 60, price: 5000, total: 300000 }
    ],
    subtotal: 300000,
    vatAmount: 42000,
    withholdingTax: 0,
    total: 342000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-SLS-001",
    date: "2025-09-15",
    customerId: "CUST-SHERIF",
    customerName: "مجموعة الشريف للاتصالات",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 200, price: 5000, total: 1000000 }
    ],
    subtotal: 1000000,
    vatAmount: 140000,
    withholdingTax: 0,
    total: 1140000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-SLS-003",
    date: "2025-10-22",
    customerId: "CUST-NILE",
    customerName: "بنك النيل الاستثماري",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 120, price: 5000, total: 600000 }
    ],
    subtotal: 600000,
    vatAmount: 84000,
    withholdingTax: 0,
    total: 684000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-SLS-004",
    date: "2025-11-25",
    customerId: "CUST-SHERIF",
    customerName: "مجموعة الشريف للاتصالات",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 160, price: 5000, total: 800000 }
    ],
    subtotal: 800000,
    vatAmount: 112000,
    withholdingTax: 0,
    total: 912000,
    status: "Paid",
    paymentMethod: "Bank"
  },
  {
    id: "INV-SLS-005",
    date: "2025-12-20",
    customerId: "CUST-NILE",
    customerName: "بنك النيل الاستثماري",
    items: [
      { sku: "STOCK-SFT-01", name: "تراخيص نظام تشغيل السحاب", quantity: 240, price: 5000, total: 1200000 }
    ],
    subtotal: 1200000,
    vatAmount: 168000,
    withholdingTax: 0,
    total: 1368000,
    status: "Unpaid",
    paymentMethod: "Bank"
  }
];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "JE-009",
    date: "2026-01-10",
    description: "قيد تسويات مصروفات عمومية وإدارية أخرى للمقر الرئيسي",
    reference: "OP-EXP-2026",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "50400", accountName: "المصروفات العمومية والإدارية", debit: 30000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 30000 }
    ]
  },
  {
    id: "JE-008c",
    date: "2025-12-20",
    description: "إثبات فاتورة مبيعات تراخيص برمجيات لبنك النيل الاستثماري (غير مسددة)",
    reference: "SLS-2025-006",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 1368000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 1200000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 168000 }
    ]
  },
  {
    id: "JE-008b",
    date: "2025-12-12",
    description: "إثبات فاتورة مشتريات مواد خام من المنصور للإلكترونيات (غير مسددة)",
    reference: "PRC-2025-006",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 300000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 42000, credit: 0 },
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 342000 }
    ]
  },
  {
    id: "JE-008",
    date: "2025-12-15",
    description: "سداد مصروفات تشغيل خوادم وسحابة الشركة لشهر ديسمبر",
    reference: "CLOUD-2025",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "50200", accountName: "مصروفات البنية التحتية للخوادم والسحابة", debit: 450000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 450000 }
    ]
  },
  {
    id: "JE-007e",
    date: "2025-11-25",
    description: "تحصيل قيمة فاتورة مبيعات مجموعة الشريف للاتصالات للحساب الجاري",
    reference: "COLL-SHERIF-NOV",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 912000, credit: 0 },
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 912000 }
    ]
  },
  {
    id: "JE-007d",
    date: "2025-11-25",
    description: "إثبات فاتورة مبيعات تراخيص برمجيات لمجموعة الشريف للاتصالات",
    reference: "SLS-2025-005",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 912000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 800000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 112000 }
    ]
  },
  {
    id: "JE-007c",
    date: "2025-11-18",
    description: "سداد فاتورة مشتريات سيسكو الشرق الأوسط من الحساب الجاري",
    reference: "PMT-SISCO-NOV",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 285000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 285000 }
    ]
  },
  {
    id: "JE-007b",
    date: "2025-11-18",
    description: "إثبات فاتورة مشتريات مواد خام من سيسكو الشرق الأوسط",
    reference: "PRC-2025-005",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 250000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 35000, credit: 0 },
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 285000 }
    ]
  },
  {
    id: "JE-007",
    date: "2025-11-30",
    description: "سداد مصروفات رواتب الموظفين التشغيلية لشهر نوفمبر",
    reference: "SAL-2025",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "50100", accountName: "مصروفات الرواتب ومزايا الموظفين", debit: 1200000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 1200000 }
    ]
  },
  {
    id: "JE-006e",
    date: "2025-10-22",
    description: "تحصيل فاتورة مبيعات بنك النيل الاستثماري بالحساب الجاري",
    reference: "COLL-NILE-OCT",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 684000, credit: 0 },
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 684000 }
    ]
  },
  {
    id: "JE-006d",
    date: "2025-10-22",
    description: "إثبات فاتورة مبيعات تراخيص برمجيات لبنك النيل الاستثماري",
    reference: "SLS-2025-004",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 684000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 600000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 84000 }
    ]
  },
  {
    id: "JE-006c",
    date: "2025-10-15",
    description: "سداد فاتورة مشتريات المنصور للإلكترونيات بالحساب الجاري",
    reference: "PMT-MANSOUR-OCT",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 205200, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 205200 }
    ]
  },
  {
    id: "JE-006b",
    date: "2025-10-15",
    description: "إثبات فاتورة مشتريات مواد خام من المنصور للإلكترونيات",
    reference: "PRC-2025-004",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 180000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 25200, credit: 0 },
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 205200 }
    ]
  },
  {
    id: "JE-006",
    date: "2025-10-01",
    description: "تحصيل دفعة بشيك من مجموعة الشريف للاتصالات وإيداعها بالحساب الجاري",
    reference: "COLL-CUST-01",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 800000, credit: 0 },
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 800000 }
    ]
  },
  {
    id: "JE-005b",
    date: "2025-09-10",
    description: "سداد فاتورة مشتريات سيسكو الشرق الأوسط من الحساب الجاري",
    reference: "PMT-SISCO-SEP",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 171000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 171000 }
    ]
  },
  {
    id: "JE-005a",
    date: "2025-09-10",
    description: "إثبات فاتورة مشتريات مواد خام من سيسكو الشرق الأوسط",
    reference: "PRC-2025-003",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 150000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 21000, credit: 0 },
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 171000 }
    ]
  },
  {
    id: "JE-005",
    date: "2025-09-15",
    description: "إثبات فاتورة مبيعات تراخيص برمجيات لمجموعة الشريف للاتصالات",
    reference: "SLS-2025-001",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 1140000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 1000000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 140000 }
    ]
  },
  {
    id: "JE-004c",
    date: "2025-08-25",
    description: "تحصيل قيمة مبيعات مجموعة الشريف للاتصالات بالحساب الجاري",
    reference: "COLL-SHERIF-AUG",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 342000, credit: 0 },
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: 342000 }
    ]
  },
  {
    id: "JE-004b",
    date: "2025-08-25",
    description: "إثبات فاتورة مبيعات تراخيص لمجموعة الشريف للاتصالات",
    reference: "SLS-2025-003",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 342000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 300000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 42000 }
    ]
  },
  {
    id: "JE-004",
    date: "2025-08-20",
    description: "سداد دفعة للمورد المنصور للالكترونيات بالحساب الجاري",
    reference: "PMT-SUPP-01",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 300000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 300000 }
    ]
  },
  {
    id: "JE-003",
    date: "2025-08-12",
    description: "إثبات فاتورة مشتريات مواد خام من المورد المنصور للالكترونيات",
    reference: "PRC-2025-001",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 400000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 56000, credit: 0 },
      { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: 0, credit: 456000 }
    ]
  },
  {
    id: "JE-003b",
    date: "2025-07-20",
    description: "إثبات فاتورة مبيعات برمجيات وسدادها فوراً لبنك النيل الاستثماري",
    reference: "SLS-2025-002",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 570000, credit: 0 },
      { accountCode: "40100", accountName: "إيرادات مبيعات تراخيص البرمجيات للمؤسسات", debit: 0, credit: 500000 },
      { accountCode: "22000", accountName: "مصلحة الضرائب المصرية - ضريبة القيمة المضافة المستحقة (14%)", debit: 0, credit: 70000 }
    ]
  },
  {
    id: "JE-003a",
    date: "2025-07-15",
    description: "إثبات فاتورة مشتريات سحابية من سيسكو الشرق الأوسط وسدادها بالكامل",
    reference: "PRC-2025-002",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 200000, credit: 0 },
      { accountCode: "50300", accountName: "مصروفات ضريبة القيمة المضافة المسددة", debit: 28000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 228000 }
    ]
  },
  {
    id: "JE-002",
    date: "2025-07-05",
    description: "شراء وتجهيز خوادم ومعدات المقر التشغيلي بالقاهرة",
    reference: "FA-ACQ-2025",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "50400", accountName: "المصروفات العمومية والإدارية", debit: 120000, credit: 0 },
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 0, credit: 120000 }
    ]
  },
  {
    id: "JE-001",
    date: "2025-07-01",
    description: "قيد إثبات رأس المال المدفوع وتأسيس النشاط وإيداع البنك الرئيسي",
    reference: "INIT-CAPITAL",
    status: "Posted",
    costCenter: "CC-OPS",
    profitCenter: "PC-SFT",
    creator: "أحمد خضر",
    approvedBy: "أحلام سلطان",
    lines: [
      { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: 5000000, credit: 0 },
      { accountCode: "30100", accountName: "رأس المال المدفوع", debit: 0, credit: 5000000 }
    ]
  }
];
