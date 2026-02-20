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

async function getDocumentDirSize(): Promise<number> {
  try {
    const items = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    let total = 0;
    for (const item of items) {
      total += Number(item.size) || 0;
    }
    return total;
  } catch {
    return 0;
  }
}

export const storageService = {
  async getStorageUsage(): Promise<StorageUsage> {
    const [mp3Total, dbTotal, fsInfo, docDirSize] = await Promise.all([
      appMetaRepository.getTotalDownloadSize(),
      appMetaRepository.getTotalDatabaseSize(),
      RNFS.getFSInfo(),
      getDocumentDirSize(),
    ]);

    const otherBytes = Math.max(0, docDirSize - mp3Total - dbTotal);
    const usedBytes = mp3Total + dbTotal + otherBytes;
    const allocatedBytes = fsInfo.totalSpace;
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
