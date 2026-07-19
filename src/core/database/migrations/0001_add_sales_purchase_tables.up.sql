-- Migration: 0001_add_sales_purchase_tables.up.sql

CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  tax_amount NUMERIC NOT NULL DEFAULT '0',
  total_amount NUMERIC NOT NULL DEFAULT '0',
  status TEXT NOT NULL,
  notes TEXT,
  CONSTRAINT sales_invoices_tenant_invoice_uq UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT '0',
  line_total NUMERIC NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  tax_amount NUMERIC NOT NULL DEFAULT '0',
  total_amount NUMERIC NOT NULL DEFAULT '0',
  status TEXT NOT NULL,
  notes TEXT,
  CONSTRAINT purchase_invoices_tenant_invoice_uq UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT '0',
  line_total NUMERIC NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  payment_method TEXT NOT NULL,
  reference TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  payment_method TEXT NOT NULL,
  reference TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS party_ledger_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  party_id TEXT NOT NULL,
  party_type TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  source_document TEXT NOT NULL,
  date TEXT NOT NULL,
  debit NUMERIC NOT NULL DEFAULT '0',
  credit NUMERIC NOT NULL DEFAULT '0',
  balance NUMERIC NOT NULL DEFAULT '0',
  user_id TEXT NOT NULL,
  notes TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
  sales_invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE CASCADE,
  purchase_invoice_id TEXT REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  customer_payment_id TEXT REFERENCES customer_payments(id) ON DELETE CASCADE,
  supplier_payment_id TEXT REFERENCES supplier_payments(id) ON DELETE CASCADE
);
