import { Readable } from "stream";
import crypto from "crypto";
import { getDb } from "../database/db";
import { IStorageProvider } from "./IStorageProvider";
import { sql } from "drizzle-orm";

const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks

export class PostgresByteaProvider implements IStorageProvider {
  public async uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void> {
    const db = await getDb();
    let chunkIndex = 0;
    let accumulated = Buffer.alloc(0);

    const writeChunk = async (buffer: Buffer, index: number) => {
      const id = `BLB-${crypto.randomUUID()}`;
      // Standard drivers accept Buffer as a bind parameter for BYTEA
      // If we are using PGlite, it also supports Buffer parameters.
      await db.execute(sql`
        INSERT INTO document_blobs (id, tenant_id, storage_key, chunk_index, data)
        VALUES (${id}, ${tenantId}, ${storageKey}, ${index}, ${buffer})
      `);
    };

    return new Promise((resolve, reject) => {
      stream.on("data", async (chunk: Buffer) => {
        stream.pause();
        try {
          accumulated = Buffer.concat([accumulated, chunk]);
          while (accumulated.length >= CHUNK_SIZE) {
            const toWrite = accumulated.subarray(0, CHUNK_SIZE);
            accumulated = accumulated.subarray(CHUNK_SIZE);
            await writeChunk(toWrite, chunkIndex++);
          }
          stream.resume();
        } catch (err) {
          reject(err);
        }
      });

      stream.on("error", (err) => reject(err));

      stream.on("end", async () => {
        try {
          if (accumulated.length > 0) {
            await writeChunk(accumulated, chunkIndex++);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  public async downloadStream(storageKey: string, tenantId: string): Promise<Readable> {
    const db = await getDb();
    return new PostgresBlobReadStream(db, storageKey, tenantId);
  }

  public async downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable> {
    const db = await getDb();
    return new PostgresBlobReadStream(db, storageKey, tenantId, start, end);
  }

  public async deleteFile(storageKey: string, tenantId: string): Promise<void> {
    const db = await getDb();
    await db.execute(sql`
      DELETE FROM document_blobs 
      WHERE storage_key = ${storageKey} AND tenant_id = ${tenantId}
    `);
  }

  public async fileExists(storageKey: string, tenantId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT 1 FROM document_blobs 
      WHERE storage_key = ${storageKey} AND tenant_id = ${tenantId} 
      LIMIT 1
    `);
    const rows = Array.isArray(result) ? result : (result && Array.isArray((result as any).rows) ? (result as any).rows : []);
    return rows.length > 0;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (_) {
      return false;
    }
  }
}

class PostgresBlobReadStream extends Readable {
  private db: any;
  private storageKey: string;
  private tenantId: string;
  private currentChunkIndex: number;
  private endChunkIndex: number | null = null;
  private startByteOffset: number = 0;
  private endByteOffset: number | null = null;

  constructor(db: any, storageKey: string, tenantId: string, start?: number, end?: number) {
    super();
    this.db = db;
    this.storageKey = storageKey;
    this.tenantId = tenantId;

    if (start !== undefined && end !== undefined) {
      this.currentChunkIndex = Math.floor(start / CHUNK_SIZE);
      this.endChunkIndex = Math.floor(end / CHUNK_SIZE);
      this.startByteOffset = start % CHUNK_SIZE;
      this.endByteOffset = end % CHUNK_SIZE;
    } else {
      this.currentChunkIndex = 0;
    }
  }

  async _read() {
    try {
      if (this.endChunkIndex !== null && this.currentChunkIndex > this.endChunkIndex) {
        this.push(null);
        return;
      }

      const result = await this.db.execute(sql`
        SELECT data FROM document_blobs
        WHERE storage_key = ${this.storageKey} AND tenant_id = ${this.tenantId} AND chunk_index = ${this.currentChunkIndex}
      `);

      const rows = Array.isArray(result) ? result : (result && Array.isArray((result as any).rows) ? (result as any).rows : []);

      if (rows.length === 0) {
        this.push(null);
        return;
      }

      let dataVal = rows[0].data;
      let buffer: Buffer;

      if (Buffer.isBuffer(dataVal)) {
        buffer = dataVal;
      } else if (typeof dataVal === "string") {
        const hex = dataVal.startsWith("\\x") ? dataVal.slice(2) : dataVal;
        buffer = Buffer.from(hex, "hex");
      } else {
        buffer = Buffer.from(dataVal);
      }

      // Slice the buffer if range limits are active
      let outputBuffer = buffer;
      if (this.endChunkIndex !== null) {
        let startSlice = 0;
        let endSlice = buffer.length;

        if (this.currentChunkIndex === Math.floor(this.startByteOffset / CHUNK_SIZE) + (this.endChunkIndex === this.currentChunkIndex ? 0 : 1) - 1) {
          startSlice = this.startByteOffset;
        }
        if (this.currentChunkIndex === this.endChunkIndex && this.endByteOffset !== null) {
          endSlice = Math.min(buffer.length, this.endByteOffset + 1);
        }
        outputBuffer = buffer.subarray(startSlice, endSlice);
      } else if (this.currentChunkIndex === 0 && this.startByteOffset > 0) {
        outputBuffer = buffer.subarray(this.startByteOffset);
      }

      this.currentChunkIndex++;
      this.push(outputBuffer);
    } catch (err) {
      this.destroy(err as any);
    }
  }
}
