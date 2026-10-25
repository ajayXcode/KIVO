# EdgePilot: Delta Exchange India Trading Bot

**EdgePilot** is an institutional-grade, algorithmic trading bot designed specifically for the **Delta Exchange India Testnet** environment. It features a fail-closed architecture, deterministic risk management, multi-timeframe hybrid momentum/pullback strategy with Bollinger Bands and ATR, and a real-time reactive operator dashboard with direct frontend key management.

---

## Architecture Overview

```
                      +------------------------------------------+
                      |         FastAPI ASGI Web Server          |
                      |          (http://127.0.0.1:8000)         |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
         +----------v-----------+                      +----------v-----------+
         |     React + Vite     |                      |      REST API        |
         |  Operator Dashboard  |                      |    /api/health/*     |
         |  (Single UI Process) |                      |    /api/control/*    |
         +----------------------+                      +----------+-----------+
                                                                  |
+-----------------------------------------------------------------v-----------+
|                          EdgePilot Trading Engine                           |
|                                                                             |
|  +--------------------+     +--------------------+     +-----------------+  |
|  | Market Data Sync   | --> | Strategy Engine    | --> | Risk Manager    |  |
|  | (5m + 15m Candles) |     | EMA+RSI+ADX+BB+ATR |     | 0.25% Max Risk  |  |
|  +--------------------+     +--------------------+     +--------+--------+  |
|                                                                 |           |
|                                                                 v           |
|  +--------------------+     +--------------------+     +--------+--------+  |
|  | SQLite Journal     | <-- | Reconciler         | <-- | Execution Mgr   |  |
|  | (Orders & Events)  |     | (State Authority)  |     | (Idempotent ID) |  |
|  +--------------------+     +--------------------+     +--------+--------+  |
+-----------------------------------------------------------------|-----------+
                                                                  |
                                                                  v
                                              +-------------------------------+
                                              | Delta Exchange India Testnet  |
                                              | cdn-ind.testnet.deltaex.org   |
                                              +-------------------------------+
```

---

## Key Capabilities

- **Option Buying Engine**: Dynamic discovery of operational At-The-Money (ATM) Call and Put options for **BTC**, **ETH**, and **XAUT**.
- **Supertrend & EMA Volatility Filters**: Precise directional trend alignment (Supertrend 10, 3.0 + EMA 20) with 14-period Option ATR stop-loss and take-profit brackets.
- **Instant 1-Click Execution**: Direct manual option buying (`⚡ BUY ATM CALL` / `⚡ BUY ATM PUT`) with automated protective exit orders.
- **Delta Exchange Model Context Protocol (MCP)**: Standalone stdio MCP server (`mcp/delta_mcp_server.py`) for AI agents and external clients.
- **Multi-Stage Docker & Compose**: One-command production deployment listening on `0.0.0.0:8000` with volume-backed SQLite database.
- **Live Wallet & Profile Sync**: Real-time balance and user profile tracking from Delta Exchange India Testnet.

---

## How to Run

### Option 1: Docker Compose (Recommended for Live Servers / VPS)
```bash
docker compose up -d --build
```
Navigate to `http://<SERVER_IP>:8000`.

### Option 2: Windows PowerShell
```powershell
.\run_bot.ps1
```
The script will start the server and open your browser to `http://localhost:8000`.

### Option 3: Double-Click
Double-click [`run_bot.bat`](file:///d:/KIVO/run_bot.bat) in File Explorer.

---

## Model Context Protocol (MCP) Server

Connect the bot directly to your MCP client:
```bash
python mcp/delta_mcp_server.py
```
See [`DEPLOYMENT.md`](file:///d:/KIVO/DEPLOYMENT.md) for full deployment instructions and Nginx SSL configuration.
