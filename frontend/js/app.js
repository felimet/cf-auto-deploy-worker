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
 * Initialize DOM element references
 */
function initDOMReferences() {
  dropArea = document.getElementById('dropArea');
  fileInput = document.getElementById('fileInput');
  browseButton = document.getElementById('browseButton');
  folderButton = document.getElementById('folderButton');
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
  // Drag and drop area events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  // Drag area highlight
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  // Handle file drop
  dropArea.addEventListener('drop', handleDrop, false);
  
  // File selection button
  browseButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File selection event
  fileInput.addEventListener('change', handleFiles, false);

  // Add folder selection button
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
 * Prevent default drag and drop behavior
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Highlight drop area
 */
function highlight() {
  dropArea.classList.add('highlight');
}

/**
 * Remove highlight from drop area
 */
function unhighlight() {
  dropArea.classList.remove('highlight');
}

/**
 * Handle file drop
 */
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

/**
 * Handle selected files
 */
function handleFiles(e) {
  const files = e.target.files;
  if (files.length > 0) {
    // In this example, only process one file
    uploadFile(files[0]);
  }
}

/**
 * Handle folder selection
 */
function handleFolderSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    // Show upload message
    const uploadResult = document.getElementById('uploadResult');
    uploadResult.innerHTML = `
      <div class="alert alert-info">
        Preparing to upload ${files.length} files...
      </div>
    `;
    
    // Process folder structure, preserve relative paths
    processFiles(files);
  }
  
  // Remove temporary element from DOM
  e.target.remove();
}

// Export functions for global use
window.deleteFile = deleteFile;
window.showErrorDetails = showErrorDetails; 
window.loadFileList = loadFileList; // Support folder navigation
