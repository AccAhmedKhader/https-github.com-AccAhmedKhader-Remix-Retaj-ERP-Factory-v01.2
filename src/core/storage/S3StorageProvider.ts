import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { IStorageProvider } from "./IStorageProvider";

export interface S3ProviderConfig {
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor(config: S3ProviderConfig) {
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

  public async uploadStream(storageKey: string, tenantId: string, stream: Readable): Promise<void> {
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
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
    if (!response.Body) {
      throw new Error(`S3 GetObject returned empty body for key: ${storageKey}`);
    }
    return response.Body as Readable;
  }

  public async downloadStreamRange(storageKey: string, tenantId: string, start: number, end: number): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
        Range: `bytes=${start}-${end}`,
      })
    );
    if (!response.Body) {
      throw new Error(`S3 GetObject returned empty body for key with range: ${storageKey}`);
    }
    return response.Body as Readable;
  }

  public async deleteFile(storageKey: string, tenantId: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
  }

  public async fileExists(storageKey: string, tenantId: string): Promise<boolean> {
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

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return true;
    } catch (_) {
      return false;
    }
  }
}
