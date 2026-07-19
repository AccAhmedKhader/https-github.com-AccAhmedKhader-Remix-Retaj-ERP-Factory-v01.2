-- Migration rollback: 0010_enterprise_storage_upgrade.down.sql

DROP TABLE IF EXISTS document_blobs CASCADE;
DROP TABLE IF EXISTS background_upload_jobs CASCADE;
