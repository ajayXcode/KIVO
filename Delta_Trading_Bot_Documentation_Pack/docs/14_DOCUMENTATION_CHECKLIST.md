# 14 — Documentation and Manuals Required

Documentation is a deliverable, not optional polish. It must describe actual behavior and be updated with code.

## Root files after repository creation

- `README.md`: overview, scope, Testnet warning, setup, configuration, commands, tests, demo, troubleshooting.
- `LICENSE`: selected by team; do not add automatically.
- `CONTRIBUTING.md`: branches, formatting, tests, reviews and safe contribution rules.
- `CHANGELOG.md`: behavior/dependency/security changes.
- `.gitignore`: env files, secrets, virtualenvs, caches, `node_modules`, local DB/logs/build outputs.
- `.env.example`: variable names and harmless placeholders only.
- `SECURITY.md`: vulnerability/credential disclosure policy.

## Required `docs/` manuals

- Product specification and non-goals.
- Technology stack and package inventory.
- Security policy and threat model.
- Architecture and state machine.
- Strategy, risk policy and evaluation method.
- Delta API contract and internal application API.
- UI/UX and wireframes.
- Data model/KPIs and event semantics.
- Test plan and acceptance checklist.
- Deployment, runbook, observability and troubleshooting.
- Dependency/update policy and release readiness.
- Open-source research and license/attribution ledger.
- Demo script and known limitations.
- Architecture decision records (ADRs).

## What documentation changes with a feature?

| Change | Update these docs |
|---|---|
| New package | Package inventory, stack if architectural, changelog/security review |
| Signal rule | Algorithm, tests, dashboard reason copy, experiment report |
| Risk parameter | Risk policy, config docs, tests, UI labels, changelog |
| Delta schema/order behavior | API contract, fixtures, runbook, adapter tests |
| State/order lifecycle | Architecture, API, runbook, failure tests |
| Dashboard action | UI/UX, API contract, E2E tests and accessibility check |
| Metric/data definition | Data & metrics, performance UI and demo |
| Deployment/CI change | Deployment, security, threat model and CI docs |
| Incident/vulnerability | Security, update policy, incident report, tests and release notes |

## Quality bar

Use stable names/codes; mark unverified details; date external API verification; never include secrets; test commands before writing them as copy/paste instructions; link official docs rather than reproducing lengthy copyrighted content; keep diagrams in sync; document unsupported features and limitations.
