#!/usr/bin/env node

/**
 * Cloudflare Worker R2 Upload System Deployment Guide
 * Use this script to help you complete the deployment steps
 */

const readline = require('readline');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define color codes
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

// Global variables
let accountId = '';
let workerUrl = '';
let frontendUrl = 'http://localhost:8000';
let workerName = ''; // New: customizable worker name
let bucketName = ''; // New: customizable bucket name
let bindingName = ''; // New: customizable binding name

// Welcome message
console.log(`
${colors.bright}${colors.cyan}=================================================
 Cloudflare Worker R2 File Upload System Deployment Guide
=================================================

${colors.reset}${colors.yellow}This script will help you complete the following steps:

1. Check necessary configurations and environment
2. Update Worker application settings
3. Deploy Worker to Cloudflare
4. Deploy the frontend to Pages or provide instructions for local usage
${colors.reset}
`);

// Main function
async function main() {
  try {
    // 1. Check if wrangler is installed
    await checkWrangler();
    
    // 2. Check if logged into Cloudflare
    await checkCloudflareLogin();
    
    // 3. Update wrangler.toml config
    await updateWranglerConfig();
    
    // 4. Confirm if R2 bucket exists
    await confirmR2Bucket();
    
    // 5. Update API URL
    await updateApiUrl();
    
    // 6. Deploy Worker
    await deployWorker();
    
    // 7. Provide frontend deployment options
    await deployFrontend();
    
    // Completed
    console.log(`
${colors.bright}${colors.green}==========================================
        Deployment Complete!
==========================================${colors.reset}

${colors.yellow}Your R2 file upload system has been successfully deployed.
Please use the following URLs to access your system:${colors.reset}
    
${colors.bright}${colors.cyan}Worker API: ${workerUrl}
Frontend: ${frontendUrl}${colors.reset}

Thank you for using this deployment guide!
`);
  } catch (error) {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

// Check if wrangler is installed
async function checkWrangler() {
  console.log(`\n${colors.yellow}[Step 1] Checking if wrangler is installed...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec('wrangler --version', (error, stdout, stderr) => {
      if (error) {
        console.log(`${colors.red}Wrangler not detected. Attempting to install...${colors.reset}`);
        
        console.log(`\n${colors.yellow}Running: npm install -g wrangler${colors.reset}`);
        exec('npm install -g wrangler', (err, out, stdErr) => {
          if (err) {
            reject(new Error(`Cannot install wrangler: ${err.message}`));
            return;
          }
          console.log(`${colors.green}Wrangler installed successfully!${colors.reset}`);
          resolve();
        });
      } else {
        console.log(`${colors.green}Detected wrangler version: ${stdout.trim()}${colors.reset}`);
        resolve();
      }
    });
  });
}

// Check if logged into Cloudflare
async function checkCloudflareLogin() {
  console.log(`\n${colors.yellow}[Step 2] Checking Cloudflare login status...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec('wrangler whoami', (error, stdout, stderr) => {
      if (error || stderr.includes('You need to login to Cloudflare first')) {
        console.log(`${colors.red}You are not logged into Cloudflare. Please login:${colors.reset}`);
        
        const loginCommand = 'wrangler login';
        console.log(`\n${colors.yellow}Running: ${loginCommand}${colors.reset}`);
        console.log('A browser will open for Cloudflare login, please follow the prompts...\n');
        
        exec(loginCommand, (err, out, stdErr) => {
          if (err) {
            reject(new Error(`Cannot login to Cloudflare: ${err.message}`));
            return;
          }
          
          // 獲取 Account ID
          exec('wrangler whoami', (err2, out2) => {
            if (err2) {
              reject(new Error(`Cannot get account information: ${err2.message}`));
              return;
            }
            
            const match = out2.match(/Account ID: ([a-f0-9]+)/);
            if (match && match[1]) {
              accountId = match[1];
              console.log(`${colors.green}Successfully retrieved Account ID: ${accountId}${colors.reset}`);
            }
            
            console.log(`${colors.green}Login successful!${colors.reset}`);
            resolve();
          });
        });
      } else {
        console.log(`${colors.green}You are already logged into Cloudflare.${colors.reset}`);
        
        // 獲取 Account ID
        const match = stdout.match(/Account ID: ([a-f0-9]+)/);
        if (match && match[1]) {
          accountId = match[1];
          console.log(`${colors.green}Account ID: ${accountId}${colors.reset}`);
        }
        
        resolve();
      }
    });
  });
}

// Update wrangler.toml configuration
async function updateWranglerConfig() {
  console.log(`\n${colors.yellow}[Step 3] Updating wrangler.toml configuration...${colors.reset}`);
  
  // Read current configuration
  try {
    const config = fs.readFileSync('wrangler.toml', 'utf8');
    console.log(`${colors.dim}Current configuration:\n${config}${colors.reset}`);
    
    // Parse bucket_name
    const bucketMatch = config.match(/bucket_name = "([^"]+)"/);
    if (bucketMatch && bucketMatch[1]) {
      bucketName = bucketMatch[1];
    }
    
    // Parse binding name
    const bindingMatch = config.match(/binding = "([^"]+)"/);
    if (bindingMatch && bindingMatch[1]) {
      bindingName = bindingMatch[1];
    }
  } catch (error) {
    console.error(`${colors.red}Cannot read wrangler.toml: ${error.message}${colors.reset}`);
  }
  
  return new Promise((resolve) => {
    // Ask for worker name
    rl.question(`${colors.yellow}Please enter Worker name (default: "myWorker"): ${colors.reset}`, (newworkerName) => {
      workerName = newworkerName.trim() || 'myWorker';
      
      // Ask for binding name
      rl.question(`${colors.yellow}Please enter R2 binding name (default: "${bindingName}"): ${colors.reset}`, (newBindingName) => {
        bindingName = newBindingName.trim() || bindingName;

        // Ask for bucket name
        rl.question(`${colors.yellow}Please enter R2 bucket name (default: "${bucketName || 'mybucketname'}"): ${colors.reset}`, (newBucketName) => {
          bucketName = newBucketName.trim() || bucketName || 'mybucketname';
          
          // Ask for Cloudflare account name
          rl.question(`${colors.yellow}Please enter your Cloudflare account name (for Worker URL): ${colors.reset}`, (accountName) => {
            accountName = accountName.trim();
            
            // Ask for allowed domains
            rl.question(`${colors.yellow}Please enter allowed origin domains, multiple domains separated by commas (default: "*"): ${colors.reset}`, (origins) => {
              origins = origins.trim() || '*';
              
              // Modify wrangler.toml
              const newConfig = `name = "${workerName}"
main = "src/index.js"
compatibility_date = "2025-04-07"

# R2 storage settings
[[r2_buckets]]
binding = "${bindingName}"
bucket_name = "${bucketName}"

# Environment variables
[vars]
ALLOWED_ORIGINS = "${origins}"
`;
              
              try {
                fs.writeFileSync('wrangler.toml', newConfig);
                console.log(`${colors.green}Updated wrangler.toml configuration.${colors.reset}`);
                
                // Set worker URL
                workerUrl = `https://${workerName}.${accountName || (accountId ? accountId.substring(0, 8) : 'workers')}.workers.dev`;
                
                resolve();
              } catch (error) {
                console.error(`${colors.red}Cannot write to wrangler.toml: ${error.message}${colors.reset}`);
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

// Confirm if R2 bucket exists
async function confirmR2Bucket() {
  console.log(`\n${colors.yellow}[Step 4] Confirming if R2 bucket "${bucketName}" exists...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    exec(`wrangler r2 bucket list`, (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}Cannot list R2 buckets: ${error.message}${colors.reset}`);
        
        // Ask if we should create the bucket
        rl.question(`${colors.yellow}Do you want to create R2 bucket "${bucketName}"? (y/n): ${colors.reset}`, (answer) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log(`${colors.yellow}Creating R2 bucket "${bucketName}"...${colors.reset}`);
            
            exec(`wrangler r2 bucket create ${bucketName}`, (err, out, stdErr) => {
              if (err) {
                reject(new Error(`Cannot create R2 bucket: ${err.message}`));
                return;
              }
              console.log(`${colors.green}Successfully created R2 bucket "${bucketName}".${colors.reset}`);
              resolve();
            });
          } else {
            console.log(`${colors.yellow}Please manually create R2 bucket "${bucketName}", then continue.${colors.reset}`);
            resolve();
          }
        });
      } else {
        // Check if output contains bucket name
        if (stdout.includes(bucketName)) {
          console.log(`${colors.green}Confirmed R2 bucket "${bucketName}" exists.${colors.reset}`);
          resolve();
        } else {
          console.log(`${colors.red}R2 bucket "${bucketName}" not found.${colors.reset}`);
          
          // Ask if we should create the bucket
          rl.question(`${colors.yellow}Do you want to create R2 bucket "${bucketName}"? (y/n): ${colors.reset}`, (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
              console.log(`${colors.yellow}Creating R2 bucket "${bucketName}"...${colors.reset}`);
              
              exec(`wrangler r2 bucket create ${bucketName}`, (err, out, stdErr) => {
                if (err) {
                  reject(new Error(`Cannot create R2 bucket: ${err.message}`));
                  return;
                }
                console.log(`${colors.green}Successfully created R2 bucket "${bucketName}".${colors.reset}`);
                resolve();
              });
            } else {
              console.log(`${colors.yellow}Please manually create R2 bucket "${bucketName}", then continue.${colors.reset}`);
              resolve();
            }
          });
        }
      }
    });
  });
}

// Update API URL
async function updateApiUrl() {
  console.log(`\n${colors.yellow}[Step 5] Updating frontend API URL...${colors.reset}`);
  
  console.log(`${colors.cyan}Detected Worker URL: ${workerUrl}${colors.reset}`);
  
  return new Promise((resolve) => {
    try {
      // Read config.js
      const configJsPath = path.join('frontend', 'js', 'config.js');
      let configJs = fs.readFileSync(configJsPath, 'utf8');
      
      // Update API URL
      configJs = configJs.replace(
        /const API_URL = ['"].*?['"];/,
        `const API_URL = '${workerUrl}';`
      );
      
      // Write back to file
      fs.writeFileSync(configJsPath, configJs);
      console.log(`${colors.green}Updated API URL in ${configJsPath}${colors.reset}`);
      resolve();
    } catch (error) {
      console.error(`${colors.red}Cannot update API URL: ${error.message}${colors.reset}`);
      resolve();
    }
  });
}

// Deploy Worker
async function deployWorker() {
  console.log(`\n${colors.yellow}[Step 6] Deploying Worker to Cloudflare...${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    console.log(`${colors.cyan}Running: wrangler deploy${colors.reset}`);
    
    exec('wrangler deploy', (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Deployment failed: ${error.message}`));
        return;
      }
      
      console.log(stdout);
      
      if (stdout.includes('Success!') || stdout.includes('Published')) {
        console.log(`${colors.green}Worker deployed successfully!${colors.reset}`);
        
        // 嘗試從輸出中獲取 Worker URL
        const urlMatch = stdout.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9]+\.workers\.dev/);
        if (urlMatch) {
          workerUrl = urlMatch[0];
          console.log(`${colors.green}Worker URL: ${workerUrl}${colors.reset}`);
        }
        
        resolve();
      } else {
        console.log(`${colors.yellow}Worker appears to be deployed, but success message couldn't be confirmed.${colors.reset}`);
        resolve();
      }
    });
  });
}

// Deploy frontend
async function deployFrontend() {
  console.log(`\n${colors.yellow}[Step 7] Frontend deployment options...${colors.reset}`);
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Please choose frontend deployment method:
1. Use Cloudflare Pages (automatic)
2. Use other static hosting service (manual)
3. Local usage
Please select (1-3): ${colors.reset}`, (choice) => {
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

// Deploy to Cloudflare Pages
async function deployToCloudflarePages() {
  console.log(`\n${colors.cyan}Preparing to deploy to Cloudflare Pages...${colors.reset}`);
  
  // Update API_URL in all frontend files
  console.log(`${colors.cyan}Updating API URL in frontend files...${colors.reset}`);
  
  try {
    // Ensure API_URL is set correctly in config.js
    const configJsPath = path.join('frontend', 'js', 'config.js');
    let configJs = fs.readFileSync(configJsPath, 'utf8');
    
    // Use regex to replace any existing API_URL setting
    configJs = configJs.replace(
      /const API_URL = ['"].*?['"];/,
      `const API_URL = '${workerUrl}';`
    );
    
    // Write back to file
    fs.writeFileSync(configJsPath, configJs);
    console.log(`${colors.green}Updated API URL in config.js to: ${workerUrl}${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error updating frontend files: ${error.message}${colors.reset}`);
  }
  
  return new Promise((resolve, reject) => {
    // Check if wrangler pages is installed
    exec('wrangler pages project list', (error, stdout, stderr) => {
      // Create Pages project
      const projectName = `cf-${workerName}-ui-${Math.floor(Math.random() * 10000)}`;
      console.log(`${colors.cyan}Creating Pages project: ${projectName}...${colors.reset}`);
      
      exec(`wrangler pages project create ${projectName} --production-branch main`, (err, out, stdErr) => {
        if (err) {
          console.error(`${colors.red}Cannot create Pages project: ${err.message}${colors.reset}`);
          console.log(`${colors.yellow}Will provide local usage guide instead.${colors.reset}`);
          provideLocalUsageGuide().then(resolve);
          return;
        }
        
        console.log(`${colors.green}Pages project created successfully.${colors.reset}`);
        console.log(`${colors.cyan}Deploying frontend files...${colors.reset}`);
        
        // Deploy files
        exec(`wrangler pages deploy frontend --project-name=${projectName}`, (err2, out2, stdErr2) => {
          if (err2) {
            console.error(`${colors.red}Cannot deploy frontend files: ${err2.message}${colors.reset}`);
            console.log(`${colors.yellow}Will provide local usage guide instead.${colors.reset}`);
            provideLocalUsageGuide().then(resolve);
            return;
          }
          
          // Get URL from output
          const urlMatch = out2.match(/https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
          if (urlMatch) {
            frontendUrl = urlMatch[0];
            console.log(`${colors.green}Frontend successfully deployed to: ${frontendUrl}${colors.reset}`);
          } else {
            console.log(`${colors.yellow}Frontend has been deployed, but URL cannot be found in the output.${colors.reset}`);
            console.log(`${colors.yellow}Please check your Cloudflare Pages dashboard.${colors.reset}`);
          }
          
          resolve();
        });
      });
    });
  });
}

// Provide manual deployment guide
async function provideManualDeploymentGuide() {
  console.log(`\n${colors.cyan}Manual Deployment Guide${colors.reset}`);
  
  // Update API_URL in frontend files
  try {
    // Ensure API_URL is set correctly in config.js
    const configJsPath = path.join('frontend', 'js', 'config.js');
    let configJs = fs.readFileSync(configJsPath, 'utf8');
    
    // Use regex to replace any existing API_URL setting
    configJs = configJs.replace(
      /const API_URL = ['"].*?['"];/,
      `const API_URL = '${workerUrl}';`
    );
    
    // Write back to file
    fs.writeFileSync(configJsPath, configJs);
    console.log(`${colors.green}Updated API URL in config.js to: ${workerUrl}${colors.reset}`);
    
    // Create a copy of index.html (if it doesn't exist)
    const indexHtmlPath = path.join('frontend', 'index.html');
    const r2UploadHtmlPath = path.join('frontend', 'R2_upload.html');
    
    // If R2_upload.html exists but index.html doesn't, copy it
    if (fs.existsSync(r2UploadHtmlPath) && !fs.existsSync(indexHtmlPath)) {
      fs.copyFileSync(r2UploadHtmlPath, indexHtmlPath);
      console.log(`${colors.green}Created index.html file to improve compatibility${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error updating frontend files: ${error.message}${colors.reset}`);
  }
  
console.log(`
${colors.yellow}You can deploy files in the frontend folder to any static website hosting service:

1. Upload these files to your chosen hosting service:
   - ${colors.bright}frontend/index.html${colors.reset}
   - ${colors.bright}frontend/app.js${colors.reset}

2. The API_URL in your app.js has been set to:
   ${colors.bright}${workerUrl}${colors.reset}

3. Once completed, your frontend should be accessible via the URL provided by your hosting service.
${colors.reset}`);

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Please enter your frontend deployment URL (including https:// or http://): ${colors.reset}`, (customUrl) => {
      if (customUrl && customUrl.trim()) {
        frontendUrl = customUrl.trim();
        console.log(`${colors.green}Frontend URL set to: ${frontendUrl}${colors.reset}`);
      } else {
        frontendUrl = "(Your chosen hosting service URL)";
      }
      resolve();
    });
  });
}

// Provide local usage guide
async function provideLocalUsageGuide() {
  console.log(`\n${colors.cyan}Local Usage Guide${colors.reset}`);
console.log(`
${colors.yellow}You can use this upload system directly on your local machine:

1. Open ${colors.bright}frontend/index.html${colors.reset}${colors.yellow} directly in your browser

2. Make sure the API_URL in ${colors.bright}frontend/js/config.js${colors.reset}${colors.yellow} is correctly set to:
   ${colors.bright}${workerUrl}${colors.reset}

3. Due to CORS restrictions, you may need to use a local development server to serve these files.
   For example, you can use the following commands:

   ${colors.bright}npx http-server frontend -o${colors.reset}
   
   Or with Python:
   
   ${colors.bright}cd frontend && python -m http.server 8000${colors.reset}
${colors.reset}`);

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}Use custom domain? (y/n): ${colors.reset}`, (useCustomDomain) => {
      if (useCustomDomain.toLowerCase() === 'y' || useCustomDomain.toLowerCase() === 'yes') {
        rl.question(`${colors.yellow}Please enter your custom domain (including https:// or http://): ${colors.reset}`, (customUrl) => {
          if (customUrl && customUrl.trim()) {
            frontendUrl = customUrl.trim();
            console.log(`${colors.green}Frontend URL set to: ${frontendUrl}${colors.reset}`);
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

// Execute main function
main();
