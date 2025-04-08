/**
 * Authentication utilities
 */

// Storage key for auth token
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Save authentication token to localStorage
 * 
 * @param {string} token - The authentication token to save
 */
export function saveAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

/**
 * Get authentication token from localStorage
 * 
 * @returns {string|null} The authentication token or null if not found
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Remove authentication token from localStorage
 */
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Check if user is authenticated (has token)
 * 
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Add authorization header to fetch options
 * 
 * @param {Object} options - Fetch request options
 * @returns {Object} Updated options with authorization header
 */
export function addAuthHeader(options = {}) {
  const token = getAuthToken();
  if (!token) return options;
  
  // Create headers object if it doesn't exist
  const headers = options.headers || {};
  
  // Add authorization header
  return {
    ...options,
    headers: {
      ...headers,
      'Authorization': `Bearer ${token}`
    }
  };
}
