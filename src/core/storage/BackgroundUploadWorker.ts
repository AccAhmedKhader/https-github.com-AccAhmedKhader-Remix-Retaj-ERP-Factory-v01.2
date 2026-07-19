import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "../database/db";
import { StorageService } from "./StorageService";
import { DocumentArchiveRepository } from "../database/repositories/DocumentArchiveRepository";
import { sql } from "drizzle-orm";

export class BackgroundUploadWorker {
  private static isProcessing = false;

  /**
   * Schedules a background upload task.
   */
  public static async enqueueJob(
    tenantId: string,
    documentId: string,
    version: string,
    filename: string,
    tempPath: string,
    userId: string,
    metadata: {
      category?: string;
      folderId?: string;
      securityLevel?: string;
      uploadedBy: string;
    }
  ): Promise<string> {
    const db = await getDb();
    const jobId = `JOB-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await db.execute(sql`
      INSERT INTO background_upload_jobs (id, tenant_id, document_id, version, filename, temp_path, status, created_at, updated_at)
      VALUES (${jobId}, ${tenantId}, ${documentId}, ${version}, ${filename}, ${tempPath}, 'Pending', NOW(), NOW())
    `);

    // Trigger processing asynchronously
    this.processPendingJobs(userId, metadata).catch((err) => {
      console.error("[BackgroundUploadWorker] Worker execution error:", err);
    });

    return jobId;
  }

  /**
   * Processes all pending background upload jobs.
   */
  public static async processPendingJobs(
    userId: string,
    metadata: {
      category?: string;
      folderId?: string;
      securityLevel?: string;
      uploadedBy: string;
    }
  ): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const db = await getDb();

      while (true) {
        // Retrieve next Pending job
        const result = await db.execute(sql`
          SELECT * FROM background_upload_jobs 
          WHERE status = 'Pending' 
          ORDER BY created_at ASC 
          LIMIT 1
        `);

        const jobs = Array.isArray(result) ? result : (result && Array.isArray((result as any).rows) ? (result as any).rows : []);

        if (jobs.length === 0) break;

        const job = jobs[0];
        const jobId = job.id;

        // Mark as Processing
        await db.execute(sql`
          UPDATE background_upload_jobs 
          SET status = 'Processing', updated_at = NOW() 
          WHERE id = ${jobId}
        `);

        try {
          console.log(`[BackgroundUploadWorker] Processing background job ${jobId} for document ${job.document_id}`);

          if (!fs.existsSync(job.temp_path)) {
            throw new Error(`Temporary file not found: ${job.temp_path}`);
          }

          // Compute size
          const sizeBytes = fs.statSync(job.temp_path).size;

          // 1. Upload Stream from temporary file
          const readStream = fs.createReadStream(job.temp_path);
          const { storageKey, sha256 } = await StorageService.uploadStream(
            job.tenant_id,
            job.document_id,
            job.version,
            job.filename,
            readStream
          );

          // 2. Register Document & Version in the database via Repository
          await DocumentArchiveRepository.createDocument(
            {
              id: job.document_id,
              folderId: metadata.folderId || undefined,
              name: job.filename,
              category: metadata.category || "Administrative",
              securityLevel: metadata.securityLevel || "Public",
              sha256,
              storageKey,
              sizeBytes,
              uploadedBy: metadata.uploadedBy,
            },
            job.tenant_id,
            userId
          );

          // 3. Clean up temporary local file
          if (fs.existsSync(job.temp_path)) {
            fs.unlinkSync(job.temp_path);
          }

          // 4. Mark job as Completed
          await db.execute(sql`
            UPDATE background_upload_jobs 
            SET status = 'Completed', updated_at = NOW() 
            WHERE id = ${jobId}
          `);

          console.log(`[BackgroundUploadWorker] Background job ${jobId} completed successfully.`);
        } catch (jobErr: any) {
          console.error(`[BackgroundUploadWorker] Job ${jobId} failed:`, jobErr.message);

          // Mark job as Failed
          await db.execute(sql`
            UPDATE background_upload_jobs 
            SET status = 'Failed', error_message = ${jobErr.message}, updated_at = NOW() 
            WHERE id = ${jobId}
          `);

          // Attempt clean up of temp file
          try {
            if (fs.existsSync(job.temp_path)) {
              fs.unlinkSync(job.temp_path);
            }
          } catch (_) {}
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
