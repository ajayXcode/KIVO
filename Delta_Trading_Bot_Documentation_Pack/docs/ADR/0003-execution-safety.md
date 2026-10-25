# ADR 0003 — Single Order Writer, Fail-Closed Risk Gate, Reconciliation

- Status: Proposed mandatory safety design
- Date: 2026-10-25

## Decision
Only the execution manager writes orders. Every entry passes risk approval. Stale data, unresolved order outcomes, journal failure, unverified protective exits or exchange/local mismatch block entries. Startup/reconnect reconciles authoritative exchange orders, fills and positions before RUNNING.

## Timeout policy
After submit timeout, mark the order UNKNOWN and reconcile through verified identifiers/endpoints before retrying. Do not assume client order ID is idempotent unless the current official contract explicitly guarantees it.

## Consequence
More tests and state tracking are required than a simple order loop, but duplicate exposure and unsafe recovery become explicit testable requirements.
