-- Migration: 0010_enterprise_storage_upgrade.up.sql

CREATE TABLE IF NOT EXISTS document_blobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data BYTEA NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_blobs_key ON document_blobs(storage_key);

ALTER TABLE document_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_blobs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_document_blobs ON document_blobs 
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE document_blobs TO erp_app_role;


CREATE TABLE IF NOT EXISTS background_upload_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  temp_path TEXT NOT NULL,
  status TEXT NOT NULL, -- 'Pending', 'Processing', 'Completed', 'Failed'
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE background_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_upload_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_background_upload_jobs ON background_upload_jobs 
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE background_upload_jobs TO erp_app_role;
