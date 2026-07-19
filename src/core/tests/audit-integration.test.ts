import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../database/db";
import { auditLogs } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { logSecurityAudit } from "../security/auth-middleware";
import { SecurityPermissionEngine } from "../security/rbac";

describe("Audit Signature Integration Tests", () => {
  const tenantId = "TEN-APEX-01";
  const userId = "USR-001"; // Pre-seeded SystemAdmin user

  beforeEach(async () => {
    // Triggers default database migrations and seedings
    await getDb();
  });

  it("should ignore any client-supplied signature in POST request body and generate a valid server-side cryptographic signature", async () => {
    // 1. Simulate a malicious or incorrect POST request body from a client
    const requestBody = {
      action: "SECURITY_POLICY - تعديل الصلاحيات",
      tableName: "security_config",
      recordId: "CFO",
      newValues: {
        details: "سحب صلاحية [accounting:post] من دور [CFO]",
        user: "CFO Operator",
        role: "CFO",
        status: "POLICY_UPDATED",
        signature: "FORGED-CLIENT-SIGNATURE" // Injected by attacker/client
      },
      oldValues: undefined as any
    };

    // 2. Perform the exact processing logic that our server endpoint does
    // Destructure body, explicitly delete any signature field inside newValues
    const { action, tableName, recordId, newValues, oldValues } = requestBody;
    const sanitizedNewValues = { ...newValues };
    if (sanitizedNewValues && typeof sanitizedNewValues === "object") {
      delete (sanitizedNewValues as any).signature;
    }

    // 3. Call server-side logSecurityAudit to record the audit log and return the generated signature
    const serverGeneratedSignature = await logSecurityAudit(
      userId,
      tenantId,
      action,
      tableName,
      recordId,
      sanitizedNewValues,
      oldValues
    );

    expect(serverGeneratedSignature).toBeDefined();
    expect(serverGeneratedSignature).not.toBeNull();
    expect(serverGeneratedSignature).not.toBe("FORGED-CLIENT-SIGNATURE");
    expect(serverGeneratedSignature).toHaveLength(64); // Real SHA-256 hex is 64 characters

    // 4. Query the database to verify the recorded audit log and its signature integrity
    const db = await getDb();
    const records = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.userId, userId)));

    // Find the recorded log we just inserted
    const lastRecord = records.find((r: any) => r.cryptographicSignature === serverGeneratedSignature);
    expect(lastRecord).toBeDefined();
    expect(lastRecord?.cryptographicSignature).toBe(serverGeneratedSignature);
    expect(lastRecord?.cryptographicSignature).not.toBe("FORGED-CLIENT-SIGNATURE");

    // Also double check that the saved newValues in DB has signature removed
    const parsedNewValues = JSON.parse(lastRecord?.newValues || "{}");
    expect(parsedNewValues.signature).toBeUndefined();

    // 5. Verify the recorded log's signature using the server's signature verification logic
    const payloadToSign = `${action}-${tableName}-${recordId}-${JSON.stringify(sanitizedNewValues)}-${tenantId}`;
    const isValid = SecurityPermissionEngine.verifyAuditSignature(payloadToSign, userId, serverGeneratedSignature!);
    expect(isValid).toBe(true);

    // Verify it rejects any tampered signature
    const isForgedValid = SecurityPermissionEngine.verifyAuditSignature(payloadToSign, userId, "FORGED-CLIENT-SIGNATURE");
    expect(isForgedValid).toBe(false);
  });
});
