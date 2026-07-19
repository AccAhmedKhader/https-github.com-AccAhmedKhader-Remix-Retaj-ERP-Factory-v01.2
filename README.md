# ApexSaaS ERP - Enterprise SaaS ERP Factory 🚀

An advanced, production-ready, on-premise Enterprise SaaS ERP platform and autonomous architecture workspace featuring compliance engines, double-entry simulation, AI accounting assistance, and real-time operations.

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + Lucide React + Motion (Animations)
- **Backend**: Node.js + Express + ESBuild (Fast Bundler)
- **Database**: PostgreSQL / Drizzle ORM (Multi-tenant schema isolation)
- **Security**: JWT-based Authentication, Bcrypt Password Hashing, RBAC (Role-Based Access Control)
- **Containerization**: Docker & Docker Compose (On-Premises Ready)

## 📁 Repository Cleanliness & Structure

This repository contains only the official, active React + Express + Drizzle + PostgreSQL stack. All obsolete Django REST prototypes, zipped files, and local `.db` Postgres files have been pruned.

```
/
├── src/                      # React Frontend and DB Schema
│   ├── components/           # UI Modules (Accounting, HR, POS, Manufacturing, Inventory)
│   ├── core/
│   │   └── database/         # Drizzle Schema, Migrations, and Isolation Testing
│   ├── App.tsx               # Main Frontend Entry
│   ├── main.tsx
│   └── types.ts
├── server.ts                 # Express Backend Server (Tenant-Isolated API Router)
├── docker-compose.yml        # Multi-Container Production Orchestration
├── Dockerfile                # Multi-stage optimized Node.js Runner
└── package.json              # Main project description & scripts
```

## 🚀 Quick Start (Local & Docker)

### 🐳 Running via Docker Compose (Recommended)

To launch the entire stack (Express API server, frontend assets, Postgres Database, Redis cache, and Prometheus monitoring) from a clean state:

```bash
docker-compose down -v
docker-compose up --build
```

The system will start, apply migrations automatically, seed default tenant data, and bind to port `3000`.

### 💻 Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`. Note that secrets (`JWT_SECRET` and `JWT_REFRESH_SECRET`) are mandatory for the server to start:
   ```bash
   JWT_SECRET=your_super_secure_random_base64_secret_key
   JWT_REFRESH_SECRET=another_super_secure_random_base64_secret_key
   DATABASE_URL=postgresql://db_user_prod:YOUR_SECURE_PASSWORD_HERE@localhost:5432/erp_production
   ```

3. **Run isolation tests**:
   ```bash
   npm run test:isolation
   ```

4. **Start Dev Server**:
   ```bash
   npm run dev
   ```

## 🛡️ Key Features

- **Strict Relational Multi-Tenancy**: Data is segregated at the query level using explicit `tenantId` fields.
- **Strict Cryptographic Security**: No fallback JWT secrets; mandatory high-entropy keys on start.
- **Double-Entry Verification**: Built-in validation checks to ensure journal entries balance mathematically before posting.
- **Automated Depreciation**: Advanced schedules for assets.
- **Cheque Cycle Management**: Full tracking of cheques.
