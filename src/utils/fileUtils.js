/**
 * File-related utility functions
 */

/**
 * Sanitize file name
 */
function sanitizeFileName(fileName) {
  if (!fileName) return '';
  // Remove special characters from file name, keep only safe characters
  return fileName
    .replace(/[\\:*?"<>|]/g, '_')  // Replace illegal file system characters, but allow '/'
    .replace(/\.\./g, '_')         // Prevent directory traversal
    .trim();
}

/**
 * Get file extension from file name
 */
function getFileExtension(fileName) {
  if (!fileName) return '';
  const match = fileName.match(/\.([0-9a-z]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Get content type from file name
 */
function getContentTypeFromFileName(fileName) {
  const ext = getFileExtension(fileName);
  const contentTypes = {
    // Document types
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Image types
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'bmp': 'image/bmp',
    
    // Video types
    'mp4': 'video/mp4',
    
    // Code types
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'cpp': 'text/x-c++src',
    'cs': 'text/x-csharp',
    'm': 'text/x-matlab',   // MATLAB code file
    
    // Compressed files
    'zip': 'application/zip',
    'gz': 'application/gzip',
    'tar': 'application/x-tar',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    'bz2': 'application/x-bzip2',
    'xz': 'application/x-xz',
    'tgz': 'application/gzip',
    'zipx': 'application/zip',

    // Binary/model files
    'pt': 'application/octet-stream',     // PyTorch model file
    'pth': 'application/octet-stream',    // PyTorch model file
    'onnx': 'application/octet-stream',   // ONNX model file
    'bin': 'application/octet-stream',    // Binary file
    'h5': 'application/octet-stream',     // HDF5 model file
    'pb': 'application/octet-stream',     // TensorFlow model file
    'safetensors': 'application/octet-stream', // SafeTensors file
    'ckpt': 'application/octet-stream',   // Checkpoint file
    'mat': 'application/octet-stream',    // MATLAB data file
    'gguf': 'application/octet-stream',   // GGUF AI model file
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Export functions
export {
  sanitizeFileName,
  getFileExtension,
  getContentTypeFromFileName
};
