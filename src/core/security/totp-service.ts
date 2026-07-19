import crypto from "crypto";

export class TotpService {
  /**
   * Generates a 20-byte base32-encoded random secret key
   */
  public static generateSecret(): string {
    const buffer = crypto.randomBytes(10);
    // Base32 encoding alphabet
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (const byte of buffer) {
      secret += alphabet[byte & 31];
      secret += alphabet[(byte >> 5) & 31];
    }
    return secret;
  }

  /**
   * Generates standard TOTP backup recovery codes
   */
  public static generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = `${crypto.randomBytes(2).toString("hex").toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Consumes and verifies a backup code
   */
  public static verifyBackupCode(codes: string[], code: string): boolean {
    const cleanCode = code.trim().toUpperCase();
    const idx = codes.indexOf(cleanCode);
    if (idx !== -1) {
      codes.splice(idx, 1); // consume it
      return true;
    }
    return false;
  }

  /**
   * Generates a 6-digit TOTP for a specific counter interval offset
   */
  public static generateToken(secret: string, offset = 0): string {
    const timeStep = 30000;
    const now = Date.now();
    const currentCounter = Math.floor(now / timeStep) + offset;
    return this.generateCodeForCounter(secret, currentCounter);
  }

  /**
   * Verifies a 6-digit standard TOTP code against a secret for the current time
   */
  public static verifyTOTP(secret: string, code: string): boolean {
    const cleanCode = code.trim().replace(/\s/g, "");
    if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) return false;

    // Standard TOTP time step is 30 seconds
    const timeStep = 30000;
    const now = Date.now();
    const currentCounter = Math.floor(now / timeStep);

    // Allow a clock drift of 1 window (previous, current, next)
    for (let i = -1; i <= 1; i++) {
      if (this.generateCodeForCounter(secret, currentCounter + i) === cleanCode) {
        return true;
      }
    }
    return false;
  }

  /**
   * Decodes a base32 string to standard Buffer
   */
  private static base32Decode(base32: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = base32.toUpperCase().replace(/=+$/, "");
    const len = cleaned.length;
    const buffer = Buffer.alloc(Math.ceil((len * 5) / 8));
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < len; i++) {
      const idx = alphabet.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        buffer[index++] = (value >> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    return buffer;
  }

  /**
   * Generates a 6-digit TOTP for a specific counter (time interval)
   */
  private static generateCodeForCounter(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const msg = Buffer.alloc(8);
    // Write 64-bit integer counter in big endian
    let temp = counter;
    for (let i = 7; i >= 0; i--) {
      msg[i] = temp & 255;
      temp = temp >> 8;
    }

    const hmac = crypto.createHmac("sha1", key).update(msg).digest();
    const offset = hmac[hmac.length - 1] & 15;
    
    // Dynamic Truncation
    const binary =
      ((hmac[offset] & 127) << 24) |
      ((hmac[offset + 1] & 255) << 16) |
      ((hmac[offset + 2] & 255) << 8) |
      (hmac[offset + 3] & 255);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  }
}
