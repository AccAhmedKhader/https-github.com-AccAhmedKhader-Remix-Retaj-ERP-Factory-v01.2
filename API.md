# Documents ECM & Storage API Reference (API.md)

This API reference documents the endpoints for document management, chunked uploads, and storage monitoring under the **Enterprise Storage Foundation (Phase 1)**.

---

## 1. Storage Health & Prometheus Telemetry

### A. Check Storage Health
Check the health status of the active storage provider and retrieve telemetry.

* **Endpoint**: `GET /health/storage`
* **Authentication**: None (Public)
* **Response (HTTP 200/503)**:
```json
{
  "status": "UP",
  "activeProvider": "s3",
  "timestamp": "2026-07-18T07:12:00.000Z",
  "metrics": {
    "uploadCount": 42,
    "downloadCount": 185,
    "deleteCount": 5,
    "existsCount": 23,
    "errorCount": 0,
    "retryCount": 0,
    "totalBytesUploaded": 859210052,
    "totalBytesDownloaded": 3491220054,
    "totalUploadTimeMs": 12450,
    "totalDownloadTimeMs": 35200,
    "totalResponseTimeMs": 47650,
    "compressionRatioSum": 12.4,
    "compressionCount": 20
  }
}
```

### B. Prometheus Metrics Exposition
Export storage telemetry formatted for Prometheus scraping tools.

* **Endpoint**: `GET /metrics`
* **Authentication**: None (Public)
* **Response (HTTP 200, text/plain)**:
```text
# HELP erp_storage_uploads_total Total number of uploads
# TYPE erp_storage_uploads_total counter
erp_storage_uploads_total 42
# HELP erp_storage_bytes_uploaded_total Total bytes uploaded to storage
# TYPE erp_storage_bytes_uploaded_total counter
erp_storage_bytes_uploaded_total 859210052
# HELP erp_storage_circuit_breaker_tripped 1 if circuit breaker is tripped, 0 otherwise
# TYPE erp_storage_circuit_breaker_tripped gauge
erp_storage_circuit_breaker_tripped{provider="s3"} 0
```

---

## 2. Advanced Chunk Upload Engine (Files up to and >20GB)

### A. Initialize Chunk Session
Start an upload session for a large file.

* **Endpoint**: `POST /api/v1/documents/chunks/init`
* **Payload**:
```json
{
  "totalChunks": 200,
  "totalSize": 21474836480,
  "fileName": "large_database_backup.bak"
}
```
* **Response**:
```json
{
  "success": true,
  "uploadId": "CH-1779218201-3aef8c2b"
}
```

### B. Get Chunk Session Status
Retrieve uploaded chunk indexes to allow resuming from a failure.

* **Endpoint**: `GET /api/v1/documents/chunks/:uploadId/status`
* **Response (HTTP 200)**:
```json
{
  "success": true,
  "uploadId": "CH-1779218201-3aef8c2b",
  "uploadedChunks": [0, 1, 2, 4, 5],
  "metadata": {
    "uploadId": "CH-1779218201-3aef8c2b",
    "totalChunks": 200,
    "totalSize": 21474836480,
    "fileName": "large_database_backup.bak"
  }
}
```

### C. Upload Single Chunk
Upload a block of bytes with a validation signature.

* **Endpoint**: `POST /api/v1/documents/chunks/upload`
* **Content-Type**: `multipart/form-data`
* **Fields**:
  * `uploadId` (String): The active chunk session ID.
  * `chunkIndex` (Number): The 0-based index of this chunk.
  * `chunkHash` (String, Optional): Expected SHA-256 hash of this chunk to enforce integrity checks on the server.
  * `chunk` (File Binary): Chunk payload.
* **Response (HTTP 200)**:
```json
{
  "success": true,
  "message": "الكتلة رقم 3 تم رفعها بنجاح."
}
```

### D. Complete Chunk Upload
Merges all uploaded chunks in a zero-RAM streaming pipeline and registers the document.

* **Endpoint**: `POST /api/v1/documents/chunks/complete`
* **Payload**:
```json
{
  "uploadId": "CH-1779218201-3aef8c2b",
  "name": "large_database_backup.bak",
  "category": "Administrative",
  "securityLevel": "Secret"
}
```
* **Response**:
```json
{
  "success": true,
  "data": {
    "id": "DOC-1779218552",
    "name": "large_database_backup.bak",
    "sha256": "81f1c29e...",
    "sizeBytes": 21474836480,
    "securityLevel": "Secret"
  }
}
```

### E. Abort Chunk Upload
Cancels the upload and deletes all temporary chunk files on disk immediately.

* **Endpoint**: `POST /api/v1/documents/chunks/abort`
* **Payload**:
```json
{
  "uploadId": "CH-1779218201-3aef8c2b"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "تم إلغاء عملية الرفع وتنظيف كافة الملفات المؤقتة بنجاح."
}
```

---

## 3. High-Precision Pause & Resume Downloads

### A. Download File with Range Headers
Downloads a document. Supports pause, resume, and partial requests via the HTTP standard `Range` header.

* **Endpoint**: `GET /api/v1/documents/:id/download`
* **Headers**:
  * `Range`: `bytes=1048576-2097151` (Requesting the second MB of the file)
* **Response (HTTP 206 Partial Content)**:
  * **Headers**:
    * `Accept-Ranges`: `bytes`
    * `Content-Range`: `bytes 1048576-2097151/52428800`
    * `Content-Length`: `1048576`
  * **Body**: Sliced file stream payload (Decrypted and decompressed on-the-fly).
