# 0001 - Run dashboard, external API, and device API in one Next.js service

- **Status**: accepted
- **Date**: 2026-02-21

## Context

The product needs to iterate quickly across dashboard UX, public API contracts, and scale-device integrations while maintaining shared domain logic and DB transactions.

## Decision

Keep a modular monolith architecture in one service/runtime:

- UI routes + BFF APIs
- External integration APIs
- Device endpoints for telemetry and command polling

All backed by one Prisma/PostgreSQL data model.

## Consequences

### Positive

- Faster development velocity and simpler deployments.
- Shared auth/validation/idempotency utilities.
- Fewer cross-service consistency challenges.

### Negative

- Single service blast radius.
- Need careful performance isolation between user and device traffic.

## Alternatives considered

- Split into separate API services per channel (deferred until scale justifies).
