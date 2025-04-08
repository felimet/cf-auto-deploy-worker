/**
 * File deletion handler module
 */

import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle file deletion requests
 */
async function handleDelete(request, env, fileName) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Parameter validation
    if (!fileName) {
      return errorResponse('File name is required', 400, origin);
    }
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }
    
    // Get bucket parameter from URL (if any)
    const url = new URL(request.url);
    let bucketName = url.searchParams.get('bucket') || '';
    let r2Binding;
    
    if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
      // 使用指定的儲存空間
      r2Binding = bucketName;
    } else {
      // 自動偵測所有可用的 R2 binding
      const r2Bindings = Object.keys(env).filter(key => {
        return env[key] && typeof env[key].put === 'function';
      });
      
      if (r2Bindings.length === 0) {
        return errorResponse('No R2 buckets available', 500, origin);
      }
      
      // 使用第一個可用的 binding
      r2Binding = r2Bindings[0];
    }
    
    // 從 R2 刪除檔案
    await env[r2Binding].delete(fileName);
    
    // 回傳成功訊息
    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileName,
        bucket: r2Binding,
        message: 'File deleted successfully'
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
    console.error('Delete error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`Delete failed: ${error.message}`, 500, origin);
  }
}

export { handleDelete };
