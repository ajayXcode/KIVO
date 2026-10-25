# UI Wireframe Brief

## Shared shell

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ BOT NAME | TESTNET | Product: verified | State: PAUSED | Feed: Fresh       │
│ Last update: UTC time | Reconciliation: OK | Critical alerts: 0            │
├───────────────┬────────────────────────────────────────────────────────────┤
│ Overview      │ Main screen                                                │
│ Signals       │                                                            │
│ Positions     │                                                            │
│ Performance   │                                                            │
│ Risk          │                                                            │
│ Events        │                                                            │
│ Settings      │                                                            │
└───────────────┴────────────────────────────────────────────────────────────┘
```

## Overview

```text
┌──────────────┬──────────────┬──────────────┬───────────────────────────────┐
│ Bot State    │ Market Feed  │ Position     │ Daily Risk                    │
│ PAUSED       │ Fresh        │ None / side  │ Used / limit / reset boundary  │
├──────────────┴──────────────┴──────────────┴───────────────────────────────┤
│ Latest Signal: NO TRADE — REASON CODE                                      │
│ 15m trend | EMA values | ADX | 5m RSI | candle timestamp                   │
├─────────────────────────────────────┬──────────────────────────────────────┤
│ Performance summary                 │ Alerts/reconciliation                 │
│ Realized | Unrealized | Fees        │ Last sync | unresolved items          │
├─────────────────────────────────────┴──────────────────────────────────────┤
│ Recent signals / orders / state transitions                                │
└────────────────────────────────────────────────────────────────────────────┘
```

## Signal detail panel

Decision ID/config hash; source candle time/IDs; EMA50/EMA200 relation; pullback measurement; RSI/ADX pass/fail; feed age/spread/cost gate; risk result; reason codes; order-intent reference if any.

## Position table

Product · Side · Actual quantity · Average entry · P&L type/source · Entry status · Stop status/qty · Target status/qty · Last reconciled at · Action menu.

## Kill modal

Explain: “This blocks new entries. Existing exposure is handled by the configured policy. Verify final position and order state after the action.” Require confirm/cancel. Never claim the button itself has closed a position.

## Responsive behavior

Stack cards on small screens; keep environment/state/critical alerts at the top. Tables may scroll or become detail cards, but risk state and alert count must not disappear.
