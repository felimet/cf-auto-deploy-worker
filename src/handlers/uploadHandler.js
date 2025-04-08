/**
 * File upload handler module
 */

import { sanitizeFileName, getFileExtension, getContentTypeFromFileName } from '../utils/fileUtils.js';
import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle file upload requests
 */
async function handleUpload(request, env) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }

    // 檢查請求大小
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      return errorResponse('File too large (max 100MB)', 413, origin);
    }
    
    // 取得並驗證請求資料
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return errorResponse(`Failed to parse form data: ${error.message}`, 400, origin);
    }
    
    const file = formData.get('file');
    
    // 檔案驗證
    if (!file || !(file instanceof File)) {
      return errorResponse('No file or invalid file provided', 400, origin);
    }
    
    // 取得檔案名稱和路徑
    let fileName = formData.get('fileName') || file.name;
    
    // 檢查是否包含路徑（處理資料夾上傳）
    const isPath = fileName.includes('/');
    const folderPath = isPath ? fileName.split('/').slice(0, -1).join('/') : '';
    
    // 從路徑中獲取最終檔案名稱
    const baseName = isPath ? fileName.split('/').pop() : fileName;
    
    // 淨化檔案名稱，但保留路徑分隔符
    const sanitizedBaseName = sanitizeFileName(baseName);
    
    // 重組完整路徑和檔案名稱
    fileName = isPath ? `${folderPath}/${sanitizedBaseName}` : sanitizedBaseName;
    
    // 如果沒有檔案名稱則產生隨機名稱
    if (!sanitizedBaseName) {
      const fileExt = getFileExtension(file.name || file.type);
      const randomName = `${crypto.randomUUID()}${fileExt ? '.' + fileExt : ''}`;
      fileName = isPath ? `${folderPath}/${randomName}` : randomName;
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
    
    // 將儲存空間名稱加入自訂中繼資料
    customMetadata.bucket = r2Binding;
    
    try {
      // 上傳檔案到 R2
      await env[r2Binding].put(fileName, file, {
        httpMetadata: {
          contentType: contentType
        },
        customMetadata: customMetadata
      });
    } catch (error) {
      console.error('R2 upload error:', error);
      return errorResponse(`R2 upload failed: ${error.message}`, 500, origin);
    }
    
    // 檢查是否為資料夾上傳流程
    const isFromFolderUpload = formData.has('fileName');
    
    // 回傳成功訊息
    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileName,
        size: file.size,
        contentType: contentType,
        bucket: r2Binding,
        url: `/files/${fileName}`,
        isFromFolderUpload: isFromFolderUpload
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
    // 錯誤處理
    console.error('Upload error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`Upload failed: ${error.message}`, 500, origin);
  }
}

export { handleUpload };
