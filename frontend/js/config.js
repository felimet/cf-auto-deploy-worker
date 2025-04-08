/**
 * Frontend configuration file
 */

// Global application configuration
export const APP_CONFIG = {
  DEFAULT_BUCKET: '',              // Default bucket (empty means auto-select)
  PROGRESS_UPDATE_INTERVAL: 200,   // Upload progress update interval (ms)
  PATH_SEPARATOR: '/',             // Path separator character
  AUTH_REQUIRED: true,             // Whether authentication is required
  LOGIN_TIMEOUT: 24 * 60 * 60      // Login session timeout in seconds (24 hours)
};
