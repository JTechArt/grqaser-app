/**
 * Storage and mobile data usage tracking.
 * Computes storage usage from appMetaRepository + platform APIs.
 * Tracks mobile data usage via AsyncStorage with monthly reset.
 */
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appMetaRepository} from '../database/appMetaRepository';
import type {StorageUsage, MobileDataUsage} from '../types/book';

const DATA_USAGE_KEY = '@grqaser/mobile_data_usage';

/** Maximum storage allocated for app data (MP3s + databases). Default 10 GB. */
export const STORAGE_LIMIT_BYTES =
  10 * 1024 * 1024 * 1024;

interface DataUsageStore {
  period: string; // "YYYY-MM"
  streaming: number;
  downloads: number;
  dbUpdates: number;
}

function currentPeriod(): string {
  const d = new Date();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

async function loadDataUsage(): Promise<DataUsageStore> {
  try {
    const raw = await AsyncStorage.getItem(DATA_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DataUsageStore;
      if (parsed.period === currentPeriod()) {
        return parsed;
      }
    }
  } catch {
    // fall through to default
  }
  return {period: currentPeriod(), streaming: 0, downloads: 0, dbUpdates: 0};
}

async function saveDataUsage(store: DataUsageStore): Promise<void> {
  try {
    await AsyncStorage.setItem(DATA_USAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export type DataUsageCategory = 'streaming' | 'downloads' | 'dbUpdates';

/** Recursively sum file sizes under dir (so subdirs like databases/ and mp3downloads/ are included). */
async function getDirSizeRecursive(dirPath: string): Promise<number> {
  try {
    const items = await RNFS.readDir(dirPath);
    let total = 0;
    for (const item of items) {
      const isDir =
        typeof (item as {isDirectory?: () => boolean}).isDirectory ===
          'function' &&
        (item as {isDirectory: () => boolean}).isDirectory();
      if (isDir) {
        total += await getDirSizeRecursive(item.path);
      } else {
        total += Number(item.size) || 0;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function getDocumentDirSize(): Promise<number> {
  return getDirSizeRecursive(RNFS.DocumentDirectoryPath);
}

export const storageService = {
  async getStorageUsage(): Promise<StorageUsage> {
    const [mp3Total, dbTotal, docDirSize] = await Promise.all([
      appMetaRepository.getTotalDownloadSize(),
      appMetaRepository.getTotalDatabaseSize(),
      getDocumentDirSize(),
    ]);

    const otherBytes = Math.max(0, docDirSize - mp3Total - dbTotal);
    const usedBytes = mp3Total + dbTotal + otherBytes;
    const allocatedBytes = STORAGE_LIMIT_BYTES;
    const percentage =
      allocatedBytes > 0
        ? Math.round((usedBytes / allocatedBytes) * 1000) / 10
        : 0;

    return {
      allocatedBytes,
      usedBytes,
      percentage,
      breakdown: {
        mp3s: mp3Total,
        databases: dbTotal,
        other: otherBytes,
      },
    };
  },

  async getMobileDataUsage(): Promise<MobileDataUsage> {
    const store = await loadDataUsage();
    const totalBytes = store.streaming + store.downloads + store.dbUpdates;
    return {
      totalBytes,
      period: 'This Month',
      breakdown: {
        streaming: store.streaming,
        downloads: store.downloads,
        dbUpdates: store.dbUpdates,
      },
    };
  },

  async trackDataUsage(
    category: DataUsageCategory,
    bytes: number,
  ): Promise<void> {
    const store = await loadDataUsage();
    store[category] += bytes;
    await saveDataUsage(store);
  },

  async resetDataUsage(): Promise<void> {
    await saveDataUsage({
      period: currentPeriod(),
      streaming: 0,
      downloads: 0,
      dbUpdates: 0,
    });
  },
};
