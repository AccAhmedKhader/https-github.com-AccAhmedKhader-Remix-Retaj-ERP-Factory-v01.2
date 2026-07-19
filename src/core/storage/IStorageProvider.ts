import { Readable } from "stream";

export interface IStorageProvider {
  /**
   * Uploads a stream to the storage key.
   */
  uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void>;

  /**
   * Downloads the complete file as a readable stream.
   */
  downloadStream(storageKey: string, tenantId: string): Promise<Readable>;

  /**
   * Downloads a specific byte range of a file as a readable stream (for resume & partial downloads).
   */
  downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable>;

  /**
   * Deletes a file from storage.
   */
  deleteFile(storageKey: string, tenantId: string): Promise<void>;

  /**
   * Checks if a file exists.
   */
  fileExists(storageKey: string, tenantId: string): Promise<boolean>;

  /**
   * Checks the health of the underlying storage provider.
   */
  healthCheck(): Promise<boolean>;
}
