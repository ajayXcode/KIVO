# Security Policy

## 1. Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 1.1.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability within **EdgePilot (KIVO)**, please DO NOT open a public GitHub issue. Instead, report it privately to the project maintainer:

- **Security Contact**: `rangeshsha@gmail.com`
- **Response SLA**: Initial triage within 24 hours; patch deployment within 72 hours.

Please include:
- A description of the vulnerability and potential impact.
- Steps or proof-of-concept script to reproduce.
- Proposed remediation or patch if available.

---

## 3. Core Security Controls

EdgePilot enforces strict automated security guarantees across both trading execution and API connectivity:

### A. Fail-Closed Testnet Policy
To protect capital, EdgePilot enforces a **hardcoded fail-closed policy** against production URLs:
- `api.delta.exchange` and production domains are rejected at application startup with a hard exception.
- Only authenticated Delta Exchange India Testnet endpoints (`cdn-ind.testnet.deltaex.org` / `socket-ind.testnet.deltaex.org`) are permitted.

### B. In-Memory Credential Redaction
- All loggers (standard output, file, and ASGI handlers) are filtered through `SensitiveDataRedactor` ([backend/security.py](backend/security.py)).
- Real API Keys, API Secrets, and Bearer tokens are scrubbed to `[REDACTED]` prior to formatting or emitting log records.

### C. Clock Synchronization & Replay Protection
- Authenticated requests are signed using HMAC-SHA256 with synchronized millisecond timestamps.
- Any clock drift triggers self-healing calibration from Delta's authoritative backend response context, rejecting replay attempts.

### D. Server-Side Risk Gates
Before any option or futures order touches the exchange network, the request must pass mandatory risk checks:
1. Max open positions limit (`MAX_OPEN_POSITIONS = 1`)
2. Max spread threshold (`MAX_SPREAD_TICKS = 10`)
3. Consecutive loss circuit breaker (`MAX_CONSECUTIVE_LOSSES = 3`)
4. Daily drawdown threshold (`DAILY_LOSS_LIMIT_PCT = 0.015`)
5. Order cooldown timer (`COOLDOWN_SECONDS = 300`)
