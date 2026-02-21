/**
 * Unit tests for crawler duration parser/normalization.
 * Story 5.1 — crawler parsing/normalization.
 */

const { parseDuration, normalizeDurationForStorage } = require('../../src/crawler/utils/duration-parser');

describe('duration-parser', () => {
  describe('parseDuration', () => {
    it('parses Armenian format (Nժ Mր)', () => {
      const r = parseDuration('0ժ 51ր');
      expect(r.hours).toBe(0);
      expect(r.minutes).toBe(51);
      expect(r.totalMinutes).toBe(51);
      expect(r.formatted).toBe('0ժ 51ր');
    });

    it('parses hours and minutes', () => {
      const r = parseDuration('1ժ 30ր');
      expect(r.hours).toBe(1);
      expect(r.minutes).toBe(30);
      expect(r.totalMinutes).toBe(90);
    });

    it('returns zeros for null/undefined/non-string', () => {
      expect(parseDuration(null)).toEqual({ totalMinutes: 0, hours: 0, minutes: 0, formatted: '' });
      expect(parseDuration(undefined)).toEqual({ totalMinutes: 0, hours: 0, minutes: 0, formatted: '' });
      expect(parseDuration(123)).toEqual({ totalMinutes: 0, hours: 0, minutes: 0, formatted: '' });
    });

    it('returns zeros for empty string', () => {
      expect(parseDuration('')).toEqual({ totalMinutes: 0, hours: 0, minutes: 0, formatted: '' });
      expect(parseDuration('   ')).toEqual({ totalMinutes: 0, hours: 0, minutes: 0, formatted: '' });
    });

    it('handles generic Nh Nm style', () => {
      const r = parseDuration('2 hours 15 mins');
      expect(r.hours).toBe(2);
      expect(r.minutes).toBe(15);
      expect(r.totalMinutes).toBe(135);
    });

    it('handles single number as minutes', () => {
      const r = parseDuration('45');
      expect(r.minutes).toBe(45);
      expect(r.totalMinutes).toBe(45);
    });
  });

  describe('normalizeDurationForStorage', () => {
    it('returns totalMinutes and formatted string', () => {
      const r = normalizeDurationForStorage('1ժ 0ր');
      expect(r.totalMinutes).toBe(60);
      expect(typeof r.formatted).toBe('string');
      expect(r.formatted.length).toBeGreaterThan(0);
    });

    it('handles invalid input with zeros', () => {
      const r = normalizeDurationForStorage('');
      expect(r.totalMinutes).toBe(0);
      expect(r.formatted).toBe('');
    });
  });
});
