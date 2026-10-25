# Delta Exchange India Testnet Trading Bot
## Complete Product, Algorithm, Engineering, Documentation, and Production-Build Specification

**Version:** 1.1  
**Date:** 25 October 2026  
**Status:** Product planning / specification draft  
**Locked decisions:** Hybrid trend-filtered momentum + pullback strategy; web dashboard; Delta Exchange India Testnet only.  
**Repository status:** No repository or implementation code has been created by this planning work.

> **Purpose.** This is the master planning document for the complete product idea and the build needed to deliver a robust, demonstrable Testnet trading system. It covers product requirements, algorithm design, system architecture, security, exchange documentation, learning from open-source repositories, test strategy, operational procedures, deliverable documents, and the implementation roadmap.
>
> **Important limits.** This is not a claim that the strategy is profitable or ready for real-money trading. “Production-quality” here means disciplined engineering, validation, observability, safe failure behavior, and reproducible operation in the agreed Testnet environment. Mainnet/live-money trading is out of scope.

---

## 0. Decision register

| Decision | Locked choice |
|---|---|
| Product | Automated trading bot with explainable decisions and a web dashboard |
| Exchange | Delta Exchange India **Testnet/Demo environment only** |
| Strategy family | Hybrid trend-filtered momentum + pullback |
| Initial market | One eligible perpetual contract, selected only after live Testnet product discovery |
| Timeframes | 15-minute trend context and 5-minute entry signal |
| Backend | Python + FastAPI |
| Market data | REST for bootstrap/reconciliation; WebSocket where appropriate and verified |
| Persistence | SQLite for the first local/hackathon release; repository abstraction to permit later migration |
| Frontend | Web dashboard; framework selected during implementation planning |
| Testing | Unit, API-contract, integration, replay, failure-mode, and UI tests |
| Repository | Create only after specification review and ticket approval |
| Real-money trading | Explicitly excluded |

### Principles that cannot be traded away

1. Exchange state is authoritative; local state must reconcile with it.
2. Only the execution service can submit orders.
3. Every order must pass server-side risk validation.
4. If market data, order state, or exposure is uncertain, block new entries.
5. Never blindly retry an order submission after a timeout.
6. Never represent replay/fixture orders as actual Testnet executions.
7. Never commit credentials, signatures, or private account data.
8. No profitability claim without a documented evaluation period, trade count, costs, and limitations.

---

# 1. Product overview

## 1.1 Product vision

Build an explainable automated trading system that:

- discovers valid trading products from Delta Exchange India Testnet metadata;
- receives and validates market data;
- calculates indicators and closed-candle signals;
- proposes LONG, SHORT, or NO TRADE with reason codes;
- estimates position size and risk before any entry;
- executes and tracks orders through their complete lifecycle;
- verifies protective exits and reconciles positions with the exchange;
- blocks entries when safety or operational checks fail;
- exposes strategy, trades, risk, P&L, system health, and alerts in a dashboard;
- provides audit records and a reproducible hackathon demonstration.

## 1.2 Why this product should stand out

The product should not be “a chart with a buy/sell button.” Its differentiators are:

- **Explainability:** every signal and rejection has an understandable reason.
- **Risk-first execution:** no strategy signal can bypass risk gates.
- **Reconciliation:** local order/position records are compared with the exchange.
- **Failure handling:** stale feeds, partial fills, timeouts, and restarts are designed and tested.
- **Auditability:** decisions and order transitions can be reconstructed.
- **Honest performance reporting:** costs and limitations are explicit; no guaranteed-profit claims.

## 1.3 Target users

- Hackathon judges assessing strategy clarity, risk management, implementation, API automation, and demo quality.
- Developers reviewing and extending the system.
- The operator controlling a Testnet session.
- Teammates presenting strategy behavior and technical architecture.

## 1.4 Non-goals for version 1

- Real-money/mainnet trading.
- High-frequency/microsecond scalping.
- Market making, arbitrage, pairs trading, or options strategies.
- Multi-exchange execution.
- Autonomous live strategy self-modification.
- Large-scale multi-market portfolio optimization.
- AI/LLM deciding trades without deterministic, testable rules.
- A claim of profitability before adequate evidence.

---

# 2. Hackathon deliverables and evidence

The hackathon brief supplied earlier calls for Testnet API integration, automated execution from defined logic, risk/position management, strategy documentation, a public GitHub repository, setup instructions, and a demonstration of connectivity and execution. The event brief also indicates that short-term P&L is not the sole or primary judging criterion.

| Judging area | Evidence to produce |
|---|---|
| Strategy logic and clarity | Strategy document, signal reason codes, reproducible examples, baseline comparison |
| Risk management | Pre-trade gate, protective exits, daily halt, stale-data rejection, kill switch, failure tests |
| Technical implementation | Modular service, typed schemas, persistence, automated tests, readable code |
| API execution and automation | Verified Testnet connection, order lifecycle, positions, reconciliation |
| Demo and explanation | Dashboard, Testnet status, real Testnet order when possible, failure behavior, README |

Do not interpret this document as replacing the organizer's official rules. Re-check event submission requirements and AI-assistance rules before submitting.

---

# 3. Functional requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| FR-01 | Product discovery | Product metadata is fetched dynamically; no unverified product ID or symbol is hard-coded. |
| FR-02 | Market-data ingestion | Data is normalized and validated for timestamp, ordering, completeness, and staleness. |
| FR-03 | Candle handling | Indicators and signals use closed candles only. |
| FR-04 | Indicators | EMA 20/50/200, RSI 14, and ADX are calculated with documented conventions and edge-case tests. |
| FR-05 | Strategy | Emits LONG, SHORT, or NO TRADE plus reason codes, timestamps, indicator snapshot, and strategy version. |
| FR-06 | Risk manager | Validates position count, size, stop distance, costs, data health, daily loss, cooldown, and readiness. |
| FR-07 | Order lifecycle | Submission, acknowledgement, partial fill, fill, cancel, rejection, timeout, and reconciliation are represented explicitly. |
| FR-08 | Protective exits | Supported protective orders are placed and verified, or the system halts entries and follows an approved safe procedure. |
| FR-09 | Reconciliation | Startup and ambiguous outcomes trigger exchange-state reconciliation before trading can resume. |
| FR-10 | Dashboard | Shows state, signals, orders, positions, risk, P&L, health, and alerts. |
| FR-11 | Audit trail | Decisions, risk denials, state transitions, orders, fills, and operator actions are persisted with secrets redacted. |
| FR-12 | Kill switch | Stops new entries immediately and initiates a documented exposure-management workflow. |
| FR-13 | Configuration | Invalid or ambiguous configuration causes safe startup failure. |
| FR-14 | Health/metrics | Readiness reflects real dependencies and reconciliation status. |
| FR-15 | Simulation/replay | Simulated orders are clearly labelled and cannot be confused with Testnet orders. |
| FR-16 | Security | No secrets in Git, logs, frontend, exports, screenshots, or exception messages. |
| FR-17 | Repeatability | Same candle data and strategy configuration produce the same signal output. |
| FR-18 | Documentation | A clean checkout can be configured, tested, and demonstrated using documented steps. |

---

# 4. Algorithm specification

## 4.1 Algorithm type

**Short-horizon trend-filtered momentum/pullback strategy.** It is not HFT. It uses 15-minute candles to define directional context and 5-minute closed candles to identify a pullback and continuation/rejection.

The parameter values below are **initial hypotheses**, not established optimal values. They must be configurable and evaluated on recorded data.

## 4.2 Initial parameters

| Parameter | Baseline | Reason / note |
|---|---:|---|
| Trend timeframe | 15m | Directional context |
| Entry timeframe | 5m | Entry confirmation |
| Trend EMA | 50 and 200 | Directional filter |
| Entry EMA | 20 | Pullback/reclaim reference |
| RSI | 14 | Momentum/recovery filter |
| Long RSI condition | Recovery after being below 40 | Baseline; tune only through documented evaluation |
| Short RSI condition | Weakening after being above 60 | Baseline; tune only through documented evaluation |
| ADX | 14, threshold > 20 | Configurable trend-strength filter |
| Maximum open positions | 1 | Simplifies exposure and demo |
| Risk per trade | 0.25% of configured test equity | Initial Testnet configuration, not financial advice |
| Daily loss halt | 1.5% of configured test equity | Initial Testnet configuration; definition of daily P&L must be fixed |
| Signal timing | Closed candles only | Prevents intrabar repainting |
| Market count | 1 initially | Reduces integration complexity |

## 4.3 Indicator definitions and implementation requirements

- **EMA(n):** Exponential moving average over the last `n` observations, using one consistent initialization convention.
- **RSI(14):** Relative Strength Index with the chosen smoothing convention documented (e.g. Wilder's smoothing); tests must pin the implementation.
- **ADX(14):** Average Directional Index using documented +DI/-DI and smoothing conventions.
- **Candle closure:** A candle is eligible only after its close time is known to have passed and the source confirms it is final, or after a conservative finalization policy.
- **Warm-up:** Do not emit tradable signals until the longest indicator has enough valid input history. No NaN/zero-fill shortcuts for indicators.
- **Timestamp alignment:** The most recent closed 15m candle must be correctly aligned with the 5m decision candle. Do not use future higher-timeframe values.

## 4.4 Long-entry rule

Return LONG only when **all** conditions are true:

1. Product is eligible and market is in the configured Testnet environment.
2. Market data is fresh, complete, ordered, and indicator warm-up is complete.
3. Latest closed 15m EMA50 is above EMA200.
4. ADX passes the configured threshold.
5. A 5m pullback approaches the EMA20; the strategy must define the allowed distance or pullback condition explicitly in the implementation ticket.
6. RSI shows recovery from the configured retracement zone; baseline is recovery after being below 40.
7. A closed bullish candle confirms reclaim/continuation according to the exact rule approved before coding.
8. Spread and estimated execution cost are below configured thresholds.
9. No unresolved order or position conflict exists.
10. Risk manager approves size, stop distance, and protective-exit plan.

If any condition fails, emit NO TRADE with one or more reason codes.

## 4.5 Short-entry rule

Return SHORT only when **all** conditions are true:

1. Product and environment are valid.
2. Market data is fresh, complete, ordered, and warmed up.
3. Latest closed 15m EMA50 is below EMA200.
4. ADX passes the configured threshold.
5. A 5m pullback approaches EMA20; avoid chasing an extended move.
6. RSI weakens after a rebound; baseline is weakening after being above 60.
7. A closed bearish candle confirms rejection/continuation according to the approved exact rule.
8. Spread and estimated execution cost are below configured thresholds.
9. No unresolved order or position conflict exists.
10. Risk manager approves size, stop distance, and protective-exit plan.

If any condition fails, emit NO TRADE with reason codes.

## 4.6 Mandatory NO TRADE conditions

- Conflicting/neutral trend or insufficient indicator history.
- Incomplete candle, missing candle, out-of-order event, or stale feed.
- Excessive spread or estimated slippage.
- Risk limit reached, cooldown active, existing position/order unresolved, or kill switch enabled.
- Product metadata missing, stale, or invalid.
- Quantity/price precision or minimum size cannot be validated.
- Protective-exit support or required exit plan is unverified.
- Exchange connectivity/authentication unhealthy.
- Startup/restart reconciliation incomplete.
- Database/event journal unavailable when persistence is required for safe operation.

## 4.7 Exit policy: decision required before implementation

The product must not enter a position until the exit behavior is precisely defined. The recommended initial design is:

- Stop-loss based on a documented recent-swing or volatility-based method.
- Take-profit based on a configurable risk/reward relationship or a deterministic strategy exit.
- Bounds on minimum and maximum stop distance.
- Protective exit verification against actual exchange state.
- Reduce-only/close semantics only when supported and verified in the current API contract.
- Partial fills must lead to protection for the actual filled exposure.
- If protection is rejected, missing, or cannot be verified, block new entries, raise a critical alert, and run the approved emergency-management policy.
- Never average down or increase size to recover losses in v1.

**Open design gate:** approve the exact stop formula, target formula, maximum holding time (if any), and behavior when a signal reverses before implementing orders.

## 4.8 Reference pseudocode

```text
on_market_update(event):
    validate_event(event)
    update_market_data_store(event)

    if event does not complete a valid 5m decision candle:
        return

    if not system_is_ready():
        emit_no_trade("SYSTEM_NOT_READY")
        return

    if not data_is_fresh_and_aligned():
        emit_no_trade("STALE_OR_MISALIGNED_DATA")
        return

    indicators = calculate_indicators(closed_5m, closed_15m)

    if indicators.not_warmed_up:
        emit_no_trade("INDICATOR_WARMUP")
        return

    candidate = strategy.evaluate(indicators, closed_candles)
    # candidate: LONG, SHORT, or NO_TRADE + reason codes

    if candidate.signal == NO_TRADE:
        persist_decision(candidate)
        publish_to_dashboard(candidate)
        return

    risk_result = risk_manager.evaluate(
        candidate,
        current_exchange_position,
        open_orders,
        product_metadata,
        market_quality,
        session_metrics,
        system_state
    )

    persist_decision_and_risk_result(candidate, risk_result)
    publish_to_dashboard(candidate, risk_result)

    if not risk_result.allowed:
        return

    # Execution service owns all order placement.
    result = execution_manager.submit_idempotently(
        candidate,
        risk_result.approved_size,
        approved_exit_plan
    )

    reconcile_order_and_position(result)

    if position_exists():
        verify_protective_exits_for_actual_exposure()

    if exposure_or_order_state_is_uncertain():
        transition_to(PAUSED_OR_ERROR, reason="RECONCILIATION_REQUIRED")
```

## 4.9 Risk sizing model

Use a documented risk-based sizing method. Conceptually:

```text
risk_budget = configured_equity_reference * risk_fraction
loss_per_unit_at_stop = contract_specific_loss_for_one_unit(entry, stop, product_metadata)
raw_quantity = risk_budget / loss_per_unit_at_stop
quantity = round_down_to_valid_increment(raw_quantity, product_metadata.quantity_step)
```

Then validate:

- minimum/maximum order size;
- tick and quantity precision;
- contract multiplier and settlement rules;
- margin/leverage requirements, if relevant;
- fees and conservative slippage estimate;
- stop distance and maximum permitted exposure;
- actual Testnet product contract rules.

If any contract-specific calculation is not verified, **do not trade**. Never assume that a generic spot quantity formula applies to a derivative contract.

## 4.10 Evaluation algorithm

1. Capture/obtain a legitimate, timestamped candle dataset.
2. Validate duplicates, missing periods, outliers, timezone, and candle closure.
3. Split data chronologically into development, validation, and final holdout windows.
4. Compare:
   - trend-pullback baseline;
   - momentum-only baseline;
   - proposed hybrid.
5. Use the same costs and execution assumptions for each.
6. Include fees and a conservative slippage model.
7. Report net P&L, trade count, expectancy, max drawdown, average win/loss, win rate, and regime breakdown.
8. Run sensitivity checks; avoid choosing parameters solely on the best historical result.
9. Keep the final holdout untouched until strategy choices are fixed.
10. Clearly label Testnet results, replay results, and any external historical-data results.

**Data constraint:** the earlier hackathon brief said no historical dataset was supplied. Do not assume one exists. Capture Testnet data or use a lawful, documented data source and explain its limitations.

---

# 5. Risk policy and safety invariants

## 5.1 Initial configurable Testnet settings

| Control | Starting configuration | Behavior |
|---|---:|---|
| Risk per trade | 0.25% of configured test equity | Calculate from actual contract rules and stop distance |
| Concurrent positions | 1 | No entry if exposure or unresolved entry order exists |
| Daily loss halt | 1.5% of configured test equity | Halt new entries; define reset boundary and P&L source |
| Consecutive-loss cooldown | Configurable | Persist/restore cooldown if restart must not reset it |
| Stale-data threshold | Configurable | Must be based on feed/update behavior; block entries when exceeded |
| Spread/slippage threshold | Configurable | Reject if execution cost is too high |
| Kill switch | Always available | Block new entries immediately |
| Retry policy | Bounded, state-aware | Never blindly retry ambiguous order submissions |

These are initial Testnet settings, not a guarantee of safety or a real-money recommendation.

## 5.2 State machine

| State | Meaning | New entries |
|---|---|---|
| `INITIALIZING` | Config, auth, metadata, data warm-up, and reconciliation | No |
| `RUNNING` | All readiness and safety checks pass | Only through risk manager |
| `PAUSED` | Operator pause or recoverable uncertainty | No |
| `FLATTENING` | Approved exposure-reduction workflow | No |
| `HALTED` | Risk threshold or kill switch triggered | No |
| `ERROR` | Critical unexpected failure; recovery required | No |

Every transition must record timestamp, prior state, next state, reason code, and trigger. Startup must always be non-trading until all required checks pass.

## 5.3 Safety invariants

- Only `ExecutionManager` can submit/cancel orders.
- Only `RUNNING` can initiate entries.
- Every entry passes `RiskManager`.
- The exchange is the authority for positions and order status.
- An unknown order outcome triggers reconciliation before retry.
- A mismatched local/exchange state blocks new entries.
- A missing protective exit blocks new entries and triggers critical handling.
- UI actions cannot bypass backend risk gates.
- All risk rejections and operator actions are auditable.
- Secrets are never returned to the frontend or written to logs.

---

# 6. Delta Exchange India Testnet API: reference and verification plan

## 6.1 Official source

- Delta Exchange API documentation: https://docs.delta.exchange/

The official documentation surfaced during research describes the India Testnet REST base as:

`https://cdn-ind.testnet.deltaex.org`

It also describes Testnet WebSocket endpoints:

- Public market-data WebSocket: `wss://socket-ind-pub.testnet.deltaex.org`
- Private/account WebSocket: `wss://socket-ind.testnet.deltaex.org`

These values must be rechecked against the current official documentation at implementation time. Do not silently substitute production URLs or keys.

## 6.2 Authentication facts to verify and implement

The official docs state that authenticated REST requests use headers including:

- `api-key`
- `signature`
- `timestamp`
- `User-Agent`
- appropriate `Content-Type`/`Accept` headers

The documented HMAC-SHA256 prehash format is based on HTTP method + timestamp + request path + query parameters + request body, concatenated according to the official specification. The documentation states that signatures have a short validity window (currently documented as five seconds). Exact canonicalization and encoding must be implemented from the current docs and tested against known fixtures.

**Do not copy credential examples from documentation into project configuration.** They are illustrative. Use a dedicated Testnet key, minimal permissions, and environment variables.

## 6.3 Product and account endpoints to verify

The official documentation includes the following endpoint families; verify the latest schemas, required fields, pagination, and response formats before implementation:

| Purpose | Documented path family |
|---|---|
| Product discovery | `GET /v2/products` |
| Create order | `POST /v2/orders` |
| Query active orders | `GET /v2/orders` |
| Order history | `GET /v2/orders/history` |
| Positions | `GET /v2/positions` |
| Fills | `GET /v2/fills` |
| Recent public trades | `GET /v2/trades/{symbol}` |

Product metadata must be used to discover the real product ID, symbol, tick size, quantity step/minimum, contract size, status, and other contract properties. Do not hard-code a product ID from an example.

## 6.4 WebSocket considerations

The official docs describe public market channels and private account/order channels. The docs include newer channel names such as `ob_l1`, `ob_l2`, `ob_updates`, `ticker`, and `trades`; the correct channel and payload for candles must be checked before coding. The docs also note private `key-auth` authentication for private channels and mention connection limits/idle behavior.

Implementation requirements:

- Subscribe only after a successful connection/auth flow.
- Validate acknowledgements and message schemas.
- Heartbeat/idle timeout detection.
- Bounded reconnect backoff with jitter.
- On reconnect, re-fetch authoritative orders/positions and restore market-data continuity before entries.
- Avoid opening excessive connections.
- Do not rely on a WebSocket event alone as the only source of truth for recovery.
- Check current docs for deprecated channels; do not copy older examples blindly.

## 6.5 Exchange contract gate — must pass before order code

- [ ] Verify Testnet REST base URL.
- [ ] Verify public/private WebSocket URLs.
- [ ] Verify REST signature canonicalization and timestamp requirements.
- [ ] Verify required `User-Agent` header and API key permissions.
- [ ] Verify product metadata and pagination schema.
- [ ] Verify candle/history endpoints, resolution options, and supported channels.
- [ ] Verify order types and required payload fields.
- [ ] Verify stop-loss/take-profit trigger behavior and bracket/OCO support if any.
- [ ] Verify reduce-only/close semantics.
- [ ] Verify client order ID length/uniqueness/idempotency behavior.
- [ ] Verify partial fill and cancellation-race behavior.
- [ ] Verify positions/open orders/fills schemas.
- [ ] Verify rate limits and backoff expectations.
- [ ] Verify whether a deadman/cancel-on-disconnect feature exists and how it behaves; do not assume it exists.
- [ ] Run read-only auth/product/position checks before enabling order submission.
- [ ] Test all order-related behaviors only on Testnet.

---

# 7. Architecture

## 7.1 Logical flow

```text
Delta Testnet REST + WebSocket
             |
             v
    Exchange Adapter
             |
             v
 Market Data Validation
             |
             v
 Closed Candle Builder
             |
             v
 Indicator Engine
             |
             v
 Strategy Engine -----> Decision / Reason Codes -----> Dashboard
             |
             v
        Risk Manager
             |
       approved only
             v
    Execution Manager
             |
             v
 Exchange Order / Fill / Position State
             |
             v
 Reconciler + Event Journal + Watchdog
             |
             v
 Dashboard / Alerts / Metrics / Audit
```

## 7.2 Proposed module responsibilities

| Module | Responsibility | Forbidden responsibility |
|---|---|---|
| Config | Parse/validate environment and strategy settings | Store secrets in code |
| Exchange client | Auth, REST, product metadata, orders, positions | Decide trading signals |
| Market-data service | Subscribe/poll, normalize, timestamp/freshness checks | Trust stale/incomplete candles |
| Candle builder | Construct/validate closed candles | Use future/incomplete data |
| Indicators | Pure EMA/RSI/ADX calculations | Send orders |
| Strategy engine | Evaluate rules and explain decisions | Bypass risk |
| Risk manager | Size and approve/reject orders | Trust frontend validation |
| Execution manager | Order lifecycle and protective exits | Blindly retry unknown submissions |
| Reconciler | Compare local state with exchange state | Permit trading during mismatch |
| State machine/watchdog | State transitions and readiness | Report ready while unhealthy |
| Persistence | Event/order journal | Persist secrets |
| FastAPI | Dashboard data, health, controlled actions | Public arbitrary order submission |
| Dashboard | Render current state and safe controls | Hold exchange credentials |
| Alerts/metrics | Surface operational events | Block trading loop on slow notifications |

## 7.3 Proposed repository layout (future build only)

```text
delta-testnet-trading-bot/
  app/
    main.py
    config.py
    api/
      routes_health.py
      routes_dashboard.py
      routes_controls.py
      schemas.py
    exchange/
      client.py
      products.py
      market_data.py
      orders.py
      positions.py
      reconciler.py
    strategy/
      indicators.py
      candles.py
      rules.py
      signals.py
      config.py
    risk/
      manager.py
      sizing.py
      limits.py
    execution/
      executor.py
      order_state.py
      protective_exits.py
    core/
      state_machine.py
      watchdog.py
      events.py
      clock.py
    storage/
      database.py
      repositories.py
      models.py
    monitoring/
      metrics.py
      alerts.py
  dashboard/
  tests/
    unit/
    contract/
    integration/
    replay/
    failure_modes/
    ui/
  docs/
    PRODUCT_SPEC.md
    STRATEGY.md
    RISK_POLICY.md
    API_CONTRACT.md
    ARCHITECTURE.md
    DATA_AND_METRICS.md
    SECURITY.md
    TEST_PLAN.md
    RUNBOOK.md
    DEMO_SCRIPT.md
    ADR/
  .env.example
  .gitignore
  requirements.txt
  README.md
```

This is a proposed structure only. No repository has been created.

## 7.4 Recommended implementation style

- Start as one modular application, not multiple microservices.
- Keep strategy, sizing, risk, and state transitions independently testable.
- Use typed schemas and explicit enums for order/bot states.
- Use a single order-management path.
- Use append-oriented event records and reconcile them with exchange state.
- Keep exchange-specific code behind an adapter boundary.
- Use SQLite first for local/hackathon use; document limitations and migration path.
- Keep UI framework choice open until the team confirms its skills and time.

---

# 8. Dashboard specification

## 8.1 Required screens

| Screen | Data shown | Actions |
|---|---|---|
| Overview | Testnet label, product, bot state, connection, latest signal, positions, P&L, risk usage, alerts | Pause/resume only through backend guards |
| Live Signals | LONG/SHORT/NO TRADE timeline, reasons, indicator snapshot, candle time | Inspect/filter signals |
| Positions & Orders | Actual position, average entry, size, P&L, order status, fills, stop/target status | Safe cancel/close workflows |
| Performance | Net P&L, fees/cost assumptions, trade count, expectancy, drawdown, period | Filter/export report |
| Risk Controls | Per-trade budget, daily limit, current usage, cooldown, kill status | Pause, kill, request validated settings |
| System Events | Feed health, API errors, reconnects, reconciliation mismatches, state transitions | Inspect event and copy redacted diagnostics |
| Settings | Selected product, strategy parameters, risk settings, data thresholds | Validated changes with confirmation |

## 8.2 UI rules

- Persistent TESTNET indicator.
- Show bot state and reason it cannot run.
- Separate realized P&L, unrealized P&L, fees, and estimated costs.
- Every rejected entry has a human-readable explanation.
- Critical alerts remain visible until acknowledged/resolved.
- Confirmation for destructive actions.
- No secrets in browser code or API responses.
- Include loading, empty, stale, disconnected, and error states.
- Display timestamps with timezone labels.
- Backend remains the source of truth for controls and risk.

---

# 9. Data model, audit, and observability

## 9.1 Core records

- **ProductMetadata:** product ID, symbol, status, tick size, quantity step/minimum, contract size, metadata timestamp.
- **MarketEvent:** event ID, product, event type, exchange timestamp, receive timestamp, schema version, sanitized payload.
- **Candle:** product, timeframe, open/close time, OHLCV, closed flag, source.
- **StrategyDecision:** decision ID, strategy version, config hash, signal, reason codes, indicators, source candle IDs.
- **RiskDecision:** decision ID, allowed/denied, rejection codes, requested/approved size, risk estimate.
- **Order:** client order ID, exchange order ID, product, side, type, quantity, status, timestamps, supported flags.
- **Fill:** fill ID, order ID, price, quantity, fee, exchange timestamp.
- **PositionSnapshot:** product, side, size, entry, unrealized P&L, observed time.
- **BotStateEvent:** from/to state, reason, timestamp, trigger.
- **Alert:** ID, severity, code, message, created/acknowledged/resolved timestamps.
- **SessionMetrics:** session, realized/unrealized P&L, fees, trade count, drawdown, latency/error counters.

## 9.2 Logging and metrics

Log:

- correlation ID;
- decision ID and strategy version;
- client order ID and exchange order ID when available;
- state transitions;
- risk denials;
- exchange error codes and sanitized messages;
- market-data age and reconnects;
- order acknowledgement/fill latency;
- reconciliation mismatches;
- kill-switch activations.

Never log API secrets, HMAC signatures, authorization headers, or sensitive account details.

---

# 10. Application API proposal

These are **our application's endpoints**, not Delta Exchange endpoints.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health/live` | GET | Process liveness |
| `/api/health/ready` | GET | Config, exchange, data, product, and reconciliation readiness |
| `/api/overview` | GET | Bot state, product, latest signal, exposure, risk, alerts |
| `/api/signals` | GET | Paginated signal history and reasons |
| `/api/positions` | GET | Reconciled position snapshot |
| `/api/orders` | GET | Orders/fills and status |
| `/api/performance` | GET | Metrics with explicit time window and cost assumptions |
| `/api/events` | GET | Paginated redacted audit/operational events |
| `/api/control/pause` | POST | Disable new entries |
| `/api/control/resume` | POST | Resume only if all safety checks pass |
| `/api/control/kill` | POST | Block entries and start approved exposure workflow |

Requirements:

- Typed validation and consistent error codes.
- Pagination and bounded request sizes.
- UTC timestamps in responses; UI renders local time with a label.
- Authenticated and audited control endpoints.
- No public endpoint that accepts arbitrary order payloads from the browser.
- Every action revalidates backend state and risk conditions.

---

# 11. Security requirements

- Use dedicated Testnet credentials with minimum permissions.
- Never use mainnet credentials in dev, test, demo, or CI.
- Store secrets in environment variables or a secret manager.
- Commit `.env.example`, never `.env`.
- Ignore local database files and sensitive logs where appropriate.
- Sanitize logs, exports, and errors.
- Apply request validation, rate limiting, and dependency pinning.
- Bind local demo services to localhost unless secure remote access is needed.
- Protect control routes with authentication.
- Do not send private account data to third-party telemetry by default.
- Document how to rotate/revoke a leaked Testnet key.
- Scan repository history for accidental secrets before making it public.
- Verify API key environment matches the Testnet endpoint.

---

# 12. Testing and acceptance criteria

## 12.1 Test layers

| Layer | Test scope |
|---|---|
| Unit | EMA/RSI/ADX, candle closure, signals, sizing, risk limits, state machine |
| Contract | Auth/signature, response parsing, product metadata, order payload validation |
| Integration | Testnet auth, product discovery, positions, orders, fills, protective exits |
| Replay | Deterministic signals from stored market data; baseline comparison |
| Failure modes | Stale feed, reconnect, timeout, rejection, partial fill, restart, kill switch |
| UI | Loading, empty, stale, disconnected, alert, controls, confirmation |
| Demo rehearsal | Full script, actual Testnet path, clearly labelled fallback fixture |

## 12.2 Mandatory acceptance tests

- Invalid Testnet credentials result in a safe non-trading state.
- Product discovery selects only a valid eligible product.
- Indicator warm-up blocks early signals.
- LONG, SHORT, and NO TRADE cases are covered by deterministic tests.
- Incomplete candles cannot trigger entries.
- Stale/out-of-order market data blocks entries.
- Sizing obeys risk limits and contract constraints.
- Duplicate signals cannot create duplicate exposure.
- Ambiguous order timeout triggers reconciliation before retry.
- Partial fills update actual exposure and protective-order quantities.
- Missing/rejected protective exits trigger the approved safe path and halt new entries.
- Daily loss threshold and kill switch block entries.
- Restart reconciles open orders/positions before RUNNING.
- UI controls cannot bypass server-side risk checks.
- Logs and diagnostics contain no secrets.
- Replay orders are visibly distinct from Testnet orders.
- A clean checkout can run tests from documented instructions.

## 12.3 Definition of done

- All critical/high-priority tests pass.
- No unresolved safety-critical defect.
- Zero duplicate entries and zero unprotected positions in completed required test scenarios.
- Startup, pause, resume, halt, reconnect, and recovery paths are tested.
- README, strategy, risk, API contract, security, runbook, and demo documents are complete.
- Repository is free of credentials and sensitive data.
- A reviewer can reproduce setup, tests, and demo.

---

# 13. KPIs and performance evaluation

| Category | Metric | Reporting rule |
|---|---|---|
| Strategy | Net P&L after fees and estimated slippage | Include period, trades, costs, environment, limitations |
| Strategy | Expectancy/trade | State calculation and sample size |
| Strategy | Maximum drawdown | Define equity curve and inclusion of open P&L |
| Strategy | Average winner/loser, win rate | Do not use win rate alone |
| Robustness | Out-of-sample performance | Chronological split, fixed final holdout |
| Execution | Rejection rate, acknowledgement/fill latency | Separate exchange and bot-side errors |
| Reliability | Duplicate entries, unprotected positions, reconciliation mismatches | Target zero in required test cases |
| Data quality | Stale-data rejections, missing candles, recovery time | Never lower safety standards to improve metric |
| Operations | Fault detection and recovery time | Measure in rehearsals |
| Demo | Reproducible setup and scripted completion | Record pass/fail checklist |

The first release is successful if it is correct, safe, explainable, reproducible, and demonstrates the required Testnet flow. Profitable results are not guaranteed.

---

# 14. Failure handling and recovery

| Failure | Required behavior |
|---|---|
| Market-data disconnect | Block entries; reconnect with bounded backoff; refresh data; reconcile before resuming |
| Stale/missing candle | Emit NO TRADE; never reuse stale values as current |
| Order-submit timeout | Mark outcome ambiguous; query/reconcile before retry |
| Order rejected | Record reason; avoid endless retries |
| Partial fill | Update exposure and protect filled quantity |
| Protective exit rejected | Block entries, alert critically, follow approved emergency procedure |
| Position/order mismatch | PAUSED/ERROR; reconcile authoritative exchange state |
| Restart | INITIALIZING; load journal; fetch exchange orders/positions; reconcile before RUNNING |
| Daily loss breach | HALTED; block entries and follow approved exposure policy |
| Kill switch | Block entries immediately; perform tested order/position handling and verify final state |
| Clock/signature failure | Block trading; correct configuration; avoid repeated invalid requests |
| Persistence failure | Block new entries if audit/state persistence is necessary for safe operation |

### Operator controls

- **Pause:** block new entries, keep monitoring.
- **Resume:** only after readiness and reconciliation pass.
- **Kill:** block entries immediately and invoke the documented exposure policy.
- **Close position:** confirmation, verified order semantics, and post-action reconciliation.
- Never claim a position is protected or closed without exchange evidence.

---

# 15. Runbook and operational procedures

## 15.1 Startup checklist

1. Confirm explicit Testnet mode.
2. Validate config and required secrets without printing them.
3. Check system clock/auth requirements.
4. Authenticate and discover product metadata.
5. Verify market-data freshness and indicator warm-up.
6. Fetch positions and open orders.
7. Reconcile exchange state with local journal.
8. Verify risk limits, persistence, protective-exit support, and health endpoints.
9. Enter RUNNING only after all required checks pass.

## 15.2 Shutdown checklist

1. Block new entries first.
2. Persist state and pending order IDs.
3. Do not assume process shutdown closes exchange positions.
4. Apply approved open-order/position policy and reconcile.
5. Stop feed tasks gracefully and flush the journal.
6. On restart, fetch exchange state before resuming.

## 15.3 Runbook scenarios

- Invalid credentials/signature/clock drift.
- Market-data disconnect or stale data.
- Unknown order result after timeout.
- Protective order missing/rejected.
- Daily loss halt.
- Restart with open exposure.
- Kill-switch activation.
- Database failure.
- Redacted diagnostic export.
- Testnet account reset or stale open orders.

---

# 16. Learning from established open-source projects

These projects are references for architecture and validation patterns, **not code to copy blindly**. Review their licenses and dependency licenses before reusing code. The Delta Exchange adapter and all order semantics must still be verified for the selected Testnet environment.

## 16.1 Freqtrade

- Repository: https://github.com/freqtrade/freqtrade
- Documentation: https://www.freqtrade.io/en/stable/
- Backtesting docs: https://www.freqtrade.io/en/stable/backtesting/

**Useful lessons:**
- Separate strategy definitions from engine behavior.
- Keep historical data and backtest workflows explicit.
- Use dry-run/paper modes before any live trading.
- Persist trade state and provide a web UI/monitoring path.
- Report performance with assumptions and caveats.
- Check look-ahead bias and recursive indicator behavior.
- Make strategy configuration reproducible.

**Do not assume:** Freqtrade's exchange integrations or spot-oriented sizing rules directly apply to Delta Exchange India derivatives. Treat its architecture as inspiration, not a plug-in adapter.

## 16.2 Jesse

- Repository: https://github.com/jesse-ai/jesse
- Documentation: https://docs.jesse.trade/

**Useful lessons:**
- Strategy research, backtesting, and execution should share clear semantics.
- Visualizing candles, indicators, and trade decisions helps explain strategy behavior.
- Chronological evaluation and avoiding look-ahead bias are essential.
- Parameter optimization needs safeguards against overfitting.
- Reproducible research artifacts make results reviewable.

**Potential adaptation:** create a dashboard trade inspector that shows the exact candle, indicators, signal reasons, entry/exit, and cost assumptions.

## 16.3 Hummingbot

- Repository: https://github.com/hummingbot/hummingbot
- Documentation: https://hummingbot.org/docs/

**Useful lessons:**
- Isolate exchange connectors behind consistent interfaces.
- Separate strategy decisions from order execution.
- Use explicit executors/order lifecycle components.
- Model position and exit behavior as managed state, not one-off API calls.
- Keep connector-specific behavior out of strategy rules.

**Caution:** Hummingbot contains market-making and other strategies that are outside this product's scope. Learn connector and lifecycle patterns; do not add market making to v1.

## 16.4 Recommended learning checklist

- [ ] Read the project architecture and module boundaries.
- [ ] Read how strategies are represented and tested.
- [ ] Read order-state handling, cancellation, and partial-fill paths.
- [ ] Read backtest assumptions and look-ahead bias guidance.
- [ ] Read persistence/restart recovery design.
- [ ] Read Web UI and API authentication patterns.
- [ ] Check licenses before copying any code.
- [ ] Write an ADR explaining what was adopted, adapted, or rejected.
- [ ] Implement a small original Delta adapter; do not import a large framework just to avoid understanding the execution path.

## 16.5 What we should build ourselves

- Delta India Testnet adapter and verified API contract.
- The chosen hybrid strategy and reason codes.
- The risk policy and state machine.
- Exchange reconciliation behavior.
- Dashboard integration for our own event schema.
- Testnet-specific acceptance and failure tests.

---

# 17. Required project documentation

These documents should exist in the repository after build starts. The master specification here defines their contents.

| File | Purpose | Must contain |
|---|---|---|
| `README.md` | First entry point | Overview, features, architecture diagram, setup, Testnet warning, environment variables, tests, run commands, demo |
| `docs/PRODUCT_SPEC.md` | Product requirements | Scope, users, functional/non-functional requirements, acceptance criteria |
| `docs/STRATEGY.md` | Algorithm | Indicators, exact entry/exit rules, NO TRADE conditions, parameters, examples, limitations |
| `docs/RISK_POLICY.md` | Risk design | Sizing model, limits, protective exits, halt/cooldown, emergency policy |
| `docs/API_CONTRACT.md` | Exchange contract | Official URLs, auth/signing requirements, endpoints, payload schemas, product metadata, verified date |
| `docs/ARCHITECTURE.md` | System design | Components, data flow, state machine, sequence diagrams, failure boundaries |
| `docs/DATA_AND_METRICS.md` | Data and KPI definitions | Data provenance, candle schema, cost assumptions, metrics definitions, evaluation methodology |
| `docs/SECURITY.md` | Security posture | Secret handling, permissions, redaction, threat assumptions, rotation procedure |
| `docs/TEST_PLAN.md` | Verification plan | Unit/contract/integration/replay/failure/UI tests and pass/fail evidence |
| `docs/RUNBOOK.md` | Operations | Startup, shutdown, incident recovery, kill switch, common errors |
| `docs/DEMO_SCRIPT.md` | Hackathon presentation | Timed demo, prerequisites, fallback behavior, evidence checklist |
| `docs/ADR/0001-architecture.md` | Architecture decision record | Why modular monolith, Python/FastAPI, SQLite first, frontend decision |
| `docs/ADR/0002-market-and-strategy.md` | Strategy decision record | Market selection, timeframe, baseline parameters, alternatives rejected |
| `docs/ADR/0003-execution-safety.md` | Safety decision record | Idempotency, reconciliation, protective exits, state machine |
| `CHANGELOG.md` | Release history | Meaningful changes and behavior changes |
| `CONTRIBUTING.md` | Team workflow | Branches, tests, review expectations, style, commit guidance |
| `LICENSE` | Repository licensing | Chosen license after team approval; do not invent one automatically |

### README minimum outline

1. Project name and Testnet-only warning.
2. What the bot does and does not do.
3. Architecture diagram.
4. Requirements and supported environment.
5. How to create a Demo/Testnet API key.
6. Environment variable table.
7. Install/setup steps.
8. Start backend and dashboard.
9. Run tests.
10. Strategy and risk summary.
11. Troubleshooting.
12. Security warning and key rotation.
13. Demo script.
14. Known limitations.
15. References and third-party license notices.

---

# 18. Implementation roadmap and ticket breakdown

**Do not create the repository until the specification and ticket plan are approved.** Once approved, create a public repository only after a secret-handling review.

## Phase 0 — Research and contract verification

**Deliverables:** verified API contract, market-selection criteria, exit semantics, open-decision register.

Tickets:
- T0.1: Verify current Testnet URLs and authentication signing.
- T0.2: Verify product metadata and choose an eligible product.
- T0.3: Verify candle/market-data sources and reconnect semantics.
- T0.4: Verify order lifecycle, protective exits, partial fills, and close semantics.
- T0.5: Finalize exact strategy and stop/target formulas.

**Exit gate:** no implementation of order submission until the contract is understood.

## Phase 1 — Project skeleton and configuration

- T1.1: Create repository and branch/CI conventions.
- T1.2: Add validated configuration and `.env.example`.
- T1.3: Add typed schemas, structured logging, redaction.
- T1.4: Add health/readiness endpoints and test skeleton.
- T1.5: Write initial README and architecture ADR.

**Exit gate:** clean setup and tests run without exchange credentials.

## Phase 2 — Read-only exchange integration

- T2.1: Implement authenticated REST client.
- T2.2: Implement product discovery and metadata validation.
- T2.3: Implement market-data reader and candle source.
- T2.4: Implement freshness/heartbeat/reconnect logic.
- T2.5: Read positions/open orders and build reconciliation snapshot.

**Exit gate:** read-only Testnet connectivity and recovery work; no order creation.

## Phase 3 — Strategy engine

- T3.1: Implement candle validation/closure.
- T3.2: Implement and test EMA/RSI/ADX.
- T3.3: Implement long/short/no-trade rules.
- T3.4: Add reason codes and strategy-version/config hash.
- T3.5: Add deterministic replay fixtures and examples.

**Exit gate:** deterministic tests pass; strategy cannot send orders.

## Phase 4 — Risk and state management

- T4.1: Implement contract-aware sizing.
- T4.2: Implement position and unresolved-order limits.
- T4.3: Implement per-trade/daily loss controls and cooldown.
- T4.4: Implement stale-data, spread/cost, and readiness gates.
- T4.5: Implement state machine and kill-switch semantics.

**Exit gate:** risk and state transitions are independently tested.

## Phase 5 — Event journal and reconciliation

- T5.1: Add persistence models/repositories.
- T5.2: Persist decisions, risk decisions, events, and state transitions.
- T5.3: Reconcile local/exchange orders and positions.
- T5.4: Handle ambiguous timeouts without blind retries.
- T5.5: Test restart recovery and database failure behavior.

**Exit gate:** uncertain state blocks new entries.

## Phase 6 — Testnet execution lifecycle

- T6.1: Implement order submission through the single execution service.
- T6.2: Add idempotency/client ID behavior according to verified API contract.
- T6.3: Track acknowledgement, fills, partial fills, rejection, cancellation.
- T6.4: Implement protective exits and verify actual accepted state.
- T6.5: Implement safe close/kill workflow.
- T6.6: Test full lifecycle on Testnet.

**Exit gate:** no duplicate entries or unprotected exposure in required test scenarios.

## Phase 7 — Dashboard

- T7.1: Finalize wireframes and API contracts.
- T7.2: Build overview and system-state components.
- T7.3: Build signals and reason-detail views.
- T7.4: Build orders/positions and protection status.
- T7.5: Build risk controls and confirmed operator actions.
- T7.6: Build events, metrics, loading/error/stale states.

**Exit gate:** UI reflects backend/exchange state and cannot bypass risk checks.

## Phase 8 — Evaluation and replay

- T8.1: Add data validation and provenance.
- T8.2: Implement deterministic replay.
- T8.3: Add costs and slippage assumptions.
- T8.4: Compare hybrid against baselines.
- T8.5: Generate a transparent performance report.

**Exit gate:** metrics can be reproduced; limitations are documented.

## Phase 9 — Reliability hardening

- T9.1: Test feed disconnect/stale events.
- T9.2: Test ambiguous order response and duplicate signal.
- T9.3: Test partial fill and protective-order rejection.
- T9.4: Test restart with open exposure.
- T9.5: Test kill switch and daily halt.
- T9.6: Test secret redaction, persistence failure, and rate limiting.

**Exit gate:** no unresolved safety-critical defects.

## Phase 10 — Submission and demo

- T10.1: Finish all documentation.
- T10.2: Run clean-checkout verification.
- T10.3: Scan repository/history for secrets.
- T10.4: Rehearse the demo and capture evidence.
- T10.5: Prepare final architecture and risk explanation.

**Exit gate:** judges can see Testnet connectivity, a real Testnet execution when conditions permit, position/order status, risk behavior, and reproducible documentation.

### Ticket quality rules

Each ticket must include:
- goal and reason;
- dependencies;
- in-scope and out-of-scope behavior;
- acceptance criteria;
- tests to add/run;
- risks and failure cases;
- evidence required for completion.

Keep tickets small. Do not combine strategy tuning, order execution, and frontend work into one giant ticket. Implement safety-sensitive behavior test-first and review each ticket before moving on.

---

# 19. Three-minute demo plan

| Time | Action | Evidence |
|---|---|---|
| 0:00–0:30 | Show Testnet connection and selected product | Environment label, product metadata, feed health, readiness |
| 0:30–1:05 | Explain hybrid strategy | Trend filter, pullback, signal reason, NO TRADE reason |
| 1:05–1:50 | Show automated Testnet execution | Actual order acknowledgement/fill, position, protective-exit status, event trace |
| 1:50–2:25 | Demonstrate failure protection | Stale feed or controlled fault; entries blocked; alert and recovery shown |
| 2:25–3:00 | Show architecture, tests, and docs | Risk policy, README, test evidence, repository structure |

If no signal occurs during the demo, use a clearly labelled replay/fixture to explain the strategy. Do not claim a simulated order is a real Testnet execution. Rehearse a valid Testnet flow in advance and preserve a safe fallback.

---

# 20. Open decisions that must be resolved

| Decision | Current status | Required action |
|---|---|---|
| Exact market/product | Not selected | Discover eligible Testnet products and verify metadata |
| Exact pullback formula | Baseline only | Define measurable distance/condition around EMA20 |
| Exact candle confirmation | Baseline only | Define candle/body/wick conditions and edge cases |
| Stop-loss formula | Not frozen | Choose swing-based or volatility-based rule and validate |
| Take-profit formula | Not frozen | Choose fixed R multiple, trailing rule, or deterministic strategy exit |
| Maximum holding time | Open | Decide whether to use time stop |
| Dashboard framework | Open | Choose based on team skill and API contract |
| Historical data source | Not assumed available | Record Testnet data or document lawful external source |
| Deployment target | Local first | Decide whether secured remote deployment is needed |
| Team ownership | Unassigned | Assign exchange/backend, strategy/risk, frontend, QA/demo/docs |
| License | Not chosen | Team approval required before repository publication |

---

# 21. References

These sources were consulted during planning. Always check current official docs and repository licenses before implementation. Reference links below are for study and design inspiration, not a guarantee that a specific implementation is compatible with Delta Testnet.

## Official exchange documentation

1. **Delta Exchange API documentation** — REST API, authentication, product discovery, orders, positions, fills, WebSocket feeds, and API errors.  
   https://docs.delta.exchange/

## Open-source trading systems

2. **Freqtrade repository** — Python trading bot, strategy separation, persistence, dry-run, backtesting, Web UI.  
   https://github.com/freqtrade/freqtrade

3. **Freqtrade documentation** — setup, strategies, data handling, backtesting assumptions, and analysis.  
   https://www.freqtrade.io/en/stable/

4. **Freqtrade backtesting documentation** — data requirements, simulation assumptions, metrics, and limitations.  
   https://www.freqtrade.io/en/stable/backtesting/

5. **Jesse repository** — Python algorithmic trading framework, strategy research, backtesting, optimization, and visual analysis.  
   https://github.com/jesse-ai/jesse

6. **Jesse documentation** — strategy, research, testing, and analysis workflows.  
   https://docs.jesse.trade/

7. **Hummingbot repository** — connector abstractions, strategy/executor concepts, and order-lifecycle patterns.  
   https://github.com/hummingbot/hummingbot

8. **Hummingbot documentation** — connector and strategy architecture.  
   https://hummingbot.org/docs/

## Reference-use policy

- Read source and docs; do not blindly copy code.
- Verify the license for the exact code or dependency being reused.
- Attribute borrowed ideas and retain required license notices.
- Do not copy secrets, exchange credentials, or hard-coded production endpoints.
- Confirm all exchange-specific order behavior from Delta's current docs.
- Keep an ADR recording what patterns were adopted and why.

---

# 22. Final definition of the product

The target is a **Testnet-only, explainable, risk-gated automated trading system** with:

- a hybrid trend/momentum/pullback strategy;
- verified Delta Exchange India Testnet integration;
- a complete order lifecycle and protective-exit checks;
- a risk manager and explicit state machine;
- reconciliation and restart recovery;
- a web dashboard for signals, orders, positions, performance, risk, and health;
- event journaling, metrics, alerts, and secret redaction;
- deterministic tests, replay/evaluation, and fault testing;
- clear README, API contract, strategy, risk, security, runbook, and demo documentation;
- a reproducible hackathon demonstration.

This is a complete planning blueprint, not a claim that all implementation decisions are already proven. The API contract, exact entry/exit details, product selection, and dashboard framework are explicit approval gates.

**Current state remains planning. No repository, source code, or GitHub changes have been created.**

---

## Appendix A — Recommended first implementation review

Before tickets are approved, answer these in a short design review:

1. What exact EMA20 pullback distance/condition counts as a valid setup?
2. What exact closed-candle rule confirms long and short entries?
3. What is the stop-loss formula and the maximum stop distance?
4. What is the take-profit or exit formula?
5. Which Testnet product is eligible after live metadata discovery?
6. Which protective order types and close semantics are verified by Delta docs?
7. What is the chosen dashboard framework?
8. Which recorded dataset will be used for replay and evaluation?
9. Who owns exchange integration, strategy/risk, UI, and demo/testing?
10. What test evidence is required before the first Testnet order is enabled?

## Appendix B — First safe vertical slice

The first runnable slice should not place orders. It should:

1. start in `INITIALIZING`;
2. validate configuration;
3. connect read-only to Testnet;
4. discover and validate product metadata;
5. fetch or subscribe to market data;
6. build closed candles and calculate indicators;
7. emit LONG/SHORT/NO TRADE with reason codes;
8. show state and signals in the dashboard;
9. persist a minimal audit trail;
10. pass unit, contract, and failure tests.

Only after this slice is stable should order execution be added behind the risk manager and reconciliation layer.
