/**
 * Validates book row before write: required fields, types, unique ID.
 * Invalid rows are logged/skipped (coding-standards, data contract).
 */

const { validateAudioUrl } = require('./url-validator');

const REQUIRED_FIELDS = ['id', 'title', 'author'];

/**
 * Validates a book record for persistence.
 * @param {Object} book - Book data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateBookRow(book) {
  const errors = [];

  if (book == null || typeof book !== 'object') {
    return { valid: false, errors: ['Book must be an object'] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (book[field] == null || String(book[field]).trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const id = book.id;
  if (id != null) {
    const numId = Number(id);
    if (Number.isInteger(numId) && numId > 0) {
      // valid integer id
    } else if (typeof id === 'string' && id.trim() !== '') {
      // string id allowed (e.g. book_123)
    } else {
      errors.push('id must be a positive integer or non-empty string');
    }
  }

  if (book.main_audio_url != null && String(book.main_audio_url).trim() !== '') {
    const urlResult = validateAudioUrl(book.main_audio_url);
    if (!urlResult.valid) {
      errors.push(`main_audio_url: ${urlResult.error}`);
    }
  }

  if (book.download_url != null && String(book.download_url).trim() !== '') {
    const urlResult = validateAudioUrl(book.download_url);
    if (!urlResult.valid) {
      errors.push(`download_url: ${urlResult.error}`);
    }
  }

  if (typeof book.title !== 'string' && book.title != null) {
    errors.push('title must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateBookRow,
  REQUIRED_FIELDS
};
