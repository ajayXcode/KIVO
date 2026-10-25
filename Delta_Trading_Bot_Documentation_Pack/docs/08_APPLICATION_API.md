# 08 — Internal Application API Specification

These are proposed **application** endpoints, not Delta Exchange endpoints. Exact request/response schema and auth policy must be locked during implementation.

| Route | Method | Contract |
|---|---|---|
| `/api/health/live` | GET | Process liveness only; no secrets |
| `/api/health/ready` | GET | Ready only after configuration, exchange, product, feed, persistence and reconciliation checks pass |
| `/api/overview` | GET | Current bot state, environment, product, latest signal, exposure, risk usage and alerts |
| `/api/signals` | GET | Paginated decisions and reason codes; filters bounded |
| `/api/positions` | GET | Reconciled position view with observation timestamp |
| `/api/orders` | GET | Paginated orders/fills and their statuses |
| `/api/performance` | GET | Metrics with period, source and cost assumptions |
| `/api/events` | GET | Sanitized operational/audit event history |
| `/api/control/pause` | POST | Block new entries; idempotent and audited |
| `/api/control/resume` | POST | Allowed only if all readiness, risk and reconciliation gates pass |
| `/api/control/kill` | POST | Block entries and start the separately specified exposure-management procedure |
| `/api/control/close-position` | POST | Optional; only after safe close semantics are approved and tested; requires confirmation/idempotency |

## Common rules

- Typed schemas and explicit validation; reject invalid bounds and unknown action values.
- Responses use stable machine-readable error codes, safe human-readable messages and UTC timestamps.
- Bound pagination/page size, query complexity, request body size and request frequency.
- Never expose stack traces, API secrets, signatures or raw auth headers.
- Mutating routes require an authenticated operator in any network-accessible deployment. Local-only v1 must bind to loopback and still use safe control semantics.
- Exact allowed CORS origins; no wildcard credentialed CORS.
- The browser cannot submit arbitrary exchange payloads. All actions pass server-side state and risk validation.
- Every operator action records actor, action, result and reason.
- `resume` returns a clear denial if readiness is false; it must never force state to `RUNNING`.

## Error envelope (conceptual)

```json
{
  "error": {
    "code": "RECONCILIATION_REQUIRED",
    "message": "Trading is paused until exchange state is reconciled.",
    "request_id": "non-secret-correlation-id"
  }
}
```

The eventual JSON schema is owned by the application, not copied from Delta's envelope.

## API acceptance

- Unauthenticated control requests rejected.
- Wrong payload size/quantity/control values rejected.
- All controls recheck backend state.
- Health readiness remains false when critical dependencies fail.
- Logs are sanitized and correlate requests without exposing tokens.
- API contract tests cover success and error cases.
