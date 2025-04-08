/**
 * Cloudflare Worker R2 檔案上傳處理器
 * 無檔案大小限制版本
 */

// 引入路由處理模組
import { handleUpload } from './handlers/uploadHandler.js';
import { handleDownload } from './handlers/downloadHandler.js';
import { handleDelete } from './handlers/deleteHandler.js';
import { handleList } from './handlers/listHandler.js';
import { handleBuckets } from './handlers/bucketsHandler.js';
import { handleCORS } from './middlewares/cors.js';

// 主要處理函式
export default {
  async fetch(request, env, ctx) {
    // 從環境變數中獲取允許的來源
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // 取得請求來源
    const origin = request.headers.get('Origin') || '*';
    
    // CORS 處理
    if (request.method === 'OPTIONS') {
      return handleCORS(origin, allowedOrigins);
    }
    
    // 路由處理
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '').split('/')[0];
    
    // 根據路徑和方法處理不同的功能
    if (path === 'upload' && request.method === 'POST') {
      return handleUpload(request, env);
    } else if (path === 'files' && request.method === 'GET') {
      // 從路徑取得檔案名稱
      const fileName = url.pathname.replace(/^\/+files\/+/, '');
      return handleDownload(request, env, fileName);
    } else if (path === 'files' && request.method === 'DELETE') {
      // 從路徑取得檔案名稱
      const fileName = url.pathname.replace(/^\/+files\/+/, '');
      return handleDelete(request, env, fileName);
    } else if (path === 'list' && request.method === 'GET') {
      return handleList(request, env);
    } else if (path === 'buckets' && request.method === 'GET') {
      return handleBuckets(request, env);
    } else {
      return new Response('Not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': origin
        }
      });
    }
  }
};
