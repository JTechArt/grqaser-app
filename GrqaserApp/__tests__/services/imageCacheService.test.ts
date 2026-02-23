/**
 * imageCacheService tests — Story 10.6
 */

jest.mock('react-native-fast-image', () => ({
  clearMemoryCache: jest.fn().mockResolvedValue(undefined),
}));

import {clearCoverImageMemoryCache} from '../../src/services/imageCacheService';
import FastImage from 'react-native-fast-image';

describe('imageCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls FastImage.clearMemoryCache', async () => {
    await clearCoverImageMemoryCache();
    expect(FastImage.clearMemoryCache).toHaveBeenCalledTimes(1);
  });

  it('does not throw when clearMemoryCache rejects', async () => {
    (FastImage.clearMemoryCache as jest.Mock).mockRejectedValueOnce(
      new Error('native error'),
    );
    await expect(clearCoverImageMemoryCache()).resolves.toBeUndefined();
  });
});
