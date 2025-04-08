/**
 * 檔案圖示相關的公用函數
 */

/**
 * 根據檔案名稱取得對應圖示
 * 需要引入 Bootstrap Icons
 */
export function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    // 文件
    'pdf': 'bi bi-file-earmark-pdf',
    'doc': 'bi bi-file-earmark-word',
    'docx': 'bi bi-file-earmark-word',
    'xls': 'bi bi-file-earmark-excel',
    'xlsx': 'bi bi-file-earmark-excel',
    'ppt': 'bi bi-file-earmark-slides',
    'pptx': 'bi bi-file-earmark-slides',
    'txt': 'bi bi-file-earmark-text',
    'csv': 'bi bi-file-earmark-spreadsheet',
    
    // 圖片
    'jpg': 'bi bi-file-earmark-image',
    'jpeg': 'bi bi-file-earmark-image',
    'png': 'bi bi-file-earmark-image',
    'gif': 'bi bi-file-earmark-image',
    'webp': 'bi bi-file-earmark-image',
    'svg': 'bi bi-file-earmark-image',
    'tiff': 'bi bi-file-earmark-image',
    'bmp': 'bi bi-file-earmark-image',
    
    // 影片
    'mp4': 'bi bi-file-earmark-play',
    
    // 程式碼
    'html': 'bi bi-file-earmark-code',
    'css': 'bi bi-file-earmark-code',
    'js': 'bi bi-file-earmark-code',
    'json': 'bi bi-file-earmark-code',
    'xml': 'bi bi-file-earmark-code',
    'py': 'bi bi-file-earmark-code',
    'cpp': 'bi bi-file-earmark-code',
    'cs': 'bi bi-file-earmark-code',
    'm': 'bi bi-file-earmark-code',  // MATLAB 程式碼
    
    // 壓縮檔
    'zip': 'bi bi-file-earmark-zip',
    'rar': 'bi bi-file-earmark-zip',
    'tar': 'bi bi-file-earmark-zip',
    'gz': 'bi bi-file-earmark-zip',
    
    // 模型檔案
    'pt': 'bi bi-file-earmark-binary',
    'pth': 'bi bi-file-earmark-binary',
    'onnx': 'bi bi-file-earmark-binary',
    'bin': 'bi bi-file-earmark-binary',
    'h5': 'bi bi-file-earmark-binary',
    'pb': 'bi bi-file-earmark-binary',
    'safetensors': 'bi bi-file-earmark-binary',
    'ckpt': 'bi bi-file-earmark-binary',
    'mat': 'bi bi-file-earmark-binary',  // MATLAB 數據檔案
    'gguf': 'bi bi-file-earmark-binary', // GGUF AI模型檔案
  };
  
  return iconMap[ext] || 'bi bi-file-earmark';
}

/**
 * 獲取父資料夾路徑
 */
export function getParentFolder(path) {
  if (!path) return '';
  
  // 移除尾部斜線（如果有）
  let cleanPath = path;
  if (cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  
  // 找最後一個斜線
  const lastSlashIndex = cleanPath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return ''; // 如果沒有斜線，返回根目錄
  }
  
  // 返回父資料夾路徑
  return cleanPath.substring(0, lastSlashIndex + 1);
}
