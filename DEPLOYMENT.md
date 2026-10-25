# EdgePilot Delta Testnet Trading Bot - Production Deployment Guide

This guide covers everything required to deploy EdgePilot on a live Linux Virtual Private Server (VPS), cloud instance (AWS, DigitalOcean, GCP, Hetzner), or local Docker environment with Model Context Protocol (MCP) support.

---

## 1. Quick Start: Deploy via Docker Compose

### Prerequisites
- Docker Engine (v24+)
- Docker Compose (v2.20+)
- Open inbound TCP port `8000` on your cloud firewall / security group

### Step 1: Clone Repository on Server
```bash
git clone https://github.com/ajayXcode/KIVO.git
cd KIVO
```

### Step 2: Configure Environment (Optional)
```bash
cp .env.example .env
# Edit .env with your Delta Exchange Testnet keys if you want them preloaded:
# nano .env
```
*(Note: You can also enter API keys dynamically directly from the Web Dashboard without modifying any files!)*

### Step 3: Build & Launch Container
```bash
docker compose up -d --build
```

### Step 4: Access Web Dashboard
Open your browser and navigate to:
```
http://<YOUR_SERVER_IP>:8000
```
The application serves the compiled React Graphite Violet frontend and binds to `0.0.0.0:8000` across all public and internal interfaces.

---

## 2. Nginx Reverse Proxy & Free SSL (HTTPS) Setup

To connect a custom domain (e.g. `trading.yourdomain.com`) with automated SSL certificates:

### 1. Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx Virtual Host
Create `/etc/nginx/sites-available/edgepilot`:
```nginx
server {
    server_name trading.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
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

### 3. Enable Site & Generate SSL Certificate
```bash
sudo ln -s /etc/nginx/sites-available/edgepilot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d trading.yourdomain.com
```

---

## 3. Direct Linux Systemd Service Deployment (Without Docker)

If you prefer running directly on Ubuntu/Debian using Python virtualenv:

### 1. System Dependencies
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git curl nodejs npm
```

### 2. Build Frontend
```bash
cd /opt/KIVO/dashboard
npm install
npm run build
```

### 3. Set Up Python Environment
```bash
cd /opt/KIVO
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 4. Create Systemd Service
Create `/etc/systemd/system/edgepilot.service`:
```ini
[Unit]
Description=EdgePilot Delta Testnet Trading Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/KIVO
ExecStart=/opt/KIVO/.venv/bin/python -m backend.main
Restart=always
RestartSec=5
Environment=HOST=0.0.0.0
Environment=PORT=8000
Environment=ENVIRONMENT=TESTNET

[Install]
WantedBy=multi-user.target
```

### 5. Start and Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable edgepilot
sudo systemctl start edgepilot
sudo systemctl status edgepilot
```

---

## 4. How the Auto-Pilot & Option Strategy Works

### Option Buying Engine Core Logic
1. **Asset Selection**: Supports **BTC**, **ETH**, and **XAUT** (Gold token on Delta Exchange).
2. **Technical Trend Detection**:
   - **Supertrend (Period: 10, Multiplier: 3.0)** calculates dynamic volatility bands.
   - **EMA (Period: 20)** filters pullbacks and directional alignment.
   - When 5m Close > Supertrend and 5m Close > EMA: Signal is **`BUY_CALL`** (Bullish).
   - When 5m Close < Supertrend and 5m Close < EMA: Signal is **`BUY_PUT`** (Bearish).
3. **ATM Contract Discovery**:
   - The bot automatically queries the live Delta Exchange options chain.
   - It filters for operational contracts with the nearest upcoming expiry.
   - Locates the strike closest to the current spot price (At-The-Money).
4. **Option ATR Stop-Loss & Take-Profit Brackets**:
   - Calculates 14-period ATR directly on option premium volatility.
   - Attaches Stop-Loss at `Quote Price - (1.5 × ATR)`.
   - Attaches Take-Profit at `Quote Price + (2.5 × ATR)`.
5. **Auto-Pilot vs. Manual Mode**:
   - **MANUAL Mode (Default)**: Bot calculates indicators, displays ATM quotes, and waits for operator approval. You can use the **`⚡ BUY ATM CALL`** and **`⚡ BUY ATM PUT`** buttons for instant one-click execution.
   - **AUTO-PILOT Mode**: When enabled and bot state is **RUNNING**, orders are autonomously dispatched to Delta Exchange Testnet whenever a confirmed signal fires and risk management limits pass.
6. **Risk Guardian**:
   - Hard circuit breaker at 1.5% daily loss limit.
   - Maximum 1 open option position at a time.
   - Trade cooldown prevents over-trading in chop.

---

## 5. Model Context Protocol (MCP) Server Setup

EdgePilot includes a standalone Delta Exchange Model Context Protocol (MCP) server located at `mcp/delta_mcp_server.py`.

### Available MCP Tools:
- `delta_get_profile`: Query Delta account details, user ID, email, and KYC status.
- `delta_get_balances`: Query USDT, USD, and asset wallet balances.
- `delta_get_ticker`: Real-time spot and mark prices.
- `delta_find_atm_option`: Automatically select active ATM Call/Put strike.
- `delta_get_market_analysis`: Calculate live Supertrend, EMA, and recommendation.
- `delta_place_option_order`: Execute market order with protective stop-loss.
- `delta_get_positions`: View open positions and live unrealized PnL.
- `delta_close_position`: Close open position immediately.
- `delta_cancel_all_orders`: Emergency cancel all pending orders.

### Connecting in Antigravity or Claude Desktop:
Add the following snippet to your MCP configuration:
```json
{
  "mcpServers": {
    "delta-exchange": {
      "command": "python",
      "args": [
        "/path/to/KIVO/mcp/delta_mcp_server.py"
      ],
      "env": {
        "DELTA_REST_URL": "https://cdn-ind.testnet.deltaex.org",
        "DELTA_WS_URL": "wss://socket-ind.testnet.deltaex.org",
        "ENVIRONMENT": "TESTNET"
      }
    }
  }
}
```

---

## 6. Verification Commands

Run unit and integration tests:
```bash
python -m pytest tests/
```

Verify MCP Server:
```bash
python -c "from mcp.delta_mcp_server import DeltaMcpServer; s = DeltaMcpServer(); print(f'Ready with {len(s.get_tool_definitions())} tools.')"
```
