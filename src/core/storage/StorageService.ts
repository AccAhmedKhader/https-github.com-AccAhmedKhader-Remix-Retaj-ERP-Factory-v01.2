import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import os from "os";
import { Readable, Transform } from "stream";
import { Jimp } from "jimp";
import { GoogleGenAI } from "@google/genai";
import { IStorageProvider } from "./IStorageProvider";
import { LocalFilesystemProvider } from "./LocalFilesystemProvider";
import { PostgresByteaProvider } from "./PostgresByteaProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import { AzureBlobStorageProvider } from "./AzureBlobStorageProvider";
import { MinIOStorageProvider } from "./MinIOStorageProvider";
import { getDb } from "../database/db";
import { sql } from "drizzle-orm";
import { Config } from "../config/env-validation";

// Transform stream to calculate SHA256 on the fly
export class HashCalculator extends Transform {
  private hash = crypto.createHash("sha256");

  _transform(chunk: any, encoding: string, callback: Function) {
    this.hash.update(chunk);
    this.push(chunk);
    callback();
  }

  public getHash(): string {
    return this.hash.digest("hex");
  }
}

// Transform stream to encrypt on the fly using AES-256-CBC
class Encryptor extends Transform {
  private cipher: crypto.Cipher;
  private ivSent = false;
  private iv: Buffer;

  constructor(key: Buffer, iv: Buffer) {
    super();
    this.iv = iv;
    this.cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    if (!this.ivSent) {
      this.push(this.iv); // Prepend IV to the stream
      this.ivSent = true;
    }
    const encrypted = this.cipher.update(chunk);
    this.push(encrypted);
    callback();
  }

  _flush(callback: Function) {
    const final = this.cipher.final();
    this.push(final);
    callback();
  }
}

// Transform stream to decrypt on the fly
class Decryptor extends Transform {
  private decipher: crypto.Decipher | null = null;
  private key: Buffer;
  private ivBuffer = Buffer.alloc(0);

  constructor(key: Buffer) {
    super();
    this.key = key;
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    if (this.decipher === null) {
      // Accumulate first 16 bytes for IV
      const needed = 16 - this.ivBuffer.length;
      const toTake = chunk.subarray(0, needed);
      this.ivBuffer = Buffer.concat([this.ivBuffer, toTake]);

      if (this.ivBuffer.length === 16) {
        this.decipher = crypto.createDecipheriv("aes-256-cbc", this.key, this.ivBuffer);
        const remaining = chunk.subarray(needed);
        if (remaining.length > 0) {
          const decrypted = this.decipher.update(remaining);
          this.push(decrypted);
        }
      }
    } else {
      const decrypted = this.decipher.update(chunk);
      this.push(decrypted);
    }
    callback();
  }

  _flush(callback: Function) {
    if (this.decipher) {
      try {
        const final = this.decipher.final();
        this.push(final);
      } catch (err) {
        // Handle decipher final padding block error gracefully if stream was cut off
      }
    }
    callback();
  }
}

// Transform stream to slice a stream into a specific range of bytes (streaming range support)
class RangeSlicer extends Transform {
  private rangeStart: number;
  private rangeEnd: number;
  private bytesRead = 0;

  constructor(rangeStart: number, rangeEnd: number) {
    super();
    this.rangeStart = rangeStart;
    this.rangeEnd = rangeEnd;
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    const chunkLength = chunk.length;
    const chunkStart = this.bytesRead;
    const chunkEnd = chunkStart + chunkLength;

    this.bytesRead += chunkLength;

    if (chunkEnd <= this.rangeStart) {
      // This entire chunk is before the start of the range
      callback();
      return;
    }

    if (chunkStart > this.rangeEnd) {
      // This entire chunk is after the end of the range
      callback();
      return;
    }

    // Some or all of this chunk is within the range
    const relativeStart = Math.max(0, this.rangeStart - chunkStart);
    const relativeEnd = Math.min(chunkLength, this.rangeEnd - chunkStart + 1);

    const sliced = chunk.subarray(relativeStart, relativeEnd);
    this.push(sliced);
    callback();
  }
}

class ByteCounter extends Transform {
  public bytesProcessed = 0;

  _transform(chunk: any, encoding: string, callback: Function) {
    this.bytesProcessed += chunk.length;
    this.push(chunk);
    callback();
  }
}

export interface StorageMetrics {
  uploadCount: number;
  downloadCount: number;
  deleteCount: number;
  existsCount: number;
  errorCount: number;
  retryCount: number;
  totalBytesUploaded: number;
  totalBytesDownloaded: number;
  totalUploadTimeMs: number;
  totalDownloadTimeMs: number;
  totalResponseTimeMs: number;
  compressionRatioSum: number;
  compressionCount: number;
  providerFailures: Record<string, number>;
  providerSuccesses: Record<string, number>;
  circuitBreakerStatus: Record<string, { tripped: boolean; consecutiveFailures: number; lastFailureTime?: number }>;
}

export const metrics: StorageMetrics = {
  uploadCount: 0,
  downloadCount: 0,
  deleteCount: 0,
  existsCount: 0,
  errorCount: 0,
  retryCount: 0,
  totalBytesUploaded: 0,
  totalBytesDownloaded: 0,
  totalUploadTimeMs: 0,
  totalDownloadTimeMs: 0,
  totalResponseTimeMs: 0,
  compressionRatioSum: 0,
  compressionCount: 0,
  providerFailures: { s3: 0, minio: 0, azure: 0, local: 0, postgres: 0 },
  providerSuccesses: { s3: 0, minio: 0, azure: 0, local: 0, postgres: 0 },
  circuitBreakerStatus: {
    s3: { tripped: false, consecutiveFailures: 0 },
    minio: { tripped: false, consecutiveFailures: 0 },
    azure: { tripped: false, consecutiveFailures: 0 },
    local: { tripped: false, consecutiveFailures: 0 },
    postgres: { tripped: false, consecutiveFailures: 0 },
  }
};

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
  timeoutMs: number;
}

function isTestEnvDynamic(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    typeof (global as any).it === "function" ||
    typeof (global as any).describe === "function" ||
    typeof (global as any).vitest === "object" ||
    (typeof process !== "undefined" && process.argv && process.argv.some(arg => arg.includes("vitest")))
  );
}

export const defaultRetryPolicy: RetryPolicy = {
  get maxRetries() {
    return isTestEnvDynamic() ? 1 : 3;
  },
  get initialDelayMs() {
    return isTestEnvDynamic() ? 5 : 1000;
  },
  get backoffFactor() {
    return 2;
  },
  get timeoutMs() {
    return isTestEnvDynamic() ? 2000 : 30000;
  }
};

const PROVIDER_CHAIN = ["s3", "minio", "azure", "local", "postgres"];

export class StorageService {
  public static readonly metrics = metrics;
  private static providers: Record<string, IStorageProvider> = {};
  private static activeProviderName = process.env.STORAGE_PROVIDER || "local";
  private static encryptionKey: Buffer;

  static {
    // Stable 32-byte encryption key from environment
    const rawKey = Config.STORAGE_ENCRYPTION_KEY;
    this.encryptionKey = crypto.createHash("sha256").update(rawKey).digest();
  }

  private static isCircuitBreakerTripped(providerName: string): boolean {
    const cb = metrics.circuitBreakerStatus[providerName];
    if (!cb) return false;
    if (cb.tripped) {
      const now = Date.now();
      // Cool-down check: 15 seconds
      if (cb.lastFailureTime && now - cb.lastFailureTime > 15000) {
        console.log(`[StorageService] Circuit breaker for provider [${providerName}] cooled down. Resetting.`);
        cb.tripped = false;
        cb.consecutiveFailures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private static recordProviderSuccess(providerName: string) {
    if (metrics.providerSuccesses[providerName] !== undefined) {
      metrics.providerSuccesses[providerName]++;
    }
    const cb = metrics.circuitBreakerStatus[providerName];
    if (cb) {
      cb.consecutiveFailures = 0;
      cb.tripped = false;
    }
  }

  private static recordProviderFailure(providerName: string) {
    metrics.errorCount++;
    if (metrics.providerFailures[providerName] !== undefined) {
      metrics.providerFailures[providerName]++;
    }
    const cb = metrics.circuitBreakerStatus[providerName];
    if (cb) {
      cb.consecutiveFailures++;
      cb.lastFailureTime = Date.now();
      if (cb.consecutiveFailures >= 3) {
        cb.tripped = true;
        console.warn(`[StorageService] Circuit breaker TRIPPED for provider [${providerName}] due to ${cb.consecutiveFailures} consecutive failures.`);
      }
    }
  }

  /**
   * Lazy-initializes and retrieves the specified storage provider.
   */
  public static getProvider(name?: string): IStorageProvider {
    const providerName = name || this.activeProviderName;
    if (this.providers[providerName]) return this.providers[providerName];

    console.log(`[StorageService] Initializing storage provider: ${providerName}`);
    let provider: IStorageProvider;

    switch (providerName) {
      case "postgres":
        provider = new PostgresByteaProvider();
        break;
      case "minio":
        provider = new MinIOStorageProvider({
          endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
          region: process.env.S3_REGION || "us-east-1",
          accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
          secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
          bucketName: process.env.S3_BUCKET_NAME || "apex-erp-documents",
          forcePathStyle: true,
        });
        break;
      case "s3":
        provider = new S3StorageProvider({
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || "us-east-1",
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
          bucketName: process.env.S3_BUCKET_NAME || "apex-erp-documents",
          forcePathStyle: false,
        });
        break;
      case "azure":
        provider = new AzureBlobStorageProvider({
          connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
          accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
          accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
          containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || "apex-erp-documents",
        });
        break;
      case "local":
      default:
        provider = new LocalFilesystemProvider();
        break;
    }

    this.providers[providerName] = provider;
    return provider;
  }

  /**
   * Helper to run actions with exponential-backoff retries.
   */
  public static async withRetry<T>(fn: () => Promise<T>, retries = defaultRetryPolicy.maxRetries, delay = defaultRetryPolicy.initialDelayMs): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      metrics.retryCount++;
      console.warn(`[StorageService] Transient error occurred. Retrying in ${delay}ms... Remaining retries: ${retries}`);
      await new Promise((r) => setTimeout(r, delay));
      return this.withRetry(fn, retries - 1, delay * this.getBackoffFactor());
    }
  }

  private static getBackoffFactor(): number {
    return defaultRetryPolicy.backoffFactor;
  }

  public static isProviderConfigured(name: string): boolean {
    if (this.providers && this.providers[name]) {
      return true; // Manually registered or mocked provider
    }
    switch (name) {
      case "postgres":
      case "local":
        return true;
      case "s3":
        return !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
      case "minio":
        if (isTestEnvDynamic()) {
          return !!process.env.MINIO_TEST_ENABLED;
        }
        return true;
      case "azure":
        return !!(process.env.AZURE_STORAGE_CONNECTION_STRING || (process.env.AZURE_STORAGE_ACCOUNT_NAME && process.env.AZURE_STORAGE_ACCOUNT_KEY));
      default:
        return false;
    }
  }

  /**
   * Promise race helper for operation timeout.
   */
  public static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  /**
   * Core execution wrapper with automatic priority-based storage failover and circuit breaking.
   */
  private static async executeWithFailover<T>(
    operationName: string,
    action: (provider: IStorageProvider) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const primaryName = this.activeProviderName;
    
    // Construct the failover chain purely of configured providers
    const configuredChain = PROVIDER_CHAIN.filter((p) => this.isProviderConfigured(p));
    let chain = [...configuredChain];

    if (this.isProviderConfigured(primaryName)) {
      chain = [primaryName, ...configuredChain.filter((p) => p !== primaryName)];
    } else if (this.providers[primaryName]) {
      chain = [primaryName, ...configuredChain.filter((p) => p !== primaryName)];
    } else {
      console.warn(`[StorageService] Active provider [${primaryName}] is not configured in this environment. Bypassing to next configured provider.`);
    }

    let lastError: any = null;

    for (const providerName of chain) {
      if (this.isCircuitBreakerTripped(providerName)) {
        console.log(`[StorageService] Skipping provider [${providerName}] because circuit breaker is tripped.`);
        continue;
      }

      let provider: IStorageProvider;
      try {
        provider = this.getProvider(providerName);
      } catch (err) {
        console.warn(`[StorageService] Failed to initialize provider [${providerName}]: ${(err as Error).message}`);
        continue;
      }

      try {
        const result = await this.withRetry(async () => {
          const opPromise = action(provider);
          return await this.withTimeout(opPromise, defaultRetryPolicy.timeoutMs);
        });

        this.recordProviderSuccess(providerName);
        metrics.totalResponseTimeMs += (Date.now() - startTime);
        return result;
      } catch (err: any) {
        this.recordProviderFailure(providerName);
        lastError = err;
        console.error(`[StorageService] Provider [${providerName}] failed during ${operationName}: ${err.message}. Moving down failover chain...`);
      }
    }

    throw new Error(`[StorageService] All storage providers in failover chain failed. Last error: ${lastError?.message}`);
  }

  /**
   * Checks if file compression should be applied (avoiding compressed archives, PDFs, and images).
   */
  private static shouldCompress(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    const uncompressible = [".zip", ".rar", ".gz", ".7z", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mp3"];
    return !uncompressible.includes(ext);
  }

  private static async stageStreamToLocalTempFile(stream: Readable): Promise<string> {
    const tempDir = path.join(os.tmpdir(), "apex-erp-storage-temp");
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `stage_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.tmp`);
    
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempPath);
      stream.pipe(writeStream);
      writeStream.on("finish", () => resolve(tempPath));
      writeStream.on("error", (err) => {
        fs.unlink(tempPath, () => {});
        reject(err);
      });
    });
  }

  private static async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }

  /**
   * Uploads a Stream to storage with on-the-fly encryption, compression, hash calculation, failover, and retry.
   */
  public static async uploadStream(
    tenantId: string,
    docId: string,
    version: string,
    filename: string,
    rawStream: Readable
  ): Promise<{ storageKey: string; sha256: string }> {
    const storageKey = `tenants/${tenantId}/documents/${docId}/${version}/${filename}`;

    const bypassStaging = (rawStream as any).bypassStaging || false;
    let tempPath: string | null = null;

    // Detect if source stream is a local file stream to avoid duplicate disk staging
    if ((rawStream as any).path && typeof (rawStream as any).path === "string" && fs.existsSync((rawStream as any).path)) {
      tempPath = (rawStream as any).path;
    } else if (!bypassStaging) {
      tempPath = await this.stageStreamToLocalTempFile(rawStream);
    }

    try {
      let sha256 = "";
      if (tempPath) {
        sha256 = await this.calculateFileHash(tempPath);
      }

      let rawBytes = 0;
      let uploadedBytes = 0;
      let isCompressed = false;

      const startUploadTime = Date.now();
      await this.executeWithFailover("uploadStream", async (provider) => {
        // Create fresh read stream or pipe the raw stream if bypassed
        const fileStream = tempPath ? fs.createReadStream(tempPath) : rawStream;
        const rawCounter = new ByteCounter();
        const hashCalc = new HashCalculator();
        let currentStream: Readable = fileStream.pipe(rawCounter);

        if (bypassStaging) {
          currentStream = currentStream.pipe(hashCalc);
        }

        isCompressed = this.shouldCompress(filename);
        const compressedCounter = new ByteCounter();
        if (isCompressed) {
          currentStream = currentStream.pipe(zlib.createGzip()).pipe(compressedCounter) as any;
        }

        const iv = crypto.randomBytes(16);
        const encryptor = new Encryptor(this.encryptionKey, iv);
        currentStream = currentStream.pipe(encryptor) as any;

        await provider.uploadStream(storageKey, tenantId, currentStream);

        rawBytes = rawCounter.bytesProcessed;
        uploadedBytes = isCompressed ? compressedCounter.bytesProcessed : rawBytes;
        if (bypassStaging) {
          sha256 = hashCalc.getHash();
        }
      });
      const uploadDuration = Date.now() - startUploadTime;

      metrics.uploadCount++;
      metrics.totalBytesUploaded += uploadedBytes;
      metrics.totalUploadTimeMs += uploadDuration;
      if (isCompressed && rawBytes > 0) {
        metrics.compressionRatioSum += (rawBytes / uploadedBytes);
        metrics.compressionCount++;
      }

      console.log(`[StorageService] Successfully uploaded stream. Key: ${storageKey}, Hash: ${sha256}, Compressed: ${isCompressed}, Original size: ${rawBytes}B, Uploaded size: ${uploadedBytes}B`);
      return { storageKey, sha256 };
    } finally {
      if (tempPath && !bypassStaging && !(rawStream as any).path) {
        fs.unlink(tempPath, () => {});
      }
    }
  }

  /**
   * Downloads a stream from storage, performing on-the-fly decryption, GZIP decompression, and Range retrieval.
   */
  public static async downloadStream(
    storageKey: string,
    tenantId: string,
    range?: { start: number; end: number }
  ): Promise<Readable> {
    const isCompressed = this.shouldCompress(storageKey);
    const downloadCounter = new ByteCounter();

    const startDownloadTime = Date.now();
    const stream = await this.executeWithFailover("downloadStream", async (provider) => {
      return await provider.downloadStream(storageKey, tenantId);
    });

    let decodedStream: Readable = stream.pipe(downloadCounter) as any;

    // Decrypt Stream on the fly
    decodedStream = decodedStream.pipe(new Decryptor(this.encryptionKey)) as any;

    // Decompress if transparent compression was applied
    if (isCompressed) {
      decodedStream = decodedStream.pipe(zlib.createGunzip()) as any;
    }

    // Apply high-precision Range slicing on plaintext stream if range request is specified
    if (range) {
      decodedStream = decodedStream.pipe(new RangeSlicer(range.start, range.end)) as any;
    }

    downloadCounter.on("end", () => {
      metrics.downloadCount++;
      metrics.totalBytesDownloaded += downloadCounter.bytesProcessed;
      metrics.totalDownloadTimeMs += (Date.now() - startDownloadTime);
    });

    return decodedStream;
  }

  /**
   * Generates a Prometheus text exposition output for ERP storage metrics.
   */
  public static getPrometheusMetrics(): string {
    const lines: string[] = [];
    const addMetric = (name: string, value: number, labels: Record<string, string> = {}, type = "counter", help = "") => {
      if (help) lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      const labelStr = Object.keys(labels).length > 0
        ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`
        : "";
      lines.push(`${name}${labelStr} ${value}`);
    };

    addMetric("erp_storage_uploads_total", metrics.uploadCount, {}, "counter", "Total number of uploads");
    addMetric("erp_storage_downloads_total", metrics.downloadCount, {}, "counter", "Total number of downloads");
    addMetric("erp_storage_deletes_total", metrics.deleteCount, {}, "counter", "Total number of deletes");
    addMetric("erp_storage_errors_total", metrics.errorCount, {}, "counter", "Total number of storage operation errors");
    addMetric("erp_storage_retries_total", metrics.retryCount, {}, "counter", "Total number of operation retries");
    addMetric("erp_storage_bytes_uploaded_total", metrics.totalBytesUploaded, {}, "counter", "Total bytes uploaded to storage");
    addMetric("erp_storage_bytes_downloaded_total", metrics.totalBytesDownloaded, {}, "counter", "Total bytes downloaded from storage");
    addMetric("erp_storage_upload_time_ms_total", metrics.totalUploadTimeMs, {}, "counter", "Total upload time in milliseconds");
    addMetric("erp_storage_download_time_ms_total", metrics.totalDownloadTimeMs, {}, "counter", "Total download time in milliseconds");
    addMetric("erp_storage_response_time_ms_total", metrics.totalResponseTimeMs, {}, "counter", "Total response time in milliseconds");

    const avgCompression = metrics.compressionCount > 0 ? (metrics.compressionRatioSum / metrics.compressionCount) : 1.0;
    addMetric("erp_storage_compression_ratio_average", avgCompression, {}, "gauge", "Average compression ratio (compressed/raw)");

    for (const [provider, count] of Object.entries(metrics.providerSuccesses)) {
      addMetric("erp_storage_provider_success_total", count, { provider }, "counter");
    }
    for (const [provider, count] of Object.entries(metrics.providerFailures)) {
      addMetric("erp_storage_provider_failure_total", count, { provider }, "counter");
    }
    for (const [provider, cb] of Object.entries(metrics.circuitBreakerStatus)) {
      addMetric("erp_storage_circuit_breaker_tripped", cb.tripped ? 1 : 0, { provider }, "gauge", "1 if circuit breaker is tripped, 0 otherwise");
    }

    return lines.join("\n");
  }

  /**
   * Backward compatibility: Uploads a Buffer to the active storage engine.
   */
  public static async uploadFile(
    tenantId: string,
    docId: string,
    version: string,
    filename: string,
    fileBuffer: Buffer
  ): Promise<string> {
    const stream = Readable.from(fileBuffer);
    const { storageKey } = await this.uploadStream(tenantId, docId, version, filename, stream);
    
    // Asynchronously trigger thumbnails and previews
    if (!filename.startsWith("_")) {
      this.generatePreviewsAsync(tenantId, docId, version, filename, fileBuffer).catch((err) => {
        console.error("[StorageService] Preview generation background failure:", err);
      });
    }

    return storageKey;
  }

  /**
   * Backward compatibility: Downloads a complete file buffer from the active storage engine.
   */
  public static async downloadFile(storageKey: string, tenantId = "TEN-APEX-01"): Promise<Buffer> {
    const stream = await this.downloadStream(storageKey, tenantId);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Deletes a file from the active storage engine.
   */
  public static async deleteFile(storageKey: string, tenantId = "TEN-APEX-01"): Promise<void> {
    await this.executeWithFailover("deleteFile", async (provider) => {
      await provider.deleteFile(storageKey, tenantId);
    });
  }

  /**
   * Static SHA-256 calculation.
   */
  public static calculateSHA256(fileBuffer: Buffer): string {
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Asynchronous high-fidelity thumbnail and preview generation runner.
   */
  public static async generatePreviewsAsync(
    tenantId: string,
    docId: string,
    version: string,
    filename: string,
    fileBuffer: Buffer
  ): Promise<void> {
    const ext = path.extname(filename).toLowerCase();
    const baseThumbKey = `tenants/${tenantId}/documents/${docId}/${version}/_thumb.png`;
    const basePreviewKey = `tenants/${tenantId}/documents/${docId}/${version}/_preview.png`;

    try {
      if ([".png", ".jpg", ".jpeg", ".gif", ".bmp"].includes(ext)) {
        console.log(`[StorageService] Generating Image preview and thumbnail for: ${filename}`);
        
        // 1. Thumbnail (128x128)
        const jimpImage = await Jimp.read(fileBuffer);
        jimpImage.resize({ w: 128 });
        const thumbBuffer = await jimpImage.getBuffer("image/png");
        await this.uploadFile(tenantId, docId, version, "_thumb.png", thumbBuffer);

        // 2. High Quality Image Preview (800 width)
        const previewImage = await Jimp.read(fileBuffer);
        previewImage.resize({ w: 800 });
        const previewBuffer = await previewImage.getBuffer("image/png");
        await this.uploadFile(tenantId, docId, version, "_preview.png", previewBuffer);

        console.log("[StorageService] Image preview/thumbnail generated successfully.");
      } else if (ext === ".pdf") {
        console.log(`[StorageService] Generating PDF vector thumbnail and intelligent content preview card for: ${filename}`);
        
        // PDF Thumbnail Generation
        // Create a beautiful, polished crimson vector document badge using Jimp
        const canvas = new Jimp({ width: 200, height: 260, color: 0xffffffff });
        
        // Let's draw a professional document container with a shadow and crimson borders
        for (let x = 0; x < 200; x++) {
          for (let y = 0; y < 260; y++) {
            // Draw a subtle border
            if (x === 0 || x === 199 || y === 0 || y === 259) {
              canvas.setPixelColor(0xd1d5dbff, x, y); // grey-300
            }
            // Draw crimson PDF top-bar
            if (y >= 0 && y <= 45) {
              canvas.setPixelColor(0xdc2626ff, x, y); // red-600
            }
          }
        }

        // Draw visual placeholders for lines of text
        for (let i = 0; i < 5; i++) {
          const yStart = 90 + i * 25;
          const lineWidth = i % 2 === 0 ? 140 : 100;
          for (let x = 30; x < 30 + lineWidth; x++) {
            for (let y = yStart; y < yStart + 8; y++) {
              canvas.setPixelColor(0xe5e7ebff, x, y); // grey-200 lines
            }
          }
        }

        const pdfThumbBuffer = await canvas.getBuffer("image/png");
        await this.uploadFile(tenantId, docId, version, "_thumb.png", pdfThumbBuffer);
        
        // Setup AI-powered text preview extraction
        if (process.env.GEMINI_API_KEY) {
          try {
            console.log("[StorageService] Launching intelligent Gemini PDF preview metadata extractor.");
            const ai = new GoogleGenAI({
              apiKey: process.env.GEMINI_API_KEY,
              httpOptions: { headers: { "User-Agent": "aistudio-build" } },
            });

            // Extract the first 2KB of text (safe fallback)
            const safeTextSample = fileBuffer.toString("utf8", 0, Math.min(fileBuffer.length, 2048)).replace(/[^\x20-\x7E\r\n\s\t]/g, "");

            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Please parse this safe raw text stream of an enterprise PDF document and return an elegant JSON block containing:
1. "title": Best-guess official title.
2. "author": Best-guess author/organization.
3. "summary": A professional, 2-sentence executive summary.
4. "keyEntities": List of up to 4 major companies, dates, or financial amounts found.

Document content:
${safeTextSample}`,
              config: { responseMimeType: "application/json" }
            });

            if (response.text) {
              await this.uploadFile(tenantId, docId, version, "_preview_meta.json", Buffer.from(response.text, "utf8"));
              console.log("[StorageService] Intelligent PDF metadata preview written successfully.");
            }
          } catch (aiErr: any) {
            console.warn("[StorageService] Non-blocking Gemini metadata extraction bypassed:", aiErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error(`[StorageService] Error during preview generation for ${filename}:`, err.message);
    }
  }
}
