# 07 — UI/UX Specification

**Goal:** an operational dashboard that makes environment, bot state, data freshness, exposure, risk, and decision reasons obvious. Desktop-first, responsive on tablet/mobile. Testnet-only for v1.

## Information architecture

1. Overview
2. Live Signals
3. Positions & Orders
4. Performance
5. Risk Controls
6. System Events
7. Settings

Global header must show the persistent `TESTNET` badge, selected product, exchange connectivity, data age, bot state (`INITIALIZING`, `RUNNING`, `PAUSED`, `FLATTENING`, `HALTED`, `ERROR`), last update time, and active critical alert count.

## Screen requirements

### Overview
- Connection/readiness checks and bot state with reason.
- Selected product and metadata freshness.
- Latest signal and why it fired or was blocked.
- Open position, open/pending orders, realized and unrealized P&L, fee/cost assumptions.
- Daily loss-limit usage, current risk budget, stop/target verification, recent critical alerts.
- Optional small chart with EMA overlays once chart data correctness is verified.

### Live Signals
Each row displays time, signal, reason codes, strategy/config version, candle timestamp, EMA/RSI/ADX snapshot, trend/pullback/candle checks, spread/data check and risk decision. Filtering and detail inspection are allowed. A signal page must not expose a one-click bypass around the risk manager.

### Positions & Orders
- Positions: product, side, quantity, average entry, mark source/time, unrealized P&L, protection status and last reconciliation time.
- Orders: client/exchange IDs, side/type/quantity/price/trigger, lifecycle state, fill timeline, fees and sanitized rejection message.
- Cancel/close actions require confirmation and call a guarded backend workflow. Refresh and reconcile after action.

### Performance
Show net P&L only with explicit period/data source/fees/slippage assumptions; separate realized, unrealized and costs. Show count of trades, expectancy, max drawdown, average winner/loser, win rate and regime breakdown where data supports it. Label actual Testnet, replay and fixture data separately.

### Risk Controls
Display per-trade budget, current estimated exposure, max positions, daily loss-limit usage, cooldown, feed/spread status and kill-switch state. Validate changes server-side, bound values, audit old/new non-secret values, and require pause/confirmation for risk-increasing changes.

### System Events
Filter events by severity, type, time, decision ID, order ID and state. Include feed errors, stale candles, risk denial, order transitions, protective-exit state, reconciliation mismatch, DB errors and operator actions. Raw details must be redacted.

### Settings
V1 has no API secret input. Credentials are backend environment/secret configuration only. Display Testnet environment and product selection. Strategy/risk settings are validated by the backend and versioned in an audit record.

## Visual/accessibility rules

- Neutral professional trading-terminal style; high contrast; restrained motion.
- Never use color alone: pair red/green/amber with text and/or icons (`LONG`, `SHORT`, `STALE`, `HALTED`).
- Use tabular numerals for prices and quantities; state currency/units.
- Store/serve timestamps in UTC; render local time with timezone label.
- Every data view supports loading, empty, stale, disconnected, unauthorized, partial-data and error states.
- Critical alert and unknown exposure remain prominent; unknown must not look healthy.
- Keyboard focus, semantic headings, accessible icon labels and confirmation dialog focus management are required.
- At small widths, preserve bot state, alert, risk and exposure before secondary metrics.

## Component inventory

`EnvironmentBadge`, `BotStateBanner`, `ConnectionHealth`, `DataFreshnessIndicator`, `PnlMetric`, `RiskUsageBar`, `SignalCard`, `SignalReasonList`, `PositionSummary`, `OrderStatusTimeline`, `ProtectiveExitStatus`, `AlertBanner`, `EventTable`, `ConfirmActionDialog`, `LoadingSkeleton`, `EmptyState`, `ErrorPanel`, `ReplayModeBanner`.

## UX acceptance

- Testnet is obvious on every primary screen.
- Every signal/rejection has reasons.
- Positions/orders reflect reconciled backend/exchange state.
- Stale/disconnected/reconciliation-pending states are explicit.
- Destructive actions confirm intent and display result.
- UI cannot bypass server risk checks.
- Replay/fixtures are visibly different from Testnet actions.
- Keyboard and basic contrast checks pass.
