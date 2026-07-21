import crypto from "crypto";
import { Config } from "../config/env-validation";

function getAuditSigningSecret(): string {
  return Config.AUDIT_SIGNING_SECRET;
}

export type UserRole = 
  | "CFO" 
  | "LeadArchitect" 
  | "SeniorAccountant" 
  | "InventoryManager" 
  | "SystemAdmin" 
  | "POSOperator"
  | "SuperAdmin"
  | "TenantAdmin"
  | "BranchAdmin"
  | "DepartmentManager"
  | "RecordsManager"
  | "Auditor"
  | "ComplianceOfficer"
  | "LegalOfficer"
  | "FinanceManager"
  | "HRManager"
  | "Employee"
  | "ExternalUser"
  | "Guest";

export type ERPScope = 
  | "accounting:write" 
  | "accounting:read" 
  | "accounting:post" 
  | "inventory:write" 
  | "inventory:read" 
  | "hr:write" 
  | "hr:read" 
  | "manufacturing:write" 
  | "manufacturing:read" 
  | "security:admin"
  | "documents:read"
  | "documents:write"
  | "documents:sign"
  | "documents:admin"
  | "PLATFORM_ADMIN_IMPERSONATE_TENANT"
  | "platform:full_access";

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  scopes: ERPScope[];
  tenantId: string;
  branchId: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, ERPScope[]> = {
  CFO: [
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "inventory:read",
    "hr:read",
    "documents:read",
    "documents:write",
    "documents:sign",
    "documents:admin"
  ],
  LeadArchitect: [
    "accounting:read",
    "inventory:read",
    "hr:read",
    "manufacturing:read",
    "security:admin",
    "documents:read",
    "documents:write"
  ],
  SeniorAccountant: [
    "accounting:read",
    "accounting:write",
    "documents:read",
    "documents:write"
  ],
  InventoryManager: [
    "inventory:read",
    "inventory:write",
    "manufacturing:read",
    "documents:read"
  ],
  SystemAdmin: [
    "security:admin",
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "inventory:read",
    "inventory:write",
    "hr:read",
    "hr:write",
    "manufacturing:read",
    "manufacturing:write",
    "documents:read",
    "documents:write",
    "documents:sign",
    "documents:admin",
    "PLATFORM_ADMIN_IMPERSONATE_TENANT"
  ],
  POSOperator: [
    "accounting:write",
    "inventory:read",
    "documents:read"
  ],
  SuperAdmin: [
    "security:admin",
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "inventory:read",
    "inventory:write",
    "hr:read",
    "hr:write",
    "manufacturing:read",
    "manufacturing:write",
    "documents:read",
    "documents:write",
    "documents:sign",
    "documents:admin",
    "PLATFORM_ADMIN_IMPERSONATE_TENANT",
    "platform:full_access"
  ],
  TenantAdmin: [
    "security:admin",
    "documents:admin",
    "documents:read",
    "documents:write",
    "documents:sign"
  ],
  BranchAdmin: [
    "documents:read",
    "documents:write",
    "documents:sign"
  ],
  DepartmentManager: [
    "documents:read",
    "documents:write"
  ],
  RecordsManager: [
    "documents:read",
    "documents:write",
    "documents:admin",
    "documents:sign"
  ],
  Auditor: [
    "accounting:read",
    "inventory:read",
    "hr:read",
    "documents:read"
  ],
  ComplianceOfficer: [
    "security:admin",
    "documents:read",
    "documents:admin"
  ],
  LegalOfficer: [
    "documents:read",
    "documents:sign",
    "documents:admin"
  ],
  FinanceManager: [
    "accounting:read",
    "accounting:write",
    "accounting:post",
    "documents:read"
  ],
  HRManager: [
    "hr:read",
    "hr:write",
    "documents:read"
  ],
  Employee: [
    "documents:read",
    "documents:write"
  ],
  ExternalUser: [
    "documents:read"
  ],
  Guest: [
    "documents:read"
  ]
};

export class SecurityPermissionEngine {
  /**
   * Evaluates if a given user session has authorization for a specific required scope.
   * This is part of our OWASP Top 10 Broken Object Level Authorization (BOLA) and
   * Broken Function Level Authorization (BFLA) mitigation framework.
   */
  public static hasPermission(session: UserSession, requiredScope: ERPScope): boolean {
    return session.scopes.includes(requiredScope);
  }

  /**
   * Escapes HTML special characters in string input to avoid raw XSS injection.
   * This is renamed from sanitizeInput to avoid implying full injection protection.
   */
  public static basicHtmlEscape(input: string): string {
    if (!input) return "";
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/["']/g, "")
      .trim();
  }

  /**
   * Generates a cryptographic audit trail signature using HMAC-SHA256.
   */
  public static generateAuditSignature(payload: string, userId: string): string {
    const secret = getAuditSigningSecret();
    const cleanStr = `${payload}-${userId}`;
    return crypto.createHmac("sha256", secret).update(cleanStr).digest("hex");
  }

  /**
   * Verifies the authenticity and integrity of a cryptographic audit trail signature.
   */
  public static verifyAuditSignature(payload: string, userId: string, signature: string): boolean {
    const expected = this.generateAuditSignature(payload, userId);
    return expected === signature;
  }
}
