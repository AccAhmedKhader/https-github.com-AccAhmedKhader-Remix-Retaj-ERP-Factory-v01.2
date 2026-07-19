# Production Deployment Guide (DEPLOYMENT.md)

This document provides complete instructions for deploying the ApexSaaS ERP storage engine with PostgreSQL and MinIO in a highly available, enterprise production environment.

---

## 1. Local & On-Premises Architecture (Docker Compose)

For secure self-hosted environments, use the following `docker-compose.yml` to spin up a clustered PostgreSQL database and a high-availability MinIO object storage instance.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: erp-postgres
    restart: always
    environment:
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: erp_secure_password_2026
      POSTGRES_DB: erp_production
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: erp-minio
    restart: always
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin_secure_pass_2026
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"

  erp-app:
    build: .
    container_name: erp-application
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://erp_user:erp_secure_password_2026@postgres:5432/erp_production
      - STORAGE_PROVIDER=minio
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin_secure_pass_2026
      - S3_BUCKET_NAME=apex-erp-documents
      - STORAGE_ENCRYPTION_KEY=your_production_secure_aes_key_32_chars
    depends_on:
      - postgres
      - minio

volumes:
  pgdata:
  miniodata:
```

---

## 2. Cloud Native Serverless Deployments (Google Cloud Run)

When deploying to Google Cloud, we recommend using Google Cloud Run for the stateless API app containers, Cloud SQL for PostgreSQL, and Google Cloud Storage (GCS) as the S3-compatible backend.

### A. Deploying App Container via gcloud CLI
Build the Docker image and deploy to Google Cloud Run:

```bash
# 1. Submit build to Google Artifact Registry
gcloud builds submit --tag gcr.io/your-project-id/apex-erp-core:latest

# 2. Deploy stateless server container with injected environment secrets
gcloud run deploy apex-erp-core \
  --image gcr.io/your-project-id/apex-erp-core:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="NODE_ENV=production,STORAGE_PROVIDER=s3,S3_BUCKET_NAME=prod-apex-erp-documents" \
  --set-secrets="DATABASE_URL=DATABASE_URL_SECRET:latest,S3_ACCESS_KEY=S3_ACCESS_KEY_SECRET:latest,S3_SECRET_KEY=S3_SECRET_KEY_SECRET:latest,STORAGE_ENCRYPTION_KEY=STORAGE_KEY_SECRET:latest"
```

---

## 3. High-Availability Bucket Tuning

For enterprise-scale file transfers (files larger than 20GB), tune the MinIO/S3 buckets with the following object lifecycle configurations:

1. **Multi-Part Garbage Collection**: Set a rule to clean up aborted multipart uploads after 24 hours to prevent orphan chunks from consuming disk space.
2. **Version control**: Enable bucket versioning to allow recovery of older document revisions.
3. **Object Locking**: For financial compliance (IFRS/IAS), configure WORMs (Write Once Read Many) on accounting audit logs directories to prohibit modifications.
