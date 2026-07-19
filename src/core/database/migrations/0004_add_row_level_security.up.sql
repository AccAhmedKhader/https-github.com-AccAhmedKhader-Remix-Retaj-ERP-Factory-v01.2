-- Migration: 0004_add_row_level_security.up.sql

-- Enable RLS on all existing tables containing tenant_id
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for each of these tables
CREATE POLICY tenant_isolation_branches ON branches USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_users ON users USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_roles ON roles USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_accounts ON accounts USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_journal_entries ON journal_entries USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_journal_lines ON journal_lines USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_customers ON customers USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_suppliers ON suppliers USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_warehouses ON warehouses USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_stock_items ON stock_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_inventory_transactions ON inventory_transactions USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_sales_invoices ON sales_invoices USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_sales_invoice_items ON sales_invoice_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_purchase_invoices ON purchase_invoices USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_purchase_invoice_items ON purchase_invoice_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_cheques ON cheques USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_customer_payments ON customer_payments USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_supplier_payments ON supplier_payments USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_party_ledger_entries ON party_ledger_entries USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_audit_logs ON audit_logs USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
