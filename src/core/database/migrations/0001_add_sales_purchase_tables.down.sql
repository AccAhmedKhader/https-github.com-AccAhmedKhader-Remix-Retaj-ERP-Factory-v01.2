-- Migration: 0001_add_sales_purchase_tables.down.sql

DROP TABLE IF EXISTS party_ledger_entries CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS customer_payments CASCADE;
DROP TABLE IF EXISTS purchase_invoice_items CASCADE;
DROP TABLE IF EXISTS purchase_invoices CASCADE;
DROP TABLE IF EXISTS sales_invoice_items CASCADE;
DROP TABLE IF EXISTS sales_invoices CASCADE;
