/**
 * Database manager service. Handles downloading, storing, refreshing,
 * removing, and switching catalog SQLite databases from public URLs.
 * Uses react-native-fs for file operations and appMetaRepository for
 * persistence of managed_databases records.
 */
import RNFS from 'react-native-fs';
import {ManagedDatabase} from '../types/book';
import {appMetaRepository} from '../database/appMetaRepository';

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

export const databaseManager = {
  async loadDatabaseFromUrl(
    url: string,
    onProgress?: DbDownloadProgressCallback,
  ): Promise<ManagedDatabase> {
    validateUrl(url);
    await ensureDir(DB_DIR);

    const dbId = generateDbId();
    const filePath = `${DB_DIR}/${dbId}.db`;

    const result = await RNFS.downloadFile({
      fromUrl: url.trim(),
      toFile: filePath,
      progress: res => {
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

    return entry;
  },

  async listManagedDatabases(): Promise<ManagedDatabase[]> {
    return appMetaRepository.listDatabases();
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
