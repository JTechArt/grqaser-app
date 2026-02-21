/**
 * Unit tests for crawler book validator: required fields, types, no HTML in text.
 * Story 5.1 — crawler validation before DB write.
 */

const { validateBookRow, REQUIRED_FIELDS } = require('../../src/crawler/utils/book-validator');

describe('book-validator', () => {
  it('exports REQUIRED_FIELDS id, title, author', () => {
    expect(REQUIRED_FIELDS).toContain('id');
    expect(REQUIRED_FIELDS).toContain('title');
    expect(REQUIRED_FIELDS).toContain('author');
  });

  it('rejects null or non-object', () => {
    expect(validateBookRow(null).valid).toBe(false);
    expect(validateBookRow(undefined).valid).toBe(false);
    expect(validateBookRow('string').valid).toBe(false);
    expect(validateBookRow(null).errors).toContain('Book must be an object');
  });

  it('requires id, title, author', () => {
    const r = validateBookRow({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Missing required field: id');
    expect(r.errors).toContain('Missing required field: title');
    expect(r.errors).toContain('Missing required field: author');
  });

  it('rejects empty string required fields', () => {
    expect(validateBookRow({ id: 1, title: '  ', author: 'A' }).valid).toBe(false);
    expect(validateBookRow({ id: 1, title: 'T', author: '' }).valid).toBe(false);
  });

  it('accepts positive integer id', () => {
    const r = validateBookRow({ id: 1, title: 'T', author: 'A' });
    expect(r.valid).toBe(true);
  });

  it('accepts non-empty string id', () => {
    const r = validateBookRow({ id: 'book_123', title: 'T', author: 'A' });
    expect(r.valid).toBe(true);
  });

  it('rejects invalid id (zero or negative)', () => {
    const r = validateBookRow({ id: 0, title: 'T', author: 'A' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('validates main_audio_url when present', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', main_audio_url: '' }).valid).toBe(false);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', main_audio_url: 'http://example.com/a.mp3' }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', main_audio_url: 'ftp://bad.com/x' }).valid).toBe(false);
  });

  it('validates download_url when present', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', download_url: 'https://example.com/d.mp3' }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', download_url: 'not-a-url' }).valid).toBe(false);
  });

  it('validates duration is non-negative number', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', duration: 3600 }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', duration: -1 }).valid).toBe(false);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', duration: '60' }).valid).toBe(false);
  });

  it('validates rating is 0-5', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', rating: 4.5 }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', rating: 6 }).valid).toBe(false);
  });

  it('validates rating_count is non-negative integer', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', rating_count: 10 }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', rating_count: -1 }).valid).toBe(false);
  });

  it('validates language max length 10', () => {
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', language: 'en' }).valid).toBe(true);
    expect(validateBookRow({ id: 1, title: 'T', author: 'A', language: '12345678901' }).valid).toBe(false);
  });

  it('valid book passes with minimal fields', () => {
    const r = validateBookRow({ id: 1, title: 'Title', author: 'Author' });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});
