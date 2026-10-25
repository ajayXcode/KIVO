# 27 — Production-Quality Testnet Checklist

## Correctness
- [ ] Strategy is deterministic and tested with closed candles only.
- [ ] No look-ahead; order price/quantity calculations use verified contract metadata.
- [ ] Exchange order-state mapping uses tested response fixtures.

## Safety
- [ ] Testnet-only host/mode guard.
- [ ] Every entry passes risk manager.
- [ ] Position/daily loss/cooldown limits enforced.
- [ ] Stale feed/API failures block entries.
- [ ] Unknown order reconciled before retry.
- [ ] Protective order confirmed for actual filled quantity.
- [ ] Kill/pause/resume and restart reconciliation tested.

## Security
- [ ] No secrets in UI, logs, repository, CI artifacts or recordings.
- [ ] Control endpoints protected for deployment context.
- [ ] Lockfiles committed and dependencies audited.
- [ ] CI permissions minimal; secret scanning enabled where available.

## UX
- [ ] Environment/state/feed age/exposure/alerts visible.
- [ ] Stale/empty/loading/error states correct.
- [ ] High-impact actions confirmed and explained.
- [ ] Replay and Testnet distinguishable.

## Operations
- [ ] Startup/shutdown/incident runbook exercised.
- [ ] Journal backup/restore tested if used.
- [ ] Readiness accurate.
- [ ] Another teammate verifies clean setup.

## Documentation
- [ ] README, strategy, risk, API contract, security, test plan, runbook, demo and known limitations match behavior.
- [ ] Licenses and attribution reviewed.
- [ ] No unresolved critical safety defect.
