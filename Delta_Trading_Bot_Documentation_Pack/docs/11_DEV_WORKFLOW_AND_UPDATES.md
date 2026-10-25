# 11 — Development Workflow, Dependency Updates, and Documentation Maintenance

## Ticket workflow

Every ticket defines goal, dependencies, in-scope/non-goals, acceptance criteria, tests, security/safety considerations and completion evidence. Keep tickets small. Strategy, execution and UI should not be one giant ticket.

For each change:
1. Read master spec and affected manual.
2. Add/update tests before or with the change.
3. Implement the smallest complete increment.
4. Run focused tests, then broader relevant tests.
5. Inspect security/safety and failure-path behavior.
6. Update docs in the same PR.
7. Record exact commands/results and any skipped tests.
8. Merge only after review/CI passes.

## Documentation-as-code rules

- Actual behavior is the truth; docs cannot advertise unimplemented features as shipped.
- Update related docs in the same pull request.
- Mark planned/unverified capabilities explicitly.
- Record official API source + verification date for external behavior.
- Every config setting documents units, range, default, source and failure behavior.
- Every metric documents formula, source and caveat.
- Every new package documents purpose, version constraint, license and vulnerability check.
- Changelog includes user-visible or operationally significant changes.

## Update matrix

| Change | Docs to revisit |
|---|---|
| Strategy rules | Algorithm, data/metrics, tests, dashboard explanations, changelog |
| Risk/position sizing | Security, config, runbook, tests, release gates |
| Exchange endpoint/channel | API contract, architecture, security, contract fixtures, references |
| Order lifecycle | Architecture, API contract, runbook, integration/failure tests |
| Dashboard action | UI/UX, API, security, accessibility tests, demo script |
| Dependency added/upgraded | Tech stack, package inventory, lockfiles, licenses, security checks |
| Database schema | Data model, migrations, backup/recovery, tests |
| New API route | App API, auth rules, validation, tests, runbook |
| Incident | Runbook, threat/risk register, regression test, ADR if needed |
| Release | Changelog, release checklist, known limitations, deployment steps |

## Package update procedure
1. Separate dependency update PR from strategy changes.
2. Check official release notes, supported runtime, breaking changes, security advisories and license.
3. Update a small package or compatible group.
4. Regenerate lockfile using package manager; never manually edit lockfile.
5. Run lint/type/unit/contract/integration/replay/UI tests relevant to dependency.
6. Run dependency audits and inspect transitive changes.
7. Update package inventory if runtime/compatibility changes.
8. Merge only with reviewer and CI approval; preserve prior known-good commit for rollback.

## Delta API update procedure
1. Read current official docs/changelog.
2. Record date and affected endpoint/channel/field.
3. Update `06_EXCHANGE_API_CONTRACT.md` and sanitized fixtures.
4. Add/update contract tests.
5. Run read-only Testnet verification.
6. If order behavior changed, run controlled order/partial-fill/protection/reconnect tests.
7. Keep entry disabled until safety tests pass.

## Stop conditions
Stop and keep bot non-trading if API contract is unclear, risk gates can be bypassed, an order outcome is ambiguous, protection is unverified, startup reconciliation fails, a secret may be exposed, or a critical test fails.
