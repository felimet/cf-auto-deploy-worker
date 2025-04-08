/**
 * 檔案上傳處理模組
 */

import { API_URL, APP_CONFIG } from '../config.js';
import { formatBytes, formatTime } from '../utils/formatters.js';
import { loadFileList, getCurrentPrefix } from './fileListHandler.js';

// 上傳狀態變數
let uploadStartTime = 0;
let uploadedBytes = 0;
let totalBytes = 0;
let lastUpdateTime = 0;
let lastUploadedBytes = 0;

/**
 * 處理檔案上傳
 */
export function uploadFile(file) {
  // 取得 DOM 元素
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const uploadSpeed = document.getElementById('uploadSpeed');
  const timeRemaining = document.getElementById('timeRemaining');
  const uploadResult = document.getElementById('uploadResult');
  const bucketSelect = document.getElementById('bucketSelect');

  // 重置上傳狀態
  resetUploadStatus(file, fileName, fileSize, progressBar, uploadSpeed, timeRemaining, uploadResult);
  
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
        loadFileList(getCurrentPrefix());
      } catch (e) {
        console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
        // 即使解析錯誤，如果狀態碼為2xx，我們仍視為成功
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            檔案已上傳成功! (但回應解析失敗)
          </div>
        `;
        loadFileList(getCurrentPrefix());
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
  xhr.upload.onprogress = updateProgressHandler(progressBar, uploadSpeed, timeRemaining);
  
  // 開始上傳
  console.log(`Starting upload to ${API_URL}/upload`);
  xhr.open('POST', `${API_URL}/upload`, true);
  xhr.send(formData);
  
  // 記錄開始時間
  uploadStartTime = Date.now();
  lastUpdateTime = uploadStartTime;
}

/**
 * 重置上傳狀態
 */
function resetUploadStatus(file, fileNameEl, fileSizeEl, progressBarEl, uploadSpeedEl, timeRemainingEl, uploadResultEl) {
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  progressBarEl.style.width = '0%';
  progressBarEl.setAttribute('aria-valuenow', '0');
  uploadSpeedEl.textContent = '0 KB/s';
  timeRemainingEl.textContent = '計算中...';
  uploadResultEl.innerHTML = '';
  totalBytes = file.size;
  uploadedBytes = 0;
  lastUploadedBytes = 0;
}

/**
 * 更新進度顯示
 */
function updateProgressHandler(progressBarEl, uploadSpeedEl, timeRemainingEl) {
  return function(event) {
    if (event.lengthComputable) {
      const now = Date.now();
      const elapsedTime = now - lastUpdateTime;
      
      if (elapsedTime > APP_CONFIG.PROGRESS_UPDATE_INTERVAL) { // 每 200ms 更新一次，避免過於頻繁
        const bytesUploaded = event.loaded;
        const bytesTotal = event.total;
        const percentComplete = (bytesUploaded / bytesTotal) * 100;
        
        // 更新進度條
        progressBarEl.style.width = percentComplete.toFixed(2) + '%';
        progressBarEl.setAttribute('aria-valuenow', percentComplete.toFixed(2));
        
        // 計算上傳速度
        const bytesPerSecond = ((bytesUploaded - lastUploadedBytes) / elapsedTime) * 1000;
        const speedText = formatBytes(bytesPerSecond) + '/s';
        uploadSpeedEl.textContent = speedText;
        
        // 計算剩餘時間
        const remainingBytes = bytesTotal - bytesUploaded;
        let timeRemainingText = '計算中...';
        
        if (bytesPerSecond > 0) {
          const secondsRemaining = Math.ceil(remainingBytes / bytesPerSecond);
          timeRemainingText = formatTime(secondsRemaining);
        }
        
        timeRemainingEl.textContent = timeRemainingText;
        
        // 更新變數以備下次計算
        lastUpdateTime = now;
        lastUploadedBytes = bytesUploaded;
      }
    }
  };
}

/**
 * 處理資料夾選擇
 */
export function processFiles(files) {
  // 取得 DOM 元素
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const fileName = document.getElementById('fileName');
  const uploadResult = document.getElementById('uploadResult');
  const bucketSelect = document.getElementById('bucketSelect');

  const totalFiles = files.length;
  let uploadedCount = 0;
  let errors = [];
  
  // 創建進度顯示
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  fileName.textContent = `正在上傳多個檔案 (0/${totalFiles})`;
  
  // 選擇的 bucket
  const selectedBucket = bucketSelect && bucketSelect.value ? bucketSelect.value : '';
  console.log(`Selected bucket for folder upload: ${selectedBucket || 'none'}`);
  
  // 依序上傳每個檔案
  return new Promise(async (resolve) => {
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
    loadFileList(getCurrentPrefix());
    
    resolve({
      success: errors.length === 0,
      totalFiles,
      uploadedFiles: uploadedCount,
      errors
    });
  });
}
