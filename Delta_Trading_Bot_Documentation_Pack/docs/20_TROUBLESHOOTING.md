# 20 — Troubleshooting Guide

This guide gives safe diagnostic order. Never print API secrets or bypass safety to get a green state.

## Invalid API key / 401
- Confirm API key belongs to Demo/Testnet, not production.
- Confirm endpoint host allowlist and environment setting match.
- Check key is active and has the required permission.
- Check signature canonicalization, timestamp, body bytes, User-Agent and system clock against current official docs.
- Stop order mutation attempts until auth works; logs must be sanitized.

## 403/CDN/IP error
- Check required User-Agent header, host and hosting/network restrictions documented by Delta.
- Don't switch to production host to make the error disappear.
- Use local Testnet read-only verification while diagnosing.

## 429/rate limit
- Stop tight retry loops.
- Apply capped backoff and respect documented wait guidance.
- Reuse WS connection appropriately and avoid reconnect storms.
- Ensure dashboard polling is not generating excessive requests.

## WS disconnect / no updates
- Mark data/account feed unhealthy and block entries.
- Check heartbeat, idle timeout, channel name and subscription acknowledgement.
- Reconnect with capped exponential backoff and jitter.
- Restore candle continuity and query REST orders/positions before resuming.
- Verify new channel names against current docs; do not copy deprecated legacy channel examples.

## Signals never appear
- Check system state, product status and last market-data time.
- Verify indicator warm-up and closed-candle alignment.
- Inspect `NO_TRADE` reason counts and exact thresholds.
- Use deterministic fixtures to validate signal engine separately.
- Do not relax rules without recording an experiment and rerunning tests.

## Order timeout / unknown result
- Do not repeat POST blindly.
- Mark `UNKNOWN_NEEDS_RECONCILIATION` and block entries.
- Query order/positions/fills with verified IDs and reconcile.
- Escalate to operator if uncertainty remains.

## Protective order missing
- Block entries and raise critical alert.
- Inspect exchange truth, filled quantity and order status.
- Run only the already approved emergency policy.
- Record a regression test before resuming development/demo.

## Bot doesn't resume after restart
- Expected if reconciliation/readiness has not passed.
- Inspect specific readiness failure rather than forcing RUNNING.
- Resolve metadata, feed, open-order, position or journal mismatch.
- Reconcile again and use guarded resume.

## Dashboard stale/mismatched
- Display last update and source.
- Check API health/readiness, query error state and client cache invalidation.
- Do not mask a reconciliation mismatch with optimistic UI state.

## Secret appeared in log/repository
- Assume compromised; revoke/rotate first.
- Check artifacts, CI logs, history and recordings.
- Run secret scan, clean exposure and add regression test.
