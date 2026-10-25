# 16 — Open-Source Trading Project Research

These projects are reference material for architecture and engineering practices—not plug-in integrations for Delta India Testnet. Check the license and exact compatibility before reusing any code.

## Freqtrade
- Repository: https://github.com/freqtrade/freqtrade
- Docs: https://www.freqtrade.io/en/stable/
- Backtesting: https://www.freqtrade.io/en/stable/backtesting/

Study strategy/engine separation, data and dry-run workflows, persistence, web UI, performance metrics, and backtesting assumptions. Learn from look-ahead-bias warnings and the distinction between a promising historical backtest and robust evidence.

Potential lesson: make a signal explainable from candle/indicator inputs and keep the strategy configuration/version recorded.

Do not assume its exchange adapters, derivatives sizing or trade lifecycle automatically match Delta India.

## Jesse
- Repository: https://github.com/jesse-ai/jesse
- Docs: https://docs.jesse.trade/

Study strategy research, backtest/replay workflows, visualization of entries/exits and parameter optimization. Adapt the concept of a trade inspector linking a decision to input candles and indicator values. Avoid overfitting by preserving a chronological final holdout.

## Hummingbot
- Repository: https://github.com/hummingbot/hummingbot
- Docs: https://hummingbot.org/docs/

Study connector boundaries, executor/order lifecycle patterns and operational status visibility. Market-making and unrelated strategies are outside v1 scope.

## What we should implement ourselves
- Delta India Testnet adapter and exact API contract.
- Hybrid trend/momentum/pullback rules and reason codes.
- Server-side risk manager, state machine and reconciliation barrier.
- Protective exit policy and emergency handling.
- Dashboard integration over our own typed internal API.
- Testnet-specific order/reconnect/partial-fill acceptance tests.

## Repository study worksheet
For any module reviewed, record: responsibility, interface, failure handling, tests, license, exchange-specific assumptions, idea adopted/rejected, and tests required in this product. Add significant choices to an ADR. Don't copy secrets, copied example keys, or whole codebases without an explicit license/technical review.
