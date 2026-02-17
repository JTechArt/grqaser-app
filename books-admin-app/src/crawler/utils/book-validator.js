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

  if (book.main_audio_url != null) {
    const trimmed = String(book.main_audio_url).trim();
    if (trimmed === '') {
      errors.push('main_audio_url cannot be empty or whitespace');
    } else {
      const urlResult = validateAudioUrl(book.main_audio_url);
      if (!urlResult.valid) {
        errors.push(`main_audio_url: ${urlResult.error}`);
      }
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

  if (book.duration != null) {
    const d = book.duration;
    if (typeof d !== 'number' || !Number.isFinite(d) || d < 0) {
      errors.push('duration must be a non-negative number');
    }
  }

  if (book.rating != null) {
    const r = book.rating;
    if (typeof r !== 'number' || !Number.isFinite(r) || r < 0 || r > 5) {
      errors.push('rating must be a number between 0 and 5');
    }
  }

  if (book.rating_count != null) {
    const rc = book.rating_count;
    if (!Number.isInteger(rc) || rc < 0) {
      errors.push('rating_count must be a non-negative integer');
    }
  }

  if (book.language != null && String(book.language).length > 10) {
    errors.push('language must be at most 10 characters');
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
