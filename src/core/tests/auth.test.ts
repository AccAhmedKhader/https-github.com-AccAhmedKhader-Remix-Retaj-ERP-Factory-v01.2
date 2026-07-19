import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "../security/auth-service";

describe("AuthService Unit Tests", () => {
  const mockUser = {
    id: "USR-001",
    username: "testuser",
    role: "CFO",
    tenantId: "TEN-A",
    branchId: "BR-A-01",
  };

  it("should generate a valid access token", () => {
    const token = AuthService.generateAccessToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = AuthService.verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(mockUser.id);
    expect(decoded?.username).toBe(mockUser.username);
    expect(decoded?.role).toBe(mockUser.role);
    expect(decoded?.tenantId).toBe(mockUser.tenantId);
    expect(decoded?.branchId).toBe(mockUser.branchId);
    expect(decoded?.scopes).toContain("accounting:post");
  });

  it("should generate a valid refresh token", () => {
    const token = AuthService.generateRefreshToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = AuthService.verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(mockUser.id);
    expect(decoded?.username).toBe(mockUser.username);
    expect(decoded?.tenantId).toBe(mockUser.tenantId);
  });

  it("should return null for invalid access token (Negative Test)", () => {
    const invalidToken = "invalid-token-header.invalid-payload.invalid-signature";
    const decoded = AuthService.verifyAccessToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it("should return null for expired/tampered tokens (Negative Test)", () => {
    const token = AuthService.generateAccessToken(mockUser);
    const tamperedToken = token + "tamper";
    const decoded = AuthService.verifyAccessToken(tamperedToken);
    expect(decoded).toBeNull();
  });

  it("should return null for invalid refresh token (Negative Test)", () => {
    const decoded = AuthService.verifyRefreshToken("some-bad-token");
    expect(decoded).toBeNull();
  });
});
