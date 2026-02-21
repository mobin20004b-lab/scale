# Architecture Overview

## Context
Scale is a Next.js-based warehouse management platform focused on **weight-based inventory operations** and **connected scale devices**. The system combines:

- A web dashboard for operators and supervisors.
- A REST API surface for external integrations.
- A device API for field scales posting telemetry and pulling commands.
- A PostgreSQL data layer accessed via Prisma.

## High-level Components

1. **UI + BFF (Next.js App Router)**
   - Server-rendered dashboard pages and route handlers.
   - Hosts operational APIs under `app/api/*`.
2. **Domain Services (in-process modules)**
   - Validation schemas, idempotency helpers, auth utilities, and live scale state fanout.
3. **PostgreSQL + Prisma ORM**
   - Source of truth for inventory, stock movements, scale state, telemetry, command queue, and settings.
4. **Scale Devices**
   - Authenticate with per-scale credentials.
   - Push weight/telemetry and consume queued commands.
5. **External Clients**
   - Integrate over token-protected public endpoints for products and stock operations.

## Core Domain Boundaries

- **Inventory Domain**: products, warehouses, stock-in/out, aggregate inventory.
- **Device Domain**: scales, live weight, telemetry, command lifecycle, device config.
- **Security Domain**: user auth, API token auth, device auth, idempotency controls.
- **Observability Domain**: activity trail, telemetry history, operational health signals.

## Deployment Model

- Single deployable web service (Next.js runtime).
- Backed by PostgreSQL (local or managed).
- Optional containerized deployment via Docker/Docker Compose.

## Non-functional Priorities

- **Integrity** of inventory calculations and stock adjustments.
- **Resilience** under intermittent scale/device connectivity.
- **Traceability** for compliance and incident response.
- **Idempotent APIs** to protect from duplicate writes and retries.
