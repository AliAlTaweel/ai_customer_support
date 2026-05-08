# Backend Nginx & SSL Configuration Guide

This guide documents the step-by-step implementation of securing the backend of the **AI Customer Support** system. By moving from a raw IP address over unencrypted HTTP (`http://13.63.20.159:3001`) to Nginx with a free SSL/TLS certificate over HTTPS (`https://ali-support.duckdns.org`), we have resolved the high-severity vulnerabilities highlighted in the Security Audit Report.

---

## 🛠️ Phase 1: Nginx & Reverse Proxy Setup (on EC2)

Nginx was installed on the EC2 instance to act as a secure, high-performance reverse proxy. It listens on standard web ports (`80` and `443`) and safely routes internal traffic to the backend application running on port `3001`.

### 1. Installation
The following system commands were executed on the Ubuntu EC2 instance:
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Reverse Proxy Configuration
The default Nginx site configuration file (`/etc/nginx/sites-available/default`) was updated to route traffic from port `80` to port `3001` (localhost):

```nginx
server {
    listen 80;
    server_name ali-support.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After modifying the file, Nginx configurations were tested and restarted:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Phase 2: Free DNS & SSL Setup (via DuckDNS + Certbot)

To get an SSL certificate, a valid domain name is required. Since we are using AWS default infrastructure, we bypassed the rate limits using **DuckDNS** (a free DNS provider on the Public Suffix List).

### 1. Pointing the Domain
* A free subdomain was registered at [duckdns.org](https://www.duckdns.org): `ali-support.duckdns.org`
* The DNS **A Record** was pointed directly to the EC2 Public IP: `13.63.20.159`

### 2. Generating the SSL Certificate
Certbot was installed and run with the Nginx plugin to generate a free Let's Encrypt SSL/TLS certificate and automatically configure Nginx to enforce HTTPS:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Request and apply the SSL certificate
sudo certbot --nginx -d ali-support.duckdns.org
```

**Result:** The backend is now fully encrypted and accessible at **`https://ali-support.duckdns.org/api/v1`** with a secure padlock icon 🔒.

---

## 💻 Phase 3: Frontend Security Fixes Applied

To align with the backend upgrades and mitigate the security vulnerabilities discovered during the audit, the following frontend changes were made:

### 1. Local Environment Variables
Updated [frontend/.env](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/frontend/.env) to point to the secure backend URL without exposing port `3001`:
```env
NEXT_PUBLIC_API_URL=https://ali-support.duckdns.org/api/v1
```

### 2. Next.js Rewrite Fallbacks
Updated [frontend/next.config.ts](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/frontend/next.config.ts) to eliminate the raw IP disclosure fallback:
```typescript
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const destination = apiUrl && apiUrl.startsWith("http") 
      ? `${apiUrl}/:path*` 
      : "https://ali-support.duckdns.org/api/v1/:path*";
    return [
      {
        source: "/api/v1/:path*",
        destination,
      },
    ];
  },
```

### 3. Middleware Information Disclosure Resolution
Cleaned up [frontend/src/proxy.ts](file:///Users/alial-taweel/projects/ai/ai_customer_support_v3/frontend/src/proxy.ts) to prevent the leakage of environment variable names and server stack traces:

* **Removed `envKeys`** from the `500` error response when `CLERK_SECRET_KEY` is missing.
* **Removed `stack: error.stack` and `message`** from general middleware execution errors, replacing them with standard server-side `console.error` logs and returning a secure, generic error message to the client.

---

## 🚀 Phase 4: Production Deployment

To complete the end-to-end secure integration, update the production settings in AWS Amplify:

1. Open the **AWS Amplify Console**.
2. Go to **App settings** -> **Environment variables**.
3. Edit `NEXT_PUBLIC_API_URL` to:
   ```text
   https://ali-support.duckdns.org/api/v1
   ```
4. Trigger a **Redeploy** on AWS Amplify.
