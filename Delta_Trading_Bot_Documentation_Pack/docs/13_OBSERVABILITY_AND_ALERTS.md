# 13 — Observability, Logging, Metrics, and Alerts

## Structured logs

Include UTC timestamp, level, component, request/correlation ID, decision ID, client/exchange order ID when available, bot state, event code and safe context. Use redaction before logs are emitted. Never include API secrets, signatures, authorization headers, full signed prehash or secret environment dumps.

## Metrics

### Data/feed
- market data age by source/product;
- feed connected/disconnected and reconnect count;
- missing/out-of-order candle count;
- time since last complete candle;
- resubscription/restoration status.

### Exchange/execution
- REST status/error count and rate-limit count;
- request latency by safe operation category;
- order acknowledgement and fill latency;
- order rejection/partial-fill/cancel counts;
- unknown-order count and time to reconcile;
- protective exit accepted/rejected/unknown counts.

### Strategy/risk
- signals by type/reason;
- risk allow/deny counts by reason code;
- risk budget usage;
- daily loss usage;
- position count and unresolved order count;
- P&L metrics with explicit basis.

### Reliability
- state transition counts/durations;
- reconciliation mismatch count/duration;
- database write failures;
- restart recovery duration;
- kill switch count.

Avoid high-cardinality labels such as raw order IDs or arbitrary error strings in Prometheus metrics. Put detailed identifiers in logs/events instead.

## Alert severity

| Severity | Meaning | Examples |
|---|---|---|
| INFO | Routine operational event | Bot started in INITIALIZING, strategy emitted NO TRADE |
| WARNING | Degraded but contained | transient reconnect, high spread, cooldown |
| ERROR | Trading blocked or reconciliation needed | auth error, stale feed past threshold, mismatch, DB failure |
| CRITICAL | Exposure/protection may be unsafe or credentials may be compromised | protective exit rejected, unknown exposure, suspected key leak |

Critical alerts should not be hidden by routine updates. Alerts must not block the trading/event loop; use bounded queues and safe failure behavior.

## Health endpoints

- Liveness means process responds.
- Readiness means required config/dependencies/data/reconciliation checks pass.
- A process can be live but not ready; UI must show that distinction.
- Do not expose secrets or account details on health endpoints.

## Logging acceptance

Use fake canary secrets in tests and prove logs/exports/API error messages do not contain them. Ensure diagnostic export is redacted by default.
