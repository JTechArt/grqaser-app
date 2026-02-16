/**
 * API base URL for database-viewer (or agreed data source).
 * Set API_BASE_URL in .env (react-native-config). Must include /api/v1 for database-viewer.
 * Default: local database-viewer at port 3001 per docs/architecture.
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
