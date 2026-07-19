import { BlobServiceClient } from "@azure/storage-blob";
import { Readable } from "stream";
import { IStorageProvider } from "./IStorageProvider";

export interface AzureProviderConfig {
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
  containerName: string;
}

export class AzureBlobStorageProvider implements IStorageProvider {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor(config: AzureProviderConfig) {
    this.containerName = config.containerName;
    if (config.connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    } else if (config.accountName && config.accountKey) {
      const credential = {
        accountName: config.accountName,
        accountKey: config.accountKey,
      };
      this.blobServiceClient = new BlobServiceClient(
        `https://${config.accountName}.blob.core.windows.net`,
        credential as any
      );
    } else {
      // Fallback or dev mock string so we can compile without environment crash
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        "UseDevelopmentStorage=true"
      );
    }
  }

  private async getContainerClient() {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    await containerClient.createIfNotExists();
    return containerClient;
  }

  public async uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void> {
    const container = await this.getContainerClient();
    const blockBlobClient = container.getBlockBlobClient(storageKey);
    await blockBlobClient.uploadStream(stream);
  }

  public async downloadStream(storageKey: string, tenantId: string): Promise<Readable> {
    const container = await this.getContainerClient();
    const blockBlobClient = container.getBlockBlobClient(storageKey);
    const downloadResponse = await blockBlobClient.download();
    if (!downloadResponse.readableStreamBody) {
      throw new Error(`Azure blob download returned empty stream for key: ${storageKey}`);
    }
    return downloadResponse.readableStreamBody as Readable;
  }

  public async downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable> {
    const container = await this.getContainerClient();
    const blockBlobClient = container.getBlockBlobClient(storageKey);
    const count = end - start + 1;
    const downloadResponse = await blockBlobClient.download(start, count);
    if (!downloadResponse.readableStreamBody) {
      throw new Error(`Azure blob download returned empty range stream for key: ${storageKey}`);
    }
    return downloadResponse.readableStreamBody as Readable;
  }

  public async deleteFile(storageKey: string, tenantId: string): Promise<void> {
    const container = await this.getContainerClient();
    const blockBlobClient = container.getBlockBlobClient(storageKey);
    await blockBlobClient.deleteIfExists();
  }

  public async fileExists(storageKey: string, tenantId: string): Promise<boolean> {
    const container = await this.getContainerClient();
    const blockBlobClient = container.getBlockBlobClient(storageKey);
    return await blockBlobClient.exists();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const container = await this.getContainerClient();
      return await container.exists();
    } catch (_) {
      return false;
    }
  }
}
