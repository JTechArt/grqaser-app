import {formatFileSize} from '../../src/utils/formatters';

describe('formatFileSize', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('returns "0 B" for negative values', () => {
    expect(formatFileSize(-100)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
    expect(formatFileSize(1610612736)).toBe('1.5 GB');
  });

  it('formats terabytes correctly', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB');
  });

  it('clamps to TB for values beyond TB range', () => {
    const petabyte = 1125899906842624;
    const result = formatFileSize(petabyte);
    expect(result).toBe('1024 TB');
  });

  it('handles very small positive values', () => {
    expect(formatFileSize(1)).toBe('1 B');
  });
});
