jest.mock('react-native-fs');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../../src/database/appMetaRepository', () => ({
  appMetaRepository: {
    getTotalDownloadSize: jest.fn(),
    getTotalDatabaseSize: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {appMetaRepository} from '../../src/database/appMetaRepository';
import {
  storageService,
  STORAGE_LIMIT_BYTES,
} from '../../src/services/storageService';

const {
  __mockGetFSInfo: mockGetFSInfo,
  __mockReadDir: mockReadDir,
} = require('react-native-fs');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('storageService', () => {
  describe('getStorageUsage', () => {
    it('computes storage usage from mp3s, databases, and other', async () => {
      (appMetaRepository.getTotalDownloadSize as jest.Mock).mockResolvedValue(
        180_000_000,
      );
      (appMetaRepository.getTotalDatabaseSize as jest.Mock).mockResolvedValue(
        52_000_000,
      );
      mockGetFSInfo.mockResolvedValue({
        totalSpace: 1_000_000_000,
        freeSpace: 500_000_000,
      });
      mockReadDir.mockResolvedValue([
        {size: 248_000_000, isDirectory: () => false},
      ]);

      const result = await storageService.getStorageUsage();

      expect(result.breakdown.mp3s).toBe(180_000_000);
      expect(result.breakdown.databases).toBe(52_000_000);
      expect(result.breakdown.other).toBe(16_000_000);
      expect(result.usedBytes).toBe(248_000_000);
      expect(result.allocatedBytes).toBe(STORAGE_LIMIT_BYTES);
      expect(result.percentage).toBe(
        Math.round((248_000_000 / STORAGE_LIMIT_BYTES) * 1000) / 10,
      );
    });

    it('clamps other to 0 when document dir is smaller than tracked totals', async () => {
      (appMetaRepository.getTotalDownloadSize as jest.Mock).mockResolvedValue(
        100,
      );
      (appMetaRepository.getTotalDatabaseSize as jest.Mock).mockResolvedValue(
        50,
      );
      mockGetFSInfo.mockResolvedValue({
        totalSpace: 1_000_000,
        freeSpace: 500_000,
      });
      mockReadDir.mockResolvedValue([{size: 80, isDirectory: () => false}]);

      const result = await storageService.getStorageUsage();

      expect(result.breakdown.other).toBe(0);
      expect(result.usedBytes).toBe(150);
    });

    it('returns 0% when used bytes is 0', async () => {
      (appMetaRepository.getTotalDownloadSize as jest.Mock).mockResolvedValue(
        0,
      );
      (appMetaRepository.getTotalDatabaseSize as jest.Mock).mockResolvedValue(
        0,
      );
      mockReadDir.mockResolvedValue([]);

      const result = await storageService.getStorageUsage();

      expect(result.allocatedBytes).toBe(STORAGE_LIMIT_BYTES);
      expect(result.percentage).toBe(0);
      expect(result.usedBytes).toBe(0);
    });

    it('updates correctly after download/cleanup', async () => {
      (appMetaRepository.getTotalDownloadSize as jest.Mock).mockResolvedValue(
        100_000,
      );
      (appMetaRepository.getTotalDatabaseSize as jest.Mock).mockResolvedValue(
        50_000,
      );
      mockGetFSInfo.mockResolvedValue({
        totalSpace: 10_000_000,
        freeSpace: 5_000_000,
      });
      mockReadDir.mockResolvedValue([
        {size: 150_000, isDirectory: () => false},
      ]);

      const first = await storageService.getStorageUsage();
      expect(first.usedBytes).toBe(150_000);

      (appMetaRepository.getTotalDownloadSize as jest.Mock).mockResolvedValue(
        0,
      );
      mockReadDir.mockResolvedValue([{size: 50_000, isDirectory: () => false}]);
      const second = await storageService.getStorageUsage();
      expect(second.usedBytes).toBe(50_000);
      expect(second.breakdown.mp3s).toBe(0);
    });
  });

  describe('getMobileDataUsage', () => {
    it('returns zeroed usage when no stored data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storageService.getMobileDataUsage();

      expect(result.totalBytes).toBe(0);
      expect(result.period).toBe('This Month');
      expect(result.breakdown.streaming).toBe(0);
      expect(result.breakdown.downloads).toBe(0);
      expect(result.breakdown.dbUpdates).toBe(0);
    });

    it('returns stored data for current period', async () => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const period = `${now.getFullYear()}-${month}`;

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          period,
          streaming: 820_000_000,
          downloads: 340_000_000,
          dbUpdates: 40_000_000,
        }),
      );

      const result = await storageService.getMobileDataUsage();

      expect(result.totalBytes).toBe(1_200_000_000);
      expect(result.breakdown.streaming).toBe(820_000_000);
      expect(result.breakdown.downloads).toBe(340_000_000);
      expect(result.breakdown.dbUpdates).toBe(40_000_000);
    });

    it('resets when stored period is old', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          period: '2020-01',
          streaming: 500,
          downloads: 300,
          dbUpdates: 100,
        }),
      );

      const result = await storageService.getMobileDataUsage();

      expect(result.totalBytes).toBe(0);
    });
  });

  describe('trackDataUsage', () => {
    it('accumulates bytes for a category', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storageService.trackDataUsage('downloads', 5000);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const savedJson = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      expect(saved.downloads).toBe(5000);
      expect(saved.streaming).toBe(0);
    });

    it('adds to existing values for current period', async () => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const period = `${now.getFullYear()}-${month}`;

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          period,
          streaming: 100,
          downloads: 200,
          dbUpdates: 50,
        }),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storageService.trackDataUsage('streaming', 300);

      const savedJson = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      expect(saved.streaming).toBe(400);
      expect(saved.downloads).toBe(200);
    });
  });

  describe('resetDataUsage', () => {
    it('writes zeroed data for current period', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storageService.resetDataUsage();

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      const savedJson = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      expect(saved.streaming).toBe(0);
      expect(saved.downloads).toBe(0);
      expect(saved.dbUpdates).toBe(0);

      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const expectedPeriod = `${now.getFullYear()}-${month}`;
      expect(saved.period).toBe(expectedPeriod);
    });

    it('clears previously accumulated data', async () => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const period = `${now.getFullYear()}-${month}`;

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          period,
          streaming: 500_000,
          downloads: 300_000,
          dbUpdates: 100_000,
        }),
      );
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storageService.resetDataUsage();

      const savedJson = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      expect(saved.streaming).toBe(0);
      expect(saved.downloads).toBe(0);
      expect(saved.dbUpdates).toBe(0);
    });
  });
});
