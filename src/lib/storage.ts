import { promises as fs } from 'fs';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { config } from '../config/index.js';

export interface StorageResult {
  key: string;
  size: number;
  checksum: string;
  url?: string;
}

export interface StorageItem {
  key: string;
  size: number;
  lastModified: Date;
}

export interface StorageProvider {
  upload(key: string, data: Buffer | Readable, metadata?: Record<string, string>): Promise<StorageResult>;
  download(key: string): Promise<Readable>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<StorageItem[]>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<{ size: number; mimeType?: string } | null>;
}

/**
 * Local filesystem storage provider
 */
class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFullPath(key: string): string {
    return join(this.basePath, key);
  }

  async upload(key: string, data: Buffer | Readable): Promise<StorageResult> {
    const fullPath = this.getFullPath(key);
    const dir = dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    let size = 0;
    const hash = createHash('sha256');

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(fullPath, data);
      size = data.length;
      hash.update(data);
    } else {
      const writeStream = createWriteStream(fullPath);

      await pipeline(
        data,
        async function* (source) {
          for await (const chunk of source) {
            size += chunk.length;
            hash.update(chunk);
            yield chunk;
          }
        },
        writeStream
      );
    }

    return {
      key,
      size,
      checksum: hash.digest('hex'),
    };
  }

  async download(key: string): Promise<Readable> {
    const fullPath = this.getFullPath(key);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    return createReadStream(fullPath);
  }

  async getSignedUrl(key: string): Promise<string> {
    // For local storage, return a relative URL
    // In production, this would be served by the API
    return `/api/storage/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);

    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
  }

  async list(prefix: string): Promise<StorageItem[]> {
    const fullPath = this.getFullPath(prefix);

    if (!existsSync(fullPath)) {
      return [];
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return [];
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const items: StorageItem[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = join(fullPath, entry.name);
        const fileStat = await fs.stat(filePath);
        items.push({
          key: join(prefix, entry.name),
          size: fileStat.size,
          lastModified: fileStat.mtime,
        });
      }
    }

    return items;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return existsSync(fullPath);
  }

  async getMetadata(key: string): Promise<{ size: number; mimeType?: string } | null> {
    const fullPath = this.getFullPath(key);

    if (!existsSync(fullPath)) {
      return null;
    }

    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
    };
  }
}

// Create the appropriate storage provider based on config
function createStorageProvider(): StorageProvider {
  if (config.storage.provider === 's3' && config.s3.endpoint) {
    // TODO: Implement S3 provider when needed
    // For now, fall back to local storage
    console.warn('S3 storage not yet implemented, falling back to local storage');
  }

  return new LocalStorageProvider(config.storage.localPath);
}

// Export singleton instance
export const storage = createStorageProvider();

// Storage path helpers
export const storagePaths = {
  documents: (projectId: string, documentId: string, version: number, filename: string) =>
    `documents/projects/${projectId}/${documentId}/v${version}/${filename}`,

  documentThumbnail: (projectId: string, documentId: string) =>
    `documents/projects/${projectId}/${documentId}/thumbnails/preview.png`,

  recordings: (sessionId: string, filename: string) =>
    `recordings/sessions/${sessionId}/${filename}`,

  uploads: (uploadId: string, filename: string) =>
    `uploads/temp/${uploadId}/${filename}`,
};
