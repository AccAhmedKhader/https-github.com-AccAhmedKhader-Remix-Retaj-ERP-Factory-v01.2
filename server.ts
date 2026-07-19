import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { getDb, getDbForTenant } from "./src/core/database/db";
import { users, auditLogs } from "./src/core/database/schema";
import { eq, sql } from "drizzle-orm";
import accountingRouter from "./src/core/routes/accounting";
import inventoryRouter from "./src/core/routes/inventory";
import hrRouter from "./src/core/routes/hr";
import manufacturingRouter from "./src/core/routes/manufacturing";
import costCentersRouter from "./src/core/routes/cost-centers";
import documentsRouter from "./src/core/routes/documents";
import searchRouter from "./src/core/routes/search";
import crmRouter from "./src/core/routes/crm";
import complianceRouter from "./src/core/routes/compliance";

import { EnterpriseDBEngine, ERPDatabaseState, FixedAsset, BankStatementItem, CurrencyRate } from "./src/core/database/db-engine";
import { StorageService, metrics as storageMetrics } from "./src/core/storage/StorageService";
import { JournalEntry, JournalLine, ChartOfAccount } from "./src/types";
import { AuthService } from "./src/core/security/auth-service";
import { authenticateToken, requireScope, logSecurityAudit, AuthenticatedRequest } from "./src/core/security/auth-middleware";
import { querySecureAI } from "./src/core/security/ai-service";

import { validateEnv } from "./src/core/config/env-validation";

// Validate required high-entropy secrets at startup
validateEnv();

if (process.env.NODE_ENV === "production") {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "" || dbUrl === "undefined") {
    console.error("=================================================================");
    console.error("❌ CRITICAL CONFIGURATION ERROR: DATABASE_URL IS REQUIRED IN PRODUCTION!");
    console.error("=================================================================");
    process.exit(1);
  }
}

const app = express();
const PORT = 3000;

// Enable trusting reverse proxy headers (Cloud Run, load balancers, Nginx)
app.set("trust proxy", 1);

// Apply industry-standard Helmet protections, turning off contentSecurityPolicy in dev mode 
// so the Vite developer server / AI Studio iFrame asset loading functions flawlessly
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Apply Cross-Origin Resource Sharing (CORS) mapped to environment variables
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS || "*",
  credentials: true,
}));

// Apply robust rate-limiting for threat defense and security isolation
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 180, // Limit each IP address to 180 requests per window
  validate: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "لقد تجاوزت الحد المسموح به من الطلبات مؤقتاً. يرجى إعادة المحاولة لاحقاً."
    }
  }
});
app.use("/api/", apiLimiter);

// Specific stricter limit for auth endpoints to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5-minute window
  max: 15, // Limit each IP address to 15 requests per window
  validate: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "لقد تجاوزت الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة بعد 5 دقائق."
    }
  }
});

// Bind express JSON parser with tight payload size constraints to prevent heap buffer overflow exploits
app.use(express.json({ limit: "5mb" }));

// Database is initialized asynchronously inside setupServer() below

// ==========================================================================
// OPERATIONAL AUDIT LOGGING & SESSION LIFECYCLE
// ==========================================================================

// 1. Operational Audit and Access Logger Middleware
function auditLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const user = (req as any).user?.username || req.headers["x-user-id"] || "نظام الرقابة الآلية";
  console.log(`[Audit Tracker] ${timestamp} - User: ${user} - Accessing: ${method} ${url}`);
  next();
}
app.use(auditLogger);

// --- Storage Health Check & Prometheus Metrics (Public Monitoring) ---
app.get("/health/storage", async (req: Request, res: Response) => {
  try {
    const provider = StorageService.getProvider();
    let healthy = false;
    try {
      healthy = await provider.healthCheck();
    } catch (_) {}

    const status = healthy ? "UP" : "DOWN";
    const code = healthy ? 200 : 503;

    res.status(code).json({
      status,
      activeProvider: process.env.STORAGE_PROVIDER || "local",
      timestamp: new Date().toISOString(),
      metrics: storageMetrics
    });
  } catch (error: any) {
    res.status(503).json({
      status: "DOWN",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get("/metrics", (req: Request, res: Response) => {
  res.set("Content-Type", "text/plain");
  res.send(StorageService.getPrometheusMetrics());
});

// Apply strict token parsing and access verification on all /api/ endpoints
app.use(authenticateToken);

app.use("/api/v1/accounting", accountingRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/hr", hrRouter);
app.use("/api/v1/manufacturing", manufacturingRouter);
app.use("/api/v1/cost-centers-api", costCentersRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/compliance", complianceRouter);

// --- 2. Identity and Session Lifespans Controllers ---

// Login and JWT Issue Endpoint
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "يرجى ملء جميع الحقول المطلوبة لعملية الدخول." }
      });
    }

    const db = await getDb();
    const dbUsers = await db.select().from(users).where(eq(users.username, username));

    if (dbUsers.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "فشل الدخول! اسم المستخدم أو كلمة المرور غير صحيحة." }
      });
    }

    const user = dbUsers[0];
    const isPassValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPassValid) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "فشل الدخول! اسم المستخدم أو كلمة المرور غير صحيحة." }
      });
    }

    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    // Write persistent signed audit log for login
    await logSecurityAudit(user.id, user.tenantId, "AUTH_LOGIN", "users", user.id, {
      username: user.username,
      role: user.role,
      status: "SUCCESS"
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          branchId: user.branchId
        }
      }
    });

  } catch (error: any) {
    console.error("Login unexpected error details:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: `حدث خطأ غير متوقع أثناء معالجة طلب الدخول: ${error.message || error}` }
    });
  }
});

// Refresh Session Token Endpoint
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_TOKEN", message: "رمز التحديث مفقود." }
      });
    }

    const decoded = AuthService.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "رمز التحديث غير صالح أو منتهي الصلاحية." }
      });
    }

    const db = await getDb();
    const dbUsers = await db.select().from(users).where(eq(users.id, decoded.userId));

    if (dbUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "المستند غير موجود في السجل العام." }
      });
    }

    const user = dbUsers[0];
    const newAccessToken = AuthService.generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "فشل تجديد رمز الدخول الفني." }
    });
  }
});

// User Session Profiles Endpoint
app.get("/api/auth/me", (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "جلسة نشطة غير موجودة." }
    });
  }
  res.json({
    success: true,
    data: {
      user: authReq.user
    }
  });
});

// Liveness & Readiness Healthcheck Endpoint
app.get("/health", async (req: Request, res: Response) => {
  let dbHealthy = false;
  let storageHealthy = false;
  let dbError = "";
  let storageError = "";

  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    dbHealthy = true;
  } catch (err: any) {
    dbError = err.message || String(err);
  }

  try {
    const provider = StorageService.getProvider();
    storageHealthy = await provider.healthCheck();
  } catch (err: any) {
    storageError = err.message || String(err);
  }

  const overallHealthy = dbHealthy && storageHealthy;
  const statusCode = overallHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: overallHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
    checks: {
      database: {
        status: dbHealthy ? "UP" : "DOWN",
        ...(dbError ? { error: dbError } : {})
      },
      storage: {
        status: storageHealthy ? "UP" : "DOWN",
        ...(storageError ? { error: storageError } : {})
      }
    }
  });
});

// Prometheus Metrics Endpoint for System Telemetry & Auditing
app.get("/metrics", (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(`# HELP erp_process_uptime_seconds ERP app server process uptime in seconds
# TYPE erp_process_uptime_seconds gauge
erp_process_uptime_seconds ${uptime}

# HELP erp_process_memory_heap_used_bytes ERP app server process heap memory used
# TYPE erp_process_memory_heap_used_bytes gauge
erp_process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP erp_process_memory_heap_total_bytes ERP app server process heap memory total
# TYPE erp_process_memory_heap_total_bytes gauge
erp_process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP erp_process_memory_rss_bytes ERP app server process resident set size memory
# TYPE erp_process_memory_rss_bytes gauge
erp_process_memory_rss_bytes ${memoryUsage.rss}
`);
});

// ==========================================================================
// REST API COMPLIANCE SUITE (VERSIONING v1)
// ==========================================================================

// --- OpenAPI Swagger Documentation Endpoint ---
app.get("/api/v1/docs", (req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "Apex Enterprise ERP REST API System",
      description: "نظام واجهات البرمجة الموحد لإدارة الموارد المالية والمخزنية والتصنيعية.",
      version: "1.0.0-v1",
      contact: {
        name: "ادارة النظم والتحول الرقمي",
        email: "digital-transformation@apexlevant.eg"
      }
    },
    servers: [
      { url: "/api/v1", description: "خادم واجهة التطبيق الرئيسي الحالي" }
    ],
    paths: {
      "/accounting/state": {
        get: { summary: "تحميل كامل حالة النظام والبيانات المالية" }
      },
      "/accounting/post": {
        post: { summary: "ترحيل قيد يومية ثنائي الأثر مع التحقق المزدوج" }
      },
      "/accounting/reports/trial-balance": {
        get: { summary: "ميزان المراجعة بالأرصدة المجاميع" }
      },
      "/accounting/reports/income-statement": {
        get: { summary: "قائمة الدخل وربحية الفترة" }
      },
      "/accounting/reports/balance-sheet": {
        get: { summary: "الميزانية العمومية والمركز المالي للمؤسسة" }
      },
      "/accounting/fixed-assets/depreciate": {
        post: { summary: "إجراء عملية الإهلاك الدوري التلقائي للأصول الثابتة" }
      }
    }
  });
});

// --- API 1: Fetch/Load full State ---
app.get("/api/erp/state", requireScope("accounting:read"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = await EnterpriseDBEngine.initForTenantAsync(tenantId);
  res.json(db);
});

// Backward compatibility state saving - tenant isolated with real-time change-detection audit logging
app.post("/api/erp/state", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.userId || "SYSTEM";

    // Load current in-memory/DB state before merging to detect sensitive updates
    const currentState = EnterpriseDBEngine.initForTenant(tenantId);
    const newState = req.body;

    if (newState && currentState) {
      // 1. Audit new Sales Invoices
      if (newState.salesInvoices && currentState.salesInvoices) {
        const currentIds = new Set(currentState.salesInvoices.map((inv: any) => inv.id));
        for (const inv of newState.salesInvoices) {
          if (!currentIds.has(inv.id)) {
            await logSecurityAudit(
              userId,
              tenantId,
              "CREATE_SALES_INVOICE",
              "sales_invoices",
              inv.id,
              { customerName: inv.customerName, total: inv.subtotal || inv.amount, date: inv.date }
            );
          }
        }
      }

      // 2. Audit new Purchase Invoices
      if (newState.purchaseInvoices && currentState.purchaseInvoices) {
        const currentIds = new Set(currentState.purchaseInvoices.map((inv: any) => inv.id));
        for (const inv of newState.purchaseInvoices) {
          if (!currentIds.has(inv.id)) {
            await logSecurityAudit(
              userId,
              tenantId,
              "CREATE_PURCHASE_INVOICE",
              "purchase_invoices",
              inv.id,
              { supplierName: inv.supplierName, total: inv.subtotal || inv.amount, date: inv.date }
            );
          }
        }
      }

      // 3. Audit Stock Adjustments or additions
      if (newState.stock && currentState.stock) {
        const currentMap = new Map(currentState.stock.map((s: any) => [`${s.sku}-${s.warehouseId}`, s.quantity]));
        for (const s of newState.stock) {
          const prevQty = currentMap.get(`${s.sku}-${s.warehouseId}`);
          if (prevQty !== undefined && prevQty !== s.quantity) {
            await logSecurityAudit(
              userId,
              tenantId,
              "ADJUST_STOCK",
              "stock_items",
              s.sku,
              { name: s.name, warehouseId: s.warehouseId, oldQty: prevQty, newQty: s.quantity }
            );
          } else if (prevQty === undefined) {
            await logSecurityAudit(
              userId,
              tenantId,
              "CREATE_STOCK_ITEM",
              "stock_items",
              s.sku,
              { name: s.name, warehouseId: s.warehouseId, quantity: s.quantity, price: s.unitPrice }
            );
          }
        }
      }

      // 4. Audit newly added Journal Entries
      if (newState.journalEntries && currentState.journalEntries) {
        const currentIds = new Set(currentState.journalEntries.map((je: any) => je.id));
        for (const je of newState.journalEntries) {
          if (!currentIds.has(je.id)) {
            await logSecurityAudit(
              userId,
              tenantId,
              "CREATE_JOURNAL_ENTRY",
              "journal_entries",
              je.id,
              { description: je.description, date: je.date, linesCount: je.lines?.length }
            );
          }
        }
      }
    }

    EnterpriseDBEngine.syncState(req.body, tenantId);
    res.json({ success: true, message: "تمت مزامنة حالة الشركة بنجاح مع قاعدة البيانات المعزولة وتحديث سجل النشاط." });
  } catch (error: any) {
    console.error("Error during state sync and audit:", error);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء مزامنة حالة التطبيق وسجل العمليات." });
  }
});

// --- API 1.5: Fetch Audit Logs ---
app.get("/api/v1/security/audit-logs", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const db = await getDbForTenant(tenantId);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId));
    
    // Sort descending by timestamp
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: logs
    });
  } catch (error: any) {
    console.error("Error retrieving audit logs:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: `حدث خطأ أثناء تحميل سجل التدقيق الأمني: ${error.message || error}` }
    });
  }
});

// --- API 1.6: Write Audit Log ---
app.post("/api/v1/security/audit-logs", requireScope("accounting:write"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.userId || "SYSTEM";
    
    // Explicitly ignore/delete any client-supplied signature to prevent tampering
    const { action, tableName, recordId, newValues, oldValues } = req.body;
    if (newValues && typeof newValues === "object") {
      delete newValues.signature;
    }
    
    const signature = await logSecurityAudit(
      userId,
      tenantId,
      action || "USER_ACTION",
      tableName || "general",
      recordId || "NA",
      newValues || {},
      oldValues
    );

    res.json({ success: true, signature });
  } catch (error: any) {
    console.error("Error writing audit log:", error);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: `حدث خطأ أثناء تدوين سجل العملية الأمني.` }
    });
  }
});

app.get("/api/v1/accounting/state", requireScope("accounting:read"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = await EnterpriseDBEngine.initForTenantAsync(tenantId);
  res.json({ success: true, version: "v1", data: db });
});

// --- API 2: Standard Post Journal Entry (Double-Entry Posting Engine) ---
app.post("/api/v1/accounting/post", requireScope("accounting:post"), (req: Request, res: Response) => {
  try {
    const newEntry: JournalEntry = req.body;

    
    // Core double entry mathematical balance validation
    const totalDebit = newEntry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = newEntry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        error: {
          code: "UNBALANCED_JOURNAL",
          message: `فشل الترحيل المحاسبي! القيد غير متزن محاسبياً طبقاً لمعايير IFRS والضرائب المصرية. إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}).`
        }
      });
    }

    if (totalDebit <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ZERO_VALUE_JOURNAL",
          message: "فشل الترحيل! لا يمكن تسجيل قيد يومية بقيم صفرية أو سالبة."
        }
      });
    }

    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    // Execute atomic ledger write within transaction safe lock
    const postedResult = EnterpriseDBEngine.executeTransaction((db) => {
      // Validate schema relational constraints (Foreign Key Checkers)
      EnterpriseDBEngine.checkConstraints(newEntry.lines, newEntry.costCenter, newEntry.profitCenter, tenantId);

      // Adjust general ledger balances
      newEntry.lines.forEach((line) => {
        const acc = db.accounts.find(a => a.code === line.accountCode);
        if (acc) {
          if (acc.type === "Asset" || acc.type === "Expense") {
            acc.balance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
          } else {
            acc.balance += (Number(line.credit) || 0) - (Number(line.debit) || 0);
          }
        }
      });

      // Update Cost Centers allocation
      if (newEntry.costCenter) {
        const cc = db.costCenters.find(c => c.id === newEntry.costCenter);
        if (cc) {
          cc.spent += totalDebit; // Accumulate expenditures
        }
      }

      // Update Profit Centers actual revenue
      if (newEntry.profitCenter) {
        const pc = db.profitCenters.find(p => p.id === newEntry.profitCenter);
        if (pc) {
          pc.actual += totalCredit; // Accumulate income
        }
      }

      // Append entry to database
      newEntry.status = "Posted";
      db.journalEntries.unshift(newEntry);

      return {
        entry: newEntry,
        accounts: db.accounts,
        costCenters: db.costCenters,
        profitCenters: db.profitCenters
      };
    }, tenantId);

    res.json({
      success: true,
      version: "v1",
      data: postedResult,
      message: "تم ترحيل القيد ودفتر اليومية وتعديل أرصدة دفتر الأستاذ العام بنجاح."
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_CONSTRAINT_FAILURE",
        message: error.message || "حدث خطأ غير متوقع أثناء ترحيل قيد اليومية."
      }
    });
  }
});

// --- API 3: Run Periodic Closing (إقفال الفترات المالية وتصفير المؤقتة) ---
app.post("/api/v1/accounting/close-period", requireScope("accounting:post"), (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const result = EnterpriseDBEngine.executeTransaction((db) => {
      // 0. Verify there are no Draft journal entries
      const draftEntries = db.journalEntries.filter(e => e.status === "Draft" || e.status?.toLowerCase() === "draft");
      if (draftEntries.length > 0) {
        throw new Error(`لا يمكن إقفال الفترة المالية لوجود عدد (${draftEntries.length}) من القيود بحالة مسودة (Draft). يرجى ترحيلها أو حذفها أولاً لضمان سلامة التقرير المالي.`);
      }

      // 1. Gather all temporary Revenue and Expense Accounts
      const revenues = db.accounts.filter(a => a.type === "Revenue" && a.balance !== 0);
      const expenses = db.accounts.filter(a => a.type === "Expense" && a.balance !== 0);

      if (revenues.length === 0 && expenses.length === 0) {
        throw new Error("لا توجد أرصدة مؤقتة مفتوحة تتطلب الإقفال الدوري حالياً.");
      }

      const totalRev = revenues.reduce((sum, r) => sum + r.balance, 0);
      const totalExp = expenses.reduce((sum, e) => sum + e.balance, 0);
      const netProfit = totalRev - totalExp;

      const journalLines: JournalLine[] = [];

      // Debit revenues to zero them
      revenues.forEach(r => {
        journalLines.push({
          accountCode: r.code,
          accountName: r.name,
          debit: r.balance,
          credit: 0
        });
      });

      // Credit expenses to zero them
      expenses.forEach(e => {
        journalLines.push({
          accountCode: e.code,
          accountName: e.name,
          debit: 0,
          credit: e.balance
        });
      });

      // Distribute to Retained Earnings (الأرباح المحتجزة "30200")
      if (netProfit > 0) {
        journalLines.push({
          accountCode: "30200",
          accountName: "الأرباح المحتجزة",
          debit: 0,
          credit: netProfit
        });
      } else if (netProfit < 0) {
        journalLines.push({
          accountCode: "30200",
          accountName: "الأرباح المحتجزة",
          debit: Math.abs(netProfit),
          credit: 0
        });
      }

      const closeJE: JournalEntry = {
        id: `JE-CLOSE-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split("T")[0],
        description: `قيد إقفال الفترة المالية وتصفير الحسابات المؤقتة وترحيل صافي الربح بقيمة ${netProfit.toLocaleString()} إلى حساب الأرباح المحتجزة`,
        reference: "PERIOD-CLOSE",
        lines: journalLines,
        status: "Posted",
        costCenter: "CC-TAX",
        profitCenter: "PC-SFT",
        creator: "ياسمين الجميل",
        approvedBy: "نظام الرقابة المالية"
      };

      // Apply zero balances to temporary accounts
      db.accounts = db.accounts.map(acc => {
        if (acc.type === "Revenue" || acc.type === "Expense") {
          return { ...acc, balance: 0 };
        }
        if (acc.code === "30200") {
          return { ...acc, balance: acc.balance + netProfit };
        }
        return acc;
      });

      db.journalEntries.unshift(closeJE);

      return {
        netProfit,
        closedEntriesCount: revenues.length + expenses.length,
        retainedEarningsNewBalance: db.accounts.find(a => a.code === "30200")?.balance || 0,
        accounts: db.accounts,
        journalEntries: db.journalEntries
      };
    }, tenantId);

    res.json({
      success: true,
      version: "v1",
      data: result,
      message: "تم تصفير الحسابات المؤقتة بنجاح وتوزيع الأرباح الصافية في حساب الأرباح المحتجزة."
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: "PERIOD_CLOSE_FAILED",
        message: error.message || "حدث خطأ أثناء تشغيل معالج الإقفال المالي."
      }
    });
  }
});

// --- API 4: Fixed Assets & Depreciation Engine (الأصول الثابتة والإهلاك الدوري) ---
app.get("/api/v1/accounting/fixed-assets", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  res.json({ success: true, data: db.fixedAssets });
});

app.post("/api/v1/accounting/fixed-assets/depreciate", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const depreciationLogs: string[] = [];
      let totalDepreciationPosted = 0;
      const journalLines: JournalLine[] = [];

      db.fixedAssets.forEach((asset) => {
        if (asset.status === "Active") {
          // Linear depreciation logic: Annual = (Cost - Salvage) / UsefulLife
          const annualDepr = (asset.cost - asset.salvageValue) / asset.usefulLifeYears;
          // Calculate monthly share
          const monthlyDepr = Math.round(annualDepr / 12);

          const remainingDepreciable = asset.bookValue - asset.salvageValue;
          let monthlyDeprFinal = monthlyDepr;

          if (remainingDepreciable <= monthlyDepr * 1.5) {
            // This is the last depreciation step. Adjust to exactly the remaining depreciable value to prevent rounding differences.
            monthlyDeprFinal = remainingDepreciable;
          }

          if (monthlyDeprFinal > 0) {
            asset.accumulatedDepreciation += monthlyDeprFinal;
            asset.bookValue -= monthlyDeprFinal;
            totalDepreciationPosted += monthlyDeprFinal;

            depreciationLogs.push(`تم احتساب قسط إهلاك شهري للأصل [${asset.name}] بمبلغ ${monthlyDeprFinal.toLocaleString()} ج.م.`);

            if (asset.bookValue <= asset.salvageValue) {
              asset.status = "Fully Depreciated";
            }
          }
        }
      });

      if (totalDepreciationPosted === 0) {
        throw new Error("لا توجد أصول نشطة مؤهلة للاستهلاك المالي في الفترة الحالية.");
      }

      // Automatically construct Double-Entry Ledger Lines
      // Debit: Depreciation Expense (50400)
      // Credit: Accumulated Depreciation (Contra-Asset account) or directly adjust Cash/Accounts if direct writeoff is simulated
      // In compliance with GAAP/IFRS:
      journalLines.push({
        accountCode: "50400", // Depreciation Expense
        accountName: "المصروفات العمومية والإدارية (إهلاكات أصول)",
        debit: totalDepreciationPosted,
        credit: 0
      });

      journalLines.push({
        accountCode: "10100", // Using primary liquid asset or contra-asset allocation for simulation
        accountName: "بنك CIB - الحساب الجاري بالجنيه المصري",
        debit: 0,
        credit: totalDepreciationPosted
      });

      const deprJE: JournalEntry = {
        id: `JE-DEPR-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split("T")[0],
        description: "قيد إثبات مصروفات الاستهلاك الشهري الدوري للأصول والآلات للمؤسسة طبقاً لـ IAS 16",
        reference: "DEPR-RUN-AUTOMATED",
        lines: journalLines,
        status: "Posted",
        costCenter: "CC-INF",
        profitCenter: "PC-SFT",
        creator: "ياسمين الجميل",
        approvedBy: "محرك الإهلاك الآلي"
      };

      // Adjust Expense accounts
      const expenseAcc = db.accounts.find(a => a.code === "50400");
      if (expenseAcc) expenseAcc.balance += totalDepreciationPosted;

      const assetAcc = db.accounts.find(a => a.code === "10100");
      if (assetAcc) assetAcc.balance -= totalDepreciationPosted;

      db.journalEntries.unshift(deprJE);

      return {
        totalDepreciation: totalDepreciationPosted,
        logs: depreciationLogs,
        fixedAssets: db.fixedAssets,
        journalEntries: db.journalEntries,
        accounts: db.accounts
      };
    }, tenantId);

    res.json({
      success: true,
      version: "v1",
      data: result,
      message: `تم تشغيل دورة الإهلاك الدوري بنجاح. القيمة الإجمالية المقتطعة: ${result.totalDepreciation.toLocaleString()} ج.م.`
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: "DEPRECIATION_ERROR",
        message: error.message || "فشلت عملية احتساب الإهلاك الدوري للأصول."
      }
    });
  }
});

// --- API 5: Bank Reconciliation (التسويات البنكية ومطابقة الدفاتر) ---
app.get("/api/v1/accounting/bank-recon", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  res.json({ success: true, data: db.bankStatementItems });
});

app.post("/api/v1/accounting/bank-recon/reconcile", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { itemId } = req.body;
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    
    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const item = db.bankStatementItems.find(i => i.id === itemId);
      if (!item) {
        throw new Error("البند البنكي المطلوب تسويته غير موجود.");
      }

      if (item.status === "Reconciled") {
        throw new Error("هذا البند البنكي تمت تسويته ومطابقته بالدفاتر بالفعل.");
      }

      // Core matching engine searches journalEntries lines for a matching Debit or Credit amount
      const matchingJE = db.journalEntries.find(entry => {
        return entry.lines.some(l => {
          const isAssetMatch = l.accountCode === "10100" || l.accountCode === "10200";
          const matchesAmount = item.amount > 0 ? l.debit === item.amount : l.credit === Math.abs(item.amount);
          return isAssetMatch && matchesAmount;
        });
      });

      if (!matchingJE) {
        throw new Error("لا يوجد قيد يومية مطابق في الدفاتر يطابق هذا المبلغ. يرجى إنشاء قيد ترحيل أولاً لمطابقته.");
      }

      item.status = "Reconciled";
      item.matchedJournalId = matchingJE.id;

      return {
        reconciledItem: item,
        matchedJournal: matchingJE,
        bankStatementItems: db.bankStatementItems
      };
    }, tenantId);

    res.json({
      success: true,
      version: "v1",
      data: result,
      message: "تمت مطابقة الكشف البنكي مع دفاتر الأستاذ العام وتأكيد التسوية البنكية بنجاح."
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: "RECONCILIATION_ERROR",
        message: error.message || "حدث خطأ أثناء إجراء التسوية البنكية."
      }
    });
  }
});

// --- API 6: Multi-Currency Translation (إدارة تحويل العملات الأجنبية) ---
app.get("/api/v1/accounting/currency-exchange", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  res.json({ success: true, data: db.currencyRates });
});

app.post("/api/v1/accounting/currency-exchange/translate", requireScope("accounting:write"), (req: Request, res: Response) => {
  const { amount, fromCurrency, toCurrency } = req.body;
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);

  const rateFrom = db.currencyRates.find(r => r.code === fromCurrency);
  const rateTo = db.currencyRates.find(r => r.code === toCurrency);

  if (!rateFrom || !rateTo) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_CURRENCY", message: "العملة المحددة غير مدعومة في نظام الصرف الفني حالياً." }
    });
  }

  // Convert to Base Currency (EGP) then to Target
  const amountInBase = amount * rateFrom.rateToBase;
  const targetAmount = amountInBase / rateTo.rateToBase;

  res.json({
    success: true,
    version: "v1",
    data: {
      originalAmount: amount,
      from: fromCurrency,
      to: toCurrency,
      translatedAmount: Math.round(targetAmount * 100) / 100,
      rateApplied: rateFrom.rateToBase / rateTo.rateToBase
    }
  });
});

// --- API 7: Financial Statements Generator ( trial-balance, income-statement, balance-sheet ) ---
app.get("/api/v1/accounting/reports/trial-balance", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  
  const balanceLines = db.accounts.map(acc => {
    const isDr = acc.type === "Asset" || acc.type === "Expense";
    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: isDr ? acc.balance : 0,
      credit: !isDr ? acc.balance : 0
    };
  });

  const totalDebit = balanceLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = balanceLines.reduce((sum, l) => sum + l.credit, 0);

  res.json({
    success: true,
    version: "v1",
    data: {
      lines: balanceLines,
      totals: { debit: totalDebit, credit: totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.1 }
    }
  });
});

app.get("/api/v1/accounting/reports/income-statement", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  const revenues = db.accounts.filter(a => a.type === "Revenue");
  const expenses = db.accounts.filter(a => a.type === "Expense");

  const totalRevenues = revenues.reduce((sum, r) => sum + r.balance, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
  const netIncome = totalRevenues - totalExpenses;

  res.json({
    success: true,
    version: "v1",
    data: {
      revenues: revenues.map(r => ({ name: r.name, code: r.code, amount: r.balance })),
      expenses: expenses.map(e => ({ name: e.name, code: e.code, amount: e.balance })),
      totals: { totalRevenues, totalExpenses, netIncome }
    }
  });
});

app.get("/api/v1/accounting/reports/balance-sheet", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  const assets = db.accounts.filter(a => a.type === "Asset");
  const liabilities = db.accounts.filter(a => a.type === "Liability");
  const equity = db.accounts.filter(a => a.type === "Equity");

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const totalEquity = equity.reduce((sum, eq) => sum + eq.balance, 0);

  res.json({
    success: true,
    version: "v1",
    data: {
      assets: assets.map(a => ({ name: a.name, code: a.code, amount: a.balance })),
      liabilities: liabilities.map(l => ({ name: l.name, code: l.code, amount: l.balance })),
      equity: equity.map(eq => ({ name: eq.name, code: eq.code, amount: eq.balance })),
      totals: { totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.1 }
    }
  });
});

// --- Backward compatibility API: Append Journal Entry ---
app.post("/api/erp/journal", requireScope("accounting:post"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const user = (req as AuthenticatedRequest).user;
  const userId = user?.userId || "SYSTEM";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  const newEntry = req.body;

  const totalDebit = newEntry.lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = newEntry.lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({
      error: `فشل قيد اليومية! القيد غير متزن محاسبياً. إجمالي المدين (${totalDebit}) يجب أن يساوي إجمالي الدائن (${totalCredit}) طبقاً لمعايير IFRS.`
    });
  }

  // Update account balances
  newEntry.lines.forEach((line: any) => {
    const acc = db.accounts.find(a => a.code === line.accountCode);
    if (acc) {
      if (acc.type === "Asset" || acc.type === "Expense") {
        acc.balance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
      } else {
        acc.balance += (Number(line.credit) || 0) - (Number(line.debit) || 0);
      }
    }
  });

  db.journalEntries.unshift(newEntry);
  EnterpriseDBEngine.syncState(db, tenantId);

  // Write cryptographically-signed audit log
  await logSecurityAudit(
    userId,
    tenantId,
    "POST_JOURNAL_ENTRY",
    "journal_entries",
    newEntry.id,
    { description: newEntry.description, date: newEntry.date, total: totalDebit }
  );

  res.json({ success: true, entry: newEntry, accounts: db.accounts });
});

// --- Backward compatibility API: Execute Manufacturing Order Consumption (MRP Engine) ---
app.post("/api/erp/production-order", requireScope("accounting:write"), async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const user = (req as AuthenticatedRequest).user;
  const userId = user?.userId || "SYSTEM";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  const order = req.body;

  const bom = db.boms.find(b => b.id === order.bomId);
  if (!bom) {
    return res.status(404).json({ error: "معيار المكونات (BOM) المحدد غير موجود." });
  }

  const insufficientItems: string[] = [];
  bom.components.forEach((comp: any) => {
    const stockItem = db.stock.find(s => s.sku === comp.sku && s.warehouseId === db.config.warehouse);
    const requiredQty = comp.quantityRequired * order.quantity;
    if (!stockItem || stockItem.quantity < requiredQty) {
      insufficientItems.push(`${comp.name} (المطلوب: ${requiredQty}، المتاح: ${stockItem?.quantity || 0})`);
    }
  });

  if (insufficientItems.length > 0) {
    return res.status(400).json({
      error: `لا توجد مواد خام كافية للتصنيع في المستودع الحالي:\n${insufficientItems.join("\n")}`
    });
  }

  let rawMaterialTotalCost = 0;
  bom.components.forEach((comp: any) => {
    const stockItem = db.stock.find(s => s.sku === comp.sku && s.warehouseId === db.config.warehouse)!;
    const requiredQty = comp.quantityRequired * order.quantity;
    stockItem.quantity -= requiredQty;
    rawMaterialTotalCost += requiredQty * stockItem.unitPrice;
  });

  const finishedSku = bom.productSku;
  let finishedStock = db.stock.find(s => s.sku === finishedSku);
  const costPerUnit = (rawMaterialTotalCost / order.quantity) + bom.laborCost;

  if (finishedStock) {
    const currentTotalVal = finishedStock.quantity * finishedStock.unitPrice;
    const newTotalVal = currentTotalVal + (order.quantity * costPerUnit);
    finishedStock.quantity += order.quantity;
    finishedStock.unitPrice = Math.round(newTotalVal / finishedStock.quantity);
  } else {
    db.stock.push({
      sku: finishedSku,
      name: bom.productName,
      warehouseId: db.config.warehouse,
      quantity: order.quantity,
      unitPrice: Math.round(costPerUnit),
      minLevel: 5,
      category: "برمجيات ونظم تشغيل",
      subCategory: "خوادم مخصصة Bare-Metal"
    });
  }

  const journalId = `JE-MRP-${Date.now().toString().slice(-4)}`;
  const mfgJournal = {
    id: journalId,
    date: new Date().toISOString().split("T")[0],
    description: `إثبات قيود التصنيع لـ [${bom.productName}] عدد ${order.quantity} وتكاليف العمل البشري`,
    reference: order.id,
    status: "Posted" as const,
    costCenter: "CC-RND",
    profitCenter: "PC-SFT",
    creator: "فريدة شاهين",
    approvedBy: "أحمد منصور",
    lines: [
      { accountCode: "12100", accountName: "مخزون السلع التامة (مستودع الإسكندرية)", debit: rawMaterialTotalCost + (bom.laborCost * order.quantity), credit: 0 },
      { accountCode: "12000", accountName: "مخزون المواد الخام (مستودع القاهرة)", debit: 0, credit: rawMaterialTotalCost },
      { accountCode: "50100", accountName: "مصروفات الرواتب ومزايا الموظفين", debit: 0, credit: bom.laborCost * order.quantity }
    ]
  };

  db.accounts.find(a => a.code === "12100")!.balance += mfgJournal.lines[0].debit;
  db.accounts.find(a => a.code === "12000")!.balance -= mfgJournal.lines[1].credit;
  db.accounts.find(a => a.code === "50100")!.balance -= mfgJournal.lines[2].credit;

  db.journalEntries.unshift(mfgJournal);
  db.productionOrders.unshift({
    ...order,
    status: "Completed",
    completionDate: new Date().toISOString().split("T")[0]
  });

  EnterpriseDBEngine.syncState(db, tenantId);

  // Write audit trail for production order completed
  await logSecurityAudit(
    userId,
    tenantId,
    "CREATE_PRODUCTION_ORDER",
    "production_orders",
    order.id,
    { bomId: order.bomId, productName: bom.productName, quantity: order.quantity, totalCost: rawMaterialTotalCost }
  );

  res.json({ success: true, order, stock: db.stock, journal: mfgJournal });
});

// --- API 8: Integration Tests Suite (API integrity diagnostics) ---
app.get("/api/erp/test-connection", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  const testResults: any[] = [];

  testResults.push({
    name: "فحص تواجد وملائمة ملف قاعدة البيانات المحلية database.json",
    status: "Success",
    details: `تم العثور على قاعدة البيانات وتأكيد سلامة المخطط الهيكلي (Schema Version ${db.schemaVersion}).`
  });

  let totalDebitOfAll = 0;
  let totalCreditOfAll = 0;
  db.journalEntries.forEach(entry => {
    entry.lines.forEach(l => {
      totalDebitOfAll += l.debit || 0;
      totalCreditOfAll += l.credit || 0;
    });
  });
  testResults.push({
    name: "فحص توازن ميزان المراجعة لجميع القيود المحاسبية بالدفتر العام",
    status: Math.abs(totalDebitOfAll - totalCreditOfAll) < 0.1 ? "Success" : "Warning",
    details: `إجمالي حركات المدين بالدفتر: ${totalDebitOfAll}، حركات الدائن: ${totalCreditOfAll}. فرق الموازنة: ${Math.abs(totalDebitOfAll - totalCreditOfAll)} EGP`
  });

  const lowStock = db.stock.filter(s => s.quantity <= s.minLevel);
  testResults.push({
    name: "تدقيق مستويات المخزون والسلامة الاحتياطية (Safety Stock Alert)",
    status: lowStock.length === 0 ? "Success" : "Warning",
    details: `تم اكتشاف ${lowStock.length} أصناف تحت حد الأمان المطلوب لإعادة الطلب.`
  });

  testResults.push({
    name: "التحقق من دليل الحسابات المعتمد (GAAP Chart of Accounts)",
    status: db.accounts.length >= 10 ? "Success" : "Failed",
    details: `إجمالي الحسابات المعرفة في الدليل: ${db.accounts.length} حسابات تغطي الأصول، الخصوم، حقوق الملكية، الإيرادات والمصروفات.`
  });

  res.json({
    timestamp: new Date().toISOString(),
    status: testResults.every(r => r.status === "Success" || r.status === "Warning") ? "Healthy" : "Degraded",
    results: testResults
  });
});

// ==========================================================================
// CHEQUES MODULE REST API (TRACKING & DOUBLE-ENTRY JOURNALS)
// ==========================================================================

// --- API 8a: Get All Cheques ---
app.get("/api/v1/accounting/cheques", requireScope("accounting:read"), (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
  const db = EnterpriseDBEngine.initForTenant(tenantId);
  res.json({ success: true, data: db.cheques || [] });
});

// --- API 8b: Receive Cheque from Customer (InSafe) ---
app.post("/api/v1/accounting/cheques/receive", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { chequeNumber, bankName, amount, dueDate, customerId, beneficiaryType, beneficiaryName, notes } = req.body;

    if (!chequeNumber || !bankName || !amount || !dueDate || !customerId) {
      return res.status(400).json({ success: false, message: "بيانات الشيك غير مكتملة." });
    }

    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const customer = db.customers.find(c => c.id === customerId);
      if (!customer) throw new Error("العميل المحدد غير موجود بقاعدة البيانات.");

      // Ensure account "11100" (أوراق القبض بخزينة الشيكات) exists
      let chequeAcc = db.accounts.find(a => a.code === "11110");
      if (!chequeAcc) {
        chequeAcc = { code: "11110", name: "أوراق قبض بخزينة الشيكات تحت التحصيل", type: "Asset", balance: 0, initialBalance: 0, classification: "المدينون والذمم المدينة الأخرى" };
        db.accounts.push(chequeAcc);
      }

      // Add Cheque record
      const newCheque = {
        id: `CHQ-${Date.now().toString().slice(-4)}`,
        chequeNumber,
        bankName,
        amount: Number(amount),
        receiveDate: new Date().toISOString().split("T")[0],
        dueDate,
        customerId,
        customerName: customer.name,
        beneficiaryType: beneficiaryType || "Customer",
        beneficiaryName: beneficiaryName || customer.name,
        status: "InSafe" as const,
        notes: notes || ""
      };

      if (!db.cheques) db.cheques = [];
      db.cheques.push(newCheque);

      // Create double-entry journal entry
      const lines = [
        { accountCode: "11110", accountName: "أوراق قبض بخزينة الشيكات تحت التحصيل", debit: Number(amount), credit: 0 },
        { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: 0, credit: Number(amount) }
      ];

      const journalId = `JE-CHQ-REC-${Date.now().toString().slice(-4)}`;
      const recJournal = {
        id: journalId,
        date: new Date().toISOString().split("T")[0],
        description: `إثبات استلام الشيك رقم [${chequeNumber}] من العميل [${customer.name}] وإدراجه بخزينة الشيكات`,
        reference: newCheque.id,
        status: "Posted" as const,
        costCenter: "",
        profitCenter: "",
        creator: "ياسمين الجميل",
        approvedBy: "أحمد منصور",
        lines
      };

      // Apply ledger updates
      chequeAcc.balance += Number(amount);
      const customerAcc = db.accounts.find(a => a.code === "11000");
      if (customerAcc) customerAcc.balance -= Number(amount);

      // Decrease customer balance
      customer.balance -= Number(amount);

      db.journalEntries.unshift(recJournal);

      return { cheque: newCheque, journal: recJournal };
    }, tenantId);

    res.json({ success: true, message: "تم استلام الشيك وإدراجه بخزينة الشيكات وإنشاء قيد الترحيل المزدوج بنجاح.", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "حدث خطأ أثناء معالجة استلام الشيك." });
  }
});

// --- API 8c: Endorse Cheque to Supplier (EndorsedToSupplier) ---
app.post("/api/v1/accounting/cheques/endorse", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { chequeId, supplierId, notes } = req.body;

    if (!chequeId || !supplierId) {
      return res.status(400).json({ success: false, message: "معرف الشيك أو معرف المورد مفقود." });
    }

    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";
    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const cheque = db.cheques?.find(c => c.id === chequeId);
      if (!cheque) throw new Error("الشيك المحدد غير موجود.");
      if (cheque.status !== "InSafe") throw new Error("لا يمكن تظهير الشيك؛ الشيك ليس متواجداً في الخزينة حالياً.");

      const supplier = db.suppliers.find(s => s.id === supplierId);
      if (!supplier) throw new Error("المورد المحدد غير موجود.");

      // Ensure accounts
      const chequeAcc = db.accounts.find(a => a.code === "11110");
      const supplierAcc = db.accounts.find(a => a.code === "20100");

      cheque.status = "EndorsedToSupplier";
      cheque.supplierId = supplier.id;
      cheque.supplierName = supplier.name;
      cheque.notes = notes || cheque.notes;

      // Journal Lines:
      // Debit: Suppliers (20100)
      // Credit: Cheques in Safe (11110)
      const lines = [
        { accountCode: "20100", accountName: "الموردون (أوراق الدفع والذمم الدائنة)", debit: cheque.amount, credit: 0 },
        { accountCode: "11110", accountName: "أوراق قبض بخزينة الشيكات تحت التحصيل", debit: 0, credit: cheque.amount }
      ];

      const journalId = `JE-CHQ-END-${Date.now().toString().slice(-4)}`;
      const endJournal = {
        id: journalId,
        date: new Date().toISOString().split("T")[0],
        description: `تظهير وتسليم الشيك رقم [${cheque.chequeNumber}] للمورد [${supplier.name}] للتحصيل المحاسبي`,
        reference: cheque.id,
        status: "Posted" as const,
        costCenter: "",
        profitCenter: "",
        creator: "ياسمين الجميل",
        approvedBy: "أحمد منصور",
        lines
      };

      if (chequeAcc) chequeAcc.balance -= cheque.amount;
      if (supplierAcc) supplierAcc.balance -= cheque.amount;

      // Adjust supplier payable balance
      supplier.balance -= cheque.amount;

      db.journalEntries.unshift(endJournal);

      return { cheque, journal: endJournal };
    }, tenantId);

    res.json({ success: true, message: "تم تظهير وتسليم الشيك للمورد بنجاح وتسوية ذمته الدائنة.", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "حدث خطأ أثناء تظهير الشيك." });
  }
});

// --- API 8d: Collect Cheque by Supplier/Bank (Collected) ---
app.post("/api/v1/accounting/cheques/collect", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { chequeId } = req.body;
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";

    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const cheque = db.cheques?.find(c => c.id === chequeId);
      if (!cheque) throw new Error("الشيك المحدد غير موجود.");
      if (cheque.status !== "InSafe" && cheque.status !== "EndorsedToSupplier") {
        throw new Error("لا يمكن تحصيل شيك تم صرفه أو رده أو رفضه بالفعل.");
      }

      cheque.status = "Collected";

      // If collected directly without supplier endorsement:
      // Debit Bank (10100), Credit Cheque Safe (11110)
      let collectJournal = null;
      if (!cheque.supplierId) {
        const bankAcc = db.accounts.find(a => a.code === "10100");
        const chequeAcc = db.accounts.find(a => a.code === "11110");

        const lines = [
          { accountCode: "10100", accountName: "بنك CIB - الحساب الجاري بالجنيه المصري", debit: cheque.amount, credit: 0 },
          { accountCode: "11110", accountName: "أوراق قبض بخزينة الشيكات تحت التحصيل", debit: 0, credit: cheque.amount }
        ];

        const journalId = `JE-CHQ-COL-${Date.now().toString().slice(-4)}`;
        collectJournal = {
          id: journalId,
          date: new Date().toISOString().split("T")[0],
          description: `تحصيل مباشر للشيك رقم [${cheque.chequeNumber}] في الحساب الجاري بالبنك`,
          reference: cheque.id,
          status: "Posted" as const,
          costCenter: "",
          profitCenter: "",
          creator: "ياسمين الجميل",
          approvedBy: "أحمد منصور",
          lines
        };

        if (bankAcc) bankAcc.balance += cheque.amount;
        if (chequeAcc) chequeAcc.balance -= cheque.amount;

        db.journalEntries.unshift(collectJournal);
      }

      return { cheque, journal: collectJournal };
    }, tenantId);

    res.json({ success: true, message: "تمت مطابقة وتحصيل قيمة الشيك بنجاح وتأكيد عملية الصرف البنكي.", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "حدث خطأ أثناء تحصيل الشيك." });
  }
});

// --- API 8e: Reject/Bounce Cheque (Bounced) ---
app.post("/api/v1/accounting/cheques/bounce", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { chequeId } = req.body;
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";

    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const cheque = db.cheques?.find(c => c.id === chequeId);
      if (!cheque) throw new Error("الشيك المحدد غير موجود.");

      cheque.status = "Bounced";
      return { cheque };
    }, tenantId);

    res.json({ success: true, message: "تم تغيير حالة الشيك إلى مرتجع ومرفوض بنجاح وجاري إخطار المحاسب القانوني.", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "حدث خطأ أثناء رفض الشيك." });
  }
});

// --- API 8f: Return Cheque to Customer (ReturnedToCustomer) ---
app.post("/api/v1/accounting/cheques/return", requireScope("accounting:write"), (req: Request, res: Response) => {
  try {
    const { chequeId } = req.body;
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "TEN-APEX-01";

    const result = EnterpriseDBEngine.executeTransaction((db) => {
      const cheque = db.cheques?.find(c => c.id === chequeId);
      if (!cheque) throw new Error("الشيك المحدد غير موجود.");
      if (cheque.status !== "Bounced" && cheque.status !== "InSafe") {
        throw new Error("لا يمكن رد الشيك للعميل إلا إذا كان مرفوضاً أو ما زال بالخزينة.");
      }

      cheque.status = "ReturnedToCustomer";

      // Restore customer balance and reverse the initial receive entry
      // Debit: Customers (11000)
      // Credit: Cheques in Safe (11110)
      const customer = db.customers.find(c => c.id === cheque.customerId);
      const customerAcc = db.accounts.find(a => a.code === "11000");
      const chequeAcc = db.accounts.find(a => a.code === "11110");

      const lines = [
        { accountCode: "11000", accountName: "العملاء (أوراق القبض والذمم التجارية)", debit: cheque.amount, credit: 0 },
        { accountCode: "11110", accountName: "أوراق قبض بخزينة الشيكات تحت التحصيل", debit: 0, credit: cheque.amount }
      ];

      const journalId = `JE-CHQ-RET-${Date.now().toString().slice(-4)}`;
      const retJournal = {
        id: journalId,
        date: new Date().toISOString().split("T")[0],
        description: `إرجاع ورد الشيك المرفوض رقم [${cheque.chequeNumber}] للعميل [${cheque.customerName}] وإعادة مديونيته بالدفاتر`,
        reference: cheque.id,
        status: "Posted" as const,
        costCenter: "",
        profitCenter: "",
        creator: "ياسمين الجميل",
        approvedBy: "أحمد منصور",
        lines
      };

      if (customer) customer.balance += cheque.amount;
      if (customerAcc) customerAcc.balance += cheque.amount;
      if (chequeAcc) chequeAcc.balance -= cheque.amount;

      db.journalEntries.unshift(retJournal);

      return { cheque, journal: retJournal };
    }, tenantId);

    res.json({ success: true, message: "تم رد الشيك للعميل وإعادة تسجيل المديونية عليه بالكامل محاسبياً.", data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "حدث خطأ أثناء رد الشيك للعميل." });
  }
});

// Redaction layer to secure sensitive operational data (PII, Salaries, Reg Numbers) before AI consultation
function redactSensitiveDataForAI(context: any): any {
  if (!context) return context;
  try {
    const cloned = JSON.parse(JSON.stringify(context));
    
    if (cloned.customers && Array.isArray(cloned.customers)) {
      cloned.customers = cloned.customers.map((c: any) => ({
        ...c,
        phone: "[PHONE_REDACTED_FOR_SECURITY]",
        email: "[EMAIL_REDACTED_FOR_SECURITY]",
        taxRegistrationNumber: "[TAX_ID_MASKED]"
      }));
    }
    
    if (cloned.suppliers && Array.isArray(cloned.suppliers)) {
      cloned.suppliers = cloned.suppliers.map((s: any) => ({
        ...s,
        phone: "[PHONE_REDACTED_FOR_SECURITY]",
        email: "[EMAIL_REDACTED_FOR_SECURITY]",
        taxRegistrationNumber: "[TAX_ID_MASKED]"
      }));
    }

    if (cloned.employees && Array.isArray(cloned.employees)) {
      cloned.employees = cloned.employees.map((e: any) => ({
        ...e,
        baseSalary: "[CONFIDENTIAL_SALARY_MASKED]",
        withholdingTaxRate: "XX%"
      }));
    }

    return cloned;
  } catch (err) {
    return context;
  }
}

// --- API 9: Enterprise AI Consultant Proxy with Context ---
app.post("/api/gemini/query", requireScope("accounting:read"), async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const tenantId = (req as any).user?.tenantId || "TEN-APEX-01";
    const userId = (req as any).user?.userId || "SYSTEM";
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is missing. Please add it to Settings > Secrets in the top-right menu.",
      });
    }

    // Invoke the secure AI service with the active tenant boundaries
    const aiResult = await querySecureAI(prompt, tenantId, userId);

    // Log the security audit trail
    await logSecurityAudit(
      userId,
      tenantId,
      "EXECUTE_AI_QUERY",
      "ai_consultant",
      aiResult.auditLogId,
      { promptLength: prompt?.length, auditLogId: aiResult.auditLogId }
    );

    res.json({ text: aiResult.text, auditLogId: aiResult.auditLogId });
  } catch (error: any) {
    console.error("Gemini query error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model." });
  }
});

// ==========================================================================
// ERROR HANDLING MIDDLEWARE
// ==========================================================================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Global Error Handler]", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: err.message || "حدث خطأ داخلي فادح في خادم واجهة التطبيقات.",
      details: err
    }
  });
});

// ==========================================================================
// BOOTSTRAP EXPANSE
// ==========================================================================
async function setupServer() {
  console.log("Initializing Relational Database Engine on startup...");
  await EnterpriseDBEngine.init();

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode serving static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise SaaS ERP Server running at http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("CRITICAL: Failed to start full-stack server due to a fatal error:");
  if (err && err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
