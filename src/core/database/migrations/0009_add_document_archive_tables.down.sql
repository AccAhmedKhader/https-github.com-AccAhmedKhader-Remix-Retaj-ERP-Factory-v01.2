-- Migration: 0009_add_document_archive_tables.down.sql

DROP POLICY IF EXISTS tenant_isolation_document_audit_logs ON document_audit_logs;
DROP POLICY IF EXISTS tenant_isolation_document_signatures ON document_signatures;
DROP POLICY IF EXISTS tenant_isolation_document_versions ON document_versions;
DROP POLICY IF EXISTS tenant_isolation_documents ON documents;
DROP POLICY IF EXISTS tenant_isolation_document_folders ON document_folders;

DROP TABLE IF EXISTS document_audit_logs;
DROP TABLE IF EXISTS document_signatures;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS document_folders;
