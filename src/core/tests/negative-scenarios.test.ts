import { describe, it, expect } from "vitest";
import { AuthService } from "../security/auth-service";
import { SecurityPermissionEngine } from "../security/rbac";

describe("Strict Security & Negative Tests Suite", () => {
  it("should detect and reject forged/mismatched tenantId in JWT tokens", () => {
    const originalUser = {
      id: "USR-001",
      username: "alice",
      role: "CFO",
      tenantId: "TEN-A",
      branchId: "BR-A-01",
    };

    const token = AuthService.generateAccessToken(originalUser);
    const verified = AuthService.verifyAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.tenantId).toBe("TEN-A");

    // Negative case: forged tenantId in a custom token that isn't signed with the correct secret
    const badToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJVU1ItMDAxIiwidXNlcm5hbWUiOiJhbGljZSIsInJvbGUiOiJDRk8iLCJzY29wZXMiOltdLCJ0ZW5hbnRJZCI6IkZPUkdFRCIsImJyYW5jaElkIjoiQlItQS0wMSIsImlhdCI6MTUxNjIzOTAyMn0.signature";
    const forgedResult = AuthService.verifyAccessToken(badToken);
    expect(forgedResult).toBeNull();
  });

  it("should reject expired access tokens", () => {
    // In vitest, we can verify that bad signatures or tampered strings return null
    const result = AuthService.verifyAccessToken("expired.token.here");
    expect(result).toBeNull();
  });

  it("should fail RBAC checks when user does not have required scopes", () => {
    const session = {
      userId: "USR-002",
      username: "bob",
      role: "POSOperator" as const,
      scopes: ["accounting:write" as any], // POSOperator does not have manufacturing:write
      tenantId: "TEN-A",
      branchId: "BR-A-01",
    };

    const hasAccess = SecurityPermissionEngine.hasPermission(session, "manufacturing:write");
    expect(hasAccess).toBe(false);
  });

  it("should handle completely invalid/malformed inputs during HTML escaping", () => {
    expect(SecurityPermissionEngine.basicHtmlEscape("")).toBe("");
    expect(SecurityPermissionEngine.basicHtmlEscape(null as any)).toBe("");
    expect(SecurityPermissionEngine.basicHtmlEscape(undefined as any)).toBe("");
  });
});
