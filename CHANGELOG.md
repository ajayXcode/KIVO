# Changelog

All notable changes to **EdgePilot (KIVO)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-25

### Added
- **Delta Model Context Protocol (MCP) Server**: Complete stdio JSON-RPC 2.0 MCP server ([mcp/delta_mcp_server.py](mcp/delta_mcp_server.py)) with 9 live tools for Antigravity, Cursor, and Claude AI agents.
- **One-Click Instant Option Execution**: Added `⚡ BUY ATM CALL` and `⚡ BUY ATM PUT` execution cards in frontend with automatic ATR Stop-Loss and Take-Profit brackets.
- **Auto-Pilot Live Status Banner**: Real-time status badge and Delta Testnet account details (`id: 26864393`, `email: ajayyv972@gmail.com`, `$91.98 USD`).
- **Production Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` binding `0.0.0.0:8000` with volume persistence.
- **GitHub Community Standards**: Added CI pipeline (`.github/workflows/ci.yml`), issue templates, PR template, MIT `LICENSE`, `SECURITY.md`, and `ARCHITECTURE.md`.

### Fixed
- **Clock Drift & 401 Signature Rejection**: Eliminated stale CDN HTTP `Date` header parsing (-51s lag) that caused `expired_signature` errors on authenticated requests. Implemented self-healing offset calibration from Delta's error context.
- **Windows MCP Stdio Crash**: Replaced Windows IOCP `loop.connect_read_pipe(sys.stdin)` (`[WinError 6] The handle is invalid`) with a thread-safe daemon worker using `sys.stdin.readline()` and an `asyncio.Queue`.
- **Uvicorn Access Logger Argument Crash**: Fixed `ValueError: not enough values to unpack (expected 5, got 0)` in `SensitiveDataRedactor` by preserving tuple argument length.
- **Windows Console UnicodeEncodeError**: Removed emoji characters (`🤖`, `🚨`) in logging to prevent `charmap` codec crashes on Windows consoles (`cp1252`).
- **KYC Status Mapping**: Added fallback checks for `is_kyc_done` and `proof_of_identity_status == "approved"`, displaying KYC Approved correctly.
- **Startup Balance Initialization**: Fixed startup sequence in `bot_service.py` so wallet balance and email are fetched during `initialize()`.
- **Test Safety & Env Guard**: Guarded `.env` from accidental overwrites during unit test runs (`persist=False`).

---

## [1.0.0] - 2026-10-24

### Added
- Core algorithmic trading engine with 5m Supertrend, EMA20, and ATR indicator math.
- Multi-timeframe trend filter using 15m candles.
- Dynamic At-The-Money (ATM) option discovery engine for BTC, ETH, and XAUT.
- Risk manager with strict circuit breakers, position limits, and cooldown intervals.
- Position reconciliation engine syncing local SQLite records with Delta Exchange Testnet.
- Initial Graphite Violet single-page React + Vite dashboard.
- REST API powered by FastAPI with CORS middleware and SQLite database.
