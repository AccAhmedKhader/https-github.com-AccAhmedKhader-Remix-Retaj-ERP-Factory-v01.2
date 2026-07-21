import { Request, Response, NextFunction } from "express";
import { AuthService, TokenPayload } from "./auth-service";
import { ERPScope, SecurityPermissionEngine } from "./rbac";
import { getDb, getDbForTenant, tenantContextStore } from "../database/db";
import { auditLogs } from "../database/schema";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Express middleware to authenticate users using short-lived JWT access tokens.
 * Excludes public and auth endpoints.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const url = req.originalUrl;
  
  // Bypass auth for login, refresh, docs, and non-api routes (like frontend static assets)
  if (
    url.startsWith("/api/auth/login") ||
    url.startsWith("/api/auth/refresh") ||
    url === "/api/v1/docs" ||
    !url.startsWith("/api/")
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "فشلت عملية التحقق! رمز الوصول مفقود. يرجى تسجيل الدخول أولاً للوصول للنظام."
      }
    });
  }

  const payload = AuthService.verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "رمز الوصول غير صالح أو انتهت صلاحيته. يرجى استخدام Refresh Token لتجديد الجلسة."
      }
    });
  }

  // Allow overriding tenantId ONLY if user holds explicit PLATFORM_ADMIN_IMPERSONATE_TENANT capability.
  // Otherwise, reject the bypass completely to maintain strict tenant isolation.
  const queryTenantId = req.query.tenantId as string;
  const headerTenantId = req.headers["x-tenant-id"] as string;
  const targetTenantId = queryTenantId || headerTenantId;
  if (targetTenantId && targetTenantId !== payload.tenantId) {
    const hasImpersonationScope = SecurityPermissionEngine.hasPermission(payload, "PLATFORM_ADMIN_IMPERSONATE_TENANT");
    if (hasImpersonationScope) {
      logSecurityAudit(
        payload.userId,
        payload.tenantId,
        "IMPERSONATE_TENANT",
        "sys_sessions",
        payload.userId,
        { targetTenantId, originalTenantId: payload.tenantId }
      ).catch((err: any) => console.error("[Security Audit] Failed to log impersonation:", err));

      payload.tenantId = targetTenantId;
    } else {
      return res.status(403).json({
        success: false,
        error: {
          code: "TENANT_ACCESS_DENIED",
          message: "عذراً، لا تمتلك الصلاحيات الكافية لتغيير نطاق المستأجر (Tenant) أو محاكاة مستأجر آخر."
        }
      });
    }
  }

  // Attach verified user payload directly to request
  (req as AuthenticatedRequest).user = payload;
  
  // Wrap downstream execution in the verified tenant context
  tenantContextStore.run({ tenantId: payload.tenantId }, () => {
    next();
  });
}

/**
 * Role-Based Access Control (RBAC) scope checker
 */
export function requireScope(scope: ERPScope) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "جلسة المستخدم غير معرّفة." }
      });
    }

    const hasPermission = SecurityPermissionEngine.hasPermission(authReq.user, scope);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `عذراً، لا تمتلك الصلاحيات الكافية لإتمام هذا الإجراء. يتطلب نطاق الوصول: [${scope}]`
        }
      });
    }

    next();
  };
}

/**
 * Immutable, cryptographically-signed audit logger middleware
 */
export async function logSecurityAudit(
  userId: string,
  tenantId: string,
  action: string,
  tableName: string,
  recordId: string,
  newValues: any,
  oldValues?: any
): Promise<string | null> {
  try {
    const db = await getDbForTenant(tenantId);
    const timestamp = new Date().toISOString();
    const newValStr = JSON.stringify(newValues);
    const oldValStr = oldValues ? JSON.stringify(oldValues) : null;

    // Generate cryptographic signature to verify audit log integrity (prevents logs tampering)
    const payloadToSign = `${action}-${tableName}-${recordId}-${newValStr}-${tenantId}`;
    const cryptographicSignature = SecurityPermissionEngine.generateAuditSignature(payloadToSign, userId);

    await db.insert(auditLogs).values({
      id: `AUDIT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      tenantId,
      timestamp,
      userId,
      action,
      tableName,
      recordId,
      oldValues: oldValStr,
      newValues: newValStr,
      cryptographicSignature,
    });

    return cryptographicSignature;
  } catch (err) {
    console.error("[Audit Tracker] Failed to write signed audit record:", err);
    return null;
  }
}
