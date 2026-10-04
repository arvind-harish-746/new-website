# Cybotz: Complete Oracle Cloud (OCI) Hosting & Deployment Guide

This document records the comprehensive architectural assessment, cloud provider evaluation, domain strategy, and end-to-end deployment instructions for migrating and hosting the **Cybotz STEM Platform** (`cybotz.tech`) onto **Oracle Cloud Infrastructure (OCI)**.

---

## 1. Executive Architectural Assessment

### 1.1 The Hostinger (hPanel) Static Hosting Trap
Your domain `cybotz.tech` is currently registered on Hostinger with static web hosting (hPanel). While the frontend build produces static assets (`dist/public`), hosting only the frontend on Hostinger while running backend services on a separate server creates critical failure points:
1. **Single Page Application (SPA) Routing Failure (404s)**:
   * Hostinger’s static web server looks for physical `.html` files corresponding to URL paths.
   * Direct navigation or refreshing any client-side route (`/workshops`, `/about`, `/labs`, `/blogs`) will throw a **404 Not Found** error unless an Apache `.htaccess` rewrite rule redirects all traffic to `index.html`.
2. **Relative `/api` Endpoint Breakage**:
   * The frontend relies on relative API calls (`fetch("/api/booked-dates")`, `fetch("/api/schedule-session")`, `fetch("/api/blogs")`, `fetch("/api/admin/*")`).
   * On Hostinger static hosting, these requests hit Hostinger instead of your Express server and return 404s. Fixing this requires rewriting all frontend code to use absolute URLs (`https://api.cybotz.tech`), setting up cross-origin CORS headers, and managing two separate SSL certificates across two different hosting providers.
3. **Unnecessary Operational Redundancy**:
   * Since you already need an Oracle Cloud VM to run MongoDB, Redis, the Express API, BullMQ worker, and the Baileys WhatsApp automation engine, running the static frontend on Hostinger introduces unnecessary complexity.

### 1.2 The Unified Target Architecture (All-in-One on Oracle VM)
The Express server is already programmed to serve the compiled static frontend (`dist/public`) alongside all API routes on the exact same origin (`https://cybotz.tech`). Hosting everything on a single Oracle Cloud VM behind an Nginx reverse proxy eliminates CORS, simplifies SSL management, and provides maximum performance.

```
                    ┌────────────────────────────────────────┐
                    │      DNS: Cloudflare or Hostinger      │
                    │   (A Record -> Oracle VM Public IP)    │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS (:443)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       Nginx Reverse Proxy & SSL        │
                    │         (Let's Encrypt Certbot)        │
                    └───────────────────┬────────────────────┘
                                        │ Proxy Pass (:5000)
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Oracle Cloud VM (Ubuntu 22.04/24.04)                         │
│                                                                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐  │
│  │      PM2: Web App     │  │   PM2: BullMQ Worker  │  │  PM2: Baileys Engine │  │
│  │   (Express + SPA)     │  │  (Async WhatsApp Job) │  │  (WhatsApp WebSocket)│  │
│  │      Port: 5000       │  │      Background       │  │      Port: 8080      │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └──────────┬───────────┘  │
│              │                          │                         │              │
│              ▼                          ▼                         │              │
│  ┌───────────────────────┐  ┌───────────────────────┐             │              │
│  │    Docker: MongoDB    │  │     Docker: Redis     │◄────────────┘              │
│  │      Port: 27017      │  │      Port: 6379       │                            │
│  └───────────────────────┘  └───────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cloud & VPS Provider Benchmark Comparison

The Cybotz stack requires ~1.2 GB to 1.5 GB RAM minimum (MongoDB container: ~400MB, Redis: ~50MB, Express + Worker: ~250MB, Baileys WhatsApp: ~150MB, Nginx + OS: ~200MB).

| Provider | Plan / Tier | Resources (RAM / CPU / Disk) | Verdict & Assessment for Cybotz |
| :--- | :--- | :--- | :--- |
| **Oracle Cloud (OCI)** | **Always Free Tier**<br>(VM.Standard.A1.Flex) | **24 GB RAM**, 4 ARM Ampere Cores, 200 GB NVMe SSD | **10/10 (Best Choice)**<br>Unmatched free resources globally. Handles full stack, containers, staging, and future scale effortlessly. |
| **Google Cloud (GCP)** | Always Free Tier<br>(e2-micro) | 1 GB RAM, 1 Shared vCPU, 30 GB HDD | **3/10 (Inadequate)**<br>1 GB RAM triggers Linux Out-Of-Memory (OOM) kernel panics when running MongoDB and Node together. |
| **Amazon Web Services (AWS)** | 12-Month Trial<br>(t2.micro / t3.micro) | 1 GB RAM, 1 vCPU, 30 GB EBS | **3/10 (Temporary & Weak)**<br>Expires after 12 months; 1 GB RAM cannot comfortably run MongoDB + Redis + WhatsApp. |
| **Microsoft Azure** | 12-Month Trial<br>(B1s) | 1 GB RAM, 1 vCPU, 64 GB SSD | **3/10 (Temporary & Weak)**<br>Same 1 GB RAM bottlenecks as AWS/GCP; billing starts after 1 year. |
| **Container PaaS**<br>(Render / Railway / Fly.io) | Free Plans | Shared Resources | **1/10 (Unusable)**<br>Free web services spin down / sleep after 15 minutes of inactivity, permanently breaking the Baileys WhatsApp WebSocket and BullMQ queue. |

---

## 3. Domain, DNS & Cloudflare Strategy

### 3.1 Hostinger Domain Status
* **Prepaid Period**: Your domain `cybotz.tech` is registered on Hostinger through **March 8th, 2027**.
* **Registrar Policy**: You do **not** need to transfer the legal domain registration right now. Keep it registered on Hostinger at $0 additional cost.
* **Email Safety**: If you use Hostinger business email (e.g. `info@cybotz.tech`), your `MX`, `SPF`, and `DKIM` records remain untouched in your DNS zone so email delivery is 100% uninterrupted.

### 3.2 Cloudflare Integration (Recommended Best Practice)
You can point your domain through Cloudflare while keeping Hostinger as the registrar:
1. Create a free account on [Cloudflare](https://dash.cloudflare.com/) and add `cybotz.tech`.
2. In Hostinger hPanel -> **Domain Management** -> **Nameservers**, change default nameservers to Cloudflare's assigned nameservers (e.g. `ns1.cloudflare.com`).
3. Point the **A record** (`@` and `www`) in Cloudflare to your **Oracle Cloud VM Public IP**.

**Benefits of Cloudflare:**
* **Global Edge CDN**: Static React assets cache worldwide for millisecond load times.
* **Universal SSL/TLS**: Cloudflare automatically manages HTTPS certificates with automatic renewal.
* **DDoS & IP Masking**: Protects your Oracle VM from direct attacks and bots.
* **Instant DNS Updates**: Any future IP or record changes take effect in under 2 seconds.

---

## 4. Step-by-Step Oracle VM Deployment Guide

### Phase 1: Provisioning Oracle Cloud Infrastructure (OCI)
1. **Create Compute Instance**:
   * Log into Oracle Cloud Console -> **Compute** -> **Instances** -> **Create Instance**.
   * **OS Image**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS.
   * **Shape**: Select *Ampere (ARM)* -> `VM.Standard.A1.Flex` (Allocate 2 to 4 OCPUs, 12 to 24 GB RAM).
   * **SSH Key**: Generate and download your private `.key` file.
   * **Networking**: Select *Assign a public IPv4 address*.
2. **Assign Reserved Static Public IP**:
   * Navigate to *Networking* -> *Virtual Cloud Networks* -> *Public IPs* -> *Reserve Public IP*.
   * Attach the reserved IP to your newly created Compute instance so the IP never changes on reboot.
3. **Configure OCI Security Lists (Virtual Firewall)**:
   * Go to *Virtual Cloud Networks* -> Select your VCN -> *Security Lists* -> *Default Security List*.
   * Add **Ingress Rules**:
     * `0.0.0.0/0` | Protocol: TCP | Destination Port: `22` (SSH)
     * `0.0.0.0/0` | Protocol: TCP | Destination Port: `80` (HTTP)
     * `0.0.0.0/0` | Protocol: TCP | Destination Port: `443` (HTTPS)

---

### Phase 2: Server Initialization & Dependencies
Connect to your instance via SSH:
```bash
ssh -i /path/to/your-private-key.key ubuntu@<ORACLE_PUBLIC_IP>
```

1. **Update OS & Configure Host Firewall (iptables / UFW)**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw --force enable
   ```

2. **Install Node.js 20, PNPM, Docker, PM2, Nginx & Certbot**:
   ```bash
   # Install Node.js 20 LTS
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git nginx certbot python3-certbot-nginx docker.io docker-compose

   # Enable Docker and add user permissions
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER

   # Install global CLI utilities
   sudo npm install -g pnpm pm2
   ```

---

### Phase 3: Project Deployment & Container Setup
1. **Clone Application Repository**:
   ```bash
   sudo mkdir -p /var/www/cybotz
   sudo chown -R $USER:$USER /var/www/cybotz
   cd /var/www/cybotz
   git clone <YOUR_GIT_REPOSITORY_URL> .
   pnpm install
   ```

2. **Configure Production Environment Variables**:
   Create `/var/www/cybotz/.env`:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb://admin:secretpassword@127.0.0.1:27017/cybotz?authSource=admin
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   JWT_SECRET=production_super_secure_jwt_key_2026
   WHATSAPP_TARGET_NUMBER=120363401663297042@g.us
   OPENWA_SERVER_URL=http://localhost:8080/sendText
   WHATSAPP_API_KEY=cybotz_wa_key_2026
   ```

3. **Start Database & Message Queue Containers**:
   ```bash
   docker-compose up -d
   ```

4. **Build Production Bundles & Seed Initial Users**:
   ```bash
   pnpm run build
   npx tsx server/seedUsers.ts
   ```

---

### Phase 4: Process Management (PM2) & WhatsApp QR Authentication
1. **Create PM2 Process File (`ecosystem.config.cjs`)**:
   In `/var/www/cybotz/ecosystem.config.cjs`:
   ```javascript
   module.exports = {
     apps: [
       {
         name: "cybotz-web",
         script: "dist/index.js",
         instances: 1,
         autorestart: true,
         watch: false,
         env: { NODE_ENV: "production" }
       },
       {
         name: "cybotz-worker",
         script: "npx tsx server/worker.ts",
         autorestart: true,
         watch: false,
         env: { NODE_ENV: "production" }
       },
       {
         name: "cybotz-wa-runner",
         script: "npx tsx server/run-whatsapp.ts",
         autorestart: true,
         watch: false,
         env: { NODE_ENV: "production" }
       }
     ]
   };
   ```

2. **Authenticate WhatsApp Engine**:
   ```bash
   # Run the WhatsApp runner in the foreground to display terminal QR code
   npx tsx server/run-whatsapp.ts
   # 1. Open WhatsApp on smartphone -> Linked Devices -> Link a Device.
   # 2. Scan the terminal ASCII QR code.
   # 3. Once "WHATSAPP CONNECTED" logs, press CTRL+C.
   ```

3. **Start All Services Under PM2 Supervision**:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
   ```

---

### Phase 5: Nginx Reverse Proxy & SSL Configuration
1. **Create Nginx Configuration**:
   Create `/etc/nginx/sites-available/cybotz.tech`:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name cybotz.tech www.cybotz.tech;

       client_max_body_size 25M;
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

       location / {
           proxy_pass http://127.0.0.1:5000;
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

2. **Enable Site & Obtain SSL**:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/cybotz.tech /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx

   # Obtain free Let's Encrypt SSL certificate
   sudo certbot --nginx -d cybotz.tech -d www.cybotz.tech --non-interactive --agree-tos -m admin@cybotz.tech
   ```

---

## 5. Post-Migration Verification Checklist

- [ ] **Home Page (`https://cybotz.tech/`)**: Loads hero, 3D/canvas effects, and trial booking calendar.
- [ ] **SPA Direct Navigation**: Direct browser access to `https://cybotz.tech/workshops`, `/about`, `/labs`, and `/blogs` returns HTTP 200 (no 404s).
- [ ] **Dynamic API / Database**:
  - Submitting a trial session booking stores record in MongoDB.
  - WhatsApp alert successfully posts to the target group chat.
- [ ] **Admin Authentication**: Owner login at `/api/admin/login` issues valid 12-hour JWT token and opens management modal.
- [ ] **SSL & HTTPS Redirection**: Testing `http://cybotz.tech` automatically redirects to `https://cybotz.tech` with an A+ SSL rating.
