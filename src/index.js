/**
 * Cloudflare Worker R2 檔案上傳處理器
 * 無檔案大小限制版本
 */

// 主要處理函式
export default {
    async fetch(request, env, ctx) {
      // 允許的來源網站
      const allowedOrigins = ['*'];
      
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
          headers: getCORSHeaders(origin, allowedOrigins)
        });
      }
    }
  };
  
  /**
   * 處理檔案上傳請求
   */
  async function handleUpload(request, env) {
    try {
      // 取得並驗證請求資料
      const formData = await request.formData();
      const file = formData.get('file');
      
      // 檔案驗證
      if (!file || !(file instanceof File)) {
        return errorResponse('No file or invalid file provided', 400);
      }
      
      // 取得檔案名稱
      let fileName = formData.get('fileName') || file.name;
      fileName = sanitizeFileName(fileName); // 淨化檔案名稱
      
      // 如果沒有檔案名稱則產生隨機名稱
      if (!fileName) {
        const fileExt = getFileExtension(file.name || file.type);
        fileName = `${crypto.randomUUID()}${fileExt ? '.' + fileExt : ''}`;
      }
      
      // 取得檔案內容類型
      const contentType = file.type || getContentTypeFromFileName(fileName);
      
      // 取得自訂中繼資料
      const customMetadata = {};
      for (const [key, value] of formData.entries()) {
        // 排除檔案和檔案名稱欄位
        if (key !== 'file' && key !== 'fileName') {
          customMetadata[key] = value;
        }
      }
      
      // 加入上傳時間與檔案大小
      customMetadata.uploadedAt = new Date().toISOString();
      customMetadata.fileSize = file.size.toString();
      
      // 獲取指定的 R2 儲存空間 (如未指定則自動偵測)
      let bucketName = formData.get('bucket') || '';
      let r2Binding;
      
      if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
        // 使用指定的儲存空間
        r2Binding = bucketName;
      } else {
        // 自動偵測第一個可用的 R2 binding
        r2Binding = Object.keys(env).find(key => env[key] && typeof env[key].put === 'function') || 'model';
      }
      
      // 將儲存空間名稱加入自訂中繼資料
      customMetadata.bucket = r2Binding;
      
      // 上傳檔案到 R2
      await env[r2Binding].put(fileName, file, {
        httpMetadata: {
          contentType: contentType
        },
        customMetadata: customMetadata
      });
      
      // 回傳成功訊息
      return new Response(
        JSON.stringify({
          success: true,
          fileName: fileName,
          size: file.size,
          contentType: contentType,
          url: `/files/${fileName}`
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request.headers.get('Origin'), allowedOrigins)
          }
        }
      );
    } catch (error) {
      // 錯誤處理
      console.error('Upload error:', error);
      return errorResponse(`Upload failed: ${error.message}`, 500);
    }
  }
  
  /**
   * 處理檔案下載請求
   */
  async function handleDownload(request, env, fileName) {
    try {
      // 參數驗證
      if (!fileName) {
        return errorResponse('File name is required', 400);
      }
      
      // 從 URL 參數獲取指定的 bucket (如有)
      const url = new URL(request.url);
      let bucketName = url.searchParams.get('bucket') || '';
      let r2Binding;
      
      if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
        // 使用指定的儲存空間
        r2Binding = bucketName;
      } else {
        // 自動偵測第一個可用的 R2 binding
        r2Binding = Object.keys(env).find(key => env[key] && typeof env[key].put === 'function') || 'model';
      }
      
      // 從 R2 取得檔案
      const object = await env[r2Binding].get(fileName);
      
      // 檔案不存在
      if (object === null) {
        return errorResponse('File not found', 404);
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
        ...getCORSHeaders(request.headers.get('Origin'), ['*'])
      };
      
      // 加入自訂中繼資料到頭部
      for (const [key, value] of Object.entries(object.customMetadata || {})) {
        headers[`X-Metadata-${key}`] = value;
      }
      
      // 回傳檔案
      return new Response(data, { headers });
    } catch (error) {
      console.error('Download error:', error);
      return errorResponse(`Download failed: ${error.message}`, 500);
    }
  }
  
  /**
   * 處理檔案刪除請求
   */
  async function handleDelete(request, env, fileName) {
    try {
      // 參數驗證
      if (!fileName) {
        return errorResponse('File name is required', 400);
      }
      
      // 驗證授權 (此處簡化，實際應用中應加強驗證)
      const authHeader = request.headers.get('Authorization');
      
      // 從 URL 參數獲取指定的 bucket (如有)
      const url = new URL(request.url);
      let bucketName = url.searchParams.get('bucket') || '';
      let r2Binding;
      
      if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
        // 使用指定的儲存空間
        r2Binding = bucketName;
      } else {
        // 自動偵測第一個可用的 R2 binding
        r2Binding = Object.keys(env).find(key => env[key] && typeof env[key].put === 'function') || 'model';
      }
      
      // 從 R2 刪除檔案
      await env[r2Binding].delete(fileName);
      
      // 回傳成功訊息
      return new Response(
        JSON.stringify({
          success: true,
          fileName: fileName,
          message: 'File deleted successfully'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request.headers.get('Origin'), ['*'])
          }
        }
      );
    } catch (error) {
      console.error('Delete error:', error);
      return errorResponse(`Delete failed: ${error.message}`, 500);
    }
  }
  
  /**
   * 處理檔案列表請求
   */
  async function handleList(request, env) {
    try {
      // 分頁參數
      const url = new URL(request.url);
      const prefix = url.searchParams.get('prefix') || '';
      const limit = parseInt(url.searchParams.get('limit')) || 100;
      const cursor = url.searchParams.get('cursor');
      
      // 從 R2 獲取檔案列表
      const options = {
        prefix: prefix,
        limit: limit
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
        // 自動偵測第一個可用的 R2 binding
        r2Binding = Object.keys(env).find(key => env[key] && typeof env[key].put === 'function') || 'model';
      }
      
      // 從 R2 獲取檔案列表
      const listing = await env[r2Binding].list(options);
      
      // 格式化輸出
      const files = listing.objects.map(obj => ({
        name: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        etag: obj.etag,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata
      }));
      
      // 回傳結果
      return new Response(
        JSON.stringify({
          files: files,
          truncated: listing.truncated,
          cursor: listing.cursor
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request.headers.get('Origin'), ['*'])
          }
        }
      );
    } catch (error) {
      console.error('List error:', error);
      return errorResponse(`List failed: ${error.message}`, 500);
    }
  }

  /**
   * 處理 R2 儲存空間列表請求
   */
  async function handleBuckets(request, env) {
    try {
      // 找出所有 R2 binding
      const r2Bindings = Object.keys(env).filter(key => {
        return env[key] && typeof env[key].put === 'function';
      });
      
      // 回傳儲存空間列表
      return new Response(
        JSON.stringify({
          success: true,
          buckets: r2Bindings
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request.headers.get('Origin'), ['*'])
          }
        }
      );
    } catch (error) {
      console.error('Buckets error:', error);
      return errorResponse(`Failed to get buckets: ${error.message}`, 500);
    }
  }
  
  /**
   * 處理 CORS 預檢請求
   */
  function handleCORS(origin, allowedOrigins) {
    return new Response(null, {
      status: 204,
      headers: {
        ...getCORSHeaders(origin, allowedOrigins),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  /**
   * 取得 CORS 相關頭部
   */
  function getCORSHeaders(origin, allowedOrigins) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    };
  }
  
  /**
   * 錯誤回應輔助函式
   */
  function errorResponse(message, status = 400) {
    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      {
        status: status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
  
  /**
   * 淨化檔案名稱
   */
  function sanitizeFileName(fileName) {
    if (!fileName) return '';
    // 移除路徑中的特殊字元，僅保留安全字元
    return fileName
      .replace(/[\\/:*?"<>|]/g, '_')  // 替換不合法的檔案系統字元
      .replace(/\.\./g, '_')          // 防止目錄穿越
      .trim();
  }
  
  /**
   * 從檔案名稱取得副檔名
   */
  function getFileExtension(fileName) {
    if (!fileName) return '';
    const match = fileName.match(/\.([0-9a-z]+)$/i);
    return match ? match[1].toLowerCase() : '';
  }
  
  /**
   * 從檔案名稱取得內容類型
   */
  function getContentTypeFromFileName(fileName) {
    const ext = getFileExtension(fileName);
    const contentTypes = {
      // 文件類型
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      
      // 圖片類型
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'tiff': 'image/tiff',
      'bmp': 'image/bmp',
      
      // 影片類型
      'mp4': 'video/mp4',
      
      // 程式碼類型
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'cpp': 'text/x-c++src',
      'cs': 'text/x-csharp',
      'm': 'text/x-matlab',   // MATLAB 程式碼檔案
      
      // 壓縮檔
      'zip': 'application/zip',
      
      // 二進位/模型檔案
      'pt': 'application/octet-stream',     // PyTorch 模型檔案
      'pth': 'application/octet-stream',    // PyTorch 模型檔案
      'onnx': 'application/octet-stream',   // ONNX 模型檔案
      'bin': 'application/octet-stream',    // 二進位檔案
      'h5': 'application/octet-stream',     // HDF5 模型檔案
      'pb': 'application/octet-stream',     // TensorFlow 模型檔案
      'safetensors': 'application/octet-stream', // 安全張量檔案
      'ckpt': 'application/octet-stream',   // 檢查點檔案
      'mat': 'application/octet-stream',    // MATLAB 數據檔案
      'gguf': 'application/octet-stream',   // GGUF AI模型檔案
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
