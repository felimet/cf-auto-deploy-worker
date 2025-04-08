/**
 * File icon utility functions
 */

/**
 * Get corresponding icon based on filename
 * Requires Bootstrap Icons
 */
export function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    // Documents
    'pdf': 'bi bi-file-earmark-pdf',
    'doc': 'bi bi-file-earmark-word',
    'docx': 'bi bi-file-earmark-word',
    'xls': 'bi bi-file-earmark-excel',
    'xlsx': 'bi bi-file-earmark-excel',
    'ppt': 'bi bi-file-earmark-slides',
    'pptx': 'bi bi-file-earmark-slides',
    'txt': 'bi bi-file-earmark-text',
    'csv': 'bi bi-file-earmark-spreadsheet',
    
    // Images
    'jpg': 'bi bi-file-earmark-image',
    'jpeg': 'bi bi-file-earmark-image',
    'png': 'bi bi-file-earmark-image',
    'gif': 'bi bi-file-earmark-image',
    'webp': 'bi bi-file-earmark-image',
    'svg': 'bi bi-file-earmark-image',
    'tiff': 'bi bi-file-earmark-image',
    'bmp': 'bi bi-file-earmark-image',
    
    // Videos
    'mp4': 'bi bi-file-earmark-play',
    
    // Code
    'html': 'bi bi-file-earmark-code',
    'css': 'bi bi-file-earmark-code',
    'js': 'bi bi-file-earmark-code',
    'json': 'bi bi-file-earmark-code',
    'xml': 'bi bi-file-earmark-code',
    'py': 'bi bi-file-earmark-code',
    'cpp': 'bi bi-file-earmark-code',
    'cs': 'bi bi-file-earmark-code',
    'm': 'bi bi-file-earmark-code',  // MATLAB code
    
    // Compressed files
    'zip': 'bi bi-file-earmark-zip',
    'rar': 'bi bi-file-earmark-zip',
    'tar': 'bi bi-file-earmark-zip',
    'gz': 'bi bi-file-earmark-zip',
    
    // Model files
    'pt': 'bi bi-file-earmark-binary',
    'pth': 'bi bi-file-earmark-binary',
    'onnx': 'bi bi-file-earmark-binary',
    'bin': 'bi bi-file-earmark-binary',
    'h5': 'bi bi-file-earmark-binary',
    'pb': 'bi bi-file-earmark-binary',
    'safetensors': 'bi bi-file-earmark-binary',
    'ckpt': 'bi bi-file-earmark-binary',
    'mat': 'bi bi-file-earmark-binary',  // MATLAB data file
    'gguf': 'bi bi-file-earmark-binary', // GGUF AI model file
  };
  
  return iconMap[ext] || 'bi bi-file-earmark';
}

/**
 * Get parent folder path
 */
export function getParentFolder(path) {
  if (!path) return '';
  
  // Remove trailing slash (if any)
  let cleanPath = path;
  if (cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  
  // Find the last slash
  const lastSlashIndex = cleanPath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return ''; // If no slash, return root directory
  }
  
  // Return parent folder path
  return cleanPath.substring(0, lastSlashIndex + 1);
}
