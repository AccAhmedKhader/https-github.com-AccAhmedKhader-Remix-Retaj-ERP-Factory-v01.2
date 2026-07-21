import { describe, it, expect, beforeAll, vi } from "vitest";
import dotenv from "dotenv";
import { AclEngine } from "../security/acl-engine";
import { AntivirusService } from "../security/antivirus-service";
import { CryptographyService } from "../security/cryptography-service";
import { TotpService } from "../security/totp-service";
import { getDb } from "../database/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import path from "path";
import os from "os";
import fs from "fs";

describe("Enterprise Security Platform Integration & Unit Tests", () => {
  beforeAll(async () => {
    const db = await getDb();
    try {
      // Create required schemas if missing (e.g. if running in memory)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS document_acls (
          id VARCHAR PRIMARY KEY,
          tenant_id VARCHAR NOT NULL,
          document_id VARCHAR NOT NULL,
          user_id VARCHAR,
          role VARCHAR,
          permission_type VARCHAR NOT NULL,
          action VARCHAR NOT NULL
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS folder_acls (
          id VARCHAR PRIMARY KEY,
          tenant_id VARCHAR NOT NULL,
          folder_id VARCHAR NOT NULL,
          user_id VARCHAR,
          role VARCHAR,
          permission_type VARCHAR NOT NULL,
          action VARCHAR NOT NULL
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS folder_security_settings (
          folder_id VARCHAR PRIMARY KEY,
          owner_id VARCHAR,
          is_protected BOOLEAN DEFAULT false,
          is_confidential BOOLEAN DEFAULT false,
          inherit_permissions BOOLEAN DEFAULT true
        )
      `);

      // Seed mock branch & user to satisfy foreign key constraints
      await db.execute(sql`
        INSERT INTO branches (id, tenant_id, name)
        VALUES ('BR-APEX-01', 'TEN-APEX-01', 'Apex HQ')
        ON CONFLICT (id) DO NOTHING
      `);

      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, password_hash, name, role, branch_id)
        VALUES ('USR-HACKER', 'TEN-APEX-01', 'hacker', 'hash', 'Hacker', 'CFO', 'BR-APEX-01')
        ON CONFLICT (id) DO NOTHING
      `);

      // Seed a mock document to satisfy foreign key constraints
      await db.execute(sql`
        INSERT INTO documents (
          id, name, category, security_level, current_version, retention_years, is_legal_hold, signature_status, size_bytes, sha256, storage_key, tenant_id, uploaded_by, version
        )
        VALUES (
          'DOC-TEST-123', 'test.txt', 'Administrative', 'Public', 'v1.0', 5, false, 'Unsigned', 123, 'sha256', 'key', 'TEN-APEX-01', 'system', 1
        )
        ON CONFLICT (id) DO NOTHING
      `);
    } catch (_) {
      // Ignore if database/schemas are already initialized or mocked
    }
  });

  // ----------------------------------------------------
  // 1. ACL Engine Tests (P1-1)
  // ----------------------------------------------------
  describe("AclEngine Permission Evaluation & Security Clearances (P1-1)", () => {
    it("should correctly block read access if role clearance rank is lower than classification rank", async () => {
      // LeadArchitect (Rank 4) has lower clearance than TopSecret (Rank 5) -> Blocked
      const leadArchitectAllowed = await AclEngine.checkClassificationClearance("LeadArchitect", "TopSecret");
      expect(leadArchitectAllowed).toBe(false);

      // Employee (Rank 3) has higher clearance than Internal (Rank 2) -> Allowed
      const employeeAllowed = await AclEngine.checkClassificationClearance("Employee", "Internal");
      expect(employeeAllowed).toBe(true);

      // CFO (Rank 5) has higher clearance than Secret (Rank 4) -> Allowed
      const cfoAllowed = await AclEngine.checkClassificationClearance("CFO", "Secret");
      expect(cfoAllowed).toBe(true);
    });

    it("should properly evaluate specific User & Role explicit Allow/Deny ACLs", async () => {
      const db = await getDb();
      const docId = `DOC-TEST-${Date.now()}`;

      // Insert dummy document for this specific test
      await db.execute(sql`
        INSERT INTO documents (
          id, name, category, security_level, current_version, retention_years, is_legal_hold, signature_status, size_bytes, sha256, storage_key, tenant_id, uploaded_by, version
        )
        VALUES (
          ${docId}, 'acl_test.txt', 'Administrative', 'Public', 'v1.0', 5, false, 'Unsigned', 123, 'sha256', 'key', 'TEN-APEX-01', 'system', 1
        )
        ON CONFLICT (id) DO NOTHING
      `);
      
      const acl1Id = `ACL-1-${Date.now()}`;
      const acl2Id = `ACL-2-${Date.now()}`;

      // Inject some mock ACL entries using actual schema columns
      await db.execute(sql`
        INSERT INTO document_acls (id, tenant_id, document_id, user_id, role, permission_type, action)
        VALUES 
          (${acl1Id}, 'TEN-APEX-01', ${docId}, 'USR-HACKER', NULL, 'DENY', 'Read'),
          (${acl2Id}, 'TEN-APEX-01', ${docId}, NULL, 'CFO', 'ALLOW', 'Read')
        ON CONFLICT DO NOTHING
      `);

      // 1. USR-HACKER with role CFO -> Should be Denied (Explicit Deny takes precedence)
      const hackerResult = await AclEngine.evaluateDocumentPermission("USR-HACKER", "CFO", "TEN-APEX-01", docId, "Read");
      expect(hackerResult).toBe(false);

      // 2. USR-CFO-VALID with role CFO -> Should be Allowed (Explicit Role Allow)
      const cfoResult = await AclEngine.evaluateDocumentPermission("USR-CFO-VALID", "CFO", "TEN-APEX-01", docId, "Read");
      expect(cfoResult).toBe(true);
    });
  });

  // ----------------------------------------------------
  // 2. Cryptography Engine Tests (P1-2)
  // ----------------------------------------------------
  describe("CryptographyService Envelope Encryption (P1-2)", () => {
    it("should generate a secure DEK and perform successful encryption/decryption", async () => {
      const tenantId = "TEN-APEX-01";
      const docId = "DOC-TEST-123";
      
      const docDEK = await CryptographyService.getDocumentDEK(tenantId, docId);
      expect(docDEK).toBeDefined();
      expect(docDEK.length).toBe(64); // 256-bit key in hex-encoded form (64 hex characters)

      const plaintext = "This is top secret enterprise financial forecast data.";
      const originalBuffer = Buffer.from(plaintext, "utf8");

      // Encrypt
      const encryptedObj = CryptographyService.encryptPayload(originalBuffer, docDEK);
      expect(encryptedObj.encrypted).toBeDefined();
      expect(encryptedObj.iv).toBeDefined();
      expect(encryptedObj.tag).toBeDefined();

      // Decrypt
      const decryptedBuffer = CryptographyService.decryptPayload(
        encryptedObj.encrypted,
        docDEK,
        encryptedObj.iv,
        encryptedObj.tag
      );

      expect(decryptedBuffer.toString("utf8")).toBe(plaintext);
    });

    it("should fail decryption if a key or ciphertext is tampered with", () => {
      const fakeKey = crypto.randomBytes(32).toString("hex");
      const plaintext = "Safe Payload";
      const originalBuffer = Buffer.from(plaintext, "utf8");

      const encryptedObj = CryptographyService.encryptPayload(originalBuffer, fakeKey);

      // Tamper with the encrypted string (flip one byte)
      const tamperedBytes = Buffer.from(encryptedObj.encrypted, "hex");
      tamperedBytes[0] = tamperedBytes[0] ^ 0xff; // Flip bits
      const tamperedHex = tamperedBytes.toString("hex");

      expect(() => {
        CryptographyService.decryptPayload(
          tamperedHex,
          fakeKey,
          encryptedObj.iv,
          encryptedObj.tag
        );
      }).toThrow();
    });
  });

  // ----------------------------------------------------
  // 3. Antivirus Scanner Tests (P1-3)
  // ----------------------------------------------------
  describe("AntivirusService Scans & Threat Detection (P1-3)", () => {
    it("should flag files containing standard EICAR test string as malware/infected", async () => {
      const eicarString = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
      const tempPath = path.join(os.tmpdir(), "eicar_test.txt");
      fs.writeFileSync(tempPath, eicarString);

      try {
        const result = await AntivirusService.scanFile(tempPath, "eicar_test.txt");
        expect(result.isClean).toBe(false);
        const hasEicar = result.threatsFound.some(t => t.includes("EICAR_Malware_Test_Signature"));
        expect(hasEicar).toBe(true);
      } finally {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    });

    it("should flag suspicious macros in Microsoft Office files", async () => {
      const suspiciousContent = "Sub AutoOpen()\n Shell(\"cmd.exe /c download_malware.exe\")\nEnd Sub";
      const tempPath = path.join(os.tmpdir(), "invoice.docm");
      fs.writeFileSync(tempPath, suspiciousContent);

      try {
        const result = await AntivirusService.scanFile(tempPath, "invoice.docm");
        expect(result.isClean).toBe(false);
        const hasMacro = result.threatsFound.some(t => t.includes("Suspicious_Macro_Script"));
        expect(hasMacro).toBe(true);
      } finally {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    });

    it("should recognize harmless standard clean files as clean", async () => {
      const cleanContent = "Welcome to the enterprise platform document repository.";
      const tempPath = path.join(os.tmpdir(), "readme.txt");
      fs.writeFileSync(tempPath, cleanContent);

      try {
        const result = await AntivirusService.scanFile(tempPath, "readme.txt");
        expect(result.isClean).toBe(true);
        expect(result.threatsFound).toHaveLength(0);
      } finally {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    });
  });

  // ----------------------------------------------------
  // 4. TOTP Service Tests (P1-4)
  // ----------------------------------------------------
  describe("TotpService RFC 6238 Multi-Factor Authentication (P1-4)", () => {
    it("should generate a valid secret and verify the correct TOTP token", () => {
      const secret = TotpService.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBe(20); // 10 bytes -> 20 chars base32 string

      const token = TotpService.generateToken(secret);
      expect(token).toHaveLength(6);
      expect(/^\d+$/.test(token)).toBe(true); // numeric only

      const isValid = TotpService.verifyTOTP(secret, token);
      expect(isValid).toBe(true);
    });

    it("should tolerate acceptable clock drift up/down by 1 window step", () => {
      const secret = TotpService.generateSecret();
      
      // Verification for token 30 seconds ago should succeed with drift tolerance enabled
      const tokenPrevWindow = TotpService.generateToken(secret, -1);
      const isDriftValid = TotpService.verifyTOTP(secret, tokenPrevWindow);
      expect(isDriftValid).toBe(true);
    });

    it("should consume, validate and verify unique backup/recovery codes", () => {
      const backupCodes = TotpService.generateBackupCodes();
      expect(backupCodes).toHaveLength(10);
      expect(backupCodes[0]).toHaveLength(9); // xxxx-xxxx format

      const firstCode = backupCodes[0];
      const isMatch = TotpService.verifyBackupCode(backupCodes, firstCode);
      expect(isMatch).toBe(true);

      // Verify same code can't be used twice (it was popped/consumed)
      const isSecondMatch = TotpService.verifyBackupCode(backupCodes, firstCode);
      expect(isSecondMatch).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 5. Tenant Impersonation & Security Remediation Tests
  // ----------------------------------------------------
  describe("Tenant Isolation and Impersonation Security Check", () => {
    it("should allow a SystemAdmin or SuperAdmin to impersonate another tenant with audit logging", async () => {
      const { authenticateToken } = await import("../security/auth-middleware");
      const { AuthService } = await import("../security/auth-service");
      
      const adminToken = AuthService.generateAccessToken({
        id: "USR-001",
        username: "admin",
        role: "SystemAdmin",
        tenantId: "TEN-APEX-01",
        branchId: "BR-CAI-01"
      });

      // Mock Express Request with tenantId override in header
      const req: any = {
        originalUrl: "/api/v1/documents",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "x-tenant-id": "TEN-TARGET-99"
        },
        query: {}
      };
      const res: any = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticateToken(req, res, next);
      
      expect(nextCalled).toBe(true);
      expect(req.user.tenantId).toBe("TEN-TARGET-99");
    });

    it("should reject standard users (e.g., Employee) from bypassing tenant isolation via custom headers", async () => {
      const { authenticateToken } = await import("../security/auth-middleware");
      const { AuthService } = await import("../security/auth-service");
      
      const employeeToken = AuthService.generateAccessToken({
        id: "USR-003",
        username: "employee_user",
        role: "Employee",
        tenantId: "TEN-APEX-01",
        branchId: "BR-CAI-01"
      });

      // Mock Express Request with tenantId override in header
      const req: any = {
        originalUrl: "/api/v1/documents",
        headers: {
          authorization: `Bearer ${employeeToken}`,
          "x-tenant-id": "TEN-TARGET-99"
        },
        query: {}
      };
      
      let statusValue = 0;
      let jsonValue: any = null;
      const res: any = {
        status(code: number) {
          statusValue = code;
          return {
            json(obj: any) {
              jsonValue = obj;
            }
          };
        }
      };
      
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticateToken(req, res, next);
      
      expect(nextCalled).toBe(false);
      expect(statusValue).toBe(403);
      expect(jsonValue.error.code).toBe("TENANT_ACCESS_DENIED");
    });
  });

  // ----------------------------------------------------
  // 6. Environment Config Validation Tests
  // ----------------------------------------------------
  describe("Environment Config & Secrets Validation Engine", () => {
    it("should pass validation when all required secrets are set to safe values", async () => {
      const { validateEnv } = await import("../config/env-validation");
      expect(() => validateEnv()).not.toThrow();
    });

    it("should fail validation and throw error if a required secret is missing", async () => {
      const dotenvSpy = vi.spyOn(dotenv, "config").mockImplementation(() => { return {} as any; });
      const originalJwtSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      try {
        const { validateEnv } = await import("../config/env-validation");
        expect(() => validateEnv()).toThrow();
      } finally {
        process.env.JWT_SECRET = originalJwtSecret;
        dotenvSpy.mockRestore();
      }
    });

    it("should fail validation and throw error if a secret uses a known weak placeholder", async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "fallback_jwt_secret_for_development_and_tests_2026";
      
      try {
        const { validateEnv } = await import("../config/env-validation");
        expect(() => validateEnv()).toThrow();
      } finally {
        process.env.JWT_SECRET = originalJwtSecret;
      }
    });

    it("should fail validation and throw error if a secret is below the 32-character entropy bar", async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = "too_short_secret";
      
      try {
        const { validateEnv } = await import("../config/env-validation");
        expect(() => validateEnv()).toThrow();
      } finally {
        process.env.JWT_SECRET = originalJwtSecret;
      }
    });
  });
});
