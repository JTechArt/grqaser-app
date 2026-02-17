/**
 * API base URL for books-admin-app (single admin API; replaces former database-viewer).
 * Set API_BASE_URL in .env (react-native-config). Must include /api/v1.
 * Default: local books-admin-app at port 3001 per docs/architecture.
 */
const DEFAULT_BASE_URL = 'http://localhost:3001/api/v1';

function getBaseUrl(): string {
  try {
    const Config = require('react-native-config').default;
    const url = Config?.API_BASE_URL?.trim();
    if (url) {
      return url.endsWith('/') ? url.slice(0, -1) : url;
    }
  } catch {
    // react-native-config not available (e.g. tests or not linked)
  }
  return DEFAULT_BASE_URL;
}

export const apiBaseUrl = getBaseUrl();
export const apiTimeoutMs = 15000;
