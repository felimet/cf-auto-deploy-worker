/**
 * File download handler module
 */

import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle file download requests
 */
async function handleDownload(request, env, fileName) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }
    
    // 參數驗證
    if (!fileName) {
      return errorResponse('File name is required', 400, origin);
    }
    
    // 從 URL 參數獲取指定的 bucket (如有)
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
    
    // 從 R2 取得檔案
    const object = await env[r2Binding].get(fileName);
    
    // 檔案不存在
    if (object === null) {
      return errorResponse('File not found', 404, origin);
    }
    
    // 取得檔案內容
    const data = await object.arrayBuffer();
    
    // 準備回應頭部
    const headers = {
      'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
      'Content-Length': object.size,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'ETag': object.httpEtag,
      'Cache-Control': 'public, max-age=31536000',
      ...getCORSHeaders(origin, allowedOrigins)
    };
    
    // 加入自訂中繼資料到頭部
    for (const [key, value] of Object.entries(object.customMetadata || {})) {
      headers[`X-Metadata-${key}`] = value;
    }
    
    // 回傳檔案
    return new Response(data, { headers });
  } catch (error) {
    console.error('Download error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`Download failed: ${error.message}`, 500, origin);
  }
}

export { handleDownload };
