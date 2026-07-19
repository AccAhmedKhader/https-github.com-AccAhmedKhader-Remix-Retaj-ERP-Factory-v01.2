-- Migration: 0000_initial_schema.up.sql

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fiscal_year TEXT NOT NULL DEFAULT '2026',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT users_tenant_username_uq UNIQUE (tenant_id, username)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  CONSTRAINT roles_tenant_name_uq UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  CONSTRAINT permissions_role_scope_uq UNIQUE (role_id, scope)
);

CREATE TABLE IF NOT EXISTS accounts (
  code TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT '0',
  initial_balance NUMERIC NOT NULL DEFAULT '0',
  classification TEXT,
  PRIMARY KEY (tenant_id, code),
  CONSTRAINT accounts_tenant_code_uq UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL,
  cost_center TEXT NOT NULL,
  profit_center TEXT NOT NULL,
  creator TEXT NOT NULL,
  approved_by TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  reversed_entry_id TEXT,
  is_period_locked BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC NOT NULL DEFAULT '0',
  credit NUMERIC NOT NULL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tax_registration_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT '0',
  CONSTRAINT customers_tenant_tax_uq UNIQUE (tenant_id, tax_registration_number)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tax_registration_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT '0',
  CONSTRAINT suppliers_tenant_tax_uq UNIQUE (tenant_id, tax_registration_number)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id),
  CONSTRAINT warehouses_tenant_name_uq UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS stock_items (
  sku TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT '0',
  min_level INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  sub_category TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, sku),
  CONSTRAINT stock_items_tenant_sku_uq UNIQUE (tenant_id, sku),
  FOREIGN KEY (tenant_id, warehouse_id) REFERENCES warehouses (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT '0',
  attendance_days INTEGER NOT NULL DEFAULT 30,
  withholding_tax_rate NUMERIC NOT NULL DEFAULT '0.15',
  vat_rate NUMERIC NOT NULL DEFAULT '0.14',
  status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT '0',
  salvage_value NUMERIC NOT NULL DEFAULT '0',
  useful_life_years INTEGER NOT NULL,
  accumulated_depreciation NUMERIC NOT NULL DEFAULT '0',
  book_value NUMERIC NOT NULL DEFAULT '0',
  depreciation_account_code TEXT NOT NULL,
  asset_account_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS cheques (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cheque_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT '0',
  receive_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  beneficiary_type TEXT NOT NULL,
  beneficiary_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'InSafe',
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cheques_tenant_number_uq UNIQUE (tenant_id, cheque_number)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT NOT NULL,
  cryptographic_signature TEXT NOT NULL
);
