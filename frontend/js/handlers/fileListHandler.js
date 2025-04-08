/**
 * 檔案列表處理模組
 */

import { API_URL } from '../config.js';
import { getFileIcon, getParentFolder } from '../utils/fileIcons.js';
import { formatBytes } from '../utils/formatters.js';

// 變數
let currentPrefix = '';

/**
 * 載入檔案列表
 */
export async function loadFileList(prefix = '') {
  try {
    // 儲存當前路徑
    currentPrefix = prefix;
    
    // 取得選定的 bucket (如果有)
    const bucketFilter = document.getElementById('bucketFilter');
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
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="text-center text-muted">無已上傳檔案</div>';
      }
    } else {
      throw new Error(`獲取檔案列表失敗: ${response.status}`);
    }
  } catch (error) {
    console.error('載入檔案列表錯誤:', error);
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = `<div class="text-center text-danger">無法載入檔案列表: ${error.message}</div>`;
  }
}

/**
 * 顯示檔案列表
 */
function displayFileList(files) {
  const fileList = document.getElementById('fileList');
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
export async function deleteFile(fileQuery) {
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
        loadFileList(currentPrefix);
        
        // 顯示成功訊息
        const uploadResult = document.getElementById('uploadResult');
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
    const uploadResult = document.getElementById('uploadResult');
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        刪除失敗: ${error.message}
      </div>
    `;
  }
}

/**
 * 顯示錯誤詳情
 */
export function showErrorDetails() {
  if (window.uploadErrors && window.uploadErrors.length > 0) {
    let errorDetails = '<ul class="list-group list-group-flush">';
    window.uploadErrors.forEach(error => {
      errorDetails += `<li class="list-group-item">
        <strong>${error.name}</strong>: ${error.error}
      </li>`;
    });
    errorDetails += '</ul>';
    
    const uploadResult = document.getElementById('uploadResult');
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        上傳失敗的檔案:
        ${errorDetails}
        <button class="btn btn-sm btn-primary mt-2" onclick="loadFileList('${currentPrefix}')">返回</button>
      </div>
    `;
  }
}

// 返回當前路徑
export function getCurrentPrefix() {
  return currentPrefix;
}
