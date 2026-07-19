import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { IStorageProvider } from "./IStorageProvider";

export interface MinIOProviderConfig {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  forcePathStyle?: boolean;
}

export class MinIOStorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucketName: string;
  private bucketCreated = false;

  constructor(config: MinIOProviderConfig) {
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || "us-east-1",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle !== undefined ? config.forcePathStyle : true,
    });
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.bucketCreated) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.bucketCreated = true;
    } catch (err: any) {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.bucketCreated = true;
        console.log(`[MinIOStorageProvider] Auto-created bucket: ${this.bucketName}`);
      } catch (createErr: any) {
        console.warn(`[MinIOStorageProvider] Bucket verification/creation status: ${createErr.message}`);
      }
    }
  }

  public async uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void> {
    await this.ensureBucketExists();
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: storageKey,
        Body: stream,
      },
    });
    await upload.done();
  }

  public async downloadStream(storageKey: string, tenantId: string): Promise<Readable> {
    await this.ensureBucketExists();
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
    if (!response.Body) {
      throw new Error(`MinIO GetObject returned empty body for key: ${storageKey}`);
    }
    return response.Body as Readable;
  }

  public async downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable> {
    await this.ensureBucketExists();
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
        Range: `bytes=${start}-${end}`,
      })
    );
    if (!response.Body) {
      throw new Error(`MinIO GetObject returned empty body with range for key: ${storageKey}`);
    }
    return response.Body as Readable;
  }

  public async deleteFile(storageKey: string, tenantId: string): Promise<void> {
    await this.ensureBucketExists();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
  }

  public async fileExists(storageKey: string, tenantId: string): Promise<boolean> {
    await this.ensureBucketExists();
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  public async getMetadata(storageKey: string, tenantId: string): Promise<Record<string, any>> {
    await this.ensureBucketExists();
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
    return response.Metadata || {};
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureBucketExists();
      return true;
    } catch {
      return false;
    }
  }
}
