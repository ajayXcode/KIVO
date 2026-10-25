# 12 — Deployment and Operator Runbook

## Environment policy

- **Unit-test:** fully mocked; must not submit external orders.
- **Replay/simulation:** recorded data, simulated fills only, clearly labelled.
- **Delta India Testnet:** external API access; explicit mutation opt-in for execution tests.
- **Mainnet:** out of scope; reject mainnet hosts in configuration.

## Startup checklist

1. Verify dedicated Demo/Testnet account and endpoint allowlist.
2. Validate config and required secret presence without printing secrets.
3. Verify clock/authentication requirements.
4. Authenticate and discover product metadata.
5. Validate market-data freshness and indicator warm-up.
6. Start journal and watchdog.
7. Query open orders, fills and positions; reconcile with local state.
8. Verify risk limits and supported protective exit plan.
9. Enter `RUNNING` only after all readiness checks pass.

## Shutdown checklist

1. Block new entries first.
2. Persist state and pending order IDs.
3. Do not assume process exit closes exchange positions.
4. Follow approved open-order/position policy.
5. Flush journal and stop tasks gracefully.
6. On restart, fetch exchange state before resuming.

## Incident procedures

### Market-data outage
Block entries, reconnect with capped backoff, refresh candle continuity, reject gaps, REST-reconcile account state and only resume once ready.

### Unknown order outcome
Set internal state to unknown; block entries; query order ID/client ID, open orders, fills and positions. Do not retry until reconciled state and official idempotency semantics prove it is safe.

### Protective exit rejected/missing
Critical alert, block new entries, inspect real exchange state, follow the already approved emergency policy, verify final exposure/protection, record incident and add regression test.

### Restart with open position
Initialize in non-trading state; load journal; fetch and reconcile current orders/positions; restore risk counters based on documented sources; remain paused on mismatch.

### Auth/signature failure
Stop order mutations. Check endpoint/key pairing, timestamp, canonical signature, User-Agent and API permissions. Never log secret to debug.

### Database/journal failure
Block new entries when audit/recovery guarantee is compromised; raise critical alert; restore or repair the journal and reconcile with exchange before resume.

### Daily loss limit reached
Transition to `HALTED`, block new entries, record P&L basis and day-boundary rule, handle exposure only under the approved policy, and do not reset until eligibility conditions pass.

### Credential leak
Revoke/rotate first, review account activity, clean code/history/logs/artifacts as needed, rerun secret scan, revalidate with read-only Testnet access and record incident.

## Production-quality limitations

A local Testnet demo is not a production mainnet deployment. Remote exposure, multi-user auth, high availability, database replication, formal incident response and on-call operations are out of scope until separately designed and reviewed.
