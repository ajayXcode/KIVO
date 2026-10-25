# 03 — Security Policy and Secure Engineering Manual

**Scope:** internal policy for a Delta India Testnet-only trading tool. Review before credentials, remote access, or order submission are enabled.

## 1. Security objectives

1. Prevent accidental mainnet use.
2. Protect API keys, secrets, signatures, account/order/position state, and control actions.
3. Ensure each order passes server-side risk checks.
4. Fail closed when feeds, exchange state, reconciliation, persistence, or configuration are uncertain.
5. Maintain a reconstructable audit trail without logging secrets.
6. Minimize dependency/supply-chain risk.
7. Default the dashboard to local-only operation.

## 2. Environment and endpoint safety

- Only `TESTNET` mode is allowed in this product.
- Require explicit mode and endpoint config; validate hostnames against an allowlist at startup.
- Reject production hosts before any authenticated request or order path.
- Do not include a mainnet toggle in v1.
- Never store mainnet credentials in local `.env`, GitHub, CI, screenshots, or docs.
- Keep a persistent `TESTNET` badge visible in the UI and record environment in logs.
- Test that wrong host/mode combinations fail before network/order activity.

## 3. API key and secret handling

- Use a dedicated Demo/Testnet API key with minimum permissions.
- Do not paste credentials into source files, chat, issues, docs, screenshots, videos, or test fixtures.
- Local credentials belong in an ignored `.env` or OS secret store. `.env.example` contains names and harmless placeholders only.
- Frontend build-time environment variables are public; no exchange secrets in Vite variables.
- Redact keys, secrets, signatures, authorization headers, session cookies, and sensitive account identifiers from logs/exports.
- If a secret appears in Git/CI/logs/recordings, treat it as compromised: revoke/rotate first, then clean the source of exposure and document the incident.
- Validate that required secret settings exist without printing their values.

## 4. Control API and browser trust

- The browser is untrusted. Backend policy and validation are authoritative.
- Bind to `127.0.0.1` by default. Remote/LAN exposure is out of scope until authentication, TLS, origin validation, CSRF protection for cookie sessions, rate limits, firewalling, and a security review are complete.
- CORS and hidden buttons are not authentication.
- Separate read routes from control routes.
- Kill, close, cancel, risk-config changes, and resume actions require backend checks, confirmation semantics, and audit entries.
- Do not expose a generic order endpoint accepting arbitrary browser-supplied exchange payloads.
- Cap request body size, page size, query ranges, and field lengths; reject NaN/Infinity and invalid numeric ranges.

## 5. Authentication and signing

- Implement Delta signing exactly per the current official docs and test it using known inputs/outputs.
- Keep signing code isolated. Ensure the bytes used for signing match the exact request sent.
- Never log the canonical prehash, signature, auth headers, secret, or full signed request.
- Validate clock/timestamp behavior before authenticated operations.
- Use `hmac.compare_digest` where local signature comparison is needed.
- Invalid auth or clock drift blocks trading; no unbounded retries.
- Private WebSocket authentication must use the currently documented protocol; older sample flows may be deprecated.

## 6. Order/risk security invariants

- Only the `ExecutionManager` can submit or cancel exchange orders.
- An entry is allowed only in `RUNNING` and after `RiskManager` approval.
- Validate product metadata, tick size, quantity increment/minimum, contract size, stop distance, costs, risk budgets, exposure, and cooldown on the backend.
- Never trust a client-provided risk decision, quantity, or product identifier.
- An ambiguous submit timeout becomes `UNKNOWN`; reconcile before retry. Never blindly resubmit.
- Client IDs are not assumed to provide idempotency unless the official contract explicitly guarantees it.
- Verify protective order acceptance and quantity against actual filled exposure before showing “protected.”
- A protective order failure blocks new entries and invokes the pre-approved safe exposure policy.
- Pause/kill blocks new entries immediately. Open-position management must be a separate, tested behavior; do not claim kill automatically closes exposure.
- If the journal/persistence is required for safe recovery and fails, block new entries.

## 7. Logging/data retention

- Structured logs: time, environment, component, correlation ID, decision ID, order ID, event code, state, sanitized error code.
- Never store `.env`, auth headers, signatures, or raw private account payloads in logs.
- Diagnostic exports must be redacted and previewed before sharing.
- Do not send account logs to third-party telemetry by default.
- Define retention and backup/restore behavior before remote deployment.

## 8. Supply-chain security

- Commit lockfiles (`uv.lock`, `package-lock.json`) after implementation begins.
- Run `pip-audit` and `npm audit` before release/CI; review findings rather than suppressing blindly.
- Enable GitHub secret scanning/push protection, dependency alerts, and Dependabot where available.
- Use minimal GitHub Actions permissions. Pin third-party actions to immutable commit SHAs where practical.
- Never run unreviewed post-install scripts or unknown copied code without inspection.
- Review package maintenance, ownership, supported runtime, license, and transitive dependencies.
- Make dependency updates in dedicated branches; run tests, security checks, and relevant Testnet smoke tests.

## 9. Secure development lifecycle

### Before development
- [ ] Threat model reviewed.
- [ ] Testnet-only host guard and tests defined.
- [ ] Secret storage, `.gitignore`, and `.env.example` policy set.
- [ ] API signing contract verified.
- [ ] Security tests included in roadmap.

### Every PR
- [ ] No secret or private account data in diff.
- [ ] All inputs validated on server.
- [ ] No new route bypasses the risk gate.
- [ ] Tests, lint, type checks, and audits pass.
- [ ] Logs/errors are redacted.
- [ ] Any invariant change is explicitly approved and documented.

### Before public repo/demo
- [ ] Scan current tree and Git history for secrets.
- [ ] Confirm no production endpoints/credentials are configured.
- [ ] Review CI/workflow permissions and branch protections.
- [ ] Review third-party licenses and attribution.
- [ ] Ensure no secrets appear in terminal/editor/recording.

## 10. Credential incident procedure

1. Stop new entries and make the bot non-trading.
2. Revoke/regenerate the exposed Testnet key.
3. Inspect Git history, issues, CI logs/artifacts, screenshots, and recordings.
4. Remove/rewrite exposed secret history where appropriate; deleting the current line alone is not enough.
5. Replace local credentials and verify the old key no longer works.
6. Record the event without including the secret.
7. Add a regression control to prevent recurrence.

## 11. Security references

- OWASP ASVS 5.0.0: https://asvs.owasp.org/
- OWASP ASVS/cheat sheet index: https://cheatsheetseries.owasp.org/IndexASVS
- GitHub Actions hardening: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- GitHub secret scanning: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
- Delta API docs: https://docs.delta.exchange/
