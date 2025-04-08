/**
 * 儲存空間處理模組
 */

import { API_URL } from '../config.js';
import { loadFileList } from './fileListHandler.js';

// 預設值
let availableBuckets = [];
let defaultBucket = '';

/**
 * 載入可用的 R2 儲存空間
 */
export async function loadBuckets() {
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
        
        // 取得 DOM 元素
        const bucketSelect = document.getElementById('bucketSelect');
        const bucketFilter = document.getElementById('bucketFilter');
        
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
        
        // 初始化事件監聽器
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
 * 初始化 bucket 過濾和選擇功能
 */
function initBucketFilters() {
  // 取得 DOM 元素
  const bucketFilter = document.getElementById('bucketFilter');
  const bucketSelect = document.getElementById('bucketSelect');
  
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
 * 獲取預設的 bucket
 */
export function getDefaultBucket() {
  return defaultBucket;
}

/**
 * 獲取所有可用的 buckets
 */
export function getAvailableBuckets() {
  return availableBuckets;
}
