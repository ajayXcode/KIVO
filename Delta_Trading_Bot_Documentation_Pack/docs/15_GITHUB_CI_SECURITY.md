# 15 — GitHub Repository, CI, and Supply-Chain Security

**Activation stage:** after product spec and ticket plan approval. Public repo expected by the earlier hackathon brief; credentials and private account data must never be public.

## Repository bootstrap
- Create a dedicated repository for this product; don't reuse unrelated repos.
- Add README, license approved by team, `.gitignore`, changelog, docs, package manifests and lockfiles.
- Protect the main branch if the plan allows: PR-only changes, required CI checks and review.
- Enable dependency graph, Dependabot alerts/security updates and secret scanning/push protection where available.
- Use least-privilege workflow permissions and pin/review external GitHub Actions according to a documented policy.

## CI jobs
Backend:
- install using the committed lockfile;
- Ruff lint/format checks;
- one type checker;
- pytest unit/contract suite;
- coverage report;
- dependency audit.

Frontend:
- install using the chosen lockfile;
- TypeScript type-check;
- lint;
- unit/component tests;
- production build;
- Playwright smoke tests where practical.

Repository-wide:
- secret scanning;
- verify no `.env`, local DB, logs or account data;
- dependency review;
- documentation check for required files;
- tests that production hosts are rejected by config.

## GitHub Actions security
- Use read-only default permissions; add specific scopes only when necessary.
- Never expose secrets to forked pull-request code.
- Review workflows using `pull_request_target`; avoid unless thoroughly threat-modelled.
- Don't print environments or secret variables.
- Be cautious with caches and artifacts; do not cache secrets or account data.
- Prefer pinned action references or a clear trusted-version policy.

## PR requirements
Each PR includes purpose, ticket, test evidence, docs updated, security/safety impact and rollback. Changes to exchange/auth/order/risk code require focused review and relevant failure tests.

## Secret incident
1. Revoke/rotate the exposed credential immediately if real.
2. Stop new entries and inspect account activity.
3. Remove from files, logs, artifacts and history as necessary.
4. Review workflows, issue attachments and recordings.
5. Re-run secret scanning and add a prevention test.
6. Document the incident and corrective action.

## References
- GitHub security overview: https://docs.github.com/en/code-security
- Repository security quickstart: https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository
- Dependabot updates: https://docs.github.com/en/code-security/dependabot/dependabot-security-updates
