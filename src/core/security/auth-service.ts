import jwt from "jsonwebtoken";
import { UserRole, ERPScope, ROLE_PERMISSIONS } from "./rbac";
import { getDb } from "../database/db";
import { sysSessions, userMfa, users } from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { TotpService } from "./totp-service";
import { Config } from "../config/env-validation";

function getJwtSecret(): string {
  return Config.JWT_SECRET;
}

function getRefreshSecret(): string {
  return Config.JWT_REFRESH_SECRET;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  scopes: ERPScope[];
  tenantId: string;
  branchId: string;
}

export class AuthService {
  /**
   * Generates a short-lived access token (15 minutes expiry)
   */
  public static generateAccessToken(user: { id: string; username: string; role: string; tenantId: string; branchId: string }): string {
    const roleName = user.role as UserRole;
    const scopes = ROLE_PERMISSIONS[roleName] || [];
    
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: roleName,
      scopes,
      tenantId: user.tenantId,
      branchId: user.branchId,
    };

    return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
  }

  /**
   * Generates a longer-lived refresh token (7 days expiry)
   */
  public static generateRefreshToken(user: { id: string; username: string; role: string; tenantId: string; branchId: string }): string {
    const payload = {
      userId: user.id,
      username: user.username,
      tenantId: user.tenantId,
    };

    return jwt.sign(payload, getRefreshSecret(), { expiresIn: "7d" });
  }

  /**
   * Verifies an access token
   */
  public static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
      return decoded;
    } catch (err) {
      return null;
    }
  }

  /**
   * Verifies a refresh token
   */
  public static verifyRefreshToken(token: string): { userId: string; username: string; tenantId: string } | null {
    try {
      const decoded = jwt.verify(token, getRefreshSecret()) as any;
      return {
        userId: decoded.userId,
        username: decoded.username,
        tenantId: decoded.tenantId,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Registers a session in sys_sessions and enforces concurrent session limits (Max 3)
   */
  public static async registerSession(
    userId: string,
    tenantId: string,
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    const db = await getDb();
    
    // Concurrent Session Control: Find existing active sessions for the user
    const active = await db
      .select()
      .from(sysSessions)
      .where(and(
        eq(sysSessions.userId, userId),
        eq(sysSessions.isRevoked, false)
      ))
      .orderBy(desc(sysSessions.createdAt));

    const MAX_CONCURRENT_SESSIONS = 3;
    if (active.length >= MAX_CONCURRENT_SESSIONS) {
      // Revoke older sessions
      const sessionsToRevoke = active.slice(MAX_CONCURRENT_SESSIONS - 1);
      for (const s of sessionsToRevoke) {
        await db.update(sysSessions)
          .set({ isRevoked: true })
          .where(eq(sysSessions.id, s.id));
      }
    }

    // Insert new session
    const id = `SESS-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.insert(sysSessions).values({
      id,
      userId,
      tenantId,
      refreshToken,
      deviceInfo: deviceInfo || "Unknown",
      ipAddress: ipAddress || "127.0.0.1",
      createdAt: new Date(),
      expiresAt,
      isRevoked: false,
    });
  }

  /**
   * Rotates a refresh token (Refresh Token Rotation - RTR)
   */
  public static async rotateRefreshToken(
    oldToken: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const decoded = this.verifyRefreshToken(oldToken);
    if (!decoded) return null;

    const db = await getDb();

    // Check if the old refresh token exists in DB and is active
    const sessionRows = await db
      .select()
      .from(sysSessions)
      .where(and(
        eq(sysSessions.refreshToken, oldToken),
        eq(sysSessions.isRevoked, false)
      ));

    if (sessionRows.length === 0) {
      // Replay Attack Detected: If a rotated or invalid token is reused,
      // invalidate ALL active sessions of this user for safety! (Automatic Session Invalidation)
      console.warn(`[Auth] Potential refresh token replay attack! Revoking all sessions for user ${decoded.userId}`);
      await db.update(sysSessions)
        .set({ isRevoked: true })
        .where(eq(sysSessions.userId, decoded.userId));
      return null;
    }

    const session = sessionRows[0];

    // Revoke the old refresh token/session
    await db.update(sysSessions)
      .set({ isRevoked: true })
      .where(eq(sysSessions.id, session.id));

    // Fetch user details to generate new tokens
    const userRows = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (userRows.length === 0) return null;
    const user = userRows[0];

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    // Register the new rotated session
    await this.registerSession(
      user.id,
      user.tenantId,
      newRefreshToken,
      deviceInfo || session.deviceInfo || "Unknown",
      ipAddress || session.ipAddress || "127.0.0.1"
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revokes a specific session (Secure Logout)
   */
  public static async revokeSession(token: string): Promise<void> {
    const db = await getDb();
    await db.update(sysSessions)
      .set({ isRevoked: true })
      .where(eq(sysSessions.refreshToken, token));
  }

  /**
   * Enrolls a user in TOTP MFA
   */
  public static async enrollMfa(userId: string): Promise<{ mfaSecret: string; backupCodes: string[] }> {
    const db = await getDb();
    
    const secret = TotpService.generateSecret();
    const backupCodes = TotpService.generateBackupCodes();

    // Delete any existing enrollment
    await db.delete(userMfa).where(eq(userMfa.userId, userId));

    const id = `MFA-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await db.insert(userMfa).values({
      id,
      userId,
      mfaSecret: secret,
      isEnabled: false, // Must verify to enable
      backupCodes: backupCodes.join(","),
    });

    return { mfaSecret: secret, backupCodes };
  }

  /**
   * Verifies and enables MFA for a user
   */
  public static async verifyAndEnableMfa(userId: string, code: string): Promise<boolean> {
    const db = await getDb();
    const mfaRows = await db.select().from(userMfa).where(eq(userMfa.userId, userId));
    if (mfaRows.length === 0) return false;

    const mfa = mfaRows[0];
    const isVerified = TotpService.verifyTOTP(mfa.mfaSecret, code);

    if (isVerified) {
      await db.update(userMfa)
        .set({ isEnabled: true })
        .where(eq(userMfa.userId, userId));
      return true;
    }
    return false;
  }

  /**
   * Verifies MFA code (either TOTP or backup code)
   */
  public static async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    const db = await getDb();
    const mfaRows = await db.select().from(userMfa).where(eq(userMfa.userId, userId));
    if (mfaRows.length === 0) return false;

    const mfa = mfaRows[0];
    if (!mfa.isEnabled) return true; // MFA not enabled yet

    // 1. Check TOTP
    if (TotpService.verifyTOTP(mfa.mfaSecret, code)) {
      return true;
    }

    // 2. Check Backup Codes
    const codes = mfa.backupCodes.split(",");
    const codeIndex = codes.indexOf(code.toUpperCase());
    if (codeIndex !== -1) {
      // Remove used backup code
      codes.splice(codeIndex, 1);
      await db.update(userMfa)
        .set({ backupCodes: codes.join(",") })
        .where(eq(userMfa.userId, userId));
      return true;
    }

    return false;
  }

  /**
   * Checks if user has MFA enabled
   */
  public static async checkMfaStatus(userId: string): Promise<boolean> {
    const db = await getDb();
    const mfaRows = await db.select().from(userMfa).where(eq(userMfa.userId, userId));
    if (mfaRows.length === 0) return false;
    return mfaRows[0].isEnabled;
  }
}
