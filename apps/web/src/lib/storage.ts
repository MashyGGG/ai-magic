import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageAdapter {
  put(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
}

const bucket = () => process.env.S3_BUCKET || 'ai-magic';

export const storage: StorageAdapter = {
  async put(key, body, contentType) {
    const client = createS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async getSignedUrl(key, expiresIn = 3600) {
    const client = createS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
  },

  async delete(key) {
    const client = createS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket(),
        Key: key,
      }),
    );
  },
};
