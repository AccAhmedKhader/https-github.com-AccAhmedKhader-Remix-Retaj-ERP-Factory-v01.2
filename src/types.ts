export interface ERPConfig {
  company: string;
  branch: string;
  warehouse: string;
  fiscalYear: string;
  currency: string;
  language: string;
  theme?: "emerald" | "blue" | "purple" | "amber" | "rose" | "midnight" | "cyberpunk" | "forest";
  mode?: "light" | "dark";
  activeRole?: string;
  enableRlsTenant?: boolean;
  enableRlsBranch?: boolean;
  enableRlsWarehouse?: boolean;
  approvalThreshold?: number;
  approvalRequiredRole?: string;
  dynamicScopes?: string[];
  rolePermissions?: Record<string, string[]>;
  companiesList?: { id: string; name: string; value: string; taxId?: string; currency?: string }[];
  branchesList?: { id: string; name: string; value: string; location?: string; companyId: string }[];
  warehousesList?: { id: string; name: string; value: string; location?: string; branchId: string }[];
}

export type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export interface ChartOfAccount {
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  classification?: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  lines: JournalLine[];
  status: "Draft" | "Approved" | "Posted";
  costCenter: string;
  profitCenter: string;
  creator: string;
  approvedBy?: string;
  version?: number;
}

export interface CostCenter {
  id: string;
  name: string;
  budget: number;
  spent: number;
}

export interface ProfitCenter {
  id: string;
  name: string;
  target: number;
  actual: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  baseSalary: number;
  attendanceDays: number; // out of 30
  withholdingTaxRate: number; // e.g. 0.15 (15% Egyptian standard)
  vatRate: number; // e.g. 0.14 (14% Egypt VAT standard)
  status: "Active" | "On Leave" | "Suspended";
}

export interface StockItem {
  sku: string;
  name: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  minLevel: number;
  category?: string;
  subCategory?: string;
  version?: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface POSSaleItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface POSSale {
  id: string;
  timestamp: string;
  items: POSSaleItem[];
  subtotal: number;
  vatAmount: number;
  withholdingTax: number;
  total: number;
  paymentMethod: "Cash" | "Card" | "Mobile Wallet" | "Point Redemption";
}

export interface BOMComponent {
  sku: string;
  name: string;
  quantityRequired: number;
}

export interface BillOfMaterials {
  id: string;
  productSku: string;
  productName: string;
  components: BOMComponent[];
  laborCost: number;
}

export interface ProductionOrder {
  id: string;
  bomId: string;
  productName: string;
  quantity: number;
  status: "Planned" | "In Progress" | "Completed";
  startDate: string;
  completionDate?: string;
}

export interface ArchitectureCheck {
  id: string;
  title: string;
  category: "Clean Architecture" | "DDD" | "Hexagonal" | "SOLID" | "Security" | "Testing" | "الكود النظيف" | "تصميم DDD" | "المعمارية السداسية" | "مبادئ SOLID" | "أمن المعلومات" | "الاختبارات والتوكيد";
  status: "success" | "warning" | "error" | "running";
  details: string;
}

export interface Customer {
  id: string;
  name: string;
  taxRegistrationNumber: string;
  phone: string;
  email: string;
  balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  taxRegistrationNumber: string;
  phone: string;
  email: string;
  balance: number;
}

export interface InvoiceItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  date: string;
  branchId?: string;
  supplierId: string;
  supplierName: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  withholdingTax: number;
  total: number;
  status: "Draft" | "Paid" | "Unpaid";
  paymentMethod: "Bank" | "Cash" | "Check";
}

export interface SalesInvoice {
  id: string;
  date: string;
  branchId?: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  withholdingTax: number;
  total: number;
  status: "Draft" | "Paid" | "Unpaid";
  paymentMethod: "Bank" | "Cash" | "Check";
}

export interface Cheque {
  id: string; // كود الشيك الداخلي
  chequeNumber: string; // رقم الشيك البنكي
  bankName: string; // اسم البنك الصادر منه الشيك
  amount: number; // مبلغ الشيك
  receiveDate: string; // تاريخ الاستلام
  dueDate: string; // تاريخ الاستحقاق / الصرف
  customerId: string; // العميل المستلم منه الشيك
  customerName: string; // اسم العميل
  beneficiaryType: "Customer" | "ThirdParty"; // باسم العميل أو طرف ثالث
  beneficiaryName: string; // اسم المستفيد الفعلي المدون بالشيك
  status: "InSafe" | "EndorsedToSupplier" | "Collected" | "Bounced" | "ReturnedToCustomer";
  // InSafe: مدرج بخزينة الشيكات
  // EndorsedToSupplier: مظهر ومسلم للمورد للتحصيل
  // Collected: تم صرفه ومطابقته بالبنك عن طريق المورد
  // Bounced: مرتجع وغير محصل
  // ReturnedToCustomer: تم رده للعميل
  supplierId?: string; // المورد المستلم للشيك (المظهر له)
  supplierName?: string; // اسم المورد
  notes?: string; // ملاحظات محاسبية
  version?: number;
}

export interface GeneratedCodeArtifact {
  filePath: string;
  language: string;
  description: string;
  code: string;
}

export interface CashFlowMapping {
  accountCode: string;
  tenantId: string;
  activityType: "Operating" | "Investing" | "Financing" | "CashEquivalent";
  categoryName: string;
}
