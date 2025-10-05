import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

interface StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  signedUrlTtlSeconds?: number;
}

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtl: number;

  constructor(private readonly configService: ConfigService) {
    const storage = (this.configService.get<StorageConfig>("storage") ?? {
      bucket: "benchcrm-dev",
      region: "us-east-1"
    }) as StorageConfig;

    this.bucket = storage.bucket;
    this.signedUrlTtl = storage.signedUrlTtlSeconds ?? 900;
    this.client = new S3Client({
      region: storage.region,
      endpoint: storage.endpoint,
      forcePathStyle: storage.forcePathStyle ?? false
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  async createUploadUrl(key: string, contentType: string, sizeBytes: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtl });
    return {
      url,
      expiresInSeconds: this.signedUrlTtl,
      headers: {
        "Content-Type": contentType
      }
    } as const;
  }

  async createDownloadUrl(key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn: this.signedUrlTtl });
    return {
      url,
      expiresInSeconds: this.signedUrlTtl
    } as const;
  }

  async putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return this.streamToBuffer(response.Body);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private async streamToBuffer(body: any): Promise<Buffer> {
    if (!body) {
      return Buffer.alloc(0);
    }

    if (body instanceof Readable || typeof (body as any)[Symbol.asyncIterator] === "function") {
      const chunks: Buffer[] = [];
      for await (const chunk of body as AsyncIterable<unknown>) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk));
        } else if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
        }
      }
      return Buffer.concat(chunks);
    }

    if (typeof (body as any).arrayBuffer === "function") {
      const arrayBuffer = await (body as any).arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    this.logger.warn(`Unsupported S3 body type: ${typeof body}`);
    return Buffer.alloc(0);
  }
}
