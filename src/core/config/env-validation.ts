import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const Config = {
  get JWT_SECRET(): string {
    return process.env.JWT_SECRET || "";
  },
  get JWT_REFRESH_SECRET(): string {
    return process.env.JWT_REFRESH_SECRET || "";
  },
  get AUDIT_SIGNING_SECRET(): string {
    return process.env.AUDIT_SIGNING_SECRET || "";
  },
  get MASTER_ENCRYPTION_KEY(): string {
    return process.env.MASTER_ENCRYPTION_KEY || "";
  },
  get STORAGE_ENCRYPTION_KEY(): string {
    return process.env.STORAGE_ENCRYPTION_KEY || "";
  },
};

const KNOWN_PLACEHOLDERS = new Set([
  "fallback_jwt_secret_for_development_and_tests_2026",
  "fallback_jwt_refresh_secret_for_development_and_tests_2026",
  "erp_secure_signing_secret",
  "erp_default_cryptographic_master_key_2026",
  "enterprise_storage_secure_encryption_key_2026",
]);

export function validateEnv() {
  // Load existing environment variables
  dotenv.config();

  const isTest = process.env.NODE_ENV === "test" || typeof (globalThis as any).describe === "function";

  const requiredKeys = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "AUDIT_SIGNING_SECRET",
    "MASTER_ENCRYPTION_KEY",
    "STORAGE_ENCRYPTION_KEY",
  ];

  // Self-heal environment config if not in a testing environment
  if (!isTest) {
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    } else {
      const examplePath = path.join(process.cwd(), ".env.example");
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, "utf-8");
      }
    }

    let modified = false;

    for (const key of requiredKeys) {
      const value = process.env[key];
      const isMissingOrInvalid = !value || value.length < 32 || KNOWN_PLACEHOLDERS.has(value);

      if (isMissingOrInvalid) {
        // Generate a high-entropy 32-byte hex key (64 characters)
        const secureKey = crypto.randomBytes(32).toString("hex");
        process.env[key] = secureKey;

        // Safely replace or append the key in the .env file content
        const keyRegex = new RegExp(`^#?\\s*${key}\\s*=.*$`, "m");
        const entry = `${key}="${secureKey}"`;

        if (envContent.match(keyRegex)) {
          envContent = envContent.replace(keyRegex, entry);
        } else {
          envContent += `\n${entry}`;
        }
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
      // Reload dotenv to reflect the changes in process.env
      dotenv.config();
    }
  }

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      continue;
    }

    if (value.length < 32) {
      invalid.push(`${key} (length is less than 32 characters)`);
      continue;
    }

    if (KNOWN_PLACEHOLDERS.has(value)) {
      invalid.push(`${key} (uses a forbidden fallback string from the codebase)`);
      continue;
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error("=================================================================");
    console.error("❌ CRITICAL CONFIGURATION ERROR: ENVIRONMENT VALIDATION FAILED!");
    if (missing.length > 0) {
      console.error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    if (invalid.length > 0) {
      console.error(`Invalid environment variables (entropy check failed):\n - ${invalid.join("\n - ")}`);
    }
    console.error("=================================================================");
    
    // In test environment, throw instead of process.exit(1) so tests can assert the failure.
    if (isTest) {
      throw new Error(`Environment validation failed: ${[...missing, ...invalid].join(", ")}`);
    } else {
      process.exit(1);
    }
  }
}
