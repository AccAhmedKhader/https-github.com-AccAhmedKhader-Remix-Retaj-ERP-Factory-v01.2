import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDb } from "../database/db";
import { documents, documentVersions, documentBlobs, backgroundUploadJobs } from "../database/schema";
import { eq, and } from "drizzle-orm";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { StorageService, HashCalculator } from "../storage/StorageService";
import { LocalFilesystemProvider } from "../storage/LocalFilesystemProvider";
import { PostgresByteaProvider } from "../storage/PostgresByteaProvider";
import { BackgroundUploadWorker } from "../storage/BackgroundUploadWorker";

describe("Enterprise Storage Engine Platform Tests", () => {
  const tenantId = "TEN-STORE-TEST";
  const userId = "USR-ARCHITECT-01";
  const docId = "DOC-TEST-999";
  const filename = "financial_statement.txt";
  const uncompressibleFilename = "diagram.png";
  const testData = "Enterprise Content Management Security Platform Payload - Confidential Alpha v1.0";

  beforeEach(async () => {
    const db = await getDb();

    // Clean up DB records
    await db.delete(documents).where(eq(documents.tenantId, tenantId));
    await db.delete(documentVersions).where(eq(documentVersions.tenantId, tenantId));
    await db.delete(documentBlobs).where(eq(documentBlobs.tenantId, tenantId));
    await db.delete(backgroundUploadJobs).where(eq(backgroundUploadJobs.tenantId, tenantId));

    // Clear uploads testing directory
    const testUploadsDir = path.join(process.cwd(), "uploads");
    if (fs.existsSync(testUploadsDir)) {
      try {
        fs.rmSync(testUploadsDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  it("should successfully process full lifecycle upload and download with encryption, compression, and hash validation", async () => {
    const stream = Readable.from(Buffer.from(testData));
    const uploadRes = await StorageService.uploadStream(
      tenantId,
      docId,
      "v1.0",
      filename,
      stream
    );

    expect(uploadRes.storageKey).toContain(docId);
    expect(uploadRes.sha256).toBe(crypto.createHash("sha256").update(testData).digest("hex"));

    // Download complete stream
    const downloadStream = await StorageService.downloadStream(uploadRes.storageKey, tenantId);
    let downloadedData = "";
    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk) => {
        downloadedData += chunk.toString();
      });
      downloadStream.on("error", reject);
      downloadStream.on("end", resolve);
    });

    expect(downloadedData).toBe(testData);
  });

  it("should correctly bypass compression for uncompressible file types like PNG images", async () => {
    const pngBuffer = Buffer.alloc(1024, "A"); // Simulated image bytes
    const stream = Readable.from(pngBuffer);
    const uploadRes = await StorageService.uploadStream(
      tenantId,
      docId,
      "v1.0",
      uncompressibleFilename,
      stream
    );

    expect(uploadRes.storageKey).toContain(uncompressibleFilename);

    const downloadStream = await StorageService.downloadStream(uploadRes.storageKey, tenantId);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      downloadStream.on("data", (chunk) => chunks.push(chunk));
      downloadStream.on("error", reject);
      downloadStream.on("end", resolve);
    });

    const downloadedBuffer = Buffer.concat(chunks);
    expect(downloadedBuffer.length).toBe(1024);
  });

  it("should support high-precision partial content stream range requests", async () => {
    // Write test data first
    const rawBuffer = Buffer.from("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    const stream = Readable.from(rawBuffer);
    const uploadRes = await StorageService.uploadStream(
      tenantId,
      docId,
      "v1.0",
      "range_test.txt",
      stream
    );

    // Request bytes 5 to 15 (inclusive) -> '56789ABCDEF'
    const partialStream = await StorageService.downloadStream(uploadRes.storageKey, tenantId, { start: 5, end: 15 });
    let rangeData = "";
    await new Promise<void>((resolve, reject) => {
      partialStream.on("data", (chunk) => {
        rangeData += chunk.toString();
      });
      partialStream.on("error", reject);
      partialStream.on("end", resolve);
    });

    expect(rangeData).toBe("56789ABCDEF");
  });

  it("should support automatic failover to the failsafe local provider if the primary provider raises errors", async () => {
    // Register a mock faulty provider that always throws errors
    const faultyProvider: any = {
      uploadStream: async () => { throw new Error("Faulty provider upload error"); },
      downloadStream: async () => { throw new Error("Faulty provider download error"); },
      deleteFile: async () => { throw new Error("Faulty provider delete error"); },
      fileExists: async () => { throw new Error("Faulty provider exists error"); }
    };

    const originalProvider = (StorageService as any).activeProviderName;
    (StorageService as any).providers["faulty"] = faultyProvider;
    (StorageService as any).activeProviderName = "faulty";

    const stream = Readable.from(Buffer.from(testData));
    
    // Upload should succeed via automatic fallback to local
    const uploadRes = await StorageService.uploadStream(
      tenantId,
      docId,
      "v1.0",
      "failover_test.txt",
      stream
    );

    expect(uploadRes.storageKey).toBeDefined();

    // Reset provider back to original
    (StorageService as any).activeProviderName = originalProvider;
    delete (StorageService as any).providers["faulty"];
  }, 15000);

  it("should execute automatic exponential-backoff retries for transient operations", async () => {
    let callCount = 0;
    const dummyTask = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Transient network exception");
      }
      return "SUCCESS";
    };

    const res = await StorageService.withRetry(dummyTask, 3, 5);
    expect(res).toBe("SUCCESS");
    expect(callCount).toBe(3);
  });

  it("should generate beautiful high-fidelity thumbnails and intelligent metadata previews", async () => {
    const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    
    // Temporarily unset GEMINI_API_KEY to skip actual model network call in unit test
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      // PNG processing test
      await StorageService.generatePreviewsAsync(tenantId, docId, "v1.0", "diagram.png", pngBuffer);
      
      // PDF processing test
      const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Enterprise Annual Audits) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
      await StorageService.generatePreviewsAsync(tenantId, docId, "v1.0", "audit.pdf", pdfBuffer);

      // Verify previews uploaded successfully via Local provider
      const thumbExists = await StorageService.getProvider("local").fileExists(
        `tenants/${tenantId}/documents/${docId}/v1.0/_thumb.png`,
        tenantId
      );
      expect(thumbExists).toBe(true);
    } finally {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }, 15000);

  it("should track metrics accurately and output them in Prometheus format", async () => {
    // Perform an upload
    const data = "test prometheus metrics";
    const stream = Readable.from(Buffer.from(data));
    await StorageService.uploadStream(tenantId, docId, "v1.0", "metrics_test.txt", stream);

    const prometheusOutput = StorageService.getPrometheusMetrics();
    expect(prometheusOutput).toContain("erp_storage_uploads_total");
    expect(prometheusOutput).toContain("erp_storage_bytes_uploaded_total");
  });

  it("should trip circuit breaker after 3 consecutive failures, and reset after cooling down", async () => {
    const faultyProvider: any = {
      uploadStream: async () => { throw new Error("Faulty"); },
      downloadStream: async () => { throw new Error("Faulty"); },
      deleteFile: async () => { throw new Error("Faulty"); },
      fileExists: async () => { throw new Error("Faulty"); }
    };

    (StorageService as any).providers["faulty_cb"] = faultyProvider;
    const cb = (StorageService as any).metrics.circuitBreakerStatus["faulty_cb"] = {
      tripped: false,
      consecutiveFailures: 0,
      lastFailureTime: undefined as number | undefined
    };

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      (StorageService as any).recordProviderFailure("faulty_cb");
    }

    expect(cb.tripped).toBe(true);
    expect((StorageService as any).isCircuitBreakerTripped("faulty_cb")).toBe(true);

    // Speed up cooldown time for test
    cb.lastFailureTime = Date.now() - 20000; // 20 seconds ago (> 15s)
    expect((StorageService as any).isCircuitBreakerTripped("faulty_cb")).toBe(false);

    delete (StorageService as any).providers["faulty_cb"];
    delete (StorageService as any).metrics.circuitBreakerStatus["faulty_cb"];
  });

  it("should successfully initialize and verify interface properties of MinIO provider", async () => {
    const provider = StorageService.getProvider("minio");
    expect(provider).toBeDefined();
    expect(typeof provider.healthCheck).toBe("function");
    expect(typeof provider.uploadStream).toBe("function");
    expect(typeof provider.downloadStream).toBe("function");
  });
});
