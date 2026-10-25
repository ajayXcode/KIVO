# 05 — Algorithm and Strategy Rules

## Strategy identity

**Hybrid trend-filtered momentum/pullback baseline.** This is short-horizon candle-based trading, not high-frequency trading. Product family is locked, but exact entry/exit formulas remain approval gates.

## Initial parameters (hypotheses, configurable)

- Trend timeframe: 15m.
- Entry timeframe: 5m.
- Trend filter: EMA50 vs EMA200.
- Pullback reference: EMA20 on 5m.
- Momentum: RSI14.
- Trend strength: ADX14 above a configurable threshold (initial baseline >20).
- Long RSI: recovery after being below 40.
- Short RSI: weakening after being above 60.
- Max simultaneous positions: 1.
- Risk per trade: 0.25% of configured test equity.
- Daily loss halt: 1.5% of configured test equity.

These are test settings, not optimized values, recommendations for real money, or a profitability claim.

## Data rules

- Only use closed candles.
- Align the most recent valid closed 15m candle with the 5m decision time; never use future values.
- Deduplicate candles and detect missing/out-of-order periods.
- Warm up the longest indicator before emitting tradable signals.
- Document EMA initialization and RSI/ADX smoothing convention; test known data vectors.
- Missing/invalid values block entries; do not invent candle data.

## LONG candidate — every condition required

1. Testnet mode and product metadata valid.
2. Feed, persistence, and reconciliation healthy.
3. Indicators warmed up; latest candles closed and aligned.
4. 15m EMA50 > EMA200.
5. ADX passes configured threshold.
6. 5m price/candle passes a measurable pullback-to-EMA20 rule (exact distance/condition must be approved).
7. RSI recovers from configured retracement region (baseline: after being below 40).
8. Closed bullish candle passes the approved confirmation definition.
9. Spread and estimated execution cost below limits.
10. No position/unresolved order conflicts with one-position rule.
11. Risk manager approves size and exit plan.

## SHORT candidate — every condition required

Same readiness checks, but 15m EMA50 < EMA200, 5m pullback toward EMA20, RSI weakness after rebound (baseline: after being above 60), and a closed bearish confirmation candle. Spread/cost and all risk gates must pass.

## NO TRADE conditions

Stable reason codes should include `SYSTEM_NOT_READY`, `STALE_DATA`, `MISSING_CANDLE`, `OUT_OF_ORDER_DATA`, `INDICATOR_WARMUP`, `TREND_NEUTRAL`, `ADX_FILTER_FAILED`, `PULLBACK_NOT_VALID`, `MOMENTUM_NOT_CONFIRMED`, `SPREAD_TOO_WIDE`, `COST_TOO_HIGH`, `POSITION_EXISTS`, `ORDER_UNRESOLVED`, `DAILY_LIMIT`, `COOLDOWN_ACTIVE`, `KILL_SWITCH`, `PRODUCT_METADATA_INVALID`, `SIZE_INVALID`, `EXIT_PLAN_UNVERIFIED`, `PERSISTENCE_UNAVAILABLE`, and `RECONCILIATION_REQUIRED`.

## Risk sizing

```text
risk_budget = equity_reference * risk_fraction
loss_per_contract_at_stop = verified_contract_loss(entry, stop, product_metadata, fee_assumption)
raw_size = risk_budget / loss_per_contract_at_stop
size = round_down_to_valid_quantity_step(raw_size, product_metadata)
```

Then validate minimum/maximum size, tick/quantity precision, contract multiplier, margin, stop distance, position limits, fees and conservative slippage. Derivative contracts differ from spot products; if contract semantics are unverified, do not trade. Use `Decimal` or integer ticks for exchange price/quantity math where appropriate.

## Exit policy — must be resolved before order code

Approve exact stop formula (swing-based or volatility-based), target formula, minimum/maximum stop distance, maximum holding time if any, reversed-signal behavior, supported order/trigger types, reduce-only/close semantics, partial-fill protection and emergency response if protection rejects/disappears. Never label exposure protected unless the exchange confirms active protective orders for the actual filled size. Do not average down in v1.

## Pseudocode

```text
on_closed_entry_candle(candle):
    validate_and_persist(candle)
    if not readiness_ok(): return NO_TRADE(SYSTEM_NOT_READY)
    if not data_fresh_complete_aligned(): return NO_TRADE(STALE_DATA)
    if not indicator_warmup_complete(): return NO_TRADE(INDICATOR_WARMUP)

    signal = strategy.evaluate(closed_5m, closed_15m)
    persist_decision(signal)
    if signal == NO_TRADE: return

    risk = risk_manager.evaluate(signal, exchange_state, product, cost_estimate, session_limits)
    persist_risk(risk)
    if not risk.approved: return

    intent = execution_manager.create_persisted_intent(signal, risk.approved_size, exit_plan)
    result = execution_manager.submit_once(intent)
    persist_sanitized_result(result)
    if result.is_ambiguous:
        transition(PAUSED, RECONCILIATION_REQUIRED)
        reconcile_before_any_retry()
        return
    reconcile_exchange_state()
    protect_actual_filled_exposure()
    verify_protection()
```

## Evaluation protocol

- Collect valid time-stamped Testnet candles or use a lawful documented source; the hackathon brief said no historical dataset was supplied.
- Validate missing intervals, duplicates, timestamps and provenance.
- Split chronologically into development, validation and untouched holdout; never shuffle time-series rows.
- Compare hybrid against trend-pullback and momentum-only baselines on the same data/cost assumptions.
- Include fees and conservative slippage; define treatment of funding/other costs.
- Report net P&L, trades, expectancy, max drawdown, average win/loss, win rate and regime behavior.
- Run sensitivity checks; do not select parameters only because they win on a small sample.
- Keep replay and actual Testnet metrics visibly separate. No profit guarantee.
