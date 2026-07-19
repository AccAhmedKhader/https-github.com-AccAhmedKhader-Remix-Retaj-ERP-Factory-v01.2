# System Configuration Registry (CONFIGURATION.md)

This document maps all available configuration parameters, secret parameters, retry strategies, and circuit breaker variables inside the **Enterprise Storage Foundation**.

---

## 1. Environment Variable Registry

All variables must be defined in your `.env` file at the project root. Refer to `.env.example` for empty placeholder values.

### A. General Core Server Setup
| Variable | Expected Type | Description | Default Value |
|----------|---------------|-------------|---------------|
| `PORT` | Number | Express listening port. | `3000` |
| `NODE_ENV` | String (`development` / `production` / `test`) | Operational runtime environment. | `development` |
| `DATABASE_URL` | String | Connection string for external Postgres DB. | None (falls back to local sqlite/pglite) |
| `STORAGE_PROVIDER` | String (`local`, `postgres`, `s3`, `minio`, `azure`) | The primary storage provider backend. | `local` |

### B. Security & Cryptographic Secrets
| Variable | Expected Type | Description | Security Level |
|----------|---------------|-------------|----------------|
| `JWT_SECRET` | String (32+ chars) | Key used for generating session access tokens. | Critical Secret |
| `STORAGE_ENCRYPTION_KEY` | String (32+ chars) | Key used for AES-256 transparent file encryption. | Critical Secret |
| `GEMINI_API_KEY` | String | Google Gemini API key used for document metadata extraction. | Critical Secret |

### C. Amazon S3 / MinIO Configuration
| Variable | Expected Type | Description | Default Value |
|----------|---------------|-------------|---------------|
| `S3_ENDPOINT` | String (URL) | Service host URL (Required for MinIO, omit for AWS S3). | `http://localhost:9000` |
| `S3_REGION` | String | Cloud datacenter geographic region. | `us-east-1` |
| `S3_ACCESS_KEY` | String | Access key credential. | None |
| `S3_SECRET_KEY` | String | Secret access key credential. | None |
| `S3_BUCKET_NAME` | String | Target storage container name. | `apex-erp-documents` |

### D. Microsoft Azure Blob Storage Configuration
| Variable | Expected Type | Description | Default Value |
|----------|---------------|-------------|---------------|
| `AZURE_STORAGE_CONNECTION_STRING` | String | Full SAS or account connection string. | None |
| `AZURE_STORAGE_ACCOUNT_NAME` | String | Azure storage account name. | None |
| `AZURE_STORAGE_ACCOUNT_KEY` | String | Azure storage access key credential. | None |
| `AZURE_STORAGE_CONTAINER_NAME` | String | Target blob container name. | `apex-erp-documents` |

---

## 2. Advanced Retry Policy & Circuit Breakers

Fine-tuning retry parameters can prevent performance bottlenecks under high congestion. The following configuration properties are mapped in `StorageService.ts`:

```typescript
export interface RetryPolicy {
  maxRetries: number;      // Maximum number of backoff attempts before failing
  initialDelayMs: number;  // Delay before the first retry (exponentially doubled on successive retries)
  backoffFactor: number;   // Multiplier applied to successive retry delays
  timeoutMs: number;       // Promise race timeout limit per individual provider command
}
```

### Circuit Breaker Specifications
* **Consecutive Failures Threshold**: `3`. If a single provider fails 3 times in a row, its circuit breaker trips.
* **Status**: When tripped, the provider is excluded from the active failover sequence.
* **Cool-down Reset Duration**: `15` seconds. After 15 seconds, the breaker enters a half-open state, allowing a single retry operation to test the provider's health.
