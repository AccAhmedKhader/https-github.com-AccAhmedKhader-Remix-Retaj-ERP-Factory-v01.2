import crypto from "crypto";
import { getDb } from "../database/db";
import { sysEncryptionKeys } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { Config } from "../config/env-validation";

export class CryptographyService {
  private static MASTER_KEY: Buffer = crypto.scryptSync(
    Config.MASTER_ENCRYPTION_KEY,
    "salt_for_cryptography_2026",
    32
  );

  /**
   * Generates a new cryptographically secure symmetric key (32 bytes)
   */
  public static generateKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Encrypts a plain key using the master key (Envelope KEK protection)
   */
  public static encryptKeyWithMaster(plainKey: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainKey, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
      iv: iv.toString("hex"),
      encrypted: encrypted.toString("hex"),
      tag: tag.toString("hex")
    });
  }

  /**
   * Decrypts an encrypted key using the master key
   */
  public static decryptKeyWithMaster(encryptedKeyJson: string): string {
    const { iv, encrypted, tag } = JSON.parse(encryptedKeyJson);
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.MASTER_KEY, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  }

  /**
   * Retrieves or creates a Tenant KEK (Key Encryption Key)
   */
  public static async getTenantKEK(tenantId: string): Promise<string> {
    const db = await getDb();
    const rows = await db.select().from(sysEncryptionKeys).where(and(
      eq(sysEncryptionKeys.tenantId, tenantId),
      eq(sysEncryptionKeys.keyType, "KEK")
    ));

    if (rows.length > 0) {
      const kekObj = rows[0];
      if (kekObj.expiresAt && new Date(kekObj.expiresAt) < new Date()) {
        console.warn(`[Crypto] KEK expired for tenant ${tenantId}. Triggering key rotation...`);
        return await this.rotateTenantKEK(tenantId);
      }
      return this.decryptKeyWithMaster(kekObj.encryptedKeyValue);
    }

    // Generate new KEK
    const plainKek = this.generateKey();
    const encryptedKek = this.encryptKeyWithMaster(plainKek);
    const id = `KEK-${tenantId}-${Date.now()}`;
    
    // Expire KEK after 1 year
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.insert(sysEncryptionKeys).values({
      id,
      tenantId,
      keyType: "KEK",
      encryptedKeyValue: encryptedKek,
      createdAt: new Date(),
      expiresAt
    });

    return plainKek;
  }

  /**
   * Rotates a Tenant's KEK, re-encrypting all document DEKs associated with this tenant
   */
  public static async rotateTenantKEK(tenantId: string): Promise<string> {
    console.log(`[Crypto] Rotating KEK for tenant ${tenantId}...`);
    const db = await getDb();
    
    // Check if KEK row exists
    const existingKEK = await db.select().from(sysEncryptionKeys).where(and(
      eq(sysEncryptionKeys.tenantId, tenantId),
      eq(sysEncryptionKeys.keyType, "KEK")
    ));

    let oldKek: string;
    if (existingKEK.length > 0) {
      oldKek = this.decryptKeyWithMaster(existingKEK[0].encryptedKeyValue);
    } else {
      // Just generate first KEK
      return await this.getTenantKEK(tenantId);
    }

    const newKek = this.generateKey();

    // Fetch all document DEKs for this tenant
    const deks = await db.select().from(sysEncryptionKeys).where(and(
      eq(sysEncryptionKeys.tenantId, tenantId),
      eq(sysEncryptionKeys.keyType, "DEK")
    ));

    // For each DEK, decrypt with old KEK and re-encrypt with new KEK
    for (const dekObj of deks) {
      try {
        const plainDek = this.decryptKeyWithKEK(dekObj.encryptedKeyValue, oldKek);
        const encryptedWithNewKek = this.encryptKeyWithKEK(plainDek, newKek);
        await db.update(sysEncryptionKeys)
          .set({ encryptedKeyValue: encryptedWithNewKek })
          .where(eq(sysEncryptionKeys.id, dekObj.id));
      } catch (err: any) {
        console.error(`[Crypto] Failed to re-encrypt DEK ${dekObj.id} during KEK rotation:`, err.message);
      }
    }

    // Update Tenant KEK
    const newEncryptedKek = this.encryptKeyWithMaster(newKek);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.update(sysEncryptionKeys)
      .set({
        encryptedKeyValue: newEncryptedKek,
        createdAt: new Date(),
        expiresAt
      })
      .where(and(
        eq(sysEncryptionKeys.tenantId, tenantId),
        eq(sysEncryptionKeys.keyType, "KEK")
      ));

    console.log(`[Crypto] KEK successfully rotated for tenant ${tenantId}`);
    return newKek;
  }

  /**
   * Encrypts a key (DEK) using another key (KEK) (Envelope Encryption)
   */
  public static encryptKeyWithKEK(plainKey: string, kek: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(kek, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(plainKey, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
      iv: iv.toString("hex"),
      encrypted: encrypted.toString("hex"),
      tag: tag.toString("hex")
    });
  }

  /**
   * Decrypts a key (DEK) using a KEK
   */
  public static decryptKeyWithKEK(encryptedKeyJson: string, kek: string): string {
    const { iv, encrypted, tag } = JSON.parse(encryptedKeyJson);
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(kek, "hex"), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  }

  /**
   * Encrypts file payload buffer using AES-256-GCM and a custom DEK
   */
  public static encryptPayload(payload: Buffer, dekHex: string): { iv: string; encrypted: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(dekHex, "hex"), iv);
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      iv: iv.toString("hex"),
      encrypted: encrypted.toString("hex"),
      tag: tag.toString("hex")
    };
  }

  /**
   * Decrypts file payload buffer using AES-256-GCM and a custom DEK
   */
  public static decryptPayload(encryptedHex: string, dekHex: string, ivHex: string, tagHex: string): Buffer {
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(dekHex, "hex"), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
    return decrypted;
  }

  /**
   * Generates or retrieves a Document DEK (Data Encryption Key), wrapped with Tenant KEK
   */
  public static async getDocumentDEK(tenantId: string, documentId: string): Promise<string> {
    const db = await getDb();
    const rows = await db.select().from(sysEncryptionKeys).where(and(
      eq(sysEncryptionKeys.tenantId, tenantId),
      eq(sysEncryptionKeys.documentId, documentId),
      eq(sysEncryptionKeys.keyType, "DEK")
    ));

    const kek = await this.getTenantKEK(tenantId);

    if (rows.length > 0) {
      return this.decryptKeyWithKEK(rows[0].encryptedKeyValue, kek);
    }

    // Generate new DEK for this specific document
    const plainDek = this.generateKey();
    const encryptedDek = this.encryptKeyWithKEK(plainDek, kek);
    const id = `DEK-${documentId}-${Date.now()}`;

    await db.insert(sysEncryptionKeys).values({
      id,
      tenantId,
      documentId,
      keyType: "DEK",
      encryptedKeyValue: encryptedDek,
      createdAt: new Date()
    });

    return plainDek;
  }
}
