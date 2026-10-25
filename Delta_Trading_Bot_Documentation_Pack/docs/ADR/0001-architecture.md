# ADR 0001 — Modular Monolith and Stack

- Status: Proposed, awaiting approval
- Date: 2026-10-25

## Context
The product needs one reliable Testnet trading process, operator dashboard and auditable state transitions. Distributed services would add coordination complexity before the order lifecycle is proven.

## Proposed decision
Use a modular Python FastAPI backend and separately built React/TypeScript dashboard. Start with SQLite for a single-process local demo. Keep exchange, strategy, risk, execution, storage and API modules separately testable.

## Consequences
Benefits: simple deployment, one order writer, low setup burden, easy replay/debugging. Limitations: SQLite and one engine process do not provide multi-instance/multi-user production architecture. Remote deployment requires a security/database review.

## Alternatives
- Microservices: defer due coordination/operations overhead.
- Full trading framework: study patterns, but adopt only if Delta India Testnet compatibility is proven.
- Server-rendered frontend framework: not currently needed for a Python-backed local dashboard.

## Revisit if
Multi-user remote access, multiple products, multiple engine instances, or materially higher event volume becomes a real requirement.
