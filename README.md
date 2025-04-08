# Cloudflare R2 File Upload System

[[English (US)](README.md)] | [[中文 (zh-TW)](README-zh_TW.md)]

This is a file upload and management system using Cloudflare Workers and R2 storage service. It provides a comprehensive file management solution with no file size limit, making it well-suited for managing large files such as model files.

## Features

- Store large files on Cloudflare R2 with no file size limit
- Real-time upload progress display and time remaining estimation
- Automatic file-type detection and icons
- File browsing and management
- File preview (supports images) and download
- Use Cloudflare Workers to handle file uploads, downloads, and deletions
- Drag-and-drop file upload interface
- Supports model files (`.pt`, `.ckpt`, `.safetensors`, etc.)

## Requirements

- [Node.js](https://nodejs.org/) 14.x or higher
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Cloudflare](https://cloudflare.com/) account (free account is sufficient)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI tool

## Quick Start

### Method 1: Using the Automated Deployment Script

An interactive deployment script is provided to guide you through all setup and deployment steps:

```bash
# Make the script executable
chmod +x deploy.js

# Run the deployment script
node deploy.js
```

### Method 2: Manual Deployment

1. **Install wrangler CLI**

```bash
npm install -g wrangler
```

2. **Log into Cloudflare**

```bash
wrangler login
```

3. **Configure wrangler.toml**

Update the `wrangler.toml` file according to your requirements:

```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "yyyy-MM-dd"

# R2 storage settings
[[r2_buckets]]
binding = "your-binding"
bucket_name = "your-bucket-name"

# Environment variables
[vars]
ALLOWED_ORIGINS = "*"
```

4. **Create an R2 Bucket**

```bash
wrangler r2 bucket create your-bucket-name
```

5. **Update Frontend API URL**

In `frontend/app.js`, update the `API_URL` variable to your Worker URL:

```javascript
const API_URL = 'https://your-worker-name.your-account.workers.dev';
```

6. **Deploy the Worker**

```bash
wrangler deploy
```

7. **Deploy the Frontend**

   - Deploy via Cloudflare Pages
   - Deploy via another hosting service (e.g., GitHub Pages)
   - Serve locally (open the HTML file directly or run a local web server)

## Frontend Access Options

### 1. Open the HTML File Directly (simplest approach)

```bash
# In the frontend folder
# Copy or open frontend/index.html in your browser (using the file:/// protocol)
```

**Note**: When opening the HTML file directly, ensure `API_URL` in `app.js` is set to the correct Worker URL:
```javascript
const API_URL = 'https://your-worker-name.your-account.workers.dev';
```

### 2. Use GitHub Pages (static) or Other Hosting Services

1. Create a new repository on GitHub
2. Upload the contents of the `frontend` folder
3. Enable GitHub Pages

**Example**:

```bash
# In the frontend folder
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/repo-name.git
git push -u origin main
```

### 3. Use Other Static Hosting Services

Services like Netlify or Vercel follow similar steps.

**Important**: Regardless of your hosting method, ensure that your Worker’s CORS settings allow requests from your frontend domain.

## Usage

1. Open the deployed frontend page
2. Click “Browse Files” or drag and drop files into the upload area
3. Once uploaded, files will appear in the “Uploaded Files” list
4. Click a file to download it, or use the delete button to remove it

## Customization

### Frontend Configuration

- Modify the UI in `frontend/R2_upload.html`
- Update logic in `frontend/app.js`

### Worker Configuration

- Modify the request-handling logic in `src/index.js`
- Adjust environment variables and settings in `wrangler.toml`

## Notes

- By default, all origins are allowed (CORS is set to “*”)—adjust for security as needed
- There is no file size limit by default, but note that usage might incur Cloudflare R2 costs
- This system does not include authentication; for production, consider adding an authentication mechanism

## Security Considerations

- In production, add authentication and authorization
- Restrict CORS allowed origins
- Consider file type and size limitations
- Implement file scanning and content validation

## LICENSE

[MIT LICENSE](LICENSE)
