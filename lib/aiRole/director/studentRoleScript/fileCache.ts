import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

type CacheStore<T> = {
  useMemoryStore: boolean;
  data: T;
};

type FileCacheConfig<T> = {
  dataDir: string;
  fileName: string;
  defaultValue: T;
};

function isReadOnlyFileSystemError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EACCES' || code === 'EPERM' || code === 'EROFS';
}

export class FileCache<T> {
  private store: CacheStore<T>;
  private dataDir: string;
  private dataFile: string;
  private defaultValue: T;

  constructor(config: FileCacheConfig<T>) {
    this.dataDir = config.dataDir;
    this.dataFile = path.join(config.dataDir, config.fileName);
    this.defaultValue = config.defaultValue;
    this.store = {
      useMemoryStore: false,
      data: config.defaultValue,
    };
  }

  private useMemoryStore(): void {
    if (!this.store.useMemoryStore) {
      this.store.useMemoryStore = true;
    }
  }

  private async writeDataToFile(data: T): Promise<boolean> {
    if (this.store.useMemoryStore) {
      this.store.data = data;
      return true;
    }

    try {
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      if (isReadOnlyFileSystemError(error)) {
        this.useMemoryStore();
        this.store.data = data;
        return false;
      }
      throw error;
    }
  }

  private async ensureDataFile(): Promise<void> {
    if (this.store.useMemoryStore) {
      return;
    }

    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      if (isReadOnlyFileSystemError(error)) {
        this.useMemoryStore();
        return;
      }
      throw error;
    }

    try {
      await fs.access(this.dataFile);
    } catch (error) {
      if (isReadOnlyFileSystemError(error)) {
        this.useMemoryStore();
        return;
      }

      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }

      await this.writeDataToFile(this.defaultValue);
    }
  }

  async read(): Promise<T> {
    if (this.store.useMemoryStore) {
      return this.store.data;
    }

    await this.ensureDataFile();
    if (this.store.useMemoryStore) {
      return this.store.data;
    }

    let content: string;
    try {
      content = await fs.readFile(this.dataFile, 'utf-8');
    } catch (error) {
      if (isReadOnlyFileSystemError(error)) {
        this.useMemoryStore();
        return this.store.data;
      }
      throw error;
    }

    try {
      const parsed = JSON.parse(content);
      this.store.data = parsed as T;
      return this.store.data;
    } catch {
      // 如果檔案損毀，重置為預設值
      this.store.data = this.defaultValue;
      await this.writeDataToFile(this.store.data);
      return this.store.data;
    }
  }

  async write(data: T): Promise<void> {
    this.store.data = data;

    if (this.store.useMemoryStore) {
      return;
    }

    await this.ensureDataFile();
    if (this.store.useMemoryStore) {
      return;
    }

    await this.writeDataToFile(this.store.data);
  }

  isUsingMemoryStore(): boolean {
    return this.store.useMemoryStore;
  }
}
