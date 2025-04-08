/**
 * Frontend configuration file
 */

// API URL configuration
// Automatic deployment mode will automatically replace this URL
// You can find this URL in the Cloudflare Workers settings
export const API_URL = 'https://r2-upload-worker.felimet.workers.dev';

// Global application configuration
export const APP_CONFIG = {
  // MAX_UPLOAD_SIZE_MB: 100,         // Maximum upload file size (MB)
  DEFAULT_BUCKET: '',              // Default bucket (empty means auto-select)
  PROGRESS_UPDATE_INTERVAL: 200,   // Upload progress update interval (ms)
  PATH_SEPARATOR: '/',             // Path separator character
  AUTH_REQUIRED: true,             // Whether authentication is required
  LOGIN_TIMEOUT: 24 * 60 * 60      // Login session timeout in seconds (24 hours)
};
