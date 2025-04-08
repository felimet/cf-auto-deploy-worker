/**
 * File listing handler module
 */

import { getCORSHeaders, errorResponse } from '../middlewares/cors.js';
import { validateAuth, authFailureResponse } from '../middlewares/auth.js';

/**
 * Handle file listing requests
 */
async function handleList(request, env) {
  try {
    // Get request origin
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['*'];
    
    // Validate authentication
    const authResult = validateAuth(request, env);
    if (!authResult.authenticated) {
      return authFailureResponse(authResult.error, origin);
    }
    
    // Pagination parameters
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const delimiter = url.searchParams.get('delimiter') || '/';  // Use slash as delimiter to support folder structure
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const cursor = url.searchParams.get('cursor');
    
    // Get file list from R2
    const options = {
      prefix: prefix,
      limit: limit,
      delimiter: delimiter  // Add delimiter to support folder structure
    };
    
    // Only add cursor when it exists and is a string
    if (cursor && typeof cursor === 'string') {
      options.cursor = cursor;
    }
    
    // Get specified bucket from URL parameters (if any)
    let bucketName = url.searchParams.get('bucket') || '';
    let r2Binding;
    
    if (bucketName && env[bucketName] && typeof env[bucketName].put === 'function') {
      // Use the specified storage space
      r2Binding = bucketName;
    } else {
      // Auto-detect all available R2 bindings
      const r2Bindings = Object.keys(env).filter(key => {
        return env[key] && typeof env[key].put === 'function';
      });
      
      if (r2Bindings.length === 0) {
        return errorResponse('No R2 buckets available', 500, origin);
      }
      
      // Use the first available binding
      r2Binding = r2Bindings[0];
    }
    
    // Get file list from R2
    const listing = await env[r2Binding].list(options);
    
    // Format file output
    const files = listing.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      etag: obj.etag,
      bucket: r2Binding,
      isFolder: obj.key.endsWith('/'),  // Mark if it's a folder
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata
    }));
    
    // Process folders (prefixes)
    const folders = listing.delimitedPrefixes ? listing.delimitedPrefixes.map(prefix => ({
      name: prefix,
      isFolder: true,
      bucket: r2Binding,
      size: 0
    })) : [];
    
    // Merge files and folders and sort by name
    const allItems = [...files, ...folders].sort((a, b) => {
      // Folders first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      // Same type sorted alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    // Return results
    return new Response(
      JSON.stringify({
        files: allItems,
        currentPrefix: prefix,
        bucket: r2Binding,
        truncated: listing.truncated,
        cursor: listing.cursor
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(origin, allowedOrigins)
        }
      }
    );
  } catch (error) {
    console.error('List error:', error);
    const origin = request.headers.get('Origin') || '*';
    return errorResponse(`List failed: ${error.message}`, 500, origin);
  }
}

export { handleList };
