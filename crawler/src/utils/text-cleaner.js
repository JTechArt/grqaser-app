/**
 * Clean text fields for storage: strip HTML, normalize encoding.
 * No HTML in persisted text fields (crawler data contract).
 */

/**
 * Strips HTML tags and decodes common entities.
 * @param {string} raw - Raw text (may contain HTML)
 * @returns {string} Plain text, no HTML, normalized
 */
function cleanText(raw) {
  if (raw == null) return '';
  if (typeof raw !== 'string') return String(raw).trim();
  let text = raw.trim();
  if (text === '') return '';

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  // Decode common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Normalize string for storage: clean and ensure valid UTF-8-style string.
 * @param {string} raw
 * @returns {string}
 */
function normalizeForStorage(raw) {
  return cleanText(raw);
}

module.exports = {
  cleanText,
  normalizeForStorage
};
