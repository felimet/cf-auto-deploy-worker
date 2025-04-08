/**
 * R2 bucket list handler module
 */

import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle R2 bucket list requests
 */
async function handleBuckets(request, env) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }
    
    // 找出所有 R2 binding
    const r2Bindings = Object.keys(env).filter(key => {
      return env[key] && typeof env[key].put === 'function';
    });
    
    // 如果沒有找到任何 R2 binding，返回錯誤
    if (r2Bindings.length === 0) {
      return errorResponse('No R2 buckets available', 404, origin);
    }
    
    // 回傳儲存空間列表
    return new Response(
      JSON.stringify({
        success: true,
        buckets: r2Bindings,
        default: r2Bindings[0] || null
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(origin, allowedOrigins)
        }
      }
    );
  } catch (error) {
    console.error('Buckets error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`Failed to get buckets: ${error.message}`, 500, origin);
  }
}

export { handleBuckets };
