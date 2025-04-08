/**
 * 檔案相關公用函數
 */

/**
 * 淨化檔案名稱
 */
function sanitizeFileName(fileName) {
  if (!fileName) return '';
  // 移除檔案名稱中的特殊字元，僅保留安全字元
  return fileName
    .replace(/[\\:*?"<>|]/g, '_')  // 替換不合法的檔案系統字元，但允許 '/'
    .replace(/\.\./g, '_')         // 防止目錄穿越
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

// 導出函數
export {
  sanitizeFileName,
  getFileExtension,
  getContentTypeFromFileName
};
