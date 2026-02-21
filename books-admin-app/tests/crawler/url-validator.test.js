/**
 * Unit tests for crawler URL validator (audio/download links).
 * Story 5.1 — crawler validation.
 */

const { hasValidScheme, validateAudioUrl, filterValidUrls } = require('../../src/crawler/utils/url-validator');

describe('url-validator', () => {
  describe('hasValidScheme', () => {
    it('accepts http and https', () => {
      expect(hasValidScheme('http://example.com')).toBe(true);
      expect(hasValidScheme('https://example.com')).toBe(true);
    });

    it('rejects other schemes', () => {
      expect(hasValidScheme('ftp://example.com')).toBe(false);
      expect(hasValidScheme('file:///local')).toBe(false);
    });

    it('rejects null, non-string, invalid URL', () => {
      expect(hasValidScheme(null)).toBe(false);
      expect(hasValidScheme(123)).toBe(false);
      expect(hasValidScheme('not a url')).toBe(false);
    });
  });

  describe('validateAudioUrl', () => {
    it('accepts valid http/https URL', () => {
      expect(validateAudioUrl('https://cdn.example.com/audio.mp3').valid).toBe(true);
      expect(validateAudioUrl('http://example.com/f').valid).toBe(true);
    });

    it('rejects missing or empty URL', () => {
      expect(validateAudioUrl(null).valid).toBe(false);
      expect(validateAudioUrl('').valid).toBe(false);
      expect(validateAudioUrl('   ').valid).toBe(false);
    });

    it('rejects invalid scheme', () => {
      const r = validateAudioUrl('ftp://x.com');
      expect(r.valid).toBe(false);
      expect(r.error).toMatch(/scheme|http|https/i);
    });

    it('rejects malformed URL', () => {
      const r = validateAudioUrl('://missing-host');
      expect(r.valid).toBe(false);
    });
  });

  describe('filterValidUrls', () => {
    it('splits valid and invalid URLs', () => {
      const urls = ['https://a.com/1', 'ftp://b.com', 'https://c.com/2'];
      const { valid, invalid } = filterValidUrls(urls);
      expect(valid).toHaveLength(2);
      expect(valid).toContain('https://a.com/1');
      expect(valid).toContain('https://c.com/2');
      expect(invalid).toHaveLength(1);
      expect(invalid[0].url).toBe('ftp://b.com');
    });

    it('returns empty arrays for non-array input', () => {
      const { valid, invalid } = filterValidUrls(null);
      expect(valid).toEqual([]);
      expect(invalid).toEqual([]);
    });
  });
});
