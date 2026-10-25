# 19 — Decisions, Assumptions, and Risk Register

## Locked decisions
- Hybrid trend-filtered momentum + pullback strategy.
- 15m trend context and 5m entry baseline.
- Web dashboard.
- Delta Exchange India Testnet/Demo only.
- Python + FastAPI backend; React/TypeScript/Vite frontend recommended.
- One eligible perpetual contract initially, dynamically discovered.
- Local-first modular monolith; SQLite first.
- No mainnet/live-money trading in v1.

## Decision gates before order writes
1. How is pullback proximity to EMA20 measured?
2. What precise closed-candle rule confirms long/short entry?
3. What stop-loss calculation and maximum stop distance apply?
4. What take-profit, trailing or signal exit applies?
5. Is there a maximum holding time?
6. Which eligible product does current metadata expose?
7. Which protective order types and trigger semantics work on the selected Testnet?
8. What exact equity/P&L basis defines risk and daily loss?
9. What fee/slippage model is used?
10. Is the dashboard local-only in v1? Recommended: yes.
11. Which chart library/license and frontend packages are approved?
12. What lawful/recorded data source supports evaluation?
13. Who owns backend/exchange, strategy/risk, UI, QA, demo and docs?

## Risk register

| Risk | Mitigation | Gate |
|---|---|---|
| Wrong environment/key | Host allowlist, explicit Testnet check | Before API requests |
| Wrong order payload | Current official docs + contract tests | Before order write code |
| Missing protection | Verify supported behavior; rejection path and critical alert | Before execution release |
| Duplicate order after timeout | Reconciliation and idempotency semantics | Critical acceptance test |
| Stale/misaligned market data | Closed-candle and freshness checks | Critical acceptance test |
| Backtest overfit | Chronological holdout, costs, baseline comparison | Before performance claims |
| Secret leak | Redaction, push protection, key rotation runbook | Before public repo |
| Incompatible package upgrades | Locked deps, CI, isolated update PRs | Before release |
| Dashboard misleading state | Stale/unknown UI states, source timestamps | Before demo |
| Feature creep | One market/one strategy/phase gates | Ongoing |
| No historical dataset | Capture Testnet or document lawful source | Before replay claims |

## Assumptions and limitations
- Event brief previously provided requires Testnet API execution, risk management, strategy explanation and public repository.
- No historical dataset is assumed to be supplied by organizers.
- Testnet P&L is not equivalent to live results and doesn't guarantee profitability.
- WebSocket can be deferred until REST recovery and reconciliation work.
- Remote/multi-user production deployment requires additional auth, privacy, operations and availability design.
