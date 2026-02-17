/**
 * URL validation for audio and download links.
 * Validates scheme (http/https), format, and optionally reachability.
 */

const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Checks if a URL has an allowed scheme (http or https).
 * @param {string} url - URL string
 * @returns {boolean}
 */
function hasValidScheme(url) {
  if (url == null || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    return ALLOWED_SCHEMES.includes(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates URL format and scheme. Does not perform network requests.
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateAudioUrl(url) {
  if (url == null || typeof url !== 'string') {
    return { valid: false, error: 'URL is missing or not a string' };
  }
  const trimmed = url.trim();
  if (trimmed === '') {
    return { valid: false, error: 'URL is empty' };
  }
  try {
    const u = new URL(trimmed);
    if (!ALLOWED_SCHEMES.includes(u.protocol)) {
      return { valid: false, error: `Invalid scheme: ${u.protocol}. Use http or https.` };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message || 'Invalid URL format' };
  }
}

/**
 * Filters an array of URLs to only those that pass validateAudioUrl.
 * @param {string[]} urls - Array of URL strings
 * @returns {{ valid: string[], invalid: Array<{ url: string, error: string }> }}
 */
function filterValidUrls(urls) {
  const valid = [];
  const invalid = [];
  if (!Array.isArray(urls)) return { valid, invalid };
  for (const url of urls) {
    const result = validateAudioUrl(url);
    if (result.valid) {
      valid.push(typeof url === 'string' ? url.trim() : String(url).trim());
    } else {
      invalid.push({ url: String(url), error: result.error || 'Invalid' });
    }
  }
  return { valid, invalid };
}

module.exports = {
  hasValidScheme,
  validateAudioUrl,
  filterValidUrls
};
