import { getDb } from "../database/db";
import { documentAcls, folderAcls, folderSecuritySettings, documents, documentFolders } from "../database/schema";
import { eq, and, or } from "drizzle-orm";
import { UserRole } from "./rbac";

export type AclAction =
  | "Read"
  | "Write"
  | "Update"
  | "Delete"
  | "Download"
  | "Preview"
  | "Share"
  | "Move"
  | "Copy"
  | "Version"
  | "Restore"
  | "Sign"
  | "Approve"
  | "Archive"
  | "LegalHold";

export type ClassificationLevel = "Public" | "Internal" | "Confidential" | "Secret" | "TopSecret";

export const CLASSIFICATION_RANK: Record<ClassificationLevel, number> = {
  Public: 1,
  Internal: 2,
  Confidential: 3,
  Secret: 4,
  TopSecret: 5,
};

export const ROLE_CLEARANCE_RANK: Record<UserRole, number> = {
  SuperAdmin: 5,
  SystemAdmin: 5,
  TenantAdmin: 5,
  CFO: 5,
  ComplianceOfficer: 5,
  LegalOfficer: 5,
  RecordsManager: 5,
  Auditor: 4,
  BranchAdmin: 4,
  DepartmentManager: 4,
  HRManager: 4,
  FinanceManager: 4,
  LeadArchitect: 4,
  SeniorAccountant: 3,
  InventoryManager: 3,
  Employee: 3,
  POSOperator: 2,
  ExternalUser: 2,
  Guest: 1,
};

export class AclEngine {
  /**
   * Helper to evaluate if a role has the required classification clearance.
   */
  public static async checkClassificationClearance(
    role: UserRole,
    classification: ClassificationLevel
  ): Promise<boolean> {
    const userClearance = ROLE_CLEARANCE_RANK[role] || 1;
    const docRequiredRank = CLASSIFICATION_RANK[classification] || 2;
    return userClearance >= docRequiredRank;
  }

  /**
   * Evaluates if a user has permission to perform an action on a document.
   */
  public static async evaluateDocumentPermission(
    userId: string,
    role: UserRole,
    tenantId: string,
    documentId: string,
    action: AclAction
  ): Promise<boolean> {
    const db = await getDb();

    // 1. Fetch document & validation
    const docRows = await db.select().from(documents).where(eq(documents.id, documentId));
    if (docRows.length === 0) return false;
    const doc = docRows[0];

    // Tenant Isolation
    if (doc.tenantId !== tenantId) {
      console.warn(`[ACL] Cross-tenant access block: User ${userId} (${tenantId}) -> Document ${documentId} (${doc.tenantId})`);
      return false;
    }

    // 2. Multi-level Classification Check
    const docClassification = (doc.securityClassification || "Internal") as ClassificationLevel;
    const userClearance = ROLE_CLEARANCE_RANK[role] || 1;
    const docRequiredRank = CLASSIFICATION_RANK[docClassification] || 2;

    if (userClearance < docRequiredRank) {
      console.warn(`[ACL] Classification block: User ${userId} has clearance ${userClearance} but document requires ${docRequiredRank}`);
      return false;
    }

    // 3. SuperAdmin / SystemAdmin bypass standard ACLs (subject to classification and tenant check)
    if (role === "SuperAdmin" || role === "SystemAdmin") {
      return true;
    }

    // 4. Check explicit DENY at document level
    const docDeny = await db.select().from(documentAcls).where(and(
      eq(documentAcls.documentId, documentId),
      eq(documentAcls.permissionType, "DENY"),
      eq(documentAcls.action, action),
      or(eq(documentAcls.userId, userId), eq(documentAcls.role, role))
    ));
    if (docDeny.length > 0) return false;

    // 5. Check explicit ALLOW at document level
    const docAllow = await db.select().from(documentAcls).where(and(
      eq(documentAcls.documentId, documentId),
      eq(documentAcls.permissionType, "ALLOW"),
      eq(documentAcls.action, action),
      or(eq(documentAcls.userId, userId), eq(documentAcls.role, role))
    ));
    if (docAllow.length > 0) return true;

    // 6. If document belongs to a folder, check Folder ACLs and Inheritance
    if (doc.folderId) {
      return await this.evaluateFolderPermission(userId, role, tenantId, doc.folderId, action);
    }

    // Default to allow for standard read/write if the user has corresponding global scope,
    // but default deny for destructive or privileged actions (Delete, Archive, LegalHold).
    const privilegedActions = ["Delete", "Archive", "LegalHold", "Share"];
    if (privilegedActions.includes(action)) {
      return false;
    }

    return true;
  }

  /**
   * Evaluates if a user has permission to perform an action on a folder.
   */
  public static async evaluateFolderPermission(
    userId: string,
    role: UserRole,
    tenantId: string,
    folderId: string,
    action: AclAction
  ): Promise<boolean> {
    const db = await getDb();

    // 1. Fetch Folder
    const folderRows = await db.select().from(documentFolders).where(eq(documentFolders.id, folderId));
    if (folderRows.length === 0) return false;
    const folder = folderRows[0];

    // Tenant Isolation
    if (folder.tenantId !== tenantId) return false;

    // 2. SuperAdmin / SystemAdmin bypass
    if (role === "SuperAdmin" || role === "SystemAdmin") {
      return true;
    }

    // 3. Folder Ownership and Isolation settings
    const settingsRows = await db.select().from(folderSecuritySettings).where(eq(folderSecuritySettings.folderId, folderId));
    let isProtected = false;
    let isConfidential = false;
    let ownerId: string | null = null;

    if (settingsRows.length > 0) {
      const s = settingsRows[0];
      isProtected = s.isProtected;
      isConfidential = s.isConfidential;
      ownerId = s.ownerId;
    }

    // Folder Owner has full access
    if (ownerId && ownerId === userId) {
      return true;
    }

    // Confidential or Protected Folder restricts access
    if (isConfidential || isProtected) {
      // Check explicit ALLOW for folder
      const folderAllow = await db.select().from(folderAcls).where(and(
        eq(folderAcls.folderId, folderId),
        eq(folderAcls.permissionType, "ALLOW"),
        eq(folderAcls.action, action),
        or(eq(folderAcls.userId, userId), eq(folderAcls.role, role))
      ));
      if (folderAllow.length > 0) return true;

      // Protected/Confidential folders default to DENY for non-owners
      return false;
    }

    // 4. Check Folder Explicit DENY
    const folderDeny = await db.select().from(folderAcls).where(and(
      eq(folderAcls.folderId, folderId),
      eq(folderAcls.permissionType, "DENY"),
      eq(folderAcls.action, action),
      or(eq(folderAcls.userId, userId), eq(folderAcls.role, role))
    ));
    if (folderDeny.length > 0) return false;

    // 5. Check Folder Explicit ALLOW
    const folderAllow = await db.select().from(folderAcls).where(and(
      eq(folderAcls.folderId, folderId),
      eq(folderAcls.permissionType, "ALLOW"),
      eq(folderAcls.action, action),
      or(eq(folderAcls.userId, userId), eq(folderAcls.role, role))
    ));
    if (folderAllow.length > 0) return true;

    // Default to allow for standard actions if no constraints are violated
    const privilegedActions = ["Delete", "Archive", "LegalHold", "Share"];
    if (privilegedActions.includes(action)) {
      return false;
    }

    return true;
  }
}
