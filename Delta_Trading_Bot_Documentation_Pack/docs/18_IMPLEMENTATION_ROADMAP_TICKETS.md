# 18 — Implementation Roadmap and Ticket Backlog

Tickets are created only after spec approval. Each ticket must contain goal, dependencies, in/out of scope, acceptance criteria, tests, safety impact and rollback/evidence.

## EPIC 0 — Contract and product decision
- T0.1 Verify REST/WS host, auth/signing, timestamp/User-Agent and rate limits.
- T0.2 Verify product metadata and choose eligible Testnet market.
- T0.3 Verify candle feed/history and WS channel schema.
- T0.4 Verify order types, client IDs, partial fills, cancels, protective exit and close semantics.
- T0.5 Approve exact pullback, candle confirmation, stop, target and time-stop rules.

**Exit gate:** no order-write code until the official contract and exit plan are documented.

## EPIC 1 — Skeleton/config/CI
- T1.1 Create repository and branch/PR rules.
- T1.2 Add validated configuration, Testnet host allowlist and `.env.example`.
- T1.3 Add structured logging and redaction.
- T1.4 Add typed API schemas and liveness/readiness.
- T1.5 Add locked packages, test tools and CI.

## EPIC 2 — Read-only exchange adapter
- T2.1 REST auth/signature module with dummy-vector tests.
- T2.2 Product discovery and contract metadata validation.
- T2.3 Market data read and candle normalizer.
- T2.4 Data freshness/gap detection.
- T2.5 WS reconnect/heartbeat after REST path works.
- T2.6 Read positions/open orders and reconciliation snapshot.

**Exit gate:** stable read-only connectivity; no orders submitted.

## EPIC 3 — Strategy engine
- T3.1 Closed-candle builder/validator.
- T3.2 EMA/RSI/ADX implementation and reference fixtures.
- T3.3 Long/short/no-trade rules.
- T3.4 Stable reason codes and strategy config hash.
- T3.5 Deterministic replay fixtures.

## EPIC 4 — Risk manager/state
- T4.1 Contract-aware size calculation.
- T4.2 Position/open-order caps.
- T4.3 Per-trade and daily loss controls.
- T4.4 Data/spread/cost/cooldown checks.
- T4.5 Bot state machine and kill/pause/resume semantics.

## EPIC 5 — Persistence/reconciliation
- T5.1 Event/order/fill schema and migrations.
- T5.2 Decision and risk audit journal.
- T5.3 Exchange-vs-local reconciliation.
- T5.4 Ambiguous submit handling.
- T5.5 Restart with open exposure and DB failure tests.

## EPIC 6 — Execution
- T6.1 Single execution service and client ID policy.
- T6.2 Order submit/query/cancel.
- T6.3 Partial fills/cancel races/rejections.
- T6.4 Protective exits and verification.
- T6.5 Safe close/kill workflow.
- T6.6 Testnet lifecycle test suite.

**Exit gate:** full execution safety criteria pass before regular demo use.

## EPIC 7 — Dashboard
- T7.1 UI wireframe/component system.
- T7.2 Overview and state/health indicators.
- T7.3 Signals + reason details.
- T7.4 Positions/orders/protection status.
- T7.5 Risk controls and safe operator actions.
- T7.6 Performance/events/loading/stale/error states.

## EPIC 8 — Evaluation
- T8.1 Data ingestion/provenance validation.
- T8.2 Replay evaluator.
- T8.3 Fees/slippage assumptions.
- T8.4 Hybrid vs baseline comparisons.
- T8.5 Transparent results report with holdout.

## EPIC 9 — Hardening and submission
- T9.1 Stale/disconnect/reconnect test.
- T9.2 Timeout/rejection/duplicate/partial-fill tests.
- T9.3 Protection failure/restart/kill tests.
- T9.4 Secret/license/dependency scans.
- T9.5 Clean-install documentation rehearsal.
- T9.6 Three-minute hackathon demo and final review.

## Ticket policy
Use focused increments and fresh work contexts where practical. Test safety-sensitive code first. A ticket is not done until tests and docs are updated and evidence is recorded.
