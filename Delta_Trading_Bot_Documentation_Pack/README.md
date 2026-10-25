# Delta Testnet Trading Bot — Documentation Pack

**Version:** 1.2 · **Review date:** 25 October 2026 · **Stage:** planning, not implementation.

This pack defines the product, stack, packages, security controls, strategy, architecture, UI/UX, API contract, tests, runbooks, update process, release gates, and documentation needed to build the product. It is documentation only: no application source code or GitHub repo has been created.

## Locked decisions

- **Strategy:** hybrid trend-filtered momentum + pullback.
- **Interface:** web dashboard.
- **Exchange:** Delta Exchange India Testnet/Demo only.
- **Market:** one eligible product selected only after current Testnet product discovery.
- **Build sequence:** read-only API proof → deterministic signals → risk/reconciliation → Testnet order lifecycle → dashboard polish.
- **No mainnet/live-money trading** in scope.

## Read in this order

1. [`00_MASTER_PRODUCT_SPEC.md`](00_MASTER_PRODUCT_SPEC.md) — end-to-end idea and roadmap.
2. [`docs/01_TECH_STACK.md`](docs/01_TECH_STACK.md) and [`docs/02_PACKAGES_AND_LIBRARIES.md`](docs/02_PACKAGES_AND_LIBRARIES.md) — architecture, packages, dependency policy.
3. [`docs/03_SECURITY.md`](docs/03_SECURITY.md) and [`docs/23_THREAT_MODEL.md`](docs/23_THREAT_MODEL.md) — security before credentials/orders.
4. [`docs/06_EXCHANGE_API_CONTRACT.md`](docs/06_EXCHANGE_API_CONTRACT.md) — verify all exchange details at build start.
5. [`docs/05_ALGORITHM_AND_SIGNAL_RULES.md`](docs/05_ALGORITHM_AND_SIGNAL_RULES.md) — approve exact pullback/confirmation/exit rules.
6. [`docs/07_UI_UX_SPEC.md`](docs/07_UI_UX_SPEC.md) and [`docs/WIREFRAME_BRIEF.md`](docs/WIREFRAME_BRIEF.md) — dashboard UX.
7. [`docs/18_IMPLEMENTATION_ROADMAP_TICKETS.md`](docs/18_IMPLEMENTATION_ROADMAP_TICKETS.md) — ticket sequencing.
8. Create the repository only after approval.

## Contents

- `00_MASTER_PRODUCT_SPEC.md` — complete product specification.
- `docs/01_TECH_STACK.md` — stack and architecture choices.
- `docs/02_PACKAGES_AND_LIBRARIES.md` — backend/frontend/runtime/test/security packages.
- `docs/03_SECURITY.md` — full security policy and secure development process.
- `docs/04_ARCHITECTURE.md` — components, flows, states and concurrency.
- `docs/05_ALGORITHM_AND_SIGNAL_RULES.md` — rules, risk sizing, pseudocode and evaluation.
- `docs/06_EXCHANGE_API_CONTRACT.md` — Delta Testnet hosts/auth/order/channel verification checklist.
- `docs/07_UI_UX_SPEC.md` — dashboard screens, accessibility and safety interactions.
- `docs/08_APPLICATION_API.md` — our internal API routes and semantics.
- `docs/09_DATA_MODEL_AND_METRICS.md` — data entities, journal and KPI definitions.
- `docs/10_TEST_PLAN_AND_ACCEPTANCE.md` — tests, failure injection and release acceptance.
- `docs/11_DEV_WORKFLOW_AND_UPDATES.md` — branches, dependency updates and doc update rules.
- `docs/12_DEPLOYMENT_AND_RUNBOOK.md` — startup, shutdown, incidents and recovery.
- `docs/13_OBSERVABILITY_AND_ALERTS.md` — logs, metrics, alert severities and readiness.
- `docs/14_DOCUMENTATION_CHECKLIST.md` — all required project manuals.
- `docs/15_GITHUB_CI_SECURITY.md` — GitHub/CI/security controls.
- `docs/16_OPEN_SOURCE_RESEARCH.md` — Freqtrade/Jesse/Hummingbot lessons and license cautions.
- `docs/17_RELEASE_READINESS.md` — stage gates and no-go criteria.
- `docs/18_IMPLEMENTATION_ROADMAP_TICKETS.md` — epics and ticket backlog outline.
- `docs/19_DECISIONS_AND_OPEN_QUESTIONS.md` — choices to approve before build.
- `docs/20_TROUBLESHOOTING.md` — common failures and safe responses.
- `docs/21_DEMO_SCRIPT.md` — three-minute demo flow.
- `docs/22_UPDATE_POLICY.md` — technical/source/doc update process.
- `docs/23_THREAT_MODEL.md` — assets, threats, mitigations and abuse cases.
- `docs/24_LICENSES_AND_ATTRIBUTION.md` — reuse/license review.
- `docs/25_GLOSSARY.md` — common terms.
- `docs/ADR/` — architecture decision records.
- `docs/templates/` — ticket, bug, incident and strategy experiment templates.
- `SOURCE_REFERENCES.md` — official references and verification caveats.

## Important source/version notes

- Current official Delta documentation is authoritative: <https://docs.delta.exchange/>.
- API notes in this pack are a researched starting point, not proof that every order/channel works in the selected Demo account. Verify and test them before enabling order submission.
- Package versions are locked when implementation starts; do not invent fixed pins in the planning document. Commit `uv.lock` and `package-lock.json` and use clean/locked installs in CI.
- Recommended planning baseline: Python 3.13 and Node.js 24 LTS, subject to a current compatibility check at build start.
- “Production-quality” means secure, observable, recoverable Testnet software—not readiness or permission for real-money trading.
