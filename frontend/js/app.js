/**
 * R2 File Upload Client
 * Provides drag-and-drop upload, progress display, and file management functionality
 */

import { loadBuckets } from './handlers/bucketHandler.js';
import { loadFileList, deleteFile, showErrorDetails } from './handlers/fileListHandler.js';
import { uploadFile, processFiles } from './handlers/uploadHandler.js';
import { initLogin } from './components/login.js';
import { APP_CONFIG } from './config.js';

// DOM element references
let dropArea, fileInput, browseButton, folderButton;
let loginState;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize login system
  loginState = initLogin();
  
  // Add auth toolbar if authentication is required
  if (APP_CONFIG.AUTH_REQUIRED) {
    addAuthToolbar();
  }
  
  // Initialize DOM references
  initDOMReferences();
  
  // Initialize event listeners
  initEventListeners();
  
  // Check authentication before loading data
  if (APP_CONFIG.AUTH_REQUIRED && !loginState.isLoggedIn()) {
    // Show login modal if authentication is required but user is not logged in
    loginState.showLoginModal();
  } else {
    // Load application data
    await loadAppData();
  }
});

/**
 * Load application data
 */
async function loadAppData() {
  try {
    // Load available storage buckets
    await loadBuckets();
    
    // Load file list
    loadFileList();
  } catch (error) {
    console.error('Failed to load application data:', error);
    
    // If authentication error, show login modal
    if (error.status === 401 && APP_CONFIG.AUTH_REQUIRED) {
      loginState.showLoginModal();
    }
  }
}

/**
 * Add authentication toolbar to page
 */
function addAuthToolbar() {
  const container = document.querySelector('.container');
  const authToolbar = document.createElement('div');
  authToolbar.className = 'auth-toolbar d-flex justify-content-end mb-3';
  authToolbar.innerHTML = `
    <button id="authButton" class="btn btn-outline-secondary btn-sm">
      <i class="bi bi-key"></i> <span id="authStatus">Login</span>
    </button>
  `;
  
  // Insert toolbar at the top of the container
  container.insertBefore(authToolbar, container.firstChild);
  
  // Add event listener to auth button
  const authButton = document.getElementById('authButton');
  const authStatus = document.getElementById('authStatus');
  
  authButton.addEventListener('click', () => {
    if (loginState.isLoggedIn()) {
      // Logout
      if (confirm('Are you sure you want to log out?')) {
        logout();
      }
    } else {
      // Login
      showLogin();
    }
  });
  
  // Update button text based on login state
  if (loginState.isLoggedIn()) {
    authStatus.textContent = 'Logout';
  } else {
    authStatus.textContent = 'Login';
  }
}

/**
 * 初始化 DOM 元素引用
 */
function initDOMReferences() {
  dropArea = document.getElementById('dropArea');
  fileInput = document.getElementById('fileInput');
  browseButton = document.getElementById('browseButton');
  folderButton = document.getElementById('folderButton');
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
 * 處理資料夾選擇
 */
function handleFolderSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    // 顯示上傳中訊息
    const uploadResult = document.getElementById('uploadResult');
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

// 將功能導出到全域使用
window.deleteFile = deleteFile;
window.showErrorDetails = showErrorDetails; 
window.loadFileList = loadFileList; // 支援資料夾導航
