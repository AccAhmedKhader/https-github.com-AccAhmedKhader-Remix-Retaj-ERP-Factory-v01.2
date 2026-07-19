-- Migration: 0009_add_document_archive_tables.up.sql

CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_type TEXT NOT NULL DEFAULT 'Folder',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  security_level TEXT NOT NULL DEFAULT 'Public',
  current_version TEXT NOT NULL DEFAULT 'v1.0',
  retention_years INTEGER NOT NULL DEFAULT 5,
  is_legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  signature_status TEXT NOT NULL DEFAULT 'Unsigned',
  sha256 TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  modified_by TEXT NOT NULL,
  modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_signatures (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  signature_hash TEXT NOT NULL,
  certificate_ref TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS document_audit_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_tenant ON document_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_legal_hold ON documents(is_legal_hold);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_logs_document ON document_audit_logs(document_id);

-- Enable RLS and FORCE RLS on all document tables
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures FORCE ROW LEVEL SECURITY;

ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_logs FORCE ROW LEVEL SECURITY;

-- Create policies for multi-tenant isolation
CREATE POLICY tenant_isolation_document_folders ON document_folders USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_documents ON documents USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_document_versions ON document_versions USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_document_signatures ON document_signatures USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY tenant_isolation_document_audit_logs ON document_audit_logs USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Grant DML privileges to erp_app_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE document_folders TO erp_app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE documents TO erp_app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE document_versions TO erp_app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE document_signatures TO erp_app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE document_audit_logs TO erp_app_role;
