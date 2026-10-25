# 26 — Changelog and Versioning Policy

Record user-visible changes, strategy/risk changes, exchange contract changes, security fixes and major dependency changes. Use release tags only after acceptance gates pass; avoid implying stable API compatibility prematurely.

Every strategy change states strategy version/config hash, evaluation evidence and limitations. Every API contract update has a verification date. Dependency changes link to lockfile diff and test/audit evidence. Never paste secrets or raw authenticated payloads in changelog entries.

Suggested sections: Added, Changed, Fixed, Security, Known Limitations, Verification Evidence.
