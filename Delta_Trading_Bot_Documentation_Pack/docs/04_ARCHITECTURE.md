# 04 — Architecture and Runtime Flows

## Principles

- Modular monolith for v1.
- Exchange adapter isolates Delta-specific details.
- Strategy and risk are deterministic/pure where possible.
- One execution component is the only order writer.
- Exchange state is authoritative for orders/positions.
- Startup always begins non-trading; readiness must pass before `RUNNING`.
- Event journal and reconciliation are core correctness requirements.
- Run one engine instance in v1; adding workers must not create multiple independent traders.

## Component boundaries

| Component | Responsibility | Failure behavior |
|---|---|---|
| Config | Parse and validate env/settings | Invalid mode/limits block startup |
| Delta adapter | Auth, REST, WebSocket and schema normalization | Mark unhealthy; bounded retry |
| Product registry | Product discovery and metadata checks | No entry if metadata invalid/stale |
| Market-data service | Ingest, normalize, timestamp, check freshness/gaps | Block signals on stale/incomplete data |
| Candle builder | Closed 5m/15m candles | No incomplete/future candles |
| Indicator engine | EMA/RSI/ADX | No signal until warm-up/valid values |
| Strategy | LONG/SHORT/NO TRADE + reasons | No exchange calls |
| Risk manager | Exposure, sizing, costs, limits | Fail closed on missing data |
| Execution manager | Order intent/lifecycle/protection | Unknown outcome → reconcile, no blind retry |
| Reconciler | Local journal vs exchange orders/fills/positions | Mismatch blocks entries |
| State machine/watchdog | Readiness and state transitions | PAUSED/HALTED/ERROR on unsafe conditions |
| Storage | Event journal and order records | Block entry if required persistence fails |
| FastAPI | Read views, guarded operator controls | No arbitrary order proxy endpoint |
| Dashboard | Render backend state and request controls | Stale/error states visible |
| Alerts/metrics | Expose system health | Alerts cannot block trading loop |

## Data flow

```text
REST bootstrap + product metadata
          ↓
Public market feed (REST and/or verified WebSocket)
          ↓
Normalize → timestamp/freshness/order validation
          ↓
Closed 5m + 15m candles → indicators
          ↓
Strategy signal + reason codes
          ↓
Risk manager: position + size + cost + limits + readiness
          ↓ approved only
Execution manager → exchange order
          ↓
REST/WS updates → fills/positions reconciliation
          ↓
Protective exit verification → event journal + dashboard + alerts
```

## Startup gate

1. Validate explicit Testnet config and allowlisted endpoints.
2. Initialize logging/redaction and durable journal.
3. Authenticate and fetch product metadata.
4. Connect/inspect market data and verify timestamps.
5. Warm indicators using valid closed candles.
6. Fetch open orders, positions and recent fills.
7. Reconcile local/exchange state.
8. Restore daily loss/cooldown and strategy config version.
9. Verify risk config and protective-exit contract.
10. Enter `RUNNING` only after all checks pass.

## State machine

- `INITIALIZING`: no entries.
- `RUNNING`: entries only with risk approval.
- `PAUSED`: operator pause or recoverable uncertainty; no entries.
- `FLATTENING`: explicitly approved exposure reduction; no new entries.
- `HALTED`: risk limit/kill switch; no entries.
- `ERROR`: critical failure; reconciliation/recovery required.

Every transition records prior state, next state, timestamp, reason and trigger. Resume requests re-evaluate readiness; they do not force state.

## Order lifecycle

```text
INTENT_CREATED → RISK_APPROVED → SUBMITTING
   → ACKNOWLEDGED / REJECTED / UNKNOWN
   → PARTIALLY_FILLED → FILLED or cancelled/rejected remainder
   → PROTECTION_PENDING → PROTECTED
   → EXIT_PENDING → CLOSED / RECONCILIATION_REQUIRED
```

Map real Delta statuses only after verifying current responses. `UNKNOWN` is neither success nor rejection. Reconcile before retry.

## Concurrency and persistence

- Serialize changes to order/position state when async tasks can race.
- Deduplicate candles by product/timeframe/open time or exchange-provided event ID.
- Don't hold DB transactions across network calls.
- Persist order intent before submission where practical; persist sanitized results afterward.
- On restart, exchange state wins; local state must be reconciled.
- Use `asyncio.sleep`, not blocking `time.sleep`, in async loops.
- Graceful shutdown blocks new entries first, persists state, closes tasks, and does not assume exchange exposure is closed.

## Scale boundary

Before remote/multi-user/multi-instance use, redesign data access, auth, durable coordination, database concurrency, leader locking, monitoring, backups and incident response. Increasing API workers alone is unsafe.
