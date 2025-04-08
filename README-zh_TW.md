# Cloudflare R2 檔案上傳系統

這是一個使用 Cloudflare Workers 和 R2 儲存服務的檔案上傳與管理系統。此專案實現了一個完整的檔案管理解決方案，支援無檔案大小限制的上傳，適合用於模型檔案等大型檔案的管理。

## 功能

- 使用 Cloudflare R2 儲存大型檔案，無檔案大小限制
- 實時上傳進度顯示和剩餘時間估算
- 檔案類型自動識別和圖示顯示
- 檔案列表瀏覽和管理
- 檔案預覽（支援影像）和下載
- 使用 Cloudflare Workers 處理檔案上傳、下載和刪除
- 拖放式檔案上傳界面
- 支援模型檔案（.pt、.ckpt、.safetensors 等）

## 系統需求

- [Node.js](https://nodejs.org/) 14.x 或更高版本
- [npm](https://www.npmjs.com/) 或 [yarn](https://yarnpkg.com/)
- [Cloudflare](https://cloudflare.com/) 帳戶（免費帳戶即可）
- [wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI 工具

## 快速開始

### 方法一：使用自動部署腳本

提供了一個互動式部署腳本，可以引導您完成所有設定和部署步驟：

```bash
# 運行部署腳本
node deploy.js
```

### 方法二：手動部署

1. **安裝 wrangler CLI**

```bash
npm install -g wrangler
```

2. **登入 Cloudflare**

```bash
wrangler login
```

3. **設定 wrangler.toml 檔案**

根據您的需求修改 `wrangler.toml` 檔案：

```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "yyyy-MM-dd"

# R2 儲存空間設定
[[r2_buckets]]
binding = "your-binding"
bucket_name = "your-bucket-name"

# 環境變數設定
[vars]
ALLOWED_ORIGINS = "*"
```

4. **創建 R2 儲存桶**

```bash
wrangler r2 bucket create your-bucket-name
```

5. **更新前端 API URL**

在 `frontend/app.js` 檔案中，更新 `API_URL` 變數為您的 Worker URL：

```javascript
const API_URL = 'https://your-worker-name.your-account.workers.dev';
```

6. **部署 Worker**

```bash
wrangler deploy
```

7. **部署前端**

   - 使用 Cloudflare Pages
   - 使用其他網站託管服務（如 GitHub Pages）
   - 本地使用（直接開啟 HTML 檔案或使用本地伺服器）

## 前端訪問選項

### 1. 直接開啟 HTML 檔案（最簡單方式）

```bash
# 在 frontend 資料夾中
# 複製 frontend/index.html 到瀏覽器網址欄（使用檔案協議 file:///）
```

**注意**：直接開啟 HTML 檔案時，請確保在 app.js 中的 API_URL 指向正確的 Worker URL：
```javascript
const API_URL = 'https://your-worker-name.your-account.workers.dev';
```

### 2. 使用 GitHub Pages（靜態）或其他網站託管

1. 在 GitHub 上創建一個新的儲存庫
2. 上傳 `frontend` 目錄中的檔案
3. 啟用 GitHub Pages

**示例**：

```bash
# 在 frontend 目錄中
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/您的用戶名/repo-name.git
git push -u origin main
```

### 3. 使用其他靜態網站託管服務

如 Netlify、Vercel 等，步驟類似。

**重要**：無論哪種託管方式，都需要確保 Worker 的 CORS 設定允許前端頁面的來源網域訪問。

## 使用方法

1. 打開部署的前端頁面
2. 點擊「瀏覽檔案」或直接拖放檔案到上傳區域
3. 檔案上傳完成後，會顯示在「已上傳檔案」列表中
4. 點擊檔案可以下載，或使用刪除按鈕移除檔案

## 注意事項

- 預設允許所有來源訪問 API（CORS 設置為 "*"），請根據您的安全需求調整
- 預設不限制上傳檔案大小，但注意 Cloudflare R2 可能有計費限制
- 此系統沒有使用身份驗證，如需生產環境使用，請考慮添加身份驗證機制

## 安全性考慮

- 在生產環境中，建議添加身份驗證和授權機制
- 限制允許的 CORS 來源域名
- 考慮添加檔案類型和大小限制
- 添加檔案掃描和內容驗證

## LICENSE

[MIT LICENSE](LICENSE)
