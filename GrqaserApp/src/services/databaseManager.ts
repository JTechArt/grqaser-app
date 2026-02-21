/**
 * Database manager service. Handles downloading, storing, refreshing,
 * removing, and switching catalog SQLite databases from public URLs.
 * Uses react-native-fs for file operations and appMetaRepository for
 * persistence of managed_databases records.
 */
import RNFS from 'react-native-fs';
import {ManagedDatabase} from '../types/book';
import {appMetaRepository} from '../database/appMetaRepository';
import {storageService} from './storageService';

const DB_DIR = `${RNFS.DocumentDirectoryPath}/databases`;

export type DbDownloadProgressCallback = (progress: {
  bytesWritten: number;
  contentLength: number;
  fraction: number;
}) => void;

async function ensureDir(dir: string): Promise<void> {
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
}

function generateDbId(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `db-${ts}-${rand}`;
}

function deriveDisplayName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'database';
    return filename.replace(/\.db$/i, '').replace(/[_-]/g, ' ');
  } catch {
    return 'Catalog Database';
  }
}

function validateUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('Only http:// and https:// URLs are supported');
  }
}

/**
 * List the databases directory and return actual file sizes by db id.
 * Does not depend on stored paths — finds files by listing the dir (e.g. "db-xxx.db" -> id "db-xxx").
 */
async function getDatabaseFileSizesFromDisk(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const exists = await RNFS.exists(DB_DIR);
    if (!exists) {
      return map;
    }
    const items = await RNFS.readDir(DB_DIR);
    for (const item of items) {
      if (item.isFile() && item.name.endsWith('.db')) {
        const id = item.name.replace(/\.db$/i, '');
        const size = Number(item.size);
        if (id && Number.isFinite(size) && size >= 0) {
          map.set(id, size);
        }
      }
    }
  } catch {
    // return empty map
  }
  return map;
}

export const databaseManager = {
  async loadDatabaseFromUrl(
    url: string,
    onProgress?: DbDownloadProgressCallback,
  ): Promise<ManagedDatabase> {
    validateUrl(url);
    await ensureDir(DB_DIR);

    const dbId = generateDbId();
    const filePath = `${DB_DIR}/${dbId}.db`;

    let expectedBytes = 0;
    const result = await RNFS.downloadFile({
      fromUrl: url.trim(),
      toFile: filePath,
      progress: res => {
        if (res.contentLength > 0) expectedBytes = res.contentLength;
        onProgress?.({
          bytesWritten: res.bytesWritten,
          contentLength: res.contentLength,
          fraction:
            res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0,
        });
      },
      progressInterval: 500,
      background: true,
      discretionary: false,
    }).promise;

    if (result.statusCode < 200 || result.statusCode >= 300) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error(`Download failed with HTTP ${result.statusCode}`);
    }

    const stat = await RNFS.stat(filePath);
    const size = Number(stat.size);
    const expected = expectedBytes > 0 ? expectedBytes : result.bytesWritten;
    if (expected > 0 && size < expected * 0.95) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error(
        `Download incomplete: got ${Math.round(size / 1024)} KB, expected ~${Math.round(expected / 1024)} KB. Try again or use a different network.`,
      );
    }
    const existingDbs = await appMetaRepository.listDatabases();
    const isFirst = existingDbs.length === 0;

    const entry: ManagedDatabase = {
      id: dbId,
      displayName: deriveDisplayName(url),
      sourceUrl: url.trim(),
      filePath,
      fileSizeBytes: Number(stat.size),
      downloadedAt: new Date().toISOString(),
      isActive: isFirst,
    };

    await appMetaRepository.addDatabase(entry);

    if (isFirst) {
      await appMetaRepository.setActiveDatabase(dbId);
    }

    storageService
      .trackDataUsage('dbUpdates', entry.fileSizeBytes)
      .catch(() => {});

    return entry;
  },

  async listManagedDatabases(): Promise<ManagedDatabase[]> {
    const list = await appMetaRepository.listDatabases();
    const sizeByDbId = await getDatabaseFileSizesFromDisk();
    const result: ManagedDatabase[] = [];
    for (const db of list) {
      const diskSize = sizeByDbId.get(db.id);
      const fileSizeBytes =
        diskSize !== undefined && Number.isFinite(diskSize) && diskSize >= 0
          ? diskSize
          : db.fileSizeBytes;
      if (diskSize !== undefined && diskSize !== db.fileSizeBytes) {
        await appMetaRepository.updateDatabaseFileSize(db.id, fileSizeBytes);
      }
      result.push({...db, fileSizeBytes});
    }
    return result;
  },

  async getActiveDatabase(): Promise<ManagedDatabase | null> {
    return appMetaRepository.getActiveDatabase();
  },

  async setActiveDatabase(dbId: string): Promise<ManagedDatabase> {
    const db = await appMetaRepository.getDatabaseById(dbId);
    if (!db) {
      throw new Error(`Database ${dbId} not found`);
    }
    await appMetaRepository.setActiveDatabase(dbId);
    return {...db, isActive: true};
  },

  async refreshDatabase(
    dbId: string,
    onProgress?: DbDownloadProgressCallback,
  ): Promise<ManagedDatabase> {
    const existing = await appMetaRepository.getDatabaseById(dbId);
    if (!existing) {
      throw new Error(`Database ${dbId} not found`);
    }

    const newEntry = await databaseManager.loadDatabaseFromUrl(
      existing.sourceUrl,
      onProgress,
    );
    return newEntry;
  },

  async removeDatabase(dbId: string): Promise<void> {
    const db = await appMetaRepository.getDatabaseById(dbId);
    if (!db) {
      throw new Error(`Database ${dbId} not found`);
    }
    if (db.isActive) {
      throw new Error(
        'Cannot remove the active database. Set another database as active first.',
      );
    }

    const fileExists = await RNFS.exists(db.filePath);
    if (fileExists) {
      await RNFS.unlink(db.filePath);
    }

    await appMetaRepository.removeDatabase(dbId);
  },
};
