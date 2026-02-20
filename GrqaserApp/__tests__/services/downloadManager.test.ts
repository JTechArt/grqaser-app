jest.mock('react-native-fs');

const {
  __mockDownloadFile: mockDownloadFile,
  __mockExists: mockExists,
  __mockMkdir: mockMkdir,
  __mockUnlink: mockUnlink,
  __mockStat: mockStat,
  __mockReadDir: mockReadDir,
} = require('react-native-fs');

import {downloadManager} from '../../src/services/downloadManager';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('downloadManager', () => {
  describe('downloadBookMp3s', () => {
    it('downloads a single-file book and returns metadata', async () => {
      mockExists.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
      mockMkdir.mockResolvedValue(undefined);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 200, bytesWritten: 5000}),
      });
      mockStat.mockResolvedValue({size: 5000});

      const result = await downloadManager.downloadBookMp3s(
        'book-1',
        ['https://example.com/audio.mp3'],
      );

      expect(result).toHaveLength(1);
      expect(result[0].bookId).toBe('book-1');
      expect(result[0].id).toBe('book-1');
      expect(result[0].chapterIndex).toBeUndefined();
      expect(result[0].fileSizeBytes).toBe(5000);
      expect(result[0].sourceUrl).toBe('https://example.com/audio.mp3');
      expect(mockMkdir).toHaveBeenCalledTimes(2);
    });

    it('downloads multi-chapter book and returns per-chapter metadata', async () => {
      mockExists.mockResolvedValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockDownloadFile.mockReturnValue({
        promise: Promise.resolve({statusCode: 200, bytesWritten: 2000}),
      });
      mockStat.mockResolvedValue({size: 2000});

      const urls = [
        'https://example.com/ch0.mp3',
        'https://example.com/ch1.mp3',
        'https://example.com/ch2.mp3',
      ];

      const result = await downloadManager.downloadBookMp3s('book-2', urls);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('book-2_0');
      expect(result[0].chapterIndex).toBe(0);
      expect(result[1].id).toBe('book-2_1');
      expect(result[1].chapterIndex).toBe(1);
      expect(result[2].id).toBe('book-2_2');
      expect(result[2].chapterIndex).toBe(2);
    });

    it('retries on download failure up to MAX_RETRIES', async () => {
      mockExists.mockResolvedValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockDownloadFile
        .mockReturnValueOnce({
          promise: Promise.reject(new Error('Network error')),
        })
        .mockReturnValueOnce({
          promise: Promise.reject(new Error('Network error again')),
        })
        .mockReturnValueOnce({
          promise: Promise.resolve({statusCode: 200, bytesWritten: 1000}),
        });
      mockStat.mockResolvedValue({size: 1000});

      const result = await downloadManager.downloadBookMp3s('book-3', [
        'https://example.com/audio.mp3',
      ]);

      expect(result).toHaveLength(1);
      expect(mockDownloadFile).toHaveBeenCalledTimes(3);
    });

    it('throws after exceeding MAX_RETRIES', async () => {
      mockExists.mockResolvedValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockDownloadFile.mockReturnValue({
        promise: Promise.reject(new Error('Persistent error')),
      });

      await expect(
        downloadManager.downloadBookMp3s('book-4', [
          'https://example.com/audio.mp3',
        ]),
      ).rejects.toThrow('Persistent error');
    });
  });

  describe('deleteBookDownloads', () => {
    it('deletes the book directory when it exists', async () => {
      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined);

      await downloadManager.deleteBookDownloads('book-1');

      expect(mockUnlink).toHaveBeenCalledWith(
        '/mock/documents/mp3downloads/book-1',
      );
    });

    it('does nothing when directory does not exist', async () => {
      mockExists.mockResolvedValue(false);

      await downloadManager.deleteBookDownloads('book-1');

      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllDownloads', () => {
    it('deletes the entire mp3downloads directory', async () => {
      mockExists.mockResolvedValue(true);
      mockUnlink.mockResolvedValue(undefined);

      await downloadManager.deleteAllDownloads();

      expect(mockUnlink).toHaveBeenCalledWith(
        '/mock/documents/mp3downloads',
      );
    });
  });

  describe('isBookDownloaded', () => {
    it('returns true when book directory exists', async () => {
      mockExists.mockResolvedValue(true);

      const result = await downloadManager.isBookDownloaded('book-1');

      expect(result).toBe(true);
    });

    it('returns false when book directory does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const result = await downloadManager.isBookDownloaded('book-1');

      expect(result).toBe(false);
    });
  });

  describe('getStorageUsage', () => {
    it('returns 0 when mp3downloads directory does not exist', async () => {
      mockExists.mockResolvedValue(false);

      const usage = await downloadManager.getStorageUsage();

      expect(usage).toBe(0);
    });

    it('sums up file sizes in the directory', async () => {
      mockExists.mockResolvedValue(true);
      mockReadDir.mockResolvedValue([
        {path: '/a/file1.mp3', size: 100, isDirectory: () => false},
        {path: '/a/file2.mp3', size: 200, isDirectory: () => false},
      ]);

      const usage = await downloadManager.getStorageUsage();

      expect(usage).toBe(300);
    });
  });

  describe('getLocalFilePath', () => {
    it('returns the single-file path when no chapter index', () => {
      const path = downloadManager.getLocalFilePath('book-1');
      expect(path).toBe('/mock/documents/mp3downloads/book-1/book-1.mp3');
    });

    it('returns chapter-specific path with index', () => {
      const path = downloadManager.getLocalFilePath('book-1', 3);
      expect(path).toBe(
        '/mock/documents/mp3downloads/book-1/book-1_ch3.mp3',
      );
    });
  });
});
