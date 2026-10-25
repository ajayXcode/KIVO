# 22 — Source, Dependency, API, and Documentation Update Policy

## Source verification
Use official documentation for exchange behavior and official package release pages for version claims. Community posts may help diagnose issues, but do not override official payload/signature/stop-order definitions.

For each external fact that affects code, record: source URL, exact section, checked date, assumption, implementation impact and regression test.

## Package updates
1. Check official changelog/security advisories and supported runtime.
2. Open a small separate PR.
3. Update package constraint, regenerate lockfile using package manager, and inspect transitive changes.
4. Run lint/type/unit/contract/integration/replay/frontend tests as affected.
5. Run dependency audit.
6. Update package inventory and release notes when relevant.
7. Merge with review; keep previous lockfile/commit available for rollback.

## Exchange API updates
1. Check Delta official docs/changelog.
2. Update API contract and verification date.
3. Update sanitized fixtures and contract tests.
4. Run read-only Testnet validation.
5. If order semantics changed, run controlled order, partial fill, protection, cancel and recovery tests.
6. Keep order submission disabled until safety evidence passes.

## Product behavior updates
Any change to signal/risk/execution/UI must update the relevant requirements, test plan, metric definition and runbook in the same pull request.

## No silent changes
- Do not change a strategy threshold without a versioned config and recorded experiment.
- Do not change risk limits silently.
- Do not change exchange endpoint/channel without contract verification.
- Do not automatically accept a dependency bot PR without CI/review.
- Do not claim a feature exists until acceptance evidence exists.

## Version snapshot
Stack/package versions were researched on 25 Oct 2026. Recheck before the actual build, since documentation and releases move continuously.
