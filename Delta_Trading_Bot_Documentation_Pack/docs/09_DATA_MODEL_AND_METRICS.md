# 09 — Data Model, Event Journal, and Metrics

## Core records

### ProductMetadata
Product ID/symbol/status, type, contract size/multiplier, tick size, quantity step/minimum/maximum, quote/settlement properties, metadata source and observed time. Persist only fields supported by current API response.

### MarketEvent and Candle
Record event ID, product, channel/source, exchange timestamp, received timestamp, schema version and normalized payload. Candle record includes timeframe, open/close time, OHLCV, closed flag and source. Keep exchange time and local receive time separate.

### StrategyDecision
Decision ID, UTC timestamp, strategy version, config hash, `LONG`/`SHORT`/`NO_TRADE`, stable reason codes, indicator snapshot and source candle IDs.

### RiskDecision
Decision ID, allowed/denied, rejection codes, requested and approved quantity, risk budget, estimated loss/cost, stop/target plan identifier and risk config version.

### Order / Fill / PositionSnapshot
Order: client ID, exchange ID if available, product, side, type, requested quantity, internal state, raw exchange state mapping, safe flags and timestamps. Fill: exchange fill ID, order ID, price, quantity, fee, fee currency and timestamp. Position snapshot: product, side, quantity, average entry and exchange-reported P&L fields where available, observation and reconciliation timestamps.

### BotStateEvent / Alert / SessionMetrics
State events record from/to state, reason, trigger and timestamp. Alerts record severity, code, message, created/acknowledged/resolved time. Metrics snapshots include session, trade count, P&L basis, fees, drawdown and reliability counters.

## Journal invariants

- Persist state transitions, decisions, risk outcomes and order/fill events.
- Prefer append-only event facts plus rebuildable projections.
- Use schema versions and migrations.
- Use UTC timezone-aware timestamps; preserve monotonic durations separately.
- Use correlation IDs across signal → risk → order → fill.
- Redact secrets before persistence.
- Do not hold a DB transaction open while waiting on the exchange network.
- If durable audit/recovery persistence fails, block new entries.
- Never commit a local account database to public GitHub.

## Metric definitions

- **Net P&L:** explicit equity/P&L basis, realized/unrealized handling, fees and slippage convention. Confirm whether exchange P&L already includes particular fees to avoid double counting.
- **Win rate:** profitable closed trades / all closed trades in a defined window; not sufficient on its own.
- **Expectancy:** mean net outcome per closed trade; report sample size.
- **Maximum drawdown:** peak-to-trough decline in a documented equity series, including a stated treatment of open P&L.
- **Average winner/loser:** average net outcome over winning/losing closed trades.
- **Acknowledgement latency:** submit attempt to exchange acknowledgement using a monotonic clock.
- **Fill latency:** submit attempt to fill, noting partial fills.
- **Stale-data rejection rate:** number/rate of decisions blocked by freshness/data checks.
- **Reconciliation mismatch:** count and duration of local/exchange disagreement.
- **Duplicate entry count:** target zero in required test scenarios.
- **Unprotected exposure:** target zero in completed required execution scenarios.
- **Recovery time:** detected fault to restored readiness after reconciliation.

## Data-quality checks

Detect duplicates, missing intervals, out-of-order updates, timezone/timestamp-unit inconsistencies, unclosed candles, impossible OHLC relationships, stale reception, metadata changes and missing cost fields. Missing data must not be silently imputed into tradable signals.

## Performance report fields

Environment/source, time range, strategy/config hash, number of signals/trades, costs and slippage, metric definitions, limitations, sample size, and whether the results are Testnet, replay, or external historical data. Never merge simulated fills with actual Testnet fills without distinct labels.
