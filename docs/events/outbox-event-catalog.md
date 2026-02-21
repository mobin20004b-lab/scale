# Event Contract Catalog (Outbox)

This catalog defines canonical outbox event types, schemas, and versioning policy.

## Envelope

All events should be published with this envelope:

```json
{
  "id": "evt_...",
  "type": "inventory.stock_in.recorded",
  "version": 1,
  "occurredAt": "2026-02-21T12:00:00Z",
  "source": "scale-app",
  "traceId": "...",
  "payload": {}
}
```

## Event Types

| Event Type | Version | Schema |
| --- | --- | --- |
| `inventory.stock_in.recorded` | `1` | `docs/events/schemas/inventory.stock_in.recorded.v1.json` |
| `inventory.stock_out.recorded` | `1` | `docs/events/schemas/inventory.stock_out.recorded.v1.json` |
| `scale.telemetry.received` | `1` | `docs/events/schemas/scale.telemetry.received.v1.json` |
| `scale.command.acked` | `1` | `docs/events/schemas/scale.command.acked.v1.json` |

## Versioning Policy

- **Additive, backward-compatible fields**: keep same major version.
- **Breaking change (rename/remove/type change)**: publish new version.
- Never mutate historical schema files in place; append new versioned files.
- Consumers should route by `type + version`.

## Delivery Semantics

- Outbox writes are in the same transaction as source mutation.
- Dispatcher retries on transient errors with exponential backoff.
- Consumers must be idempotent and de-duplicate by event `id`.
