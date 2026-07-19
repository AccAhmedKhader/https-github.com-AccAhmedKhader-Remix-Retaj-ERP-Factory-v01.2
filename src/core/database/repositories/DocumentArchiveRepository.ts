import { getDb } from "../db";
import { 
  documents, 
  documentFolders, 
  documentVersions, 
  documentSignatures, 
  documentAuditLogs 
} from "../schema";
import { eq, and, like, or, sql } from "drizzle-orm";

export class DocumentArchiveRepository {
  /**
   * Retrieves all document folders for a tenant.
   */
  public static async getFolders(tenantId: string): Promise<any[]> {
    const db = await getDb();
    return await db.select().from(documentFolders).where(eq(documentFolders.tenantId, tenantId));
  }

  /**
   * Creates a new document folder.
   */
  public static async createFolder(folder: { id: string; name: string; description?: string; iconType?: string }, tenantId: string): Promise<any> {
    const db = await getDb();
    const newFolder = {
      id: folder.id,
      tenantId,
      name: folder.name,
      description: folder.description || null,
      iconType: folder.iconType || "Folder",
      createdAt: new Date()
    };
    await db.insert(documentFolders).values(newFolder);
    return newFolder;
  }

  /**
   * Retrieves documents for a tenant, with optional filters and full-text search.
   */
  public static async getDocuments(
    tenantId: string, 
    filters?: { folderId?: string; category?: string; search?: string }
  ): Promise<any[]> {
    const db = await getDb();
    let query = db.select().from(documents).where(eq(documents.tenantId, tenantId));

    const allDocs = await query;
    let filtered: any[] = allDocs;

    if (filters) {
      if (filters.folderId) {
        filtered = filtered.filter((d: any) => d.folderId === filters.folderId);
      }
      if (filters.category) {
        filtered = filtered.filter((d: any) => d.category === filters.category);
      }
      if (filters.search) {
        const term = filters.search.toLowerCase();
        filtered = filtered.filter((d: any) => 
          d.name.toLowerCase().includes(term) || 
          (d.category && d.category.toLowerCase().includes(term))
        );
      }
    }

    // Map and load relations
    const finalDocs = [];
    for (const d of filtered) {
      const vers = await db.select().from(documentVersions).where(and(
        eq(documentVersions.documentId, d.id),
        eq(documentVersions.tenantId, tenantId)
      ));
      const sigs = await db.select().from(documentSignatures).where(and(
        eq(documentSignatures.documentId, d.id),
        eq(documentSignatures.tenantId, tenantId)
      ));
      const logs = await db.select().from(documentAuditLogs).where(and(
        eq(documentAuditLogs.documentId, d.id),
        eq(documentAuditLogs.tenantId, tenantId)
      ));

      finalDocs.push({
        ...d,
        versions: vers.map((v: any) => ({
          version: v.version,
          size: (v.sizeBytes / 1024).toFixed(1) + " KB",
          sha256: v.sha256,
          modifiedBy: v.modifiedBy,
          modifiedAt: v.modifiedAt.toISOString(),
          reason: v.reason
        })),
        signatures: sigs.map((s: any) => ({
          signer: s.signerUserId, // We can resolve username or keep signer ID/name
          role: s.role,
          timestamp: s.signedAt.toISOString(),
          signatureHash: s.signatureHash,
          certificateRef: s.certificateRef,
          isVerified: s.isVerified
        })),
        auditLogs: logs.map((l: any) => ({
          action: l.action,
          timestamp: l.createdAt.toISOString(),
          user: l.userId,
          details: l.details
        })).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
      });
    }

    return finalDocs;
  }

  /**
   * Retrieves a document by its ID.
   */
  public static async getDocumentById(id: string, tenantId: string): Promise<any | null> {
    const db = await getDb();
    const rows = await db.select().from(documents).where(and(
      eq(documents.id, id),
      eq(documents.tenantId, tenantId)
    ));
    if (rows.length === 0) return null;

    const d = rows[0];
    const vers = await db.select().from(documentVersions).where(and(
      eq(documentVersions.documentId, d.id),
      eq(documentVersions.tenantId, tenantId)
    ));
    const sigs = await db.select().from(documentSignatures).where(and(
      eq(documentSignatures.documentId, d.id),
      eq(documentSignatures.tenantId, tenantId)
    ));
    const logs = await db.select().from(documentAuditLogs).where(and(
      eq(documentAuditLogs.documentId, d.id),
      eq(documentAuditLogs.tenantId, tenantId)
    ));

    return {
      ...d,
      versions: vers.map((v: any) => ({
        version: v.version,
        size: (v.sizeBytes / 1024).toFixed(1) + " KB",
        sha256: v.sha256,
        modifiedBy: v.modifiedBy,
        modifiedAt: v.modifiedAt.toISOString(),
        reason: v.reason
      })),
      signatures: sigs.map((s: any) => ({
        signer: s.signerUserId,
        role: s.role,
        timestamp: s.signedAt.toISOString(),
        signatureHash: s.signatureHash,
        certificateRef: s.certificateRef,
        isVerified: s.isVerified
      })),
      auditLogs: logs.map((l: any) => ({
        action: l.action,
        timestamp: l.createdAt.toISOString(),
        user: l.userId,
        details: l.details
      })).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
    };
  }

  /**
   * Creates a new document and writes the initial version and audit log.
   */
  public static async createDocument(
    doc: {
      id: string;
      folderId?: string;
      name: string;
      category: string;
      securityLevel?: string;
      sha256: string;
      storageKey: string;
      sizeBytes: number;
      uploadedBy: string;
    },
    tenantId: string,
    userId: string
  ): Promise<any> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      const newDoc = {
        id: doc.id,
        tenantId,
        folderId: doc.folderId || null,
        name: doc.name,
        category: doc.category,
        securityLevel: doc.securityLevel || "Public",
        currentVersion: "v1.0",
        retentionYears: 5,
        isLegalHold: false,
        signatureStatus: "Unsigned",
        sha256: doc.sha256,
        storageKey: doc.storageKey,
        sizeBytes: doc.sizeBytes,
        uploadedBy: doc.uploadedBy,
        uploadedAt: new Date(),
        version: 1
      };

      await tx.insert(documents).values(newDoc);

      const initialVer = {
        id: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        documentId: doc.id,
        tenantId,
        version: "v1.0",
        storageKey: doc.storageKey,
        sizeBytes: doc.sizeBytes,
        sha256: doc.sha256,
        modifiedBy: doc.uploadedBy,
        modifiedAt: new Date(),
        reason: "النسخة المبدئية عند الرفع"
      };

      await tx.insert(documentVersions).values(initialVer);

      const log = {
        id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        documentId: doc.id,
        tenantId,
        action: "إنشاء",
        userId,
        details: "تمت أرشفة وتشفير المستند بنجاح"
      };

      await tx.insert(documentAuditLogs).values(log);

      return newDoc;
    });
  }

  /**
   * Adds a new version to an existing document with Optimistic Locking.
   */
  public static async addVersion(
    docId: string,
    version: string,
    storageKey: string,
    sizeBytes: number,
    sha256: string,
    modifiedBy: string,
    reason: string,
    tenantId: string,
    userId: string,
    currentDbVersion: number
  ): Promise<any> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      // Find and verify current document
      const rows = await tx.select().from(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const doc = rows[0];
      if (doc.version !== currentDbVersion) {
        throw new Error("CONCURRENT_WRITE_CONFLICT");
      }
      if (doc.isLegalHold) {
        throw new Error("LEGAL_HOLD_ACTIVE");
      }

      // Insert new version
      const newVerId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentVersions).values({
        id: newVerId,
        documentId: docId,
        tenantId,
        version,
        storageKey,
        sizeBytes,
        sha256,
        modifiedBy,
        modifiedAt: new Date(),
        reason
      });

      // Update parent document
      await tx.update(documents)
        .set({
          currentVersion: version,
          sha256,
          storageKey,
          sizeBytes,
          version: currentDbVersion + 1
        })
        .where(and(
          eq(documents.id, docId),
          eq(documents.tenantId, tenantId),
          eq(documents.version, currentDbVersion)
        ));

      // Add Audit log
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentAuditLogs).values({
        id: logId,
        documentId: docId,
        tenantId,
        action: "تعديل",
        userId,
        details: `تم إصدار نسخة جديدة للمستند: ${version} - السبب: ${reason}`
      });
    });
  }

  /**
   * Rolls back a document to a previous version.
   */
  public static async rollbackVersion(
    docId: string,
    targetVersion: string,
    tenantId: string,
    userId: string,
    userName: string
  ): Promise<any> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      const rows = await tx.select().from(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const doc = rows[0];
      if (doc.isLegalHold) {
        throw new Error("LEGAL_HOLD_ACTIVE");
      }

      // Find the specific version details
      const verRows = await tx.select().from(documentVersions).where(and(
        eq(documentVersions.documentId, docId),
        eq(documentVersions.tenantId, tenantId),
        eq(documentVersions.version, targetVersion)
      ));
      if (verRows.length === 0) {
        throw new Error("VERSION_NOT_FOUND");
      }
      const targetVerObj = verRows[0];

      // Update parent document
      await tx.update(documents)
        .set({
          currentVersion: targetVersion,
          sha256: targetVerObj.sha256,
          storageKey: targetVerObj.storageKey,
          sizeBytes: targetVerObj.sizeBytes,
          version: doc.version + 1
        })
        .where(and(
          eq(documents.id, docId),
          eq(documents.tenantId, tenantId)
        ));

      // Add audit log
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentAuditLogs).values({
        id: logId,
        documentId: docId,
        tenantId,
        action: "استرجاع",
        userId,
        details: `استعادة النسخة التاريخية: ${targetVersion} بواسطة ${userName}`
      });
    });
  }

  /**
   * Cryptographically signs a document.
   */
  public static async signDocument(
    docId: string,
    signerUserId: string,
    role: string,
    signatureHash: string,
    certificateRef: string,
    tenantId: string
  ): Promise<any> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      const rows = await tx.select().from(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const doc = rows[0];
      if (doc.isLegalHold) {
        throw new Error("LEGAL_HOLD_ACTIVE");
      }

      const sigId = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentSignatures).values({
        id: sigId,
        documentId: docId,
        tenantId,
        signerUserId,
        role,
        signedAt: new Date(),
        signatureHash,
        certificateRef,
        isVerified: true
      });

      // Update signature status
      await tx.update(documents)
        .set({
          signatureStatus: "Signed",
          version: doc.version + 1
        })
        .where(and(
          eq(documents.id, docId),
          eq(documents.tenantId, tenantId)
        ));

      // Add audit log
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentAuditLogs).values({
        id: logId,
        documentId: docId,
        tenantId,
        action: "توقيع",
        userId: signerUserId,
        details: `توقيع رقمي موثق (PKI) - البصمة: ${signatureHash.substring(0, 10)}...`
      });
    });
  }

  /**
   * Toggles the Legal Hold status of a document.
   */
  public static async toggleLegalHold(
    docId: string,
    isLegalHold: boolean,
    tenantId: string,
    userId: string,
    details: string
  ): Promise<any> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      const rows = await tx.select().from(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const doc = rows[0];

      await tx.update(documents)
        .set({
          isLegalHold,
          version: doc.version + 1
        })
        .where(and(
          eq(documents.id, docId),
          eq(documents.tenantId, tenantId)
        ));

      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await tx.insert(documentAuditLogs).values({
        id: logId,
        documentId: docId,
        tenantId,
        action: "تعديل",
        userId,
        details: isLegalHold ? `تفعيل الوقف القانوني التجميدي للمستند: ${details}` : `رفع الوقف القانوني التجميدي للمستند`
      });
    });
  }

  /**
   * Deletes a document (strictly rejected if isLegalHold is true).
   */
  public static async deleteDocument(docId: string, tenantId: string, userId: string): Promise<void> {
    const db = await getDb();

    return await db.transaction(async (tx: any) => {
      const rows = await tx.select().from(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const doc = rows[0];
      if (doc.isLegalHold) {
        throw new Error("LEGAL_HOLD_ACTIVE");
      }

      // Delete references or let cascade handle it. Drizzle has onDelete: cascade, so it is safe.
      await tx.delete(documents).where(and(
        eq(documents.id, docId),
        eq(documents.tenantId, tenantId)
      ));
    });
  }

  /**
   * Finds an existing storage key by file SHA256 within the tenant for deduplication.
   */
  public static async findStorageKeyByHash(sha256: string, tenantId: string): Promise<string | null> {
    const db = await getDb();
    const rows = await db.select({ storageKey: documents.storageKey })
      .from(documents)
      .where(and(
        eq(documents.sha256, sha256),
        eq(documents.tenantId, tenantId)
      ))
      .limit(1);

    if (rows.length > 0) {
      return rows[0].storageKey;
    }

    const verRows = await db.select({ storageKey: documentVersions.storageKey })
      .from(documentVersions)
      .where(and(
        eq(documentVersions.sha256, sha256),
        eq(documentVersions.tenantId, tenantId)
      ))
      .limit(1);

    if (verRows.length > 0) {
      return verRows[0].storageKey;
    }

    return null;
  }
}
