import { describe, it, expect, vi } from "vitest";
import { EnterpriseDBEngine } from "../database/db-engine";

describe("EnterpriseDBEngine Unit Tests", () => {
  it("should initialize a default tenant state in memory", () => {
    const state = EnterpriseDBEngine.initForTenant("TEN-APEX-01");
    expect(state).toBeDefined();
    expect(state.config.company).toBe("Apex Levant Corp");
    expect(state.accounts.length).toBeGreaterThan(0);
  });

  it("should check double-entry constraints successfully", () => {
    const lines = [
      { accountCode: "10100", debit: 5000, credit: 0 },
      { accountCode: "40100", debit: 0, credit: 5000 },
    ];
    // This should run without throwing since "10100" and "40100" exist in default chart of accounts
    expect(() => {
      EnterpriseDBEngine.checkConstraints(lines as any, undefined, undefined, "TEN-APEX-01");
    }).not.toThrow();
  });

  it("should fail double-entry constraints when account does not exist (Negative Test)", () => {
    const lines = [
      { accountCode: "99999", debit: 5000, credit: 0 }, // Non-existent account code
    ];
    expect(() => {
      EnterpriseDBEngine.checkConstraints(lines as any, undefined, undefined, "TEN-APEX-01");
    }).toThrow(/كود الحساب/);
  });
});
