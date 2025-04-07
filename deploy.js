#!/usr/bin/env node

/**
 * Cloudflare Worker R2 上傳系統部署指南
 * 使用此腳本協助您完成部署步驟
 */

const readline = require('readline');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// 創建 readline 介面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 定義顏色代碼
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// 全域變數
let accountId = '';
let workerUrl = '';
let frontendUrl = 'http://localhost:8000';
let bucketName = '';
let bindingName = ''; // 新增：可自訂的 binding 名稱

// 歡迎訊息
console.log(`
${colors.bright}${colors.cyan}=================================================
 Cloudflare Worker R2 檔案上傳系統部署指南
=================================================

${colors.reset}${colors.yellow}此腳本將幫助您完成以下步驟：

1. 檢查必要的配置和環境
2. 更新 Worker 應用程式設定
3. 部署 Worker 到 Cloudflare
4. 部署前端頁面到 Pages 或提供本地檔案的使用方法
${colors.reset}
`);

// 主函數
async function main() {
  try {
    // 1. 檢查 wrangler 是否已安裝
    await checkWrangler();
    
    // 2. 檢查是否已登入 Cloudflare
    await checkCloudflareLogin();
    
    // 3. 更新 wrangler.toml 配置
    await updateWranglerConfig();
    
    // 4. 確認 R2 存儲桶是否存在
    await confirmR2Bucket();
    
    // 5. 更新 API URL
    await updateApiUrl();
    
    // 6. 部署 Worker
    await deployWorker();
    
    // 7. 提供前端部署選項
    await deployFrontend();
    
    // 完成
    console.log(`
${colors.bright}${colors.green}==========================================
        部署完成!
==========================================${colors.reset}

${colors.yellow}您的 R2 檔案上傳系統已成功部署。
請使用以下網址訪問您的系統：${colors.reset}
    
${colors.bright}${colors.cyan}Worker API: ${workerUrl}
前端頁面: ${frontendUrl}${colors.reset}

感謝使用本部署指南！
`);
  } catch (error) {
    console.error(`${colors.red}錯誤：${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

// 檢查 wrangler 是否已安裝
async function checkWrangler() {
  console.log(`\n${colors.yellow}[步驟 1] 檢查 wrangler 是否已安裝...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec('wrangler --version', (error, stdout, stderr) => {
      if (error) {
        console.log(`${colors.red}未檢測到 wrangler。正在嘗試安裝...${colors.reset}`);
        
        console.log(`\n${colors.yellow}執行: npm install -g wrangler${colors.reset}`);
        exec('npm install -g wrangler', (err, out, stdErr) => {
          if (err) {
            reject(new Error(`無法安裝 wrangler: ${err.message}`));
            return;
          }
          console.log(`${colors.green}wrangler 安裝成功！${colors.reset}`);
          resolve();
        });
      } else {
        console.log(`${colors.green}檢測到 wrangler 版本: ${stdout.trim()}${colors.reset}`);
        resolve();
      }
    });
  });
}

// 檢查是否已登入 Cloudflare
async function checkCloudflareLogin() {
  console.log(`\n${colors.yellow}[步驟 2] 檢查 Cloudflare 登入狀態...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec('wrangler whoami', (error, stdout, stderr) => {
      if (error || stderr.includes('You need to login to Cloudflare first')) {
        console.log(`${colors.red}您尚未登入 Cloudflare。請登入：${colors.reset}`);
        
        const loginCommand = 'wrangler login';
        console.log(`\n${colors.yellow}執行: ${loginCommand}${colors.reset}`);
        console.log('即將開啟瀏覽器進行 Cloudflare 登入，請按照提示操作...\n');
        
        exec(loginCommand, (err, out, stdErr) => {
          if (err) {
            reject(new Error(`無法登入 Cloudflare: ${err.message}`));
            return;
          }
          
          // 獲取 Account ID
          exec('wrangler whoami', (err2, out2) => {
            if (err2) {
              reject(new Error(`無法獲取帳戶資訊: ${err2.message}`));
              return;
            }
            
            const match = out2.match(/Account ID: ([a-f0-9]+)/);
            if (match && match[1]) {
              accountId = match[1];
              console.log(`${colors.green}成功獲取 Account ID: ${accountId}${colors.reset}`);
            }
            
            console.log(`${colors.green}登入成功！${colors.reset}`);
            resolve();
          });
        });
      } else {
        console.log(`${colors.green}您已登入 Cloudflare。${colors.reset}`);
        
        // 獲取 Account ID
        const match = stdout.match(/Account ID: ([a-f0-9]+)/);
        if (match && match[1]) {
          accountId = match[1];
          console.log(`${colors.green}帳戶 ID: ${accountId}${colors.reset}`);
        }
        
        resolve();
      }
    });
  });
}

// 更新 wrangler.toml 配置
async function updateWranglerConfig() {
  console.log(`\n${colors.yellow}[步驟 3] 更新 wrangler.toml 配置...${colors.reset}`);
  
  // 讀取當前配置
  try {
    const config = fs.readFileSync('wrangler.toml', 'utf8');
    console.log(`${colors.dim}當前配置：\n${config}${colors.reset}`);
    
    // 解析 bucket_name
    const bucketMatch = config.match(/bucket_name = "([^"]+)"/);
    if (bucketMatch && bucketMatch[1]) {
      bucketName = bucketMatch[1];
    }
    
    // 解析 binding 名稱
    const bindingMatch = config.match(/binding = "([^"]+)"/);
    if (bindingMatch && bindingMatch[1]) {
      bindingName = bindingMatch[1];
    }
  } catch (error) {
    console.error(`${colors.red}無法讀取 wrangler.toml: ${error.message}${colors.reset}`);
  }
  
  return new Promise((resolve) => {
    // 詢問 worker 名稱
    rl.question(`${colors.yellow}請輸入 Worker 名稱 (預設: "myWorker"): ${colors.reset}`, (workerName) => {
      workerName = workerName.trim() || 'myWorker';
      
      // 詢問 bucket 名稱
      rl.question(`${colors.yellow}請輸入 R2 儲存桶名稱 (預設: "${bucketName || 'mybucketname'}"): ${colors.reset}`, (newBucketName) => {
        bucketName = newBucketName.trim() || bucketName || 'mybucketname';
        
        // 詢問 binding 名稱
        rl.question(`${colors.yellow}請輸入 R2 binding 名稱 (預設: "${bindingName}"): ${colors.reset}`, (newBindingName) => {
          bindingName = newBindingName.trim() || bindingName;
          
          // 詢問 Cloudflare 帳戶名稱
          rl.question(`${colors.yellow}請輸入您的 Cloudflare 帳戶名稱 (用於 Worker URL): ${colors.reset}`, (accountName) => {
            accountName = accountName.trim();
            
            // 詢問允許的網域
            rl.question(`${colors.yellow}請輸入允許的來源網域，多個域名用逗號分隔 (預設: "*"): ${colors.reset}`, (origins) => {
              origins = origins.trim() || '*';
              
              // 修改 wrangler.toml
              const newConfig = `name = "${workerName}"
main = "src/index.js"
compatibility_date = "2025-04-07"

# R2 儲存空間設定
[[r2_buckets]]
binding = "${bindingName}"
bucket_name = "${bucketName}"

# 環境變數設定
[vars]
ALLOWED_ORIGINS = "${origins}"
`;
              
              try {
                fs.writeFileSync('wrangler.toml', newConfig);
                console.log(`${colors.green}已更新 wrangler.toml 配置。${colors.reset}`);
                
                // 設置 worker URL
                workerUrl = `https://${workerName}.${accountName || (accountId ? accountId.substring(0, 8) : 'workers')}.workers.dev`;
                
                resolve();
              } catch (error) {
                console.error(`${colors.red}無法寫入 wrangler.toml: ${error.message}${colors.reset}`);
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

// 確認 R2 存儲桶是否存在
async function confirmR2Bucket() {
  console.log(`\n${colors.yellow}[步驟 4] 確認 R2 儲存桶 "${bucketName}" 是否存在...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec(`wrangler r2 bucket list`, (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}無法列出 R2 儲存桶: ${error.message}${colors.reset}`);
        
        // 詢問是否要創建儲存桶
        rl.question(`${colors.yellow}是否要創建 R2 儲存桶 "${bucketName}"? (y/n): ${colors.reset}`, (answer) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log(`${colors.yellow}正在創建 R2 儲存桶 "${bucketName}"...${colors.reset}`);
            
            exec(`wrangler r2 bucket create ${bucketName}`, (err, out, stdErr) => {
              if (err) {
                reject(new Error(`無法創建 R2 儲存桶: ${err.message}`));
                return;
              }
              console.log(`${colors.green}已成功創建 R2 儲存桶 "${bucketName}"。${colors.reset}`);
              resolve();
            });
          } else {
            console.log(`${colors.yellow}請手動創建 R2 儲存桶 "${bucketName}"，然後再繼續。${colors.reset}`);
            resolve();
          }
        });
      } else {
        // 檢查輸出中是否包含儲存桶名稱
        if (stdout.includes(bucketName)) {
          console.log(`${colors.green}已確認 R2 儲存桶 "${bucketName}" 存在。${colors.reset}`);
          resolve();
        } else {
          console.log(`${colors.red}未找到 R2 儲存桶 "${bucketName}"。${colors.reset}`);
          
          // 詢問是否要創建儲存桶
          rl.question(`${colors.yellow}是否要創建 R2 儲存桶 "${bucketName}"? (y/n): ${colors.reset}`, (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
              console.log(`${colors.yellow}正在創建 R2 儲存桶 "${bucketName}"...${colors.reset}`);
              
              exec(`wrangler r2 bucket create ${bucketName}`, (err, out, stdErr) => {
                if (err) {
                  reject(new Error(`無法創建 R2 儲存桶: ${err.message}`));
                  return;
                }
                console.log(`${colors.green}已成功創建 R2 儲存桶 "${bucketName}"。${colors.reset}`);
                resolve();
              });
            } else {
              console.log(`${colors.yellow}請手動創建 R2 儲存桶 "${bucketName}"，然後再繼續。${colors.reset}`);
              resolve();
            }
          });
        }
      }
    });
  });
}

// 更新 API URL
async function updateApiUrl() {
  console.log(`\n${colors.yellow}[步驟 5] 更新前端 API URL...${colors.reset}`);
  
  console.log(`${colors.cyan}檢測到 Worker URL: ${workerUrl}${colors.reset}`);
  
  return new Promise((resolve) => {
    try {
      // 讀取 app.js
      const appJsPath = path.join('frontend', 'app.js');
      let appJs = fs.readFileSync(appJsPath, 'utf8');
      
      // 更新 API URL
      appJs = appJs.replace(
        /const API_URL = ['"].*?['"];/,
        `const API_URL = '${workerUrl}';`
      );
      
      // 寫回檔案
      fs.writeFileSync(appJsPath, appJs);
      console.log(`${colors.green}已更新 API URL 到 ${appJsPath}${colors.reset}`);
      resolve();
    } catch (error) {
      console.error(`${colors.red}無法更新 API URL: ${error.message}${colors.reset}`);
      resolve();
    }
  });
}

// 部署 Worker
async function deployWorker() {
  console.log(`\n${colors.yellow}[步驟 6] 部署 Worker 到 Cloudflare...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    console.log(`${colors.cyan}執行: wrangler deploy${colors.reset}`);
    
    exec('wrangler deploy', (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`部署失敗: ${error.message}`));
        return;
      }
      
      console.log(stdout);
      
      if (stdout.includes('Success!') || stdout.includes('Published')) {
        console.log(`${colors.green}Worker 部署成功！${colors.reset}`);
        
        // 嘗試從輸出中獲取 Worker URL
        const urlMatch = stdout.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+\.workers\.dev/);
        if (urlMatch) {
          workerUrl = urlMatch[0];
          console.log(`${colors.green}Worker URL: ${workerUrl}${colors.reset}`);
        }
        
        resolve();
      } else {
        console.log(`${colors.yellow}Worker 似乎已部署，但無法確認成功訊息。${colors.reset}`);
        resolve();
      }
    });
  });
}

// 部署前端
async function deployFrontend() {
  console.log(`\n${colors.yellow}[步驟 7] 前端部署選項...${colors.reset}`);
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}請選擇前端部署方式:
1. 使用 Cloudflare Pages 部署 (自動)
2. 使用其他靜態網站託管服務 (手動)
3. 本地使用
請選擇 (1-3): ${colors.reset}`, (choice) => {
      switch (choice.trim()) {
        case '1':
          deployToCloudflarePages().then(resolve);
          break;
        case '2':
          provideManualDeploymentGuide().then(resolve);
          break;
        case '3':
        default:
          provideLocalUsageGuide().then(resolve);
          break;
      }
    });
  });
}

// 部署到 Cloudflare Pages
async function deployToCloudflarePages() {
  console.log(`\n${colors.cyan}正在準備部署到 Cloudflare Pages...${colors.reset}`);
  
  // 更新所有前端檔案中的 API_URL
  console.log(`${colors.cyan}更新前端檔案中的 API URL...${colors.reset}`);
  
  try {
    // 確保 app.js 中的 API_URL 設定正確
    const appJsPath = path.join('frontend', 'app.js');
    let appJs = fs.readFileSync(appJsPath, 'utf8');
    
    // 用正則表達式替換任何現有的 API_URL 設定
    appJs = appJs.replace(
      /const API_URL = ['"].*?['"];/,
      `const API_URL = '${workerUrl}';`
    );
    
    // 寫回檔案
    fs.writeFileSync(appJsPath, appJs);
    console.log(`${colors.green}已更新 app.js 中的 API URL 為: ${workerUrl}${colors.reset}`);
    
    // 創建 index.html 的副本（如果不存在）
    const indexHtmlPath = path.join('frontend', 'index.html');
    const r2UploadHtmlPath = path.join('frontend', 'R2_upload.html');
    
    // 如果 R2_upload.html 存在但 index.html 不存在，則複製一份
    if (fs.existsSync(r2UploadHtmlPath) && !fs.existsSync(indexHtmlPath)) {
      fs.copyFileSync(r2UploadHtmlPath, indexHtmlPath);
      console.log(`${colors.green}已創建 index.html 檔案以提高兼容性${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}更新前端檔案錯誤: ${error.message}${colors.reset}`);
  }
  
  return new Promise((resolve, reject) => {
    // 檢查是否已安裝 wrangler pages
    exec('wrangler pages project list', (error, stdout, stderr) => {
      // 建立 Pages 專案
      const projectName = `r2-upload-ui-${Math.floor(Math.random() * 10000)}`;
      console.log(`${colors.cyan}正在創建 Pages 專案: ${projectName}...${colors.reset}`);
      
      exec(`wrangler pages project create ${projectName} --production-branch main`, (err, out, stdErr) => {
        if (err) {
          console.error(`${colors.red}無法創建 Pages 專案: ${err.message}${colors.reset}`);
          console.log(`${colors.yellow}將改為提供本地使用指南。${colors.reset}`);
          provideLocalUsageGuide().then(resolve);
          return;
        }
        
        console.log(`${colors.green}Pages 專案創建成功。${colors.reset}`);
        console.log(`${colors.cyan}正在部署前端檔案...${colors.reset}`);
        
        // 部署檔案
        exec(`wrangler pages deploy frontend --project-name=${projectName}`, (err2, out2, stdErr2) => {
          if (err2) {
            console.error(`${colors.red}無法部署前端檔案: ${err2.message}${colors.reset}`);
            console.log(`${colors.yellow}將改為提供本地使用指南。${colors.reset}`);
            provideLocalUsageGuide().then(resolve);
            return;
          }
          
          // 從輸出中獲取 URL
          const urlMatch = out2.match(/https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
          if (urlMatch) {
            frontendUrl = urlMatch[0];
            console.log(`${colors.green}前端已成功部署到: ${frontendUrl}${colors.reset}`);
          } else {
            console.log(`${colors.yellow}前端已部署，但無法從輸出中找到 URL。${colors.reset}`);
            console.log(`${colors.yellow}請檢查您的 Cloudflare Pages 儀表板。${colors.reset}`);
          }
          
          resolve();
        });
      });
    });
  });
}

// 提供手動部署指南
async function provideManualDeploymentGuide() {
  console.log(`\n${colors.cyan}手動部署指南${colors.reset}`);
  
  // 更新前端檔案中的 API_URL
  try {
    // 確保 app.js 中的 API_URL 設定正確
    const appJsPath = path.join('frontend', 'app.js');
    let appJs = fs.readFileSync(appJsPath, 'utf8');
    
    // 用正則表達式替換任何現有的 API_URL 設定
    appJs = appJs.replace(
      /const API_URL = ['"].*?['"];/,
      `const API_URL = '${workerUrl}';`
    );
    
    // 寫回檔案
    fs.writeFileSync(appJsPath, appJs);
    console.log(`${colors.green}已更新 app.js 中的 API URL 為: ${workerUrl}${colors.reset}`);
    
    // 創建 index.html 的副本（如果不存在）
    const indexHtmlPath = path.join('frontend', 'index.html');
    const r2UploadHtmlPath = path.join('frontend', 'R2_upload.html');
    
    // 如果 R2_upload.html 存在但 index.html 不存在，則複製一份
    if (fs.existsSync(r2UploadHtmlPath) && !fs.existsSync(indexHtmlPath)) {
      fs.copyFileSync(r2UploadHtmlPath, indexHtmlPath);
      console.log(`${colors.green}已創建 index.html 檔案以提高兼容性${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}更新前端檔案錯誤: ${error.message}${colors.reset}`);
  }
  
  console.log(`
${colors.yellow}您可以將 frontend 資料夾中的檔案部署到任何靜態網站託管服務：

1. 上傳這些檔案到您選擇的託管服務：
   - ${colors.bright}frontend/index.html${colors.reset}
   - ${colors.bright}frontend/app.js${colors.reset}

2. 您的 app.js 中的 API_URL 已設置為：
   ${colors.bright}${workerUrl}${colors.reset}

3. 完成後，您的前端應該可以透過託管服務提供的 URL 存取。
${colors.reset}`);

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}請輸入您的前端部署網址 (包含 https:// 或 http://): ${colors.reset}`, (customUrl) => {
      if (customUrl && customUrl.trim()) {
        frontendUrl = customUrl.trim();
        console.log(`${colors.green}已設定前端網址為: ${frontendUrl}${colors.reset}`);
      } else {
        frontendUrl = "(您選擇的託管服務 URL)";
      }
      resolve();
    });
  });
}

// 提供本地使用指南
async function provideLocalUsageGuide() {
  console.log(`\n${colors.cyan}本地使用指南${colors.reset}`);
  console.log(`
${colors.yellow}您可以直接在本地使用此上傳系統：

1. 透過瀏覽器直接開啟 ${colors.bright}frontend/index.html${colors.reset}${colors.yellow} 檔案

2. 確保 ${colors.bright}frontend/app.js${colors.reset}${colors.yellow} 中的 API_URL 已正確設置為：
   ${colors.bright}${workerUrl}${colors.reset}

3. 由於跨域限制，您可能需要使用本地開發伺服器來提供這些檔案。
   例如，您可以用以下命令：

   ${colors.bright}npx http-server frontend -o${colors.reset}
   
   或者用 Python:
   
   ${colors.bright}cd frontend && python -m http.server 8000${colors.reset}
${colors.reset}`);

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}是否使用自訂網域? (y/n): ${colors.reset}`, (useCustomDomain) => {
      if (useCustomDomain.toLowerCase() === 'y' || useCustomDomain.toLowerCase() === 'yes') {
        rl.question(`${colors.yellow}請輸入您的自訂網域 (包含 https:// 或 http://): ${colors.reset}`, (customUrl) => {
          if (customUrl && customUrl.trim()) {
            frontendUrl = customUrl.trim();
            console.log(`${colors.green}已設定前端網址為: ${frontendUrl}${colors.reset}`);
          } else {
            frontendUrl = "http://localhost:8000";
          }
          resolve();
        });
      } else {
        frontendUrl = "http://localhost:8000";
        resolve();
      }
    });
  });
}

// 執行主函數
main();
