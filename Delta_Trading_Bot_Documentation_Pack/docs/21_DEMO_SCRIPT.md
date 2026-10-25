# 21 — Three-Minute Hackathon Demo Script

## Preconditions (before judges arrive)
- Testnet-only environment verified; no mainnet credentials loaded.
- Product dynamically discovered and shown on dashboard.
- Market data fresh; indicators warmed up.
- A real Testnet execution rehearsal has passed recently, including protective exit verification.
- Replay fixture prepared as a clearly labelled fallback if live signal timing doesn't align.
- No secrets or private account identifiers visible.

## Script

### 0:00–0:30 — Connectivity and state
Show `TESTNET`, product metadata, data freshness, current bot state and readiness. Explain that startup is non-trading until configuration and reconciliation pass.

### 0:30–1:05 — Strategy
Show 15m EMA50/EMA200 trend, 5m EMA20 pullback, RSI/ADX confirmation and a reason-coded LONG/SHORT/NO_TRADE decision. State parameters are hypotheses and the product is not claiming guaranteed profits.

### 1:05–1:50 — Automated Testnet execution
When a valid signal occurs, show order acknowledgement/fill, current position and protective exit status from exchange-reconciled state. Use the order/event timeline to explain the lifecycle.

### 1:50–2:25 — Risk/failure behavior
Trigger a safe, rehearsed failure such as a simulated stale-feed event or controlled test mode. Show that new entries are blocked, reason appears, alert is raised, and recovery requires readiness/reconciliation.

### 2:25–3:00 — Engineering evidence
Show architecture, risk policy, tests, docs and reproducible setup. Mention what is deliberately not implemented: mainnet, HFT, arbitrage and unverified protective features.

## If no signal occurs
Use a labelled replay/fixture to explain the algorithm, but do not call it a real Testnet order. If the event judges require a real execution, arrange the actual Testnet path in the rehearsal and comply with exchange/organizer instructions. Never bypass the risk manager or loosen rules solely for the demo.

## Demo acceptance
- [ ] Connection is real Testnet state.
- [ ] If showing execution, it is an actual Testnet action with verified exchange state.
- [ ] If showing replay, it is labelled as simulation.
- [ ] Risk rejection or stale-data block is shown.
- [ ] Stop/target/protection state is evidenced, not assumed.
- [ ] Secrets are not visible.
