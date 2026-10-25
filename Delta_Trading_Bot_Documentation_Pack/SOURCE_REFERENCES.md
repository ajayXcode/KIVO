# Source References and Verification Notes

**Research checkpoint:** 25 October 2026. Re-check externally maintained information before implementation.

## Exchange
- Delta Exchange API: https://docs.delta.exchange/
- The official docs distinguish India Demo/Testnet from production credentials and document REST/WebSocket authentication, market data, orders, positions and changelog. The exact current Testnet contract must be verified at build time.

## Frameworks and tools
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic Settings: https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- SQLAlchemy asyncio: https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html
- React + TypeScript: https://react.dev/learn/typescript
- Node release status: https://nodejs.org/en/about/previous-releases
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Playwright TypeScript: https://playwright.dev/docs/test-typescript
- Pytest: https://docs.pytest.org/en/stable/
- Ruff: https://docs.astral.sh/ruff/
- Prometheus Python client: https://prometheus.github.io/client_python/
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/

## Security
- OWASP ASVS 5.0.0: https://asvs.owasp.org/
- OWASP ASVS/cheat-sheet index: https://cheatsheetseries.owasp.org/IndexASVS
- GitHub Actions hardening: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- GitHub secret scanning: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
- GitHub dependency review: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review

## Open-source learning
- Freqtrade: https://github.com/freqtrade/freqtrade and https://www.freqtrade.io/en/stable/
- Jesse: https://github.com/jesse-ai/jesse and https://docs.jesse.trade/
- Hummingbot: https://github.com/hummingbot/hummingbot and https://hummingbot.org/docs/

## Provenance rule
A link is not proof that an endpoint, channel or order payload works with the configured Testnet account. Record dated verification and actual contract-test evidence. Do not treat this planning pack as a substitute for current official docs or exchange tests.
