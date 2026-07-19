-- Migration: 0005_add_manufacturing_cost_centers_tables.up.sql

CREATE TABLE IF NOT EXISTS boms (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  labor_cost NUMERIC NOT NULL DEFAULT '0',
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS bom_components (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity_required INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  start_date TEXT NOT NULL,
  completion_date TEXT
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT '0',
  spent NUMERIC NOT NULL DEFAULT '0',
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS profit_centers (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC NOT NULL DEFAULT '0',
  actual NUMERIC NOT NULL DEFAULT '0',
  PRIMARY KEY (tenant_id, id)
);
