# 🚀 FlashChat VPS & Frontend Deployment Guide

This guide details the step-by-step instructions for deploying the FlashChat backend to a **Hostinger VPS** (running Ubuntu 20.04/22.04 LTS) and the frontend to **Vercel**.

---

## 1. Frontend Deployment (Vercel)

Vercel is configured to build the React/TypeScript client application.

### Steps:
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New > Project**.
2. Import your GitHub repository (`TejasRawool186/flashchat`).
3. In the project setup configuration:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (Click edit and select the `client` folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_SERVER_URL`: `https://your-vps-domain.com` (Replace with your actual backend domain or VPS IP with port, e.g., `http://123.456.78.90:3001` if no domain/SSL yet. HTTPS is highly recommended for Web Crypto API to function correctly.)
5. Click **Deploy**.

> [!IMPORTANT]
> The Web Crypto API (used for E2E encryption) requires a **secure context (HTTPS)** to run in browsers (except for `localhost`). Therefore, you MUST set up SSL/HTTPS on your backend server for E2E key exchange and message transfer to work correctly.

---

## 2. Backend Deployment (Hostinger VPS)

Follow these steps to configure your Ubuntu VPS for hosting the Express/Socket.IO backend.

### Step 2.1: Update Server & Install Node.js
Log in to your VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```
Update package listings and install Node.js (v18 or newer recommended):
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verify installation:
```bash
node -v
npm -v
```

### Step 2.2: Clone Project & Install Dependencies
Clone the repository to a folder (e.g., `/var/www/flashchat`):
```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/TejasRawool186/flashchat.git
cd flashchat
```
Install the backend dependencies:
```bash
npm install
```

### Step 2.3: Configure Environment Variables
Create a production `.env` file in the root of the project:
```bash
nano .env
```
Populate it with the following configuration:
```env
PORT=3001
CORS_ORIGIN=https://your-flashchat-frontend.vercel.app
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: OPENAI_API_KEY=your_openai_api_key_here
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit Nano.)*

### Step 2.4: Configure PM2 (Process Manager)
PM2 ensures the server runs continuously in the background and restarts automatically if it crashes or the server reboots.

Install PM2 globally:
```bash
sudo npm install -y -g pm2
```
Start the backend server using PM2:
```bash
pm2 start server.js --name flashchat-backend
```
Configure PM2 to run on startup:
```bash
pm2 startup systemd
```
*(Run the command printed in the output of the above command to complete startup configuration.)*

Save the current process list:
```bash
pm2 save
```

---

## 3. Reverse Proxy & SSL Setup (Nginx + Let's Encrypt)

Setting up Nginx allows you to run the backend on port 80/443, forward requests to port 3001, and enable secure WebSockets (`wss://`).

### Step 3.1: Install Nginx
```bash
sudo apt install nginx -y
```

### Step 3.2: Configure Nginx for WebSockets
Create a new Nginx block configuration:
```bash
sudo nano /etc/nginx/sites-available/flashchat
```
Add the following configuration (replace `your-vps-domain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name your-vps-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Link and enable the config:
```bash
sudo ln -s /etc/nginx/sites-available/flashchat /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```
Verify and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3.3: Install SSL with Certbot (Let's Encrypt)
Secure the connection using Let's Encrypt SSL:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-vps-domain.com
```
Follow the interactive prompts to generate the certificate and select option `2` to redirect all HTTP traffic to HTTPS.

Certbot will automatically modify your Nginx files to handle SSL and auto-renewal.

---

## 4. Verification Check

Once both Vercel and VPS are running:
1. Open the Vercel URL.
2. Open the Chrome DevTools network tab to ensure WebSocket requests (`/socket.io/`) successfully upgrade to `wss://your-vps-domain.com/socket.io/`.
3. Test sending messages and uploading files to ensure end-to-end encryption handshake works properly across the network.
