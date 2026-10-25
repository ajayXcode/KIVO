# 23 — Threat Model

## System boundary
One local-first Testnet trading process, a React dashboard, a local event journal and a Delta Demo/Testnet API connection. Remote multi-user deployment is a separate future design.

## Actors
- Intended local operator/developer.
- Malicious or accidental browser-origin request.
- Stolen Testnet credential holder.
- Malformed/changed exchange responses or interrupted network.
- Compromised/malicious package or GitHub Action.
- Operator making an erroneous control or config change.

## Abuse cases and controls

| Abuse/failure case | Impact | Primary control | Test/evidence |
|---|---|---|---|
| Change endpoint to production | Mainnet use | URL allowlist and explicit environment enum | Production host rejected before network |
| Steal API secret from UI | Account/API compromise | Secret only backend env; never Vite bundle | Bundle scan and secret grep test |
| Forge dashboard request to place size/order | Risk bypass | No generic order proxy; server schema/risk gate | Adversarial route tests |
| Replay duplicate signal | Duplicate order | Signal/execution idempotency and open-order check | Duplicate fixture test |
| Timeout hides accepted order | Duplicate exposure | Unknown state + reconciliation before retry | Simulated lost response test |
| Stale/out-of-order market data | Invalid trade | Timestamp/gap/closure checks | Stale/gap fixture tests |
| WS reconnect storms | Throttling/unavailability | Capped backoff/jitter/connection budget | Failure-injection test |
| Protective order rejected | Unprotected exposure | Verify accepted order state; block entries and alert | Rejected-exit integration test |
| DB write failure | Lost audit/recovery state | Block entries if persistence required | DB fault test |
| Secret committed | Credential compromise | `.gitignore`, secret scanner, push protection, rotation | Pre-push/CI secret scan |
| Malicious dependency/action | Code or secret compromise | Lockfiles, review, minimal CI permissions | Dependency review and workflow audit |
| UI status optimistic when backend failed | Operator misled | Backend is source of truth; stale/error states | UI integration tests |

## Assumptions
- Testnet credentials are still sensitive and must be protected.
- Exchange API responses can be delayed, duplicated, missing, malformed or arrive out of order.
- Local process crashes are normal failure conditions, not exceptional impossibilities.
- A successful HTTP status is not proof that protection/position state is correct.
- No safety property should depend solely on color/UI behavior.

## Residual risks
- Testnet cannot fully reproduce live slippage/liquidity and market behavior.
- External exchange outage or undocumented server behavior cannot be eliminated by local code.
- Local disk loss may remove journal history; startup must reconcile with exchange before resuming.
- Remote deployment introduces additional identity, TLS, patching, availability and operational requirements.
