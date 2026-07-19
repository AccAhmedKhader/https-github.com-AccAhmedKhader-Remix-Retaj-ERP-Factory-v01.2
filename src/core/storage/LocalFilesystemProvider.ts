import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { IStorageProvider } from "./IStorageProvider";

export class LocalFilesystemProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFullPath(storageKey: string): string {
    // Prevent directory traversal attacks
    const safeKey = storageKey.replace(/\.\./g, "");
    return path.join(this.baseDir, safeKey);
  }

  public async uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void> {
    const fullPath = this.getFullPath(storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(fullPath);
      stream.on("error", (err) => {
        writeStream.destroy();
        reject(err);
      });
      writeStream.on("error", (err) => reject(err));
      writeStream.on("finish", () => resolve());
      stream.pipe(writeStream);
    });
  }

  public async downloadStream(storageKey: string, tenantId: string): Promise<Readable> {
    const fullPath = this.getFullPath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found on local filesystem: ${storageKey}`);
    }
    return fs.createReadStream(fullPath);
  }

  public async downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable> {
    const fullPath = this.getFullPath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found on local filesystem: ${storageKey}`);
    }
    return fs.createReadStream(fullPath, { start, end });
  }

  public async deleteFile(storageKey: string, tenantId: string): Promise<void> {
    const fullPath = this.getFullPath(storageKey);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  public async fileExists(storageKey: string, tenantId: string): Promise<boolean> {
    const fullPath = this.getFullPath(storageKey);
    return fs.existsSync(fullPath);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      return fs.existsSync(this.baseDir);
    } catch (_) {
      return false;
    }
  }
}
