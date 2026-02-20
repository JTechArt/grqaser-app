/**
 * Download manager for MP3 files. Handles download, deletion, and storage
 * metrics for offline playback. Uses react-native-fs for file operations.
 */
import RNFS from 'react-native-fs';
import {DownloadedMp3} from '../types/book';
import {storageService} from './storageService';

const MP3_DIR = `${RNFS.DocumentDirectoryPath}/mp3downloads`;

export type DownloadProgressCallback = (progress: {
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

function bookDir(bookId: string): string {
  return `${MP3_DIR}/${bookId}`;
}

const MAX_RETRIES = 2;

async function downloadFileWithRetry(
  fromUrl: string,
  toFile: string,
  onProgress?: DownloadProgressCallback,
  attempt = 0,
): Promise<number> {
  try {
    const result = await RNFS.downloadFile({
      fromUrl,
      toFile,
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
      throw new Error(`HTTP ${result.statusCode} downloading ${fromUrl}`);
    }

    const stat = await RNFS.stat(toFile);
    return Number(stat.size);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      return downloadFileWithRetry(fromUrl, toFile, onProgress, attempt + 1);
    }
    throw err;
  }
}

export const downloadManager = {
  /**
   * Download all MP3 files for a book. Returns metadata for each downloaded file.
   * For multi-chapter books, pass the chapter_urls array.
   * For single-file books, pass [main_audio_url].
   */
  async downloadBookMp3s(
    bookId: string,
    audioUrls: string[],
    onProgress?: DownloadProgressCallback,
  ): Promise<DownloadedMp3[]> {
    const dir = bookDir(bookId);
    await ensureDir(MP3_DIR);
    await ensureDir(dir);

    const results: DownloadedMp3[] = [];
    const now = new Date().toISOString();

    try {
      for (let i = 0; i < audioUrls.length; i++) {
        const url = audioUrls[i];
        const fileName =
          audioUrls.length === 1 ? `${bookId}.mp3` : `${bookId}_ch${i}.mp3`;
        const filePath = `${dir}/${fileName}`;

        const fileSize = await downloadFileWithRetry(url, filePath, onProgress);

        results.push({
          id: audioUrls.length === 1 ? bookId : `${bookId}_${i}`,
          bookId,
          chapterIndex: audioUrls.length === 1 ? undefined : i,
          filePath,
          fileSizeBytes: fileSize,
          downloadedAt: now,
          sourceUrl: url,
        });

        storageService.trackDataUsage('downloads', fileSize).catch(() => {});
      }
    } catch (err) {
      const dirExists = await RNFS.exists(dir);
      if (dirExists) {
        await RNFS.unlink(dir).catch(() => {});
      }
      throw err;
    }

    return results;
  },

  async deleteBookDownloads(bookId: string): Promise<void> {
    const dir = bookDir(bookId);
    const exists = await RNFS.exists(dir);
    if (exists) {
      await RNFS.unlink(dir);
    }
  },

  async deleteAllDownloads(): Promise<void> {
    const exists = await RNFS.exists(MP3_DIR);
    if (exists) {
      await RNFS.unlink(MP3_DIR);
    }
  },

  async isBookDownloaded(bookId: string): Promise<boolean> {
    const dir = bookDir(bookId);
    return RNFS.exists(dir);
  },

  async getStorageUsage(): Promise<number> {
    const exists = await RNFS.exists(MP3_DIR);
    if (!exists) {
      return 0;
    }
    return getDirSize(MP3_DIR);
  },

  getLocalFilePath(bookId: string, chapterIndex?: number): string {
    const dir = bookDir(bookId);
    if (chapterIndex != null) {
      return `${dir}/${bookId}_ch${chapterIndex}.mp3`;
    }
    return `${dir}/${bookId}.mp3`;
  },
};

async function getDirSize(path: string): Promise<number> {
  const items = await RNFS.readDir(path);
  let total = 0;
  for (const item of items) {
    if (item.isDirectory()) {
      total += await getDirSize(item.path);
    } else {
      total += Number(item.size);
    }
  }
  return total;
}
