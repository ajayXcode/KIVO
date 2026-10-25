# ADR 0002 — Hybrid Trend-Filtered Momentum/Pullback

- Status: Strategy family locked; exact thresholds/exits pending approval
- Date: 2026-10-25

## Context
Owner chose hybrid trend-filtered momentum + pullback, a web dashboard and Delta India Testnet-only operation.

## Decision
Use 15m trend context and 5m entry evaluation. Baseline uses EMA50/EMA200, EMA20 pullback reference, RSI14 and configurable ADX14 threshold. Use closed candles and stable LONG/SHORT/NO TRADE reason codes.

## Open details
Exact EMA20 pullback distance, candle confirmation formula, stop, target, max holding time, spread/slippage thresholds and actual Testnet product.

## Validation
Compare hybrid against trend-pullback and momentum-only baselines on common timestamped data with costs and chronological holdout. Do not claim profitability without adequate evidence.
