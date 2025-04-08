/**
 * Bucket Handler Module
 */

import { API_URL } from '../config.js';
import { loadFileList } from './fileListHandler.js';
import { addAuthToRequest } from '../components/login.js';

// Default values
let availableBuckets = [];
let defaultBucket = '';

/**
 * Load available R2 buckets
 */
export async function loadBuckets() {
  try {
    console.log('Loading buckets from:', `${API_URL}/buckets`);
    const response = await fetch(`${API_URL}/buckets`, 
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
      console.log('Buckets response:', data);
      
      if (data.success && data.buckets && data.buckets.length > 0) {
        // Store available bucket list
        availableBuckets = data.buckets;
        defaultBucket = data.default || data.buckets[0];
        
        // Get DOM elements
        const bucketSelect = document.getElementById('bucketSelect');
        const bucketFilter = document.getElementById('bucketFilter');
        
        // Clear existing options
        bucketSelect.innerHTML = '';
        bucketFilter.innerHTML = '<option value="">All Buckets</option>';
        
        // Add all available bucket options
        data.buckets.forEach(bucket => {
          const isDefault = bucket === defaultBucket;
          bucketSelect.innerHTML += `<option value="${bucket}" ${isDefault ? 'selected' : ''}>${bucket} ${isDefault ? '(Default)' : ''}</option>`;
          bucketFilter.innerHTML += `<option value="${bucket}">${bucket}</option>`;
        });
        
        console.log('Buckets loaded successfully:', availableBuckets);
        
        // Initialize event listeners
        initBucketFilters();
        
        return {
          success: true,
          buckets: availableBuckets,
          defaultBucket
        };
      } else {
        console.warn('No buckets available in response');
        return {
          success: false,
          error: 'No buckets available'
        };
      }
    } else {
      console.warn('Failed to load buckets:', response.status);
      const errorText = await response.text();
      console.warn('Error response:', errorText);
      return {
        success: false,
        error: `Failed to load buckets: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Error loading buckets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize bucket filtering and selection functionality
 */
function initBucketFilters() {
  // Get DOM elements
  const bucketFilter = document.getElementById('bucketFilter');
  const bucketSelect = document.getElementById('bucketSelect');
  
  // When bucket selection changes, reload file list
  if (bucketFilter) {
    bucketFilter.addEventListener('change', () => {
      console.log('Bucket filter changed to:', bucketFilter.value);
      loadFileList();
    });
  }
  
  // Select bucket and show in upload area
  if (bucketSelect) {
    bucketSelect.addEventListener('change', () => {
      console.log('Selected bucket changed to:', bucketSelect.value);
    });
  }
}

/**
 * Get default bucket
 */
export function getDefaultBucket() {
  return defaultBucket;
}

/**
 * Get all available buckets
 */
export function getAvailableBuckets() {
  return availableBuckets;
}
