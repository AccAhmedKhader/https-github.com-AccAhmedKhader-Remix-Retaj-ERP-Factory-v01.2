import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { StorageService } from "../src/core/storage/StorageService";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("[Restore Engine] Starting database restore...");
  let backupKey = process.argv[2];
  
  if (!backupKey) {
    const keyPath = path.resolve(process.cwd(), "latest_backup_key.txt");
    if (fs.existsSync(keyPath)) {
      backupKey = fs.readFileSync(keyPath, "utf-8").trim();
      console.log(`[Restore Engine] Read latest backup key from file: ${backupKey}`);
    }
  }

  if (!backupKey) {
    console.error("[Restore Engine] Error: Please provide a backup key as an argument.");
    process.exit(1);
  }

  console.log(`[Restore Engine] Downloading backup file for Key: ${backupKey}...`);
  const backupBuffer = await StorageService.downloadFile(backupKey, "TEN-APEX-01");
  
  const tempFilePath = path.join("/tmp", `downloaded_backup_${Date.now()}.dump`);
  fs.writeFileSync(tempFilePath, backupBuffer);
  console.log(`[Restore Engine] Temporary backup file written to ${tempFilePath}`);

  const dbUrl = process.env.DATABASE_URL;
  let restoredViaPg = false;
  
  if (dbUrl && (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"))) {
    console.log("[Restore Engine] Re-applying schema and database state...");
    console.log(`[Restore Engine] Executing pg_restore on ${dbUrl}...`);
    try {
      execSync(`pg_restore --clean --no-acl --no-owner -d "${dbUrl}" "${tempFilePath}"`, { stdio: "pipe" });
      restoredViaPg = true;
    } catch (restoreErr: any) {
      console.warn(`[Restore Engine] Warning: pg_restore failed (${restoreErr.message || restoreErr}). Falling back to local file restore...`);
    }
  }

  if (!restoredViaPg) {
    const localDbPath = path.resolve(process.cwd(), "erp.db");
    console.log(`[Restore Engine] Restoring local database directory/file to ${localDbPath}...`);
    
    // Check if the backup is a tar.gz by looking at the filename / key or checking magic headers or file signature
    const isTarGz = backupKey.endsWith(".tar.gz") || backupKey.includes("tar.gz");
    
    if (isTarGz) {
      // If erp.db directory exists, clean it or remove it recursively
      if (fs.existsSync(localDbPath)) {
        console.log(`[Restore Engine] Removing current local erp.db directory...`);
        fs.rmSync(localDbPath, { recursive: true, force: true });
      }
      
      console.log(`[Restore Engine] Extracting tarball into ${process.cwd()}...`);
      execSync(`tar -xzf "${tempFilePath}" -C "${process.cwd()}"`);
    } else {
      if (fs.existsSync(localDbPath) && fs.statSync(localDbPath).isDirectory()) {
        fs.rmSync(localDbPath, { recursive: true, force: true });
      }
      fs.copyFileSync(tempFilePath, localDbPath);
    }
  }

  console.log("[Restore Engine] Cleanup temp file...");
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
  
  console.log("[Restore Engine] SUCCESS: Database restored to previous snapshot state!");
}

main().catch((err) => {
  console.error("[Restore Engine] Critical restore error:", err);
  process.exit(1);
});
