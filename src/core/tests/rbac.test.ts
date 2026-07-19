import { describe, it, expect } from "vitest";
import { SecurityPermissionEngine, UserSession } from "../security/rbac";

describe("SecurityPermissionEngine Unit Tests", () => {
  const cfoSession: UserSession = {
    userId: "USR-CFO",
    username: "cfo_user",
    role: "CFO",
    scopes: ["accounting:read", "accounting:write", "accounting:post", "inventory:read", "hr:read"],
    tenantId: "TEN-A",
    branchId: "BR-A-01",
  };

  const accountantSession: UserSession = {
    userId: "USR-ACCT",
    username: "acct_user",
    role: "SeniorAccountant",
    scopes: ["accounting:read", "accounting:write"],
    tenantId: "TEN-A",
    branchId: "BR-A-01",
  };

  const adminSession: UserSession = {
    userId: "USR-ADMIN",
    username: "admin_user",
    role: "SystemAdmin",
    scopes: ["security:admin"],
    tenantId: "TEN-A",
    branchId: "BR-A-01",
  };

  it("should correctly verify scopes for standard roles", () => {
    expect(SecurityPermissionEngine.hasPermission(cfoSession, "accounting:post")).toBe(true);
    expect(SecurityPermissionEngine.hasPermission(accountantSession, "accounting:post")).toBe(false);
  });

  it("should bypass and grant all permissions to SystemAdmin", () => {
    expect(SecurityPermissionEngine.hasPermission(adminSession, "accounting:post")).toBe(true);
    expect(SecurityPermissionEngine.hasPermission(adminSession, "manufacturing:write")).toBe(true);
  });

  it("should escape HTML input strings (Negative/Sanitizing Test)", () => {
    const raw = "<script>alert('hack');</script>";
    const sanitized = SecurityPermissionEngine.basicHtmlEscape(raw);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("&lt;script&gt;");
  });

  it("should generate deterministic audit signatures using HMAC-SHA256", () => {
    const payload = "CREATED_INVOICE-INV-001";
    const sig1 = SecurityPermissionEngine.generateAuditSignature(payload, "USR-01");
    const sig2 = SecurityPermissionEngine.generateAuditSignature(payload, "USR-01");
    const sig3 = SecurityPermissionEngine.generateAuditSignature(payload, "USR-02");

    expect(sig1).toBe(sig2);
    expect(sig1).not.toBe(sig3);
    expect(sig1).toHaveLength(64); // SHA-256 hex output is always 64 characters long
  });

  it("should verify original payload successfully and reject tampered payloads", () => {
    const payload = "TRANSFER_STOCK-SKU-001-QTY-100";
    const userId = "USR-INV-01";
    const sig = SecurityPermissionEngine.generateAuditSignature(payload, userId);

    // 1. Verify it verifies successfully against itself
    const isValid = SecurityPermissionEngine.verifyAuditSignature(payload, userId, sig);
    expect(isValid).toBe(true);

    // 2. Modify one character in the payload (simulating tampering)
    const tamperedPayload = "TRANSFER_STOCK-SKU-001-QTY-101"; // changed '0' to '1' at the end
    const isTamperedValid = SecurityPermissionEngine.verifyAuditSignature(tamperedPayload, userId, sig);
    expect(isTamperedValid).toBe(false);

    // 3. Modify userId
    const isUserIdTamperedValid = SecurityPermissionEngine.verifyAuditSignature(payload, "USR-INV-02", sig);
    expect(isUserIdTamperedValid).toBe(false);
  });
});
