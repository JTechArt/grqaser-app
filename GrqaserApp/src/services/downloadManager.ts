/**
 * Download manager for MP3 files. Handles download, deletion, and storage
 * metrics for offline playback. Uses react-native-fs for file operations.
 */
import RNFS from 'react-native-fs';
import {DownloadedMp3} from '../types/book';
import {storageService} from './storageService';

const MP3_DIR = `${RNFS.DocumentDirectoryPath}/mp3downloads`;

const activeJobs = new Map<string, number>();

export type DownloadProgressCallback = (progress: {
  bytesWritten: number;
  contentLength: number;
  fraction: number;
  /** Overall progress across all files (0-1). Set when totalFiles > 1. */
  overallFraction?: number;
  /** Current file index (0-based). Set when totalFiles > 1. */
  currentFileIndex?: number;
  /** Total number of files. Set when totalFiles > 1. */
  totalFiles?: number;
  /** Number of files fully downloaded so far. */
  completedFiles?: number;
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
  bookId: string,
  onProgress?: DownloadProgressCallback,
  attempt = 0,
): Promise<number> {
  try {
    const dl = RNFS.downloadFile({
      fromUrl,
      toFile,
      begin: res => {
        console.log(
          `[DL] begin ${bookId}: status=${res.statusCode} length=${res.contentLength}`,
        );
      },
      progress: res => {
        console.log(
          `[DL] progress ${bookId}: ${res.bytesWritten}/${res.contentLength}`,
        );
        onProgress?.({
          bytesWritten: res.bytesWritten,
          contentLength: res.contentLength,
          fraction:
            res.contentLength > 0 ? res.bytesWritten / res.contentLength : 0,
        });
      },
      progressInterval: 300,
      background: false,
      discretionary: false,
    });

    console.log(
      `[DL] started ${bookId}: jobId=${dl.jobId} url=${fromUrl.substring(
        0,
        80,
      )}`,
    );
    activeJobs.set(bookId, dl.jobId);
    const result = await dl.promise;
    activeJobs.delete(bookId);
    console.log(
      `[DL] done ${bookId}: status=${result.statusCode} bytes=${result.bytesWritten}`,
    );

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`HTTP ${result.statusCode} downloading ${fromUrl}`);
    }

    const stat = await RNFS.stat(toFile);
    return Number(stat.size);
  } catch (err) {
    activeJobs.delete(bookId);
    if (attempt < MAX_RETRIES) {
      return downloadFileWithRetry(
        fromUrl,
        toFile,
        bookId,
        onProgress,
        attempt + 1,
      );
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

    const totalFiles = audioUrls.length;
    try {
      for (let i = 0; i < audioUrls.length; i++) {
        const url = audioUrls[i];
        const fileName =
          audioUrls.length === 1 ? `${bookId}.mp3` : `${bookId}_ch${i}.mp3`;
        const filePath = `${dir}/${fileName}`;

        const completedFiles = i;
        const fileSize = await downloadFileWithRetry(
          url,
          filePath,
          bookId,
          totalFiles > 1
            ? progress => {
                const fileFraction =
                  progress.contentLength > 0 ? progress.fraction : 0;
                const overallFraction =
                  (completedFiles + fileFraction) / totalFiles;
                onProgress?.({
                  ...progress,
                  overallFraction,
                  currentFileIndex: i,
                  totalFiles,
                  completedFiles,
                });
              }
            : onProgress,
        );

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

  cancelBookDownload(bookId: string): void {
    const jobId = activeJobs.get(bookId);
    if (jobId != null) {
      RNFS.stopDownload(jobId);
      activeJobs.delete(bookId);
    }
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
