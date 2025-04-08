/**
 * CORS 中介層處理
 */

/**
 * 處理 CORS 預檢請求
 */
function handleCORS(origin, allowedOrigins) {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCORSHeaders(origin, allowedOrigins),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * 取得 CORS 相關頭部
 */
function getCORSHeaders(origin, allowedOrigins) {
  // 確保 allowedOrigins 是陣列
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : ['*'];
  
  // 如果允許所有來源或請求來源在允許列表中
  if (origins.includes('*') || (origin && origins.includes(origin))) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
    };
  }
  
  // 默認情況下允許任何來源 (因為我們在配置中使用了 '*')
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'false'
  };
}

/**
 * 錯誤回應輔助函式
 */
function errorResponse(message, status = 400, origin = '*') {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
      }
    }
  );
}

export {
  handleCORS,
  getCORSHeaders,
  errorResponse
};
