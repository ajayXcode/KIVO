# 01 — Technology Stack

**Status:** recommended, pending compatibility verification at implementation start.

## Stack map

| Layer | Recommended choice | Why / constraints |
|---|---|---|
| Backend language | Python 3.13 | Conservative compatible baseline; re-check support at build start |
| API | FastAPI + Uvicorn | Typed API, async endpoints, OpenAPI |
| Schemas/config | Pydantic v2 + pydantic-settings | Validate requests and env settings; never print secrets |
| REST client | HTTPX | Explicit network timeouts, testable transport |
| WebSocket | `websockets` | Async market/account streams after channel verification |
| Signature | Python stdlib `hmac`/`hashlib` | Small surface area; exact prehash must match official Delta docs |
| Indicators | NumPy; pandas optional for offline research | Avoid a native TA-Lib requirement in v1; test formulas precisely |
| Storage | SQLite + SQLAlchemy async + `aiosqlite` | Good for a single local instance; not multi-instance production storage |
| DB migration | Alembic | Version schema changes deliberately |
| Frontend | React + TypeScript + Vite | Dashboard separate from Python backend |
| Remote UI state | TanStack Query | API loading/cache/refetch/mutation handling |
| Frontend schemas | Zod | Client-side form validation; backend remains authoritative |
| Styling | Tailwind CSS and accessible UI primitives | Consistent design; verify compatible current integration |
| Charts/icons/routing | Recharts, Lucide React, React Router | Dashboard charting, icons and screens |
| Backend tests | pytest, pytest-asyncio, pytest-cov, respx | Unit, async and mocked HTTP contract tests |
| Property testing | Hypothesis (recommended) | Quantity rounding, limits, state transitions |
| Frontend tests | Vitest, Testing Library, user-event, jsdom | Component and interaction tests |
| Browser E2E | Playwright | Critical operator workflows before demo/release |
| Python quality | Ruff + one type checker (Pyright or mypy) | Avoid overlapping tools without a clear reason |
| JS quality | ESLint + TypeScript ESLint + Prettier | Type/lint/format checks |
| Lockfiles | `uv.lock` + `package-lock.json` | Reproducible clean installs |
| Security checks | pip-audit, npm audit, secret scanner, GitHub dependency/security alerts | Identify dependency and secret risks |
| Metrics | `prometheus-client` (later phase) | Health, latency and failure counters |
| Tracing | OpenTelemetry (optional later) | Add only after data destinations/redaction are decided |

## Architecture decision

Use a **modular monolith**: one backend process owns market feeds, risk checks, order submission, reconciliation, journal, and internal API. A separate React bundle renders the dashboard. Only one process may run the trading engine in v1; do not turn on multiple API workers that could each trade.

## Frontend principles

- TanStack Query for server state; local React state/context for UI-only state.
- Zod is usability validation, not a security boundary.
- Keep exchange keys/secret exclusively in backend configuration.
- Build reusable status, alert, table, dialog, empty, stale, loading, and error states.
- Use polling first; add an app-owned SSE/WebSocket path only if polling is insufficient.

## Database boundary

SQLite is for the first single-user/demo release. Keep persistence behind repository interfaces. If multi-user/remote or concurrent instances are required, redesign around PostgreSQL/access control/concurrency rather than merely running more workers.

## Dependencies not to add by default

Do not add CCXT, TA-Lib, Redis, task queues, a vector database, an LLM SDK, or a full trading framework without a written requirement and an ADR. Delta docs mention CCXT support, but a thin adapter is preferable initially so Testnet endpoint and order semantics are understood and tested.

## Official references

- FastAPI: https://fastapi.tiangolo.com/
- Pydantic settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- SQLAlchemy asyncio: https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html
- React + TypeScript: https://react.dev/learn/typescript
- Node releases: https://nodejs.org/en/about/previous-releases
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Playwright: https://playwright.dev/docs/test-typescript
- Ruff: https://docs.astral.sh/ruff/
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/
