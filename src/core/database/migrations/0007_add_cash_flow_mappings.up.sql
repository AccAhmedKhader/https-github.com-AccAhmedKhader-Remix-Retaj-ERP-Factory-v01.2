CREATE TABLE IF NOT EXISTS cash_flow_mappings (
  account_code TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  category_name TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_code)
);
