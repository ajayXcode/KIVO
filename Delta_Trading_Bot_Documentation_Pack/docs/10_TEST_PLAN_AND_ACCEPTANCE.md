# 10 — Test Plan and Acceptance Criteria

## Test layers

1. **Unit:** indicators, candle closure/alignment, strategy rules, sizing, daily loss, cooldown, bot state and order-state mapping.
2. **Contract:** Delta response parsing, HMAC signing with dummy test credentials, metadata validation, endpoint/error mapping, order payload schemas.
3. **Integration:** Testnet auth/product discovery/positions/orders/fills/cancel/protective exits. Mutation tests must require explicit opt-in and a dedicated Testnet account.
4. **Replay:** deterministic signals from recorded data, costs/slippage and baseline comparisons.
5. **Failure-mode:** stale feed, reconnect, REST timeout, ambiguous submit, 429, partial fill, cancel race, protective exit rejection, restart, DB failure, clock/auth failure and kill switch.
6. **Frontend:** loading/empty/stale/disconnected/unauthorized/error states, status/reasons, confirmations, controls, redaction.
7. **E2E:** clean-checkout launch, dashboard state and controls. Testnet E2E must be separate from mocked test suite.

## Mandatory acceptance matrix

| ID | Scenario | Expected |
|---|---|---|
| QA-01 | Invalid Testnet credentials | Safe non-trading state; sanitized error |
| QA-02 | Production URL configured | Startup rejects before order path |
| QA-03 | Incomplete product metadata | No entries |
| QA-04 | Warm-up insufficient | `NO_TRADE` |
| QA-05 | Long valid fixture | Deterministic long candidate with reasons |
| QA-06 | Short valid fixture | Deterministic short candidate with reasons |
| QA-07 | Candle incomplete | No tradable signal |
| QA-08 | Data stale/out of order | Entry blocked and event persisted |
| QA-09 | Invalid size/step/minimum | Rejected before request |
| QA-10 | Open/unresolved order | Entry blocked |
| QA-11 | Same signal delivered twice | No duplicate exposure |
| QA-12 | Submit timeout after request may have reached exchange | Reconcile before any retry |
| QA-13 | Partial fill | Track actual exposure; protect actual filled amount |
| QA-14 | Protective exit rejected/missing | Critical alert, halt entries, approved safety workflow |
| QA-15 | Daily loss threshold hit | Halt entries |
| QA-16 | Kill switch activated | New entries blocked immediately |
| QA-17 | Restart with exposure | INITIALIZING until exchange state reconciled |
| QA-18 | Journal/database fails | Entry blocked if recovery/audit guarantees are compromised |
| QA-19 | Fake secret in error path | Secret absent from logs and API result |
| QA-20 | Crafted dashboard control request | Backend validation still blocks unsafe action |
| QA-21 | Fixture/replay data used | UI labels it non-Testnet/simulated |
| QA-22 | Clean checkout | README yields install/test path |

## CI evidence

Required: backend lint, type checker, unit/contract tests, coverage report; frontend type-check, lint, component tests and production build; dependency audits; secret scan. Playwright smoke tests are added for core operator flows.

## Coverage policy

Coverage is a diagnostic, not proof of safety. Critical risk/state transitions need explicit tests regardless of the aggregate percentage. Add regression tests for each discovered safety bug.

## Release no-go conditions

- Any unresolved critical/high safety defect.
- Order can bypass risk manager.
- Wrong environment could be selected silently.
- Unknown submit outcome can trigger a blind retry.
- Protective exit state is assumed rather than verified.
- Restart can enter RUNNING before reconciliation.
- Test or demo can confuse a fixture with a real Testnet order.
