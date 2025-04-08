/**
 * File listing handler module
 */

import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle file listing requests
 */
async function handleList(request, env) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }
    
    // 分頁參數
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const delimiter = url.searchParams.get('delimiter') || '/';  // 使用斜線作為分隔符以支持資料夾結構
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const cursor = url.searchParams.get('cursor');
    
    // 從 R2 獲取檔案列表
    const options = {
      prefix: prefix,
      limit: limit,
      delimiter: delimiter  // 添加分隔符來支持資料夾結構
    };
    
    // 只有當 cursor 存在且為字串時才添加
    if (cursor && typeof cursor === 'string') {
      options.cursor = cursor;
    }
    
    // 從 URL 參數獲取指定的 bucket (如有)
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
    
    // 從 R2 獲取檔案列表
    const listing = await env[r2Binding].list(options);
    
    // 格式化檔案輸出
    const files = listing.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      etag: obj.etag,
      bucket: r2Binding,
      isFolder: obj.key.endsWith('/'),  // 標記是否是資料夾
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata
    }));
    
    // 處理資料夾（前綴）
    const folders = listing.delimitedPrefixes ? listing.delimitedPrefixes.map(prefix => ({
      name: prefix,
      isFolder: true,
      bucket: r2Binding,
      size: 0
    })) : [];
    
    // 合併檔案和資料夾並按名稱排序
    const allItems = [...files, ...folders].sort((a, b) => {
      // 資料夾優先
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      // 同類型按名稱字母排序
      return a.name.localeCompare(b.name);
    });
    
    // 回傳結果
    return new Response(
      JSON.stringify({
        files: allItems,
        currentPrefix: prefix,
        bucket: r2Binding,
        truncated: listing.truncated,
        cursor: listing.cursor
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
    console.error('List error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`List failed: ${error.message}`, 500, origin);
  }
}

export { handleList };
