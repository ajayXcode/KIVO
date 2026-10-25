# System Architecture: EdgePilot (KIVO)

EdgePilot is an institutional-grade algorithmic option trading bot and Model Context Protocol (MCP) server engineered specifically for **Delta Exchange India Testnet**.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Clients & AI Agents"
        UI["Graphite Violet Dashboard<br/>React 18 + Vite + TS"]
        Agent["AI Agent / IDE<br/>Antigravity, Cursor, Claude"]
    end

    subgraph "EdgePilot Core Runtime (Port 8000)"
        API["FastAPI ASGI Server<br/>(backend/api.py)"]
        Service["Bot Service Orchestrator<br/>(backend/bot_service.py)"]
        SM["Deterministic State Machine<br/>(backend/state_machine.py)"]
        Strat["Options Momentum Strategy<br/>(backend/strategy.py)"]
        Risk["Server-Side Risk Manager<br/>(backend/risk_manager.py)"]
        Exec["Execution Manager<br/>(backend/execution_manager.py)"]
        Recon["Active Reconciler<br/>(backend/reconciler.py)"]
        MCP["MCP Server (JSON-RPC 2.0)<br/>(mcp/delta_mcp_server.py)"]
    end

    subgraph "Persistence"
        DB[("SQLite 3 Database<br/>(trading_bot.db)")]
        ENV[("Local Secure Env<br/>(.env)")]
    end

    subgraph "Delta Exchange India Testnet"
        REST["REST API Gateway<br/>(cdn-ind.testnet.deltaex.org)"]
        WS["WebSocket Stream<br/>(socket-ind.testnet.deltaex.org)"]
    end

    UI -->|REST & SSE| API
    Agent <-->|Stdio JSON-RPC 2.0| MCP
    MCP --> Service
    API --> Service

    Service --> SM
    Service --> Strat
    Service --> Risk
    Service --> Exec
    Service --> Recon

    Exec --> REST
    Recon --> REST
    Service --> WS

    Service <--> DB
    Service <--> ENV
```

---

## 2. Core Modules & Responsibilities

| Module | Location | Primary Responsibility |
| :--- | :--- | :--- |
| **ASGI Application** | `backend/api.py` | Exposes REST endpoints, mounts built Vite dashboard static assets, handles CORS, and controls background bot tasks. |
| **Bot Service** | `backend/bot_service.py` | Central coordinator: manages candle ingestion, strategy evaluation loop, live balance synchronization, and auto-pilot modes. |
| **State Machine** | `backend/state_machine.py` | Strictly validates lifecycle transitions (`INITIALIZING`, `READY`, `RUNNING`, `PAUSED`, `CIRCUIT_BREAKER`, `STOPPED`). |
| **Strategy Engine** | `backend/strategy.py` | Multi-timeframe trend analysis: 15m trend direction + 5m Supertrend (10, 3.0), EMA (20), and ATR volatility triggers. |
| **Risk Manager** | `backend/risk_manager.py` | Pre-flight order gating: enforces max open positions (1), daily loss limits (1.5%), cooldown intervals (300s), and spread filters. |
| **Execution Manager** | `backend/execution_manager.py` | Submits market orders, calculates option ATR brackets, attaches Stop-Loss and Take-Profit orders, and manages position sizes. |
| **Reconciler** | `backend/reconciler.py` | Periodic background reconciliation between Delta REST position endpoints and local database state to prevent phantom fills. |
| **Delta Client** | `backend/delta_client.py` | Low-level asynchronous HTTP client with HMAC-SHA256 request signing, self-healing clock offset calibration, and fail-closed host validation. |
| **MCP Server** | `mcp/delta_mcp_server.py` | Stdio JSON-RPC 2.0 server providing 9 tools for external AI agents to query balances, scan markets, and place option trades. |

---

## 3. Algorithmic State Machine Lifecycle

```mermaid
stateDiagram-v2
    [*] --> INITIALIZING: Startup Gates
    INITIALIZING --> READY: API & DB Healthy
    INITIALIZING --> STOPPED: Startup Failure

    READY --> RUNNING: Auto-Pilot Activated
    RUNNING --> PAUSED: Operator Pause
    PAUSED --> RUNNING: Operator Resume

    RUNNING --> READY: Auto-Pilot Deactivated
    RUNNING --> CIRCUIT_BREAKER: Max Loss / Max Errors Exceeded
    CIRCUIT_BREAKER --> READY: Manual Operator Reset

    READY --> STOPPED: System Shutdown
    RUNNING --> STOPPED: Emergency Flatten & Shutdown
```

---

## 4. Option Strategy & Execution Flow

```mermaid
flowchart TD
    A[Tick Trigger: 5s Loop] --> B[Fetch 5m & 15m Candles]
    B --> C{Calculate Indicators}
    C -->|Supertrend 10, 3.0<br/>EMA 20<br/>ATR 14| D{Confluence Check}

    D -->|Close > ST & Close > EMA20| E[Bullish Bias: BUY_CALL]
    D -->|Close < ST & Close < EMA20| F[Bearish Bias: BUY_PUT]
    D -->|Choppy / Mixed| G[NO_TRADE: Standby]

    E --> H[Discover Active ATM Call]
    F --> I[Discover Active ATM Put]

    H --> J[Fetch Option Quote & ATR]
    I --> J

    J --> K{Risk Manager Pre-flight}
    K -->|Pass| L{Automation Mode?}
    K -->|Fail| M[Log Rejection & Cooldown]

    L -->|AUTO_PILOT| N[Submit Market Buy Order]
    L -->|MANUAL| O[Update Dashboard ATM Card]

    N --> P[Attach Stop-Loss 1.5x ATR]
    P --> Q[Attach Take-Profit 2.5x ATR]
    Q --> R[Trigger Database Event Log & Reconcile]
```

---

## 5. Model Context Protocol (MCP) Tool Surface

External agents interact over stdio with unbuffered JSON-RPC 2.0:

```mermaid
sequenceDiagram
    participant Agent as AI Agent (Antigravity/Cursor/Claude)
    participant MCP as Delta MCP Server
    participant Delta as Delta Exchange Testnet

    Agent->>MCP: {"jsonrpc":"2.0", "method":"tools/call", "params":{"name":"delta_get_profile"}}
    MCP->>Delta: GET /v2/profile (Signed HMAC-SHA256)
    Delta-->>MCP: HTTP 200 OK {id: 26864393, email: ajayyv972@gmail.com, is_kyc_done: true}
    MCP-->>Agent: {"content": [{"type": "text", "text": "{'id': 26864393, 'is_kyc_approved': true...}"}]}

    Agent->>MCP: {"jsonrpc":"2.0", "method":"tools/call", "params":{"name":"delta_get_balances"}}
    MCP->>Delta: GET /v2/wallet/balances (Signed)
    Delta-->>MCP: HTTP 200 OK {balances: [{USD: 91.98...}]}
    MCP-->>Agent: {"content": [{"type": "text", "text": "{'total_usd_equity': 91.98...}"}]}
```
