/**
 * Cloudflare Worker R2 File Upload Handler
 * No file size limit version
 */

// Import route handling modules
import { handleUpload } from './handlers/uploadHandler.js';
import { handleDownload } from './handlers/downloadHandler.js';
import { handleDelete } from './handlers/deleteHandler.js';
import { handleList } from './handlers/listHandler.js';
import { handleBuckets } from './handlers/bucketsHandler.js';
import { handleCORS } from './middlewares/cors.js';

// Main handler function
export default {
  async fetch(request, env, ctx) {
    // Retrieve the allowed origins from environment variables
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Get the request origin
    const origin = request.headers.get('Origin') || '*';
    
    // CORS processing
    if (request.method === 'OPTIONS') {
      return handleCORS(origin, allowedOrigins);
    }
    
    // Route handling
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '').split('/')[0];
    
    // Handle different functionalities based on path and method
    if (path === 'upload' && request.method === 'POST') {
      return handleUpload(request, env);
    } else if (path === 'files' && request.method === 'GET') {
      // Get the filename from the path
      const fileName = url.pathname.replace(/^\/+files\/+/, '');
      return handleDownload(request, env, fileName);
    } else if (path === 'files' && request.method === 'DELETE') {
      // Get the filename from the path
      const fileName = url.pathname.replace(/^\/+files\/+/, '');
      return handleDelete(request, env, fileName);
    } else if (path === 'list' && request.method === 'GET') {
      return handleList(request, env);
    } else if (path === 'buckets' && request.method === 'GET') {
      return handleBuckets(request, env);
    } else {
      return new Response('Not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': origin
        }
      });
    }
  }
};
