# API Idempotency and Replay Protection

## Scope

Applies to mutating API operations (e.g., stock-in/stock-out and device command writes).

## Idempotency Contract

- Clients send `Idempotency-Key` header (UUID recommended).
- Backend keys records by `endpoint + key`.
- First valid request stores normalized request fingerprint + response.
- Retries with same fingerprint replay stored response.
- Key reuse with a different fingerprint returns conflict.

## Expiration

- Default TTL: 24 hours (tune by endpoint criticality).
- Cleanup process removes expired idempotency records.

## Replay Protection

- Require HTTPS for all clients.
- Use short-lived auth tokens where applicable.
- Reject stale signed requests when timestamp skew exceeds policy.
- Rate-limit repeated failed attempts per credential/IP.

## Response Codes

- `200/201`: success (fresh or replayed).
- `409`: key reused with payload mismatch.
- `400`: malformed/missing key on endpoints that require idempotency.

## Observability

Track idempotency hit ratio, conflict count, and key cardinality by endpoint.
