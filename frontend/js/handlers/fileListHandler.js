/**
 * File List Handler Module
 */

import { API_URL } from '../config.js';
import { getFileIcon, getParentFolder } from '../utils/fileIcons.js';
import { formatBytes } from '../utils/formatters.js';
import { addAuthToRequest } from '../components/login.js';

// Variables
let currentPrefix = '';

/**
 * Load file list
 */
export async function loadFileList(prefix = '') {
  try {
    // Save current path
    currentPrefix = prefix;
    
    // Get selected bucket (if any)
    const bucketFilter = document.getElementById('bucketFilter');
    const selectedBucket = bucketFilter ? bucketFilter.value : '';
    
    // Build URL, add bucket and prefix parameters
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
    const response = await fetch(listUrl, 
      addAuthToRequest({
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'same-origin'
      })
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Files list response:', data);
      
      if (data.files && data.files.length > 0) {
      // Display file list
        displayFileList(data.files);
      } else {
        // No files
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="text-center text-muted">No uploaded files</div>';
      }
    } else {
      throw new Error(`Failed to get file list: ${response.status}`);
    }
  } catch (error) {
    console.error('Error loading file list:', error);
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = `<div class="text-center text-danger">Unable to load file list: ${error.message}</div>`;
  }
}

/**
 * Display file list
 */
function displayFileList(files) {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  
  // If there is a current path, show back button
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
        <div class="small text-muted">Back to parent folder</div>
      </div>
    `;
    
    fileList.appendChild(backItem);
  }
  
  // Current path display
  if (currentPrefix) {
    const pathBar = document.createElement('div');
    pathBar.className = 'alert alert-secondary d-flex align-items-center mb-3';
    
    // Create path navigation
    let pathHtml = `<i class="bi bi-folder me-2"></i> `;
    let crumbs = [];
    let path = '';
    
    // Add root directory
    crumbs.push(`<span class="path-item" onclick="loadFileList('')">Root</span>`);
    
    // Add each level in the path
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
  
  // If there are no files
  if (files.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-center text-muted my-5';
    emptyMsg.innerHTML = 'No files in this folder';
    fileList.appendChild(emptyMsg);
    return;
  }
  
  // Display files and folders
  files.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    if (file.isFolder) {
      // This is a folder
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
            Folder
            ${file.bucket ? `<span class="badge bg-info">${file.bucket}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      // This is a file
      // Display file name (without path)
      const fileName = file.name.split('/').pop();
      
      // Determine file type, show corresponding preview or icon
      let previewHtml = '';
      const isImage = file.httpMetadata && file.httpMetadata.contentType && file.httpMetadata.contentType.startsWith('image/');
      
      if (isImage) {
      // Build image URL, add bucket parameter if available
        let imgUrl = `${API_URL}/files/${file.name}`;
        if (file.bucket) {
          imgUrl += `?bucket=${encodeURIComponent(file.bucket)}`;
        }
        
        previewHtml = `<img src="${imgUrl}" class="file-preview" alt="${fileName}" />`;
      } else {
        // Show icon based on file type
        const fileIcon = getFileIcon(fileName);
        previewHtml = `<div class="file-preview d-flex align-items-center justify-content-center bg-light"><i class="${fileIcon} fs-3"></i></div>`;
      }
      
      // Build download URL, add bucket parameter if available
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
          <a href="${downloadUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-2" title="Download">
            <i class="bi bi-download"></i>
          </a>
          <button class="btn btn-sm btn-outline-danger" title="Delete" onclick="deleteFile('${deleteUrl}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
    }
    
    fileList.appendChild(fileItem);
  });
}

/**
 * Delete file
 */
export async function deleteFile(fileQuery) {
  if (!confirm(`Are you sure you want to delete this file?`)) {
    return;
  }
  
  try {
    // fileQuery already contains file name and possible bucket parameter
    const deleteUrl = `${API_URL}/files/${fileQuery}`;
    console.log(`Deleting file: ${deleteUrl}`);
    
    const response = await fetch(deleteUrl, 
      addAuthToRequest({
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'same-origin'
      })
    );
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
      // Reload file list
        loadFileList(currentPrefix);
        
      // Show success message
        const uploadResult = document.getElementById('uploadResult');
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            File successfully deleted!
          </div>
        `;
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } else {
      throw new Error(`Delete failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    const uploadResult = document.getElementById('uploadResult');
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        Delete failed: ${error.message}
      </div>
    `;
  }
}

/**
 * Show error details
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
        Files that failed to upload:
        ${errorDetails}
        <button class="btn btn-sm btn-primary mt-2" onclick="loadFileList('${currentPrefix}')">Back</button>
      </div>
    `;
  }
}

// Return current path
export function getCurrentPrefix() {
  return currentPrefix;
}
