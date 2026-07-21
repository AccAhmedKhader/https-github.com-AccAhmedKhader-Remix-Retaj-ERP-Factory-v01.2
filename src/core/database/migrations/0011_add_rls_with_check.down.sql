-- Migration: 0011_add_rls_with_check.down.sql

DROP POLICY IF EXISTS tenant_isolation_branches ON branches;
CREATE POLICY tenant_isolation_branches ON branches USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_roles ON roles;
CREATE POLICY tenant_isolation_roles ON roles USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_accounts ON accounts;
CREATE POLICY tenant_isolation_accounts ON accounts USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_journal_entries ON journal_entries;
CREATE POLICY tenant_isolation_journal_entries ON journal_entries USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_journal_lines ON journal_lines;
CREATE POLICY tenant_isolation_journal_lines ON journal_lines USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_customers ON customers;
CREATE POLICY tenant_isolation_customers ON customers USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers;
CREATE POLICY tenant_isolation_suppliers ON suppliers USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_warehouses ON warehouses;
CREATE POLICY tenant_isolation_warehouses ON warehouses USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_stock_items ON stock_items;
CREATE POLICY tenant_isolation_stock_items ON stock_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_inventory_transactions ON inventory_transactions;
CREATE POLICY tenant_isolation_inventory_transactions ON inventory_transactions USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_sales_invoices ON sales_invoices;
CREATE POLICY tenant_isolation_sales_invoices ON sales_invoices USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_sales_invoice_items ON sales_invoice_items;
CREATE POLICY tenant_isolation_sales_invoice_items ON sales_invoice_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_purchase_invoices ON purchase_invoices;
CREATE POLICY tenant_isolation_purchase_invoices ON purchase_invoices USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_purchase_invoice_items ON purchase_invoice_items;
CREATE POLICY tenant_isolation_purchase_invoice_items ON purchase_invoice_items USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_cheques ON cheques;
CREATE POLICY tenant_isolation_cheques ON cheques USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_customer_payments ON customer_payments;
CREATE POLICY tenant_isolation_customer_payments ON customer_payments USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_supplier_payments ON supplier_payments;
CREATE POLICY tenant_isolation_supplier_payments ON supplier_payments USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_party_ledger_entries ON party_ledger_entries;
CREATE POLICY tenant_isolation_party_ledger_entries ON party_ledger_entries USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
