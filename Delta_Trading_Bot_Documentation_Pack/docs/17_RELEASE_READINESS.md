# 17 — Release Readiness and No-Go Gates

## Product and scope
- [ ] Testnet-only scope verified and mainnet out of scope.
- [ ] Product dynamically discovered, metadata verified.
- [ ] Strategy entry/exit rules finalized and documented.
- [ ] All unknown API behaviors resolved or explicitly block execution.

## Security
- [ ] Dedicated Demo/Testnet key only.
- [ ] No secrets in repo history, logs, UI, screenshots, or artifacts.
- [ ] Mainnet host rejected by config validation.
- [ ] Control routes authenticated/audited for deployment mode.
- [ ] CORS allowlist and safe browser controls.
- [ ] Dependency audit and license review complete.
- [ ] Secret scanning/push protection enabled where available.

## Algorithm and risk
- [ ] Closed candles only; warm-up and no-look-ahead tests pass.
- [ ] LONG/SHORT/NO TRADE reason codes tested.
- [ ] Position sizing uses verified contract metadata.
- [ ] Per-trade risk, daily limit, cooldown, spread and data gates tested.
- [ ] Protective exits verified from exchange state.
- [ ] Unknown order outcome reconciles before retry.

## Execution and recovery
- [ ] Full Testnet order lifecycle has test evidence.
- [ ] Partial fills/rejections/cancel races tested.
- [ ] Startup/restart reconciles orders, fills and positions.
- [ ] Kill/pause behavior tested.
- [ ] No duplicate entries or unprotected positions in required scenarios.
- [ ] Critical/high safety issues closed.

## UI/UX and demo
- [ ] Persistent Testnet badge and state reason.
- [ ] Stale/unknown/error status cannot look healthy.
- [ ] All signals include reasons.
- [ ] Position/order view matches reconciled state.
- [ ] Simulated data clearly labelled.
- [ ] Destructive actions require confirmation.
- [ ] Demo rehearsed, no credentials visible.

## Documentation/reproducibility
- [ ] README setup works from clean checkout.
- [ ] Locked dependency installs are reproducible.
- [ ] Strategy/risk/API/security/runbook/test docs match code.
- [ ] Changelog/release notes updated.
- [ ] License and third-party attribution included.

## No-go conditions
Do not enable order submission or call the release ready if any one of the following is true: wrong environment may be selected silently; order can bypass the risk manager; order outcome can be retried while ambiguous; protective exits are assumed rather than verified; restart can enter RUNNING before reconciliation; secrets are present; critical tests fail; a demo fixture can be mistaken for a Testnet fill.
