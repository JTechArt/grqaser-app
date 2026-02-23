/**
 * Image cache service — bounded memory for cover images.
 * Clears in-memory cache when app goes to background so memory stays bounded
 * with large catalogs (2000+ books). Disk cache is preserved for fast reload.
 *
 * Cache configuration:
 * - FastImage uses SDWebImage (iOS) and Glide (Android) with platform defaults
 * - SDWebImage: ~60MB memory, 150MB disk (approximate)
 * - Glide: similar platform-based limits
 * - No JS API to set max images; native config would require native changes
 * - clearMemoryCache on app background evicts decoded bitmaps; disk cache kept
 * - Effective bound: ~50–100 images in memory before background eviction
 *
 * Story 10.6: Book Cover Images — Lazy Load and Memory Cleanup
 */

import FastImage from 'react-native-fast-image';

/**
 * Clear in-memory image cache. Call when app goes to background to free
 * memory used by decoded cover images. Disk cache is kept for fast reload.
 */
export async function clearCoverImageMemoryCache(): Promise<void> {
  try {
    await FastImage.clearMemoryCache();
  } catch (_e) {
    // Ignore; cache clear is best-effort
  }
}
