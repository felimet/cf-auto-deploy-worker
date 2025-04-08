/**
 * R2 檔案上傳客戶端
 * 提供拖放上傳、進度顯示和檔案管理功能
 */

// 網址配置
const API_URL = 'https://cfr2-worker.felimet.workers.dev';  // 請替換為您的 Worker 網址

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
let availableBuckets = [];
let defaultBucket = '';

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
    console.log('Loading buckets from:', `${API_URL}/buckets`);
    const response = await fetch(`${API_URL}/buckets`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Buckets response:', data);
      
      if (data.success && data.buckets && data.buckets.length > 0) {
        // 儲存可用的 bucket 列表
        availableBuckets = data.buckets;
        defaultBucket = data.default || data.buckets[0];
        
        // 清空現有選項
        bucketSelect.innerHTML = '';
        bucketFilter.innerHTML = '<option value="">All Buckets</option>';
        
        // 添加所有可用的儲存空間選項
        data.buckets.forEach(bucket => {
          const isDefault = bucket === defaultBucket;
          bucketSelect.innerHTML += `<option value="${bucket}" ${isDefault ? 'selected' : ''}>${bucket} ${isDefault ? '(Default)' : ''}</option>`;
          bucketFilter.innerHTML += `<option value="${bucket}">${bucket}</option>`;
        });
        
        console.log('Buckets loaded successfully:', availableBuckets);
      } else {
        console.warn('No buckets available in response');
      }
    } else {
      console.warn('Failed to load buckets:', response.status);
      const errorText = await response.text();
      console.warn('Error response:', errorText);
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
      console.log('Bucket filter changed to:', bucketFilter.value);
      loadFileList();
    });
  }
  
  // 選擇 bucket 並顯示在上傳區域
  if (bucketSelect) {
    bucketSelect.addEventListener('change', () => {
      console.log('Selected bucket changed to:', bucketSelect.value);
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
    console.log('Using selected bucket:', bucketSelect.value);
  } else if (defaultBucket) {
    formData.append('bucket', defaultBucket);
    console.log('Using default bucket:', defaultBucket);
  }
  
  // 建立 XHR
  const xhr = new XMLHttpRequest();
  
  // 上傳完成
  xhr.onload = function() {
    console.log(`Upload completed with status: ${xhr.status}`);
    
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const result = JSON.parse(xhr.responseText);
        console.log("Upload response:", result);
        
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            檔案上傳成功! 
            <a href="${API_URL}${result.url}" target="_blank">查看檔案</a>
            ${result.bucket ? `<span class="badge bg-info">${result.bucket}</span>` : ''}
          </div>
        `;
        loadFileList();
      } catch (e) {
        console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
        // 即使解析錯誤，如果狀態碼為2xx，我們仍視為成功
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            檔案已上傳成功! (但回應解析失敗)
          </div>
        `;
        loadFileList();
      }
    } else {
      console.error(`Server error response (${xhr.status}):`, xhr.responseText);
      try {
        const errorData = JSON.parse(xhr.responseText);
        uploadResult.innerHTML = `
          <div class="alert alert-danger">
            上傳失敗: ${errorData.error || `伺服器回應 ${xhr.status}`}
          </div>
        `;
      } catch (e) {
        uploadResult.innerHTML = `
          <div class="alert alert-danger">
            上傳失敗: 伺服器回應 ${xhr.status}
          </div>
        `;
      }
    }
    
    // 隱藏進度條
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
  };
  
  // 上傳錯誤
  xhr.onerror = function(e) {
    console.error("Network error during upload:", e);
    
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        網路錯誤，上傳失敗! 請檢查網路連接或 CORS 設定。
      </div>
    `;
    progressContainer.style.display = 'none';
  };
  
  // 追蹤上傳進度
  xhr.upload.onprogress = updateProgress;
  
  // 開始上傳
  console.log(`Starting upload to ${API_URL}/upload`);
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

// 目前的導航路徑
let currentPrefix = '';

/**
 * 載入檔案列表
 */
async function loadFileList(prefix = '') {
  try {
    // 儲存當前路徑
    currentPrefix = prefix;
    
    // 取得選定的 bucket (如果有)
    const selectedBucket = bucketFilter ? bucketFilter.value : '';
    
    // 構建 URL，添加 bucket 和 prefix 參數
    let listUrl = `${API_URL}/list`;
    const params = new URLSearchParams();
    
    if (selectedBucket) {
      params.append('bucket', selectedBucket);
    }
    
    if (prefix) {
      params.append('prefix', prefix);
    }
    
    if (params.toString()) {
      listUrl += `?${params.toString()}`;
    }
    
    console.log(`Loading file list from: ${listUrl}`);
    const response = await fetch(listUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Files list response:', data);
      
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
  
  // 如果有當前路徑，顯示返回上一層按鈕
  if (currentPrefix) {
    const parentFolder = getParentFolder(currentPrefix);
    const backItem = document.createElement('div');
    backItem.className = 'file-item cursor-pointer';
    backItem.onclick = () => loadFileList(parentFolder);
    
    backItem.innerHTML = `
      <div class="file-preview d-flex align-items-center justify-content-center bg-light">
        <i class="bi bi-arrow-up-circle fs-3"></i>
      </div>
      <div class="file-info">
        <div class="fw-bold">..</div>
        <div class="small text-muted">返回上一層</div>
      </div>
    `;
    
    fileList.appendChild(backItem);
  }
  
  // 當前路徑顯示
  if (currentPrefix) {
    const pathBar = document.createElement('div');
    pathBar.className = 'alert alert-secondary d-flex align-items-center mb-3';
    
    // 建立路徑導航
    let pathHtml = `<i class="bi bi-folder me-2"></i> `;
    let crumbs = [];
    let path = '';
    
    // 加入根目錄
    crumbs.push(`<span class="path-item" onclick="loadFileList('')">根目錄</span>`);
    
    // 加入路徑中的每一層
    const parts = currentPrefix.split('/').filter(p => p);
    parts.forEach((part, i) => {
      path += (i > 0 ? '/' : '') + part;
      if (i < parts.length - 1) {
        path += '/';
        crumbs.push(`<span class="path-item" onclick="loadFileList('${path}')">${part}</span>`);
      } else {
        crumbs.push(`<span class="fw-bold">${part}</span>`);
      }
    });
    
    pathBar.innerHTML = pathHtml + crumbs.join(' / ');
    fileList.appendChild(pathBar);
  }
  
  // 如果沒有檔案
  if (files.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-center text-muted my-5';
    emptyMsg.innerHTML = '此資料夾中沒有檔案';
    fileList.appendChild(emptyMsg);
    return;
  }
  
  // 顯示檔案與資料夾
  files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    if (file.isFolder) {
      // 這是資料夾
      fileItem.className += ' cursor-pointer';
      fileItem.onclick = () => loadFileList(file.name);
      
      const folderName = file.name.split('/').slice(-2)[0];
      
      fileItem.innerHTML = `
        <div class="file-preview d-flex align-items-center justify-content-center bg-light">
          <i class="bi bi-folder fs-3"></i>
        </div>
        <div class="file-info">
          <div class="fw-bold text-truncate" style="max-width: 250px;">${folderName}/</div>
          <div class="small text-muted">
            資料夾
            ${file.bucket ? `<span class="badge bg-info">${file.bucket}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      // 這是檔案
      // 顯示檔案名稱（不含路徑）
      const fileName = file.name.split('/').pop();
      
      // 判斷檔案類型，顯示對應的預覽或圖示
      let previewHtml = '';
      const isImage = file.httpMetadata && file.httpMetadata.contentType && file.httpMetadata.contentType.startsWith('image/');
      
      if (isImage) {
        // 構建圖片URL，如果有bucket，添加bucket參數
        let imgUrl = `${API_URL}/files/${file.name}`;
        if (file.bucket) {
          imgUrl += `?bucket=${encodeURIComponent(file.bucket)}`;
        }
        
        previewHtml = `<img src="${imgUrl}" class="file-preview" alt="${fileName}" />`;
      } else {
        // 根據檔案類型顯示圖示
        const fileIcon = getFileIcon(fileName);
        previewHtml = `<div class="file-preview d-flex align-items-center justify-content-center bg-light"><i class="${fileIcon} fs-3"></i></div>`;
      }
      
      // 構建下載 URL，如果有 bucket，添加 bucket 參數
      let downloadUrl = `${API_URL}/files/${file.name}`;
      let deleteUrl = `${file.name}`;
      
      if (file.bucket) {
        downloadUrl += `?bucket=${encodeURIComponent(file.bucket)}`;
        deleteUrl += `?bucket=${encodeURIComponent(file.bucket)}`;
      }
      
      fileItem.innerHTML = `
        ${previewHtml}
        <div class="file-info">
          <div class="fw-bold text-truncate" style="max-width: 250px;">${fileName}</div>
          <div class="small text-muted">
            ${formatBytes(file.size)} · ${new Date(file.uploaded).toLocaleString()}
            ${file.bucket ? `<span class="badge bg-info">${file.bucket}</span>` : ''}
          </div>
        </div>
        <div class="file-actions">
          <a href="${downloadUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-2" title="下載">
            <i class="bi bi-download"></i>
          </a>
          <button class="btn btn-sm btn-outline-danger" title="刪除" onclick="deleteFile('${deleteUrl}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
    }
    
    fileList.appendChild(fileItem);
  });
}

/**
 * 刪除檔案
 */
async function deleteFile(fileQuery) {
  if (!confirm(`確定要刪除此檔案嗎?`)) {
    return;
  }
  
  try {
    // fileQuery 已包含檔案名稱和可能的 bucket 參數
    const deleteUrl = `${API_URL}/files/${fileQuery}`;
    console.log(`Deleting file: ${deleteUrl}`);
    
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
  
  // 選擇的 bucket
  const selectedBucket = bucketSelect && bucketSelect.value ? bucketSelect.value : defaultBucket;
  console.log(`Selected bucket for folder upload: ${selectedBucket || 'none'}`);
  
  // 依序上傳每個檔案
  for (const file of files) {
    try {
      // 獲取完整路徑，包括資料夾結構
      // 注意：這裡我們保留原始資料夾結構，而不是移除第一個資料夾名稱
      const folderPath = file.webkitRelativePath || '';
      
      // 如果沒有資料夾路徑，則使用檔案名稱
      const uploadPath = folderPath ? folderPath : file.name;
      
      // 準備 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', uploadPath); // 使用完整路徑作為檔案名稱
      
      // 添加選擇的 bucket (如果有)
      if (selectedBucket) {
        formData.append('bucket', selectedBucket);
      }
      
      // 使用 Promise 包裝 XHR 以便 await
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.onload = function() {
          console.log(`File upload ${uploadPath} completed with status: ${xhr.status}`);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            // 200-299 狀態碼都視為成功
            try {
              const response = JSON.parse(xhr.responseText);
              console.log("Upload response:", response);
              resolve(response);
            } catch (e) {
              console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
              // 即使解析錯誤，如果狀態碼為 2xx，我們仍視為成功
              resolve({success: true, message: "檔案已上傳，但回應解析失敗"});
            }
          } else {
            // 非 2xx 狀態碼視為錯誤
            console.error(`Server error (${xhr.status}):`, xhr.responseText);
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Server responded with ${xhr.status}`));
            } catch (e) {
              reject(new Error(`Server responded with ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = function(e) {
          console.error("Network error during upload:", e);
          reject(new Error('網路錯誤，上傳失敗'));
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

/**
 * 獲取父資料夾路徑
 */
function getParentFolder(path) {
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

// 全域函式
window.deleteFile = deleteFile;
window.showErrorDetails = showErrorDetails;
window.loadFileList = loadFileList; // 添加到全域，以支持資料夾導航
