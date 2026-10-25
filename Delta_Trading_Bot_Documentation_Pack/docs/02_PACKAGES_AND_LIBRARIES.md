# 02 — Libraries, Packages, and Dependency Inventory

This is a package plan, not a lockfile. At build start select compatible stable versions, check current advisories and platform support, then commit `uv.lock` and `dashboard/package-lock.json`. Do not treat a static document as the source of exact versions.

## Backend runtime

| Package | Required | Purpose / controls |
|---|---|---|
| `fastapi` | Yes | Internal API/OpenAPI; validate all input |
| `uvicorn[standard]` | Yes | ASGI runtime; one trading process only |
| `pydantic` | Yes | Typed API/config models; strict types for safety-critical fields |
| `pydantic-settings` | Yes | Parse env/config; secret values never printed |
| `httpx` | Yes | Delta REST; explicit timeouts and sanitized errors |
| `websockets` | Phase 2+ | Delta public/private feeds; verify exact API support |
| `numpy` | Yes | Indicators/replay arithmetic |
| `pandas` | Optional | Offline data analysis/research; omit from live runtime if not needed |
| `SQLAlchemy[asyncio]` | Recommended | Persistence/repositories; no DB transaction during network calls |
| `aiosqlite` | Recommended with async SQLAlchemy | Async SQLite driver; single process only |
| `alembic` | Recommended | DB schema migrations |
| `prometheus-client` | Later | Metrics; no high-cardinality or sensitive labels |
| `structlog` | Optional | Structured logs; stdlib logging is enough initially |
| `tenacity` | Optional | Bounded retries only for safe calls; never blind order retries |

### Standard library first

Use `asyncio`, `contextlib`, `dataclasses`, `datetime`, `decimal`, `enum`, `hashlib`, `hmac`, `json`, `logging`, `math`, `os`, `secrets`, `signal`, `sqlite3`, `time`, `typing`, `uuid`, `zoneinfo` where appropriate. Use `Decimal` or integer ticks for exchange price/quantity arithmetic.

## Backend developer/test/security tools

| Package/tool | Required | Purpose |
|---|---|---|
| `pytest` | Yes | Test runner |
| `pytest-asyncio` | Yes when testing async flows | Async unit/integration tests |
| `pytest-cov` | Yes | Coverage evidence, not safety proof by itself |
| `respx` | Yes | Mock HTTPX and simulate exchange errors |
| `hypothesis` | Recommended | Property-based tests for sizing/risk/state |
| `ruff` | Yes | Lint and format |
| `pyright` OR `mypy` | Choose one | Type checking |
| `pip-audit` | Yes before release/CI | Known Python dependency vulnerabilities |
| `pre-commit` | Optional | Local checks; CI remains authoritative |

Do not add `TA-Lib`, `ccxt`, Redis, task queues, vector DBs, AI/LLM APIs, or a complete trading framework to v1 without a written use case and ADR.

## Frontend runtime

| Package | Required | Purpose / controls |
|---|---|---|
| `react`, `react-dom` | Yes | UI |
| `typescript` | Yes | Static type checks (`tsc --noEmit`) |
| `vite` | Yes | Build/dev tooling; use supported Node LTS |
| `react-router-dom` | Recommended | Dashboard navigation |
| `@tanstack/react-query` | Yes | Fetch/cache/refetch/mutations; invalidate data after controls |
| `zod` | Yes | UI form/payload validation, not server security |
| `recharts` | Recommended | Performance charts with source/time/cost labels |
| `lucide-react` | Recommended | Icons with accessible names |
| `tailwindcss` | Recommended | Consistent styling; verify current Vite setup |
| `@radix-ui/react-dialog` | Optional | Accessible high-risk action confirmation |
| `@radix-ui/react-tooltip` | Optional | Supplementary explanations only |
| `react-hook-form` | Optional | Multi-field configuration forms |
| `@hookform/resolvers` | Optional | Zod integration if React Hook Form is chosen |

Avoid adding Redux/Zustand until real shared client state needs justify it. Server state goes in TanStack Query; transient UI state should use React state/context.

## Frontend dev/test/security tools

- `vitest`: component/unit tests.
- `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`: user-oriented component tests.
- `jsdom`: DOM test environment.
- `@playwright/test`: browser E2E tests for pause/resume/kill/status/error flows.
- `eslint`, `typescript-eslint`, `prettier`: lint and style checks.
- `npm audit`: known dependency issue reporting; review findings rather than blindly suppressing.

## Package manager and pinning

- Python: `uv`, `pyproject.toml`, committed `uv.lock`; install in CI from the lock.
- Frontend: npm, committed `package-lock.json`; use `npm ci` in CI.
- Avoid multiple package managers/lockfiles in the same app.
- No version pins are asserted here as permanently current. Choose compatible stable releases at build start and preserve exact resolutions in lockfiles.

## Package approval checklist

Before adding a package, record requirement, alternatives, supported Python/Node, current stable version, license, maintenance, vulnerabilities, Windows/CI compatibility, transitive packages, and how it is tested/locked. Remove dependencies that no longer serve a documented need.

References: Pydantic Settings https://docs.pydantic.dev/latest/concepts/pydantic_settings/ · SQLAlchemy async https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html · pytest https://docs.pytest.org/en/stable/ · Ruff https://docs.astral.sh/ruff/ · TanStack Query https://tanstack.com/query/latest/docs/framework/react/overview · Playwright https://playwright.dev/docs/test-typescript
