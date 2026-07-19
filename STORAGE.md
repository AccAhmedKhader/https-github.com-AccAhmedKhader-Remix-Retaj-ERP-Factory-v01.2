# Enterprise Storage Engine (STORAGE.md)

This document provides a technical deep-dive into the design, implementation, and operations of the **Enterprise Storage Foundation (Phase 1)** of the ApexSaaS ERP/ECM platform.

---

## 1. Storage Interface & Core Contract

All storage backends implement a unified interface, `IStorageProvider`, located in `/src/core/storage/IStorageProvider.ts`. This contract decouples the business logic of documents management from the underlying hardware or cloud infrastructures.

```typescript
export interface IStorageProvider {
  uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void>;
  downloadStream(storageKey: string, tenantId: string): Promise<Readable>;
  downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable>;
  deleteFile(storageKey: string, tenantId: string): Promise<void>;
  fileExists(storageKey: string, tenantId: string): Promise<boolean>;
  getMetadata?(storageKey: string, tenantId: string): Promise<Record<string, any>>;
  healthCheck(): Promise<boolean>;
}
```

---

## 2. Supported Storage Providers

### A. Local Filesystem (`LocalFilesystemProvider`)
* **Use Case**: Default fallback and local development storage.
* **Storage Path**: `uploads/tenants/{tenantId}/...`
* **Performance**: Excellent disk I/O, utilizes Node.js streams to keep memory footprints low.

### B. PostgreSQL BYTEA (`PostgresByteaProvider`)
* **Use Case**: Zero-dependency cloud database-backed transactional storage for small high-security files.
* **Mechanism**: Streams chunks of bytes on-the-fly to a database table utilizing `drizzle-orm` raw query parameters.

### C. Amazon S3 / Cloud Object Storage (`S3StorageProvider`)
* **Use Case**: Production-grade highly scalable cloud file storage.
* **Implementation**: Built on the official `@aws-sdk/client-s3` library. Employs `Upload` helpers from `@aws-sdk/lib-storage` to stream uploads directly without buffering entire files in memory.

### D. MinIO Storage Provider (`MinIOStorageProvider`)
* **Use Case**: Fully compliant self-hosted, S3-compatible enterprise storage.
* **Features**:
  * **S3 Compliant**: Uses identical S3 commands for compatibility.
  * **Auto-Bucket Creation**: Safely checks and creates target buckets during initialization.
  * **Health Checked**: Implements an active `healthCheck()` probing sequence.

### E. Azure Blob Storage (`AzureBlobStorageProvider`)
* **Use Case**: Enterprise-grade Microsoft Azure cloud hosting.
* **Implementation**: Built with `@azure/storage-blob` SDK. Uses streaming upload blocks to support large file operations safely.

---

## 3. High-Security Pipeline: Encryption, Compression, and Hashing

Every file uploaded to the storage service undergoes a zero-RAM streaming pipeline as shown below:

```
[Raw Stream] ──> [Hash Calculator (SHA256)] ──> [GZIP Compressor] ──> [AES-256 Encryptor] ──> [Active Provider]
```

### A. Automatic Hash Calculation
During upload, a custom `Transform` stream calculates the SHA-256 digest of the raw payload on-the-fly. The client receives the calculated hash for validation and auditing.

### B. Intelligent Compression
Files are evaluated based on their file extension. Code, plain text, logs, and CSVs are compressed on-the-fly with GZIP, saving storage space. Already-compressed formats (ZIP, PNG, PDF, JPG) are automatically bypassed.

### C. Strong Encryption at Rest
All files are encrypted on-the-fly using `AES-256-CBC` with a cryptographically secure, random 16-byte initialization vector (IV) prepended to the final payload. This ensures that even if the raw storage buckets are compromised, file content remains secure.

---

## 4. Multi-Provider Storage Failover Chain

To prevent data-loss and maintain high availability, the orchestrator implements a **Priority-Based Failover Chain**:

```
[Primary Provider] ──(fails)──> [Fallback Providers in Chain] ──(all fail)──> [Operation Fails]
```

1. **Active/Primary Provider**: Selected from the `STORAGE_PROVIDER` environment variable (e.g., `"s3"`, `"minio"`).
2. **Priority Sequence**: `S3 ──> MinIO ──> Azure ──> Local Filesystem ──> Postgres BYTEA`
3. **Failover Execution**: If the active provider experiences an outage, the orchestrator automatically traverses down the priority list to write/read the file from the next available healthy provider.
4. **No Data Loss**: Failovers are logged automatically, prompting DevSecOps intervention while ensuring user requests succeed.
