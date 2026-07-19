import { pgTable, text, integer, numeric, timestamp, boolean, unique, primaryKey } from "drizzle-orm/pg-core";

// ==========================================================================
// 1. Multi-Tenant Infrastructure
// ==========================================================================

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fiscalYear: text("fiscal_year").notNull().default("2026"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
});

// ==========================================================================
// 2. Identity and Access Management (RBAC)
// ==========================================================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // CFO, LeadArchitect, SeniorAccountant, etc.
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("users_tenant_username_uq").on(t.tenantId, t.username)
]);

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
}, (t) => [
  unique("roles_tenant_name_uq").on(t.tenantId, t.name)
]);

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  scope: text("scope").notNull(), // accounting:write, accounting:read, etc.
}, (t) => [
  unique("permissions_role_scope_uq").on(t.roleId, t.scope)
]);

// ==========================================================================
// 3. Accounting & Financial Ledger (Double-Entry Balance Enforced)
// ==========================================================================

export const accounts = pgTable("accounts", {
  code: text("code").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(), // Asset, Liability, Equity, Revenue, Expense
  balance: numeric("balance").notNull().default("0"),
  initialBalance: numeric("initial_balance").notNull().default("0"),
  classification: text("classification"),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.code] }),
  unique("accounts_tenant_code_uq").on(t.tenantId, t.code)
]);

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  reference: text("reference").notNull(),
  status: text("status").notNull(), // Draft, Approved, Posted
  costCenter: text("cost_center").notNull(),
  profitCenter: text("profit_center").notNull(),
  creator: text("creator").notNull(),
  approvedBy: text("approved_by"),
  isReversed: boolean("is_reversed").notNull().default(false),
  reversedEntryId: text("reversed_entry_id"),
  isPeriodLocked: boolean("is_period_locked").notNull().default(false),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entryId: text("entry_id").notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  debit: numeric("debit").notNull().default("0"),
  credit: numeric("credit").notNull().default("0"),
});

// ==========================================================================
// 4. Customers & Suppliers (Sub-Ledgers)
// ==========================================================================

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  taxRegistrationNumber: text("tax_registration_number").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  balance: numeric("balance").notNull().default("0"),
}, (t) => [
  unique("customers_tenant_tax_uq").on(t.tenantId, t.taxRegistrationNumber)
]);

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  taxRegistrationNumber: text("tax_registration_number").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  balance: numeric("balance").notNull().default("0"),
}, (t) => [
  unique("suppliers_tenant_tax_uq").on(t.tenantId, t.taxRegistrationNumber)
]);

// ==========================================================================
// 5. Inventory & Warehousing
// ==========================================================================

export const warehouses = pgTable("warehouses", {
  id: text("id").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  location: text("location").notNull(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.id] }),
  unique("warehouses_tenant_name_uq").on(t.tenantId, t.name)
]);

export const stockItems = pgTable("stock_items", {
  sku: text("sku").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price").notNull().default("0"),
  minLevel: integer("min_level").notNull().default(0),
  category: text("category"),
  subCategory: text("sub_category"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.sku] }),
  unique("stock_items_tenant_sku_uq").on(t.tenantId, t.sku)
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sku: text("sku").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  quantity: integer("quantity").notNull(), // + receipt, - issue
  type: text("type").notNull(), // RECEIPT, ISSUE, TRANSFER
  reference: text("reference"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// ==========================================================================
// 6. HR & Payroll
// ==========================================================================

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department").notNull(),
  baseSalary: numeric("base_salary").notNull().default("0"),
  attendanceDays: integer("attendance_days").notNull().default(30),
  withholdingTaxRate: numeric("withholding_tax_rate").notNull().default("0.15"),
  vatRate: numeric("vat_rate").notNull().default("0.14"),
  status: text("status").notNull().default("Active"), // Active, On Leave, Suspended
});

// ==========================================================================
// 7. Assets & Treasury (Cheques & Fixed Assets)
// ==========================================================================

export const fixedAssets = pgTable("fixed_assets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  category: text("category").notNull(), // Property, Equipment, Vehicles, IT Hardware
  purchaseDate: text("purchase_date").notNull(),
  cost: numeric("cost").notNull().default("0"),
  salvageValue: numeric("salvage_value").notNull().default("0"),
  usefulLifeYears: integer("useful_life_years").notNull(),
  accumulatedDepreciation: numeric("accumulated_depreciation").notNull().default("0"),
  bookValue: numeric("book_value").notNull().default("0"),
  depreciationAccountCode: text("depreciation_account_code").notNull(),
  assetAccountCode: text("asset_account_code").notNull(),
  status: text("status").notNull().default("Active"), // Active, Fully Depreciated, Disposed
});

export const cheques = pgTable("cheques", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  chequeNumber: text("cheque_number").notNull(),
  bankName: text("bank_name").notNull(),
  amount: numeric("amount").notNull().default("0"),
  receiveDate: text("receive_date").notNull(),
  dueDate: text("due_date").notNull(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  customerName: text("customer_name"),
  beneficiaryType: text("beneficiary_type").notNull(), // Customer, ThirdParty
  beneficiaryName: text("beneficiary_name").notNull(),
  status: text("status").notNull().default("InSafe"), // InSafe, EndorsedToSupplier, Collected, Bounced, ReturnedToCustomer
  supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: 'set null' }),
  supplierName: text("supplier_name"),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  unique("cheques_tenant_number_uq").on(t.tenantId, t.chequeNumber)
]);

// ==========================================================================
// 8. Security Audits & Tracking
// ==========================================================================

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  timestamp: text("timestamp").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // INSERT, UPDATE, DELETE, AUTH_LOGIN, etc.
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  oldValues: text("old_values"),
  newValues: text("new_values").notNull(),
  cryptographicSignature: text("cryptographic_signature").notNull(),
});

// ==========================================================================
// 9. Sales and Purchase Invoices & Party Ledger (Stage 1 additions)
// ==========================================================================

export const salesInvoices = pgTable("sales_invoices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  customerName: text("customer_name").notNull(),
  date: text("date").notNull(),
  dueDate: text("due_date").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount").notNull().default("0"),
  taxAmount: numeric("tax_amount").notNull().default("0"),
  totalAmount: numeric("total_amount").notNull().default("0"),
  status: text("status").notNull(), // Draft, Approved, Paid, Unpaid, PartiallyPaid, Cancelled
  notes: text("notes"),
}, (t) => [
  unique("sales_invoices_tenant_invoice_uq").on(t.tenantId, t.invoiceNumber)
]);

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: text("invoice_id").notNull().references(() => salesInvoices.id, { onDelete: 'cascade' }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price").notNull().default("0"),
  lineTotal: numeric("line_total").notNull().default("0"),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  supplierName: text("supplier_name").notNull(),
  date: text("date").notNull(),
  dueDate: text("due_date").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount").notNull().default("0"),
  taxAmount: numeric("tax_amount").notNull().default("0"),
  totalAmount: numeric("total_amount").notNull().default("0"),
  status: text("status").notNull(), // Draft, Approved, Paid, Unpaid, PartiallyPaid, Cancelled
  notes: text("notes"),
}, (t) => [
  unique("purchase_invoices_tenant_invoice_uq").on(t.tenantId, t.invoiceNumber)
]);

export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: text("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: 'cascade' }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price").notNull().default("0"),
  lineTotal: numeric("line_total").notNull().default("0"),
});

export const customerPayments = pgTable("customer_payments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  date: text("date").notNull(),
  amount: numeric("amount").notNull().default("0"),
  paymentMethod: text("payment_method").notNull(), // Cash, BankTransfer, Cheque
  reference: text("reference").notNull(),
  notes: text("notes"),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  date: text("date").notNull(),
  amount: numeric("amount").notNull().default("0"),
  paymentMethod: text("payment_method").notNull(), // Cash, BankTransfer, Cheque
  reference: text("reference").notNull(),
  notes: text("notes"),
});

export const partyLedgerEntries = pgTable("party_ledger_entries", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: 'cascade' }),
  partyId: text("party_id").notNull(), // customerId or supplierId
  partyType: text("party_type").notNull(), // Customer, Supplier
  entryType: text("entry_type").notNull(), // Invoice, Payment, Refund, Adjustment, OpeningBalance
  sourceDocument: text("source_document").notNull(), // Invoice ID or Payment ID or Journal ID
  date: text("date").notNull(),
  debit: numeric("debit").notNull().default("0"),
  credit: numeric("credit").notNull().default("0"),
  balance: numeric("balance").notNull().default("0"),
  userId: text("user_id").notNull(),
  notes: text("notes"),
  
  // Strict relational backing columns for polymorphic associations
  customerId: text("customer_id").references(() => customers.id, { onDelete: 'cascade' }),
  supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }),
  salesInvoiceId: text("sales_invoice_id").references(() => salesInvoices.id, { onDelete: 'cascade' }),
  purchaseInvoiceId: text("purchase_invoice_id").references(() => purchaseInvoices.id, { onDelete: 'cascade' }),
  customerPaymentId: text("customer_payment_id").references(() => customerPayments.id, { onDelete: 'cascade' }),
  supplierPaymentId: text("supplier_payment_id").references(() => supplierPayments.id, { onDelete: 'cascade' }),
});

// ==========================================================================
// 10. Manufacturing & Production (MRP)
// ==========================================================================

export const boms = pgTable("boms", {
  id: text("id").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productSku: text("product_sku").notNull(),
  productName: text("product_name").notNull(),
  laborCost: numeric("labor_cost").notNull().default("0"),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.id] }),
]);

export const bomComponents = pgTable("bom_components", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bomId: text("bom_id").notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantityRequired: integer("quantity_required").notNull().default(1),
});

export const productionOrders = pgTable("production_orders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  bomId: text("bom_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull(), // Planned, In Progress, Completed
  startDate: text("start_date").notNull(),
  completionDate: text("completion_date"),
});

// ==========================================================================
// 11. Cost & Profit Centers (Financial Organization)
// ==========================================================================

export const costCenters = pgTable("cost_centers", {
  id: text("id").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  budget: numeric("budget").notNull().default("0"),
  spent: numeric("spent").notNull().default("0"),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.id] }),
]);

export const profitCenters = pgTable("profit_centers", {
  id: text("id").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  target: numeric("target").notNull().default("0"),
  actual: numeric("actual").notNull().default("0"),
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.id] }),
]);

// ==========================================================================
// 12. Advanced HR & Payroll Tables
// ==========================================================================

export const payslips = pgTable("payslips", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text("employee_name").notNull(),
  month: text("month").notNull(),
  baseSalary: numeric("base_salary").notNull().default("0"),
  allowances: numeric("allowances").notNull().default("0"),
  deductions: numeric("deductions").notNull().default("0"),
  netSalary: numeric("net_salary").notNull().default("0"),
  status: text("status").notNull().default("Pending"),
  paymentDate: text("payment_date"),
  journalId: text("journal_id"),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text("employee_name").notNull(),
  date: text("date").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  status: text("status").notNull(),
});

export const employeeLoans = pgTable("employee_loans", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text("employee_name").notNull(),
  amount: numeric("amount").notNull().default("0"),
  installmentMonthly: numeric("installment_monthly").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  status: text("status").notNull().default("Active"),
});

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text("employee_name").notNull(),
  type: text("type").notNull(),
  duration: integer("duration").notNull().default(1),
  status: text("status").notNull().default("Pending"),
  reason: text("reason"),
});

export const jobCandidates = pgTable("job_candidates", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  position: text("position").notNull(),
  stage: text("stage").notNull(),
  score: integer("score").notNull().default(0),
  expectedSalary: numeric("expected_salary").notNull().default("0"),
  department: text("department").notNull(),
});

export const performanceAppraisals = pgTable("performance_appraisals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text("employee_name").notNull(),
  rating: numeric("rating").notNull().default("0"),
  comments: text("comments"),
});

// ==========================================================================
// 13. IAS 7 Cash Flow Mappings
// ==========================================================================

export const cashFlowMappings = pgTable("cash_flow_mappings", {
  accountCode: text("account_code").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  activityType: text("activity_type").notNull(), // Operating, Investing, Financing, CashEquivalent
  categoryName: text("category_name").notNull(), // e.g., "Customer Receipts", "Supplier Payments"
}, (t) => [
  primaryKey({ columns: [t.tenantId, t.accountCode] }),
  unique("cash_flow_mappings_tenant_code_uq").on(t.tenantId, t.accountCode)
]);

// ==========================================================================
// 14. Document Management & Electronic Archive
// ==========================================================================

export const documentFolders = pgTable("document_folders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  iconType: text("icon_type").notNull().default("Folder"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => documentFolders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // Legal, Financial, HumanResources, Administrative, Operations
  securityLevel: text("security_level").notNull().default("Public"), // Public, Confidential, Restricted, TopSecret
  currentVersion: text("current_version").notNull().default("v1.0"),
  retentionYears: integer("retention_years").notNull().default(5),
  isLegalHold: boolean("is_legal_hold").notNull().default(false),
  signatureStatus: text("signature_status").notNull().default("Unsigned"), // Unsigned, PartiallySigned, Signed
  sha256: text("sha256").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const documentVersions = pgTable("document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  sha256: text("sha256").notNull(),
  modifiedBy: text("modified_by").notNull(),
  modifiedAt: timestamp("modified_at").notNull().defaultNow(),
  reason: text("reason").notNull(),
});

export const documentSignatures = pgTable("document_signatures", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  signerUserId: text("signer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  signatureHash: text("signature_hash").notNull(),
  certificateRef: text("certificate_ref").notNull(),
  isVerified: boolean("is_verified").notNull().default(true),
});

export const documentAuditLogs = pgTable("document_audit_logs", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // Create, Update, Download, Sign, Delete, Rollback, ToggleLegalHold
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentBlobs = pgTable("document_blobs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  data: text("data").notNull(), // Or custom bytea
});

export const backgroundUploadJobs = pgTable("background_upload_jobs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(),
  version: text("version").notNull(),
  filename: text("filename").notNull(),
  tempPath: text("temp_path").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==========================================================================
// 15. Advanced Enterprise Security Platform (Phase 2 Additions)
// ==========================================================================

export const sysSessions = pgTable("sys_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull(),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
});

export const userMfa = pgTable("user_mfa", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mfaSecret: text("mfa_secret").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  backupCodes: text("backup_codes").notNull(), // Comma separated recovery codes
});

export const documentAcls = pgTable("document_acls", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: text("role"),
  permissionType: text("permission_type").notNull(), // ALLOW, DENY
  action: text("action").notNull(), // Read, Write, Update, Delete, Download, Preview, Share, Move, Copy, Version, Restore, Sign, Approve, Archive, LegalHold
});

export const folderAcls = pgTable("folder_acls", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  folderId: text("folder_id").notNull().references(() => documentFolders.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: text("role"),
  permissionType: text("permission_type").notNull(), // ALLOW, DENY
  action: text("action").notNull(), // Read, Write, etc.
});

export const folderSecuritySettings = pgTable("folder_security_settings", {
  folderId: text("folder_id").primaryKey().references(() => documentFolders.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  isProtected: boolean("is_protected").notNull().default(false),
  departmentId: text("department_id"),
  isConfidential: boolean("is_confidential").notNull().default(false),
  isRestricted: boolean("is_restricted").notNull().default(false),
  inheritPermissions: boolean("inherit_permissions").notNull().default(true),
});

export const sysEncryptionKeys = pgTable("sys_encryption_keys", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  documentId: text("document_id").references(() => documents.id, { onDelete: "cascade" }),
  keyType: text("key_type").notNull(), // KEK, DEK
  encryptedKeyValue: text("encrypted_key_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// ==========================================================================
// 16. Enterprise Search & Intelligent Discovery Platform (Phase 3 Additions)
// ==========================================================================

export const documentSearchIndex = pgTable("document_search_index", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  ocrText: text("ocr_text"), // Store extracted PDF/Image OCR text in Arabic & English
  category: text("category").notNull(),
  departmentId: text("department_id"),
  ownerId: text("owner_id"),
  securityLevel: text("security_level").notNull().default("Public"),
  status: text("status").notNull().default("Active"),
  tags: text("tags"), // JSON array/comma-separated string
  customMetadata: text("custom_metadata"), // JSON key-value representation
  sizeBytes: integer("size_bytes").notNull().default(0),
  extension: text("extension"), // e.g. .pdf, .docx, .png
  hasSignature: boolean("has_signature").notNull().default(false),
  hasVersions: boolean("has_versions").notNull().default(false),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  retentionPolicy: text("retention_policy"),
  isLegalHold: boolean("is_legal_hold").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  embeddingVector: text("embedding_vector"), // JSON representation of embeddings vector for semantic matching
});

export const savedSearches = pgTable("saved_searches", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  query: text("query").notNull(),
  filters: text("filters"), // JSON parameters
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchAnalyticsLogs = pgTable("search_analytics_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  resultCount: integer("result_count").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const recentSearches = pgTable("recent_searches", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const crmDeals = pgTable("crm_deals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  value: numeric("value").notNull().default("0"),
  stage: text("stage").notNull().default("Lead"),
  source: text("source").notNull().default("Direct"),
  phone: text("phone"),
  email: text("email"),
  createdAt: text("created_at").notNull(),
  probability: integer("probability").notNull().default(0),
});




