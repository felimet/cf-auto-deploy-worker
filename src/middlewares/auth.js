/**
 * Authentication middleware
 */

/**
 * Validate authorization header
 * @param {Request} request - The HTTP request
 * @param {Object} env - Environment variables
 * @returns {Object} - Authentication result
 */
function validateAuth(request, env) {
  // Get auth header
  const authHeader = request.headers.get('Authorization');
  
  // Check if auth header exists
  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Authorization header is missing'
    };
  }
  
  // Check if auth header has the correct format
  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Invalid authorization format, expected: Bearer TOKEN'
    };
  }
  
  // Extract token
  const token = authHeader.substring(7);
  
  // Get expected token from environment
  const expectedToken = env.API_TOKEN || '';
  
  // If no API token is configured, auth is disabled
  if (!expectedToken) {
    return {
      authenticated: true,
      info: 'Authentication is not enforced - no API token configured'
    };
  }
  
  // Validate token
  if (token === expectedToken) {
    return {
      authenticated: true
    };
  }
  
  return {
    authenticated: false,
    error: 'Invalid authorization token'
  };
}

/**
 * Generate a response for authentication failure
 * @param {string} message - Error message
 * @param {string} origin - Origin for CORS headers
 * @returns {Response} - HTTP response
 */
function authFailureResponse(message, origin = '*') {
  return new Response(
    JSON.stringify({
      success: false,
      error: message || 'Authentication failed'
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
        'WWW-Authenticate': 'Bearer'
      }
    }
  );
}

export {
  validateAuth,
  authFailureResponse
};
