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

## How to Run

### Option 1: Double-Click
Double-click [`run_bot.bat`](file:///d:/KIVO/run_bot.bat) in File Explorer.

### Option 2: PowerShell
Run from PowerShell in `D:\KIVO`:
```powershell
.\run_bot.ps1
```

The script will automatically start the server and open your browser to:
```
http://127.0.0.1:8000
```
