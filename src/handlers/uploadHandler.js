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

    // Check request size
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      return errorResponse('File too large (max 100MB)', 413, origin);
    }
    
    // Get and validate request data
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return errorResponse(`Failed to parse form data: ${error.message}`, 400, origin);
    }
    
    const file = formData.get('file');
    
    // File validation
    if (!file || !(file instanceof File)) {
      return errorResponse('No file or invalid file provided', 400, origin);
    }
    
    // Get file name and path
    let fileName = formData.get('fileName') || file.name;
    
    // Check if path is included (for folder upload)
    const isPath = fileName.includes('/');
    const folderPath = isPath ? fileName.split('/').slice(0, -1).join('/') : '';
    
    // Get final file name from path
    const baseName = isPath ? fileName.split('/').pop() : fileName;
    
    // Sanitize file name but preserve path separators
    const sanitizedBaseName = sanitizeFileName(baseName);
    
    // Rebuild complete path and file name
    fileName = isPath ? `${folderPath}/${sanitizedBaseName}` : sanitizedBaseName;
    
    // Generate random name if no file name is provided
    if (!sanitizedBaseName) {
      const fileExt = getFileExtension(file.name || file.type);
      const randomName = `${crypto.randomUUID()}${fileExt ? '.' + fileExt : ''}`;
      fileName = isPath ? `${folderPath}/${randomName}` : randomName;
    }
    
    // Get file content type
    const contentType = file.type || getContentTypeFromFileName(fileName);
    
    // Get custom metadata
    const customMetadata = {};
    for (const [key, value] of formData.entries()) {
      // Exclude file and file name fields
      if (key !== 'file' && key !== 'fileName') {
        customMetadata[key] = value;
      }
    }
    
    // Add upload time and file size
    customMetadata.uploadedAt = new Date().toISOString();
    customMetadata.fileSize = file.size.toString();
    
    // Get specified R2 bucket (auto-detect if not specified)
    let bucketName = formData.get('bucket') || '';
    let r2Binding;
    
    if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
      // Use specified bucket
      r2Binding = bucketName;
    } else {
      // Auto-detect all available R2 bindings
      const r2Bindings = Object.keys(env).filter(key => {
        return env[key] && typeof env[key].put === 'function';
      });
      
      if (r2Bindings.length === 0) {
        return errorResponse('No R2 buckets available', 500, origin);
      }
      
      // Use first available binding
      r2Binding = r2Bindings[0];
    }
    
    // Add bucket name to custom metadata
    customMetadata.bucket = r2Binding;
    
    try {
      // Upload file to R2
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
    
    // Check if this is a folder upload process
    const isFromFolderUpload = formData.has('fileName');
    
    // Return success message
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
    // Error handling
    console.error('Upload error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`Upload failed: ${error.message}`, 500, origin);
  }
}

export { handleUpload };
