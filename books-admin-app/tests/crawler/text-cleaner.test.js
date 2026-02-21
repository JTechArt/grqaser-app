/**
 * Unit tests for crawler text-cleaner: no HTML in text fields, normalization.
 * Story 5.1 — crawler parsing/normalization.
 */

const {
  cleanText,
  normalizeForStorage,
  normalizeCategory,
  normalizeAuthor
} = require('../../src/crawler/utils/text-cleaner');

describe('text-cleaner', () => {
  describe('cleanText', () => {
    it('strips HTML tags', () => {
      expect(cleanText('<p>Hello</p>')).toBe('Hello');
      expect(cleanText('<b>bold</b> text')).toBe('bold text');
      expect(cleanText('a<br/>b')).toBe('a b');
    });

    it('decodes common entities', () => {
      expect(cleanText('&amp;')).toBe('&');
      expect(cleanText('&lt;&gt;')).toBe('<>');
      expect(cleanText('&quot;quoted&quot;')).toBe('"quoted"');
      expect(cleanText('&#39;apos&#39;')).toBe("'apos'");
      expect(cleanText('a&nbsp;b')).toBe('a b');
    });

    it('normalizes whitespace', () => {
      expect(cleanText('  a   b  ')).toBe('a b');
      expect(cleanText('a\n\tb')).toBe('a b');
    });

    it('returns empty string for null/undefined', () => {
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });

    it('coerces non-string to string and trims', () => {
      expect(cleanText(123)).toBe('123');
    });

    it('ensures no HTML remains in output (data contract)', () => {
      const withHtml = '<script>alert(1)</script>Hello <em>world</em>';
      const result = cleanText(withHtml);
      expect(result).not.toMatch(/<[^>]*>/);
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });
  });

  describe('normalizeForStorage', () => {
    it('delegates to cleanText', () => {
      expect(normalizeForStorage('  <i>x</i>  ')).toBe('x');
    });
  });

  describe('normalizeCategory', () => {
    it('returns cleaned category or Unknown when empty', () => {
      expect(normalizeCategory('Fiction')).toBe('Fiction');
      expect(normalizeCategory('')).toBe('Unknown');
      expect(normalizeCategory('  ')).toBe('Unknown');
      expect(normalizeCategory('<span>Sci-Fi</span>')).toBe('Sci-Fi');
    });
  });

  describe('normalizeAuthor', () => {
    it('returns cleaned author or Unknown Author when empty', () => {
      expect(normalizeAuthor('Author Name')).toBe('Author Name');
      expect(normalizeAuthor('')).toBe('Unknown Author');
      expect(normalizeAuthor('  ')).toBe('Unknown Author');
      expect(normalizeAuthor('<b>Writer</b>')).toBe('Writer');
    });
  });
});
