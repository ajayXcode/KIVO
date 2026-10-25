# 06 — Delta Exchange India Testnet API Contract

**Authority:** https://docs.delta.exchange/ . The information below is a planning snapshot and must be verified at build time using current official docs and read-only tests in the configured Demo/Testnet account.

## Environment references

Official docs distinguish India production credentials from Demo/Testnet credentials and warn that using the wrong environment causes an invalid API key error. The docs currently show these Testnet/Demo references:

- REST: `https://cdn-ind.testnet.deltaex.org`
- Private WebSocket: `wss://socket-ind.testnet.deltaex.org`
- Public WebSocket: `wss://socket-ind-pub.testnet.deltaex.org`

Reconfirm these URLs before implementation and prevent all production hosts at config validation. Never reuse keys between Demo and production.

## Authentication

The official docs describe `api-key`, `signature`, `timestamp`, regular content/accept headers and documented User-Agent requirements as applicable. REST signature uses HMAC-SHA256 over a precise canonical combination of method, timestamp, path, query and body. Exact canonicalization, timestamp format, allowed clock drift and body bytes must come from current docs and pass known-vector tests. The private WebSocket docs have described `key-auth`; older auth examples were deprecated in a dated changelog—verify the current Testnet protocol.

Rules: isolate signing code, sign exactly what is sent, never log prehash/signature/auth headers, validate clock/host first, and fail closed on auth errors.

## Endpoint families to verify

| Purpose | Path family from docs | Required validation |
|---|---|---|
| Product discovery | `GET /v2/products` | Fields, pagination, product status and contract metadata |
| Create order | `POST /v2/orders` | Required payload fields, order types, constraints |
| Active orders | `GET /v2/orders` | Query filters, status mapping, pagination |
| Order history | `GET /v2/orders/history` | Filters and pagination |
| Positions | `GET /v2/positions` | Correct authoritative exposure representation |
| Fills | `GET /v2/fills` | Fill IDs, quantity, fee and currency |
| Recent public trades | `GET /v2/trades/{symbol}` | Valid symbol/source semantics |
| Candles | Current history/candles docs | Testnet support, resolutions, candle finality and gaps |

Do not treat endpoint families as a complete contract. Record the exact schema and sample sanitized responses during read-only phase.

## Product metadata to verify

Product ID/symbol/status, product type, underlying/quote/settlement assets, contract size/multiplier, price tick, quantity step/minimum/maximum, margin/leverage properties where relevant, supported order types and protective-exit behavior. Field names and constraints must follow the live response schema. Missing safety-critical metadata blocks order submission.

## WebSocket

The API docs describe public channels such as `ob_l1`, `ob_l2`, `ob_updates`, `ticker`, `trades`, `candlesticks`, and `system_status` in the API family. A dated docs update described migration of several legacy production channels by 31 July 2026; do not copy deprecated legacy channel examples. Verify which channel names are supported on the exact India Testnet public endpoint. Validate subscribe acknowledgements, heartbeat, idle timeout and reconnect semantics. The docs mention connection-rate limits (including 150 attempts per five minutes per IP) and disconnection after inactivity for the API family; confirm the exact Testnet applicability.

On reconnect: re-establish subscriptions, restore candle continuity, then REST-reconcile open orders/positions before resuming. WebSocket is not the only recovery source of truth.

## Before implementing order writes, verify

- order types, required payloads, time-in-force and trigger fields;
- stop-loss/take-profit and bracket/OCO support if any;
- reduce-only and close-position semantics;
- client order ID max length/format (docs have noted 32 characters in a dated update; confirm current limit);
- idempotency semantics (do not assume client ID alone deduplicates);
- partial fills, cancel/fill races, order states, positions and fills;
- margin/contract sizing rules;
- rate limits and errors;
- whether a deadman/cancel-on-disconnect feature is available (do not assume it exists).

## Contract tests

1. Wrong host/mode rejected before network activity.
2. Bad Testnet credentials produce non-trading state.
3. Signature known-vector tests pass.
4. Product metadata and quantity/price constraints use live metadata.
5. Auth, timestamp, validation, rate-limit, timeout and server errors have distinct safe handling.
6. WebSocket auth/subscription and reconnection are validated on Testnet.
7. Read-only positions/orders/fills reconcile after reconnect/restart.
8. Order lifecycle tests only occur after all safety gates and only with Testnet credentials.

## Source

Official docs: https://docs.delta.exchange/ . Re-check API changelog before each release/milestone. Public examples are illustrative; never reuse any example credential.
