/**
 * R2 檔案上傳客戶端
 * 提供拖放上傳、進度顯示和檔案管理功能
 */

// 網址配置
const API_URL = 'https://r2-upload-worker.felimet.workers.dev';  // 請替換為您的 Worker 網址

// DOM 元素引用
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const browseButton = document.getElementById('browseButton');
const bucketSelect = document.getElementById('bucketSelect');
const bucketFilter = document.getElementById('bucketFilter');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadSpeed = document.getElementById('uploadSpeed');
const timeRemaining = document.getElementById('timeRemaining');
const uploadResult = document.getElementById('uploadResult');
const fileList = document.getElementById('fileList');

// 變數
let uploadStartTime = 0;
let uploadedBytes = 0;
let totalBytes = 0;
let lastUpdateTime = 0;
let lastUploadedBytes = 0;

  // 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 初始化事件監聽器
  initEventListeners();
  
  // 載入可用的儲存空間選項
  loadBuckets().then(() => {
    // 載入檔案列表
    loadFileList();
    
    // 初始化 bucket 過濾器
    initBucketFilters();
  });
});

/**
 * 載入可用的 R2 儲存空間
 */
async function loadBuckets() {
  try {
    const response = await fetch(`${API_URL}/buckets`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.buckets && data.buckets.length > 0) {
        // 清空現有選項
        bucketSelect.innerHTML = '<option value="">Default Bucket</option>';
        bucketFilter.innerHTML = '<option value="">All Buckets</option>';
        
        // 添加所有可用的儲存空間選項
        data.buckets.forEach(bucket => {
          bucketSelect.innerHTML += `<option value="${bucket}">${bucket}</option>`;
          bucketFilter.innerHTML += `<option value="${bucket}">${bucket}</option>`;
        });
      }
    } else {
      console.warn('Failed to load buckets:', response.status);
    }
  } catch (error) {
    console.error('Error loading buckets:', error);
  }
}

/**
 * 初始化 bucket 過濾和選擇功能
 */
function initBucketFilters() {
  // Bucket 選擇改變時，重新載入檔案列表
  if (bucketFilter) {
    bucketFilter.addEventListener('change', () => {
      loadFileList();
    });
  }
}

/**
 * 初始化所有事件監聽器
 */
function initEventListeners() {
  // 拖放區域事件
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  // 拖放區域高亮
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  // 處理檔案拖放
  dropArea.addEventListener('drop', handleDrop, false);
  
  // 檔案選擇按鈕
  browseButton.addEventListener('click', () => {
    fileInput.click();
  });
  
// 檔案選擇事件
  fileInput.addEventListener('change', handleFiles, false);

  // 添加資料夾選擇按鈕
  const folderButton = document.getElementById('folderButton');
  if (folderButton) {
    folderButton.addEventListener('click', () => {
      const folderInput = document.createElement('input');
      folderInput.type = 'file';
      folderInput.webkitdirectory = true;
      folderInput.multiple = true;
      folderInput.style.display = 'none';
      document.body.appendChild(folderInput);
      folderInput.click();
      
      folderInput.addEventListener('change', handleFolderSelect, false);
    });
  }
}

/**
 * 防止預設拖放行為
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * 拖放區域高亮
 */
function highlight() {
  dropArea.classList.add('highlight');
}

/**
 * 拖放區域取消高亮
 */
function unhighlight() {
  dropArea.classList.remove('highlight');
}

/**
 * 處理檔案拖放
 */
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

/**
 * 處理選取的檔案
 */
function handleFiles(e) {
  const files = e.target.files;
  if (files.length > 0) {
    // 在本例中僅處理一個檔案
    uploadFile(files[0]);
  }
}

/**
 * 上傳檔案到 R2
 */
function uploadFile(file) {
  // 重置上傳狀態
  resetUploadStatus(file);
  
  // 顯示進度條
  progressContainer.style.display = 'block';
  
  // 準備 FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('originalName', file.name);
  
  // 添加選擇的 bucket (如果有)
  if (bucketSelect && bucketSelect.value) {
    formData.append('bucket', bucketSelect.value);
  }
  
  // 建立 XHR
  const xhr = new XMLHttpRequest();
  
  // 上傳完成
  xhr.onload = function() {
    if (xhr.status === 200) {
      try {
        const result = JSON.parse(xhr.responseText);
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            檔案上傳成功! 
            <a href="${API_URL}${result.url}" target="_blank">查看檔案</a>
          </div>
        `;
        loadFileList();
      } catch (e) {
        uploadResult.innerHTML = `
          <div class="alert alert-danger">
            回應解析錯誤: ${e.message}
          </div>
        `;
      }
    } else {
      uploadResult.innerHTML = `
        <div class="alert alert-danger">
          上傳失敗: 伺服器回應 ${xhr.status}
        </div>
      `;
    }
    
    // 隱藏進度條
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
  };
  
  // 上傳錯誤
  xhr.onerror = function() {
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        網路錯誤，上傳失敗!
      </div>
    `;
    progressContainer.style.display = 'none';
  };
  
  // 追蹤上傳進度
  xhr.upload.onprogress = updateProgress;
  
  // 開始上傳
  xhr.open('POST', `${API_URL}/upload`, true);
  xhr.send(formData);
  
  // 記錄開始時間
  uploadStartTime = Date.now();
  lastUpdateTime = uploadStartTime;
}

/**
 * 更新進度顯示
 */
function updateProgress(event) {
  if (event.lengthComputable) {
    const now = Date.now();
    const elapsedTime = now - lastUpdateTime;
    
    if (elapsedTime > 200) { // 每 200ms 更新一次，避免過於頻繁
      const bytesUploaded = event.loaded;
      const bytesTotal = event.total;
      const percentComplete = (bytesUploaded / bytesTotal) * 100;
      
      // 更新進度條
      progressBar.style.width = percentComplete.toFixed(2) + '%';
      progressBar.setAttribute('aria-valuenow', percentComplete.toFixed(2));
      
      // 計算上傳速度
      const bytesPerSecond = ((bytesUploaded - lastUploadedBytes) / elapsedTime) * 1000;
      const speedText = formatBytes(bytesPerSecond) + '/s';
      uploadSpeed.textContent = speedText;
      
      // 計算剩餘時間
      const remainingBytes = bytesTotal - bytesUploaded;
      let timeRemainingText = '計算中...';
      
      if (bytesPerSecond > 0) {
        const secondsRemaining = Math.ceil(remainingBytes / bytesPerSecond);
        timeRemainingText = formatTime(secondsRemaining);
      }
      
      timeRemaining.textContent = timeRemainingText;
      
      // 更新變數以備下次計算
      lastUpdateTime = now;
      lastUploadedBytes = bytesUploaded;
    }
  }
}

/**
 * 重置上傳狀態
 */
function resetUploadStatus(file) {
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  progressBar.style.width = '0%';
  progressBar.setAttribute('aria-valuenow', '0');
  uploadSpeed.textContent = '0 KB/s';
  timeRemaining.textContent = '計算中...';
  uploadResult.innerHTML = '';
  totalBytes = file.size;
  uploadedBytes = 0;
  lastUploadedBytes = 0;
}

/**
 * 載入檔案列表
 */
async function loadFileList() {
  try {
    // 取得選定的 bucket (如果有)
    const selectedBucket = bucketFilter ? bucketFilter.value : '';
    
    // 構建 URL，添加 bucket 參數 (如果有選擇)
    let listUrl = `${API_URL}/list`;
    if (selectedBucket) {
      listUrl += `?bucket=${encodeURIComponent(selectedBucket)}`;
    }
    
    const response = await fetch(listUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        // 顯示檔案列表
        displayFileList(data.files);
      } else {
        // 無檔案
        fileList.innerHTML = '<div class="text-center text-muted">無已上傳檔案</div>';
      }
    } else {
      throw new Error(`獲取檔案列表失敗: ${response.status}`);
    }
  } catch (error) {
    console.error('載入檔案列表錯誤:', error);
    fileList.innerHTML = `<div class="text-center text-danger">無法載入檔案列表: ${error.message}</div>`;
  }
}

/**
 * 顯示檔案列表
 */
function displayFileList(files) {
  fileList.innerHTML = '';
  
  files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    // 判斷檔案類型，顯示對應的預覽或圖示
    let previewHtml = '';
    const isImage = file.httpMetadata && file.httpMetadata.contentType && file.httpMetadata.contentType.startsWith('image/');
    
    if (isImage) {
      previewHtml = `<img src="${API_URL}/files/${file.name}" class="file-preview" alt="${file.name}" />`;
    } else {
      // 根據檔案類型顯示圖示
      const fileIcon = getFileIcon(file.name);
      previewHtml = `<div class="file-preview d-flex align-items-center justify-content-center bg-light"><i class="${fileIcon} fs-3"></i></div>`;
    }
    
    fileItem.innerHTML = `
      ${previewHtml}
      <div class="file-info">
        <div class="fw-bold text-truncate" style="max-width: 250px;">${file.name}</div>
        <div class="small text-muted">
          ${formatBytes(file.size)} · ${new Date(file.uploaded).toLocaleString()}
        </div>
      </div>
      <div class="file-actions">
        <a href="${API_URL}/files/${file.name}" target="_blank" class="btn btn-sm btn-outline-primary me-2" title="下載">
          <i class="bi bi-download"></i>
        </a>
        <button class="btn btn-sm btn-outline-danger" title="刪除" onclick="deleteFile('${file.name}')">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
    
    fileList.appendChild(fileItem);
  });
}

/**
 * 刪除檔案
 */
async function deleteFile(fileName) {
  if (!confirm(`確定要刪除檔案 "${fileName}" 嗎?`)) {
    return;
  }
  
  try {
    // 取得選定的 bucket (如果有)
    const selectedBucket = bucketFilter ? bucketFilter.value : '';
    
    // 構建 URL，添加 bucket 參數 (如果有選擇)
    let deleteUrl = `${API_URL}/files/${fileName}`;
    if (selectedBucket) {
      deleteUrl += `?bucket=${encodeURIComponent(selectedBucket)}`;
    }
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        // 重新載入檔案列表
        loadFileList();
        
        // 顯示成功訊息
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            檔案已成功刪除!
          </div>
        `;
      } else {
        throw new Error(result.error || '刪除失敗');
      }
    } else {
      throw new Error(`刪除失敗: ${response.status}`);
    }
  } catch (error) {
    console.error('刪除錯誤:', error);
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        刪除失敗: ${error.message}
      </div>
    `;
  }
}

/**
 * 格式化位元組單位
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化時間
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds} 秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} 分 ${remainingSeconds} 秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} 時 ${minutes} 分`;
  }
}

/**
 * 根據檔案名稱取得對應圖示
 * 需要引入 Bootstrap Icons
 */
function getFileIcon(fileName) {
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
 * 處理資料夾選擇
 */
function handleFolderSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    // 顯示上傳中訊息
    uploadResult.innerHTML = `
      <div class="alert alert-info">
        準備上傳 ${files.length} 個檔案...
      </div>
    `;
    
    // 處理資料夾結構，保留相對路徑
    processFiles(files);
  }
  
  // 清除DOM中的暫時元素
  e.target.remove();
}

/**
 * 處理多個檔案上傳，保留資料夾結構
 */
async function processFiles(files) {
  const totalFiles = files.length;
  let uploadedCount = 0;
  let errors = [];
  
  // 創建進度顯示
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  fileName.textContent = `正在上傳多個檔案 (0/${totalFiles})`;
  
  // 依序上傳每個檔案
  for (const file of files) {
    try {
      // 獲取相對路徑 (移除 webkitRelativePath 的第一個資料夾名稱)
      const relativePath = file.webkitRelativePath.split('/').slice(1).join('/');
      const uploadPath = relativePath ? relativePath : file.name;
      
      // 準備 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', uploadPath); // 使用相對路徑作為檔案名稱
      
      // 添加選擇的 bucket (如果有)
      if (bucketSelect && bucketSelect.value) {
        formData.append('bucket', bucketSelect.value);
      }
      
      // 使用 Promise 包裝 XHR 以便 await
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = function() {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && response.success) {
              resolve(response);
            } else if (xhr.status === 200) {
              // 伺服器回應成功但非預期回應
              console.log("上傳部分成功但回應非預期:", response);
              resolve(response);
            } else {
              reject(new Error(`Server responded with ${xhr.status}`));
            }
          } catch (e) {
            console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
            // 即使解析錯誤，如果狀態碼為200，我們仍視為成功
            if (xhr.status === 200) {
              resolve({success: true, message: "檔案已上傳，但回應解析失敗"});
            } else {
              reject(new Error(`回應解析錯誤: ${e.message}`));
            }
          }
        };
        
        xhr.onerror = function() {
          reject(new Error('Network error'));
        };
        
        xhr.open('POST', `${API_URL}/upload`, true);
        xhr.send(formData);
      });
      
      // 更新進度
      uploadedCount++;
      const progress = (uploadedCount / totalFiles) * 100;
      progressBar.style.width = `${progress}%`;
      fileName.textContent = `正在上傳多個檔案 (${uploadedCount}/${totalFiles})`;
      
    } catch (error) {
      console.error(`上傳 ${file.name} 失敗:`, error);
      errors.push({ name: file.name, error: error.message });
    }
  }
  
  // 上傳完成後顯示結果
  if (errors.length === 0) {
    uploadResult.innerHTML = `
      <div class="alert alert-success">
        已成功上傳所有 ${totalFiles} 個檔案！
      </div>
    `;
  } else {
    uploadResult.innerHTML = `
      <div class="alert alert-warning">
        上傳完成，但有 ${errors.length} 個檔案失敗。
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="showErrorDetails()">顯示詳情</button>
      </div>
    `;
    
    // 存儲錯誤詳情以便後續顯示
    window.uploadErrors = errors;
  }
  
  // 隱藏進度條
  setTimeout(() => {
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
  }, 3000);
  
  // 重新載入檔案列表
  loadFileList();
}

/**
 * 顯示錯誤詳情
 */
function showErrorDetails() {
  if (window.uploadErrors && window.uploadErrors.length > 0) {
    let errorDetails = '<ul class="list-group list-group-flush">';
    window.uploadErrors.forEach(error => {
      errorDetails += `<li class="list-group-item">
        <strong>${error.name}</strong>: ${error.error}
      </li>`;
    });
    errorDetails += '</ul>';
    
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        上傳失敗的檔案:
        ${errorDetails}
        <button class="btn btn-sm btn-primary mt-2" onclick="loadFileList()">返回</button>
      </div>
    `;
  }
}

// 全域函式
window.deleteFile = deleteFile;
window.showErrorDetails = showErrorDetails;
