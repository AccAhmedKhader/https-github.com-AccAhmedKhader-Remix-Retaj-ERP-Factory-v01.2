import { describe, it, expect } from "vitest";
import { SecurityPermissionEngine, UserSession, ROLE_PERMISSIONS } from "../security/rbac";

describe("RBAC Privilege Escalation Mitigation Tests (P0-1)", () => {
  it("should prevent TenantAdmin with security:admin from accessing platform impersonation scope", () => {
    // Under the old system, having "security:admin" bypassed and returned true for everything,
    // including the highly critical PLATFORM_ADMIN_IMPERSONATE_TENANT scope.
    const tenantAdminScopes = ROLE_PERMISSIONS["TenantAdmin"];
    expect(tenantAdminScopes).toContain("security:admin");
    expect(tenantAdminScopes).not.toContain("PLATFORM_ADMIN_IMPERSONATE_TENANT");

    const session: UserSession = {
      userId: "USR-TADMIN",
      username: "tenant_admin",
      role: "TenantAdmin",
      scopes: tenantAdminScopes,
      tenantId: "TEN-A",
      branchId: "BR-A-01"
    };

    // Assert that the tenant admin cannot impersonate other tenants
    expect(SecurityPermissionEngine.hasPermission(session, "PLATFORM_ADMIN_IMPERSONATE_TENANT")).toBe(false);
  });

  it("should prevent ComplianceOfficer with security:admin from accessing sensitive unauthorized scopes", () => {
    const complianceOfficerScopes = ROLE_PERMISSIONS["ComplianceOfficer"];
    expect(complianceOfficerScopes).toContain("security:admin");
    expect(complianceOfficerScopes).not.toContain("accounting:post");
    expect(complianceOfficerScopes).not.toContain("hr:write");
    expect(complianceOfficerScopes).not.toContain("PLATFORM_ADMIN_IMPERSONATE_TENANT");

    const session: UserSession = {
      userId: "USR-COMPLIANCE",
      username: "compliance_officer",
      role: "ComplianceOfficer",
      scopes: complianceOfficerScopes,
      tenantId: "TEN-A",
      branchId: "BR-A-01"
    };

    // Assert lack of bypass for sensitive scopes
    expect(SecurityPermissionEngine.hasPermission(session, "accounting:post")).toBe(false);
    expect(SecurityPermissionEngine.hasPermission(session, "hr:write")).toBe(false);
    expect(SecurityPermissionEngine.hasPermission(session, "PLATFORM_ADMIN_IMPERSONATE_TENANT")).toBe(false);
  });

  it("should ensure every role strictly holds only the explicitly mapped permissions", () => {
    // Loop through all defined roles and assert that calling hasPermission on a session with that role's
    // scopes returns true ONLY if the scope is explicitly in that role's ROLE_PERMISSIONS list.
    const roles = Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>;
    
    // We'll define a list of all potential sensitive scopes to verify
    const allScopes = [
      "accounting:write",
      "accounting:read",
      "accounting:post",
      "inventory:write",
      "inventory:read",
      "hr:write",
      "hr:read",
      "manufacturing:write",
      "manufacturing:read",
      "security:admin",
      "documents:read",
      "documents:write",
      "documents:sign",
      "documents:admin",
      "PLATFORM_ADMIN_IMPERSONATE_TENANT",
      "platform:full_access"
    ] as const;

    for (const role of roles) {
      const allowedScopes = ROLE_PERMISSIONS[role];
      const session: UserSession = {
        userId: `USR-${role}`,
        username: `${role.toLowerCase()}_user`,
        role,
        scopes: allowedScopes,
        tenantId: "TEN-A",
        branchId: "BR-A-01"
      };

      for (const scope of allScopes) {
        const expectedResult = allowedScopes.includes(scope);
        expect(SecurityPermissionEngine.hasPermission(session, scope)).toBe(expectedResult);
      }
    }
  });
});
