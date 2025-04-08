/**
 * File Upload Handler Module
 */

import { API_URL, APP_CONFIG } from '../config.js';
import { formatBytes, formatTime } from '../utils/formatters.js';
import { loadFileList, getCurrentPrefix } from './fileListHandler.js';

// Upload status variables
let uploadStartTime = 0;
let uploadedBytes = 0;
let totalBytes = 0;
let lastUpdateTime = 0;
let lastUploadedBytes = 0;

/**
 * Handle file upload
 */
export function uploadFile(file) {
  // Get DOM elements
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const uploadSpeed = document.getElementById('uploadSpeed');
  const timeRemaining = document.getElementById('timeRemaining');
  const uploadResult = document.getElementById('uploadResult');
  const bucketSelect = document.getElementById('bucketSelect');

  // Reset upload status
  resetUploadStatus(file, fileName, fileSize, progressBar, uploadSpeed, timeRemaining, uploadResult);
  
  // Show progress bar
  progressContainer.style.display = 'block';
  
  // Prepare FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('originalName', file.name);
  
  // Add selected bucket (if any)
  if (bucketSelect && bucketSelect.value) {
    formData.append('bucket', bucketSelect.value);
    console.log('Using selected bucket:', bucketSelect.value);
  }
  
  // Create XHR
  const xhr = new XMLHttpRequest();
  
  // Upload completed
  xhr.onload = function() {
    console.log(`Upload completed with status: ${xhr.status}`);
    
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const result = JSON.parse(xhr.responseText);
        console.log("Upload response:", result);
        
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            File uploaded successfully! 
            <a href="${API_URL}${result.url}" target="_blank">View file</a>
            ${result.bucket ? `<span class="badge bg-info">${result.bucket}</span>` : ''}
          </div>
        `;
        loadFileList(getCurrentPrefix());
      } catch (e) {
        console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
        // Even if parsing fails, if the status code is 2xx, we still consider it a success
        uploadResult.innerHTML = `
          <div class="alert alert-success">
            File uploaded successfully! (but response parsing failed)
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
            Upload failed: ${errorData.error || `Server responded with ${xhr.status}`}
          </div>
        `;
      } catch (e) {
        uploadResult.innerHTML = `
          <div class="alert alert-danger">
            Upload failed: Server responded with ${xhr.status}
          </div>
        `;
      }
    }
    
    // Hide progress bar
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
  };
  
  // Upload error
  xhr.onerror = function(e) {
    console.error("Network error during upload:", e);
    
    uploadResult.innerHTML = `
      <div class="alert alert-danger">
        Network error, upload failed! Please check your network connection or CORS settings.
      </div>
    `;
    progressContainer.style.display = 'none';
  };
  
  // Track upload progress
  xhr.upload.onprogress = updateProgressHandler(progressBar, uploadSpeed, timeRemaining);
  
  // Start upload
  console.log(`Starting upload to ${API_URL}/upload`);
  xhr.open('POST', `${API_URL}/upload`, true);
  xhr.send(formData);
  
  // Record start time
  uploadStartTime = Date.now();
  lastUpdateTime = uploadStartTime;
}

/**
 * Reset upload status
 */
function resetUploadStatus(file, fileNameEl, fileSizeEl, progressBarEl, uploadSpeedEl, timeRemainingEl, uploadResultEl) {
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  progressBarEl.style.width = '0%';
  progressBarEl.setAttribute('aria-valuenow', '0');
  uploadSpeedEl.textContent = '0 KB/s';
  timeRemainingEl.textContent = 'Calculating...';
  uploadResultEl.innerHTML = '';
  totalBytes = file.size;
  uploadedBytes = 0;
  lastUploadedBytes = 0;
}

/**
 * Update progress display
 */
function updateProgressHandler(progressBarEl, uploadSpeedEl, timeRemainingEl) {
  return function(event) {
    if (event.lengthComputable) {
      const now = Date.now();
      const elapsedTime = now - lastUpdateTime;
      
      if (elapsedTime > APP_CONFIG.PROGRESS_UPDATE_INTERVAL) { // Update every 200ms to avoid excessive updates
        const bytesUploaded = event.loaded;
        const bytesTotal = event.total;
        const percentComplete = (bytesUploaded / bytesTotal) * 100;
        
        // Update progress bar
        progressBarEl.style.width = percentComplete.toFixed(2) + '%';
        progressBarEl.setAttribute('aria-valuenow', percentComplete.toFixed(2));
        
        // Calculate upload speed
        const bytesPerSecond = ((bytesUploaded - lastUploadedBytes) / elapsedTime) * 1000;
        const speedText = formatBytes(bytesPerSecond) + '/s';
        uploadSpeedEl.textContent = speedText;
        
        // Calculate remaining time
        const remainingBytes = bytesTotal - bytesUploaded;
        let timeRemainingText = 'Calculating...';
        
        if (bytesPerSecond > 0) {
          const secondsRemaining = Math.ceil(remainingBytes / bytesPerSecond);
          timeRemainingText = formatTime(secondsRemaining);
        }
        
        timeRemainingEl.textContent = timeRemainingText;
        
        // Update variables for next calculation
        lastUpdateTime = now;
        lastUploadedBytes = bytesUploaded;
      }
    }
  };
}

/**
 * Process folder selection
 */
export function processFiles(files) {
  // Get DOM elements
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const fileName = document.getElementById('fileName');
  const uploadResult = document.getElementById('uploadResult');
  const bucketSelect = document.getElementById('bucketSelect');

  const totalFiles = files.length;
  let uploadedCount = 0;
  let errors = [];
  
  // Create progress display
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  fileName.textContent = `Uploading multiple files (0/${totalFiles})`;
  
  // Selected bucket
  const selectedBucket = bucketSelect && bucketSelect.value ? bucketSelect.value : '';
  console.log(`Selected bucket for folder upload: ${selectedBucket || 'none'}`);
  
  // Upload files sequentially
  return new Promise(async (resolve) => {
    for (const file of files) {
      try {
        // Get complete path, including folder structure
        // Note: Here we preserve the original folder structure instead of removing the first folder name
        const folderPath = file.webkitRelativePath || '';
        
        // If there's no folder path, use the file name
        const uploadPath = folderPath ? folderPath : file.name;
        
        // Prepare FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', uploadPath); // Use the complete path as the file name
        
        // Add selected bucket (if any)
        if (selectedBucket) {
          formData.append('bucket', selectedBucket);
        }
        
        // Use Promise to wrap XHR for await
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.onload = function() {
            console.log(`File upload ${uploadPath} completed with status: ${xhr.status}`);
            
            if (xhr.status >= 200 && xhr.status < 300) {
                // Status codes 200-299 are all considered successful
              try {
                const response = JSON.parse(xhr.responseText);
                console.log("Upload response:", response);
                resolve(response);
              } catch (e) {
                console.warn("Response parsing error:", e, "Raw response:", xhr.responseText);
                // Even if parsing fails, if the status code is 2xx, we still consider it a success
                resolve({success: true, message: "File uploaded, but response parsing failed"});
              }
            } else {
              // Non-2xx status codes are considered errors
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
            reject(new Error('Network error, upload failed'));
          };
          
          xhr.open('POST', `${API_URL}/upload`, true);
          xhr.send(formData);
        });
        
        // Update progress
        uploadedCount++;
        const progress = (uploadedCount / totalFiles) * 100;
        progressBar.style.width = `${progress}%`;
        fileName.textContent = `Uploading multiple files (${uploadedCount}/${totalFiles})`;
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        errors.push({ name: file.name, error: error.message });
      }
    }
    
    // Display results after upload completes
    if (errors.length === 0) {
      uploadResult.innerHTML = `
      <div class="alert alert-success">
          Successfully uploaded all ${totalFiles} files!
        </div>
      `;
    } else {
      uploadResult.innerHTML = `
      <div class="alert alert-warning">
          Upload complete, but ${errors.length} files failed.
          <button class="btn btn-sm btn-outline-secondary mt-2" onclick="showErrorDetails()">Show details</button>
        </div>
      `;
      
      // Store error details for later display
      window.uploadErrors = errors;
    }
    
    // Hide progress bar
    setTimeout(() => {
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
    
    // Reload file list
    loadFileList(getCurrentPrefix());
    
    resolve({
      success: errors.length === 0,
      totalFiles,
      uploadedFiles: uploadedCount,
      errors
    });
  });
}
