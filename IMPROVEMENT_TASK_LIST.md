# Product Improvement Task List

This backlog is based on a review of the current codebase, with emphasis on **scale manager improvements**, **UI/UX**, and **logical/data integrity improvements**.

## 1) Scale Manager Improvements (High Priority)

- [ ] Replace per-scale 1s polling with a single aggregated endpoint (`GET /api/scales/live`) and adaptive refresh strategy.
  - Why: current UI loops over all active scales and fetches each one every second, which scales poorly as number of devices grows.
  - Done when:
    - One request returns live statuses for all visible scales.
    - Refresh interval adapts (e.g., 1s when tab focused, 5-10s in background).

- [ ] Add connectivity/health model for scales (`ONLINE`, `STALE`, `OFFLINE`) with stale-threshold logic.
  - Why: `lastWeight` alone does not indicate if a scale is currently reachable.
  - Done when:
    - UI badges show health state and age of last reading.
    - Scale list can filter by health.

- [ ] Add secure API key lifecycle management (rotate/revoke/regenerate with audit log).
  - Why: keys are copyable and long-lived; compromise risk increases over time.
  - Done when:
    - Admin can rotate token with confirmation.
    - Old token invalidates immediately.
    - Activity log records key rotation events.

- [ ] Improve deletion safety for scales with linked stock-in records.
  - Why: soft UI undo exists, but backend delete can still fail or remove historic context.
  - Done when:
    - Prefer archive/deactivate over hard-delete if referenced.
    - Clear backend validation error if scale has transactional history.

- [ ] Add calibration + metadata fields for scales (`tare`, `unit`, `precision`, `location note`, `heartbeat interval`).
  - Why: operational use needs device-specific settings for accurate and trusted readings.
  - Done when:
    - Form supports these fields.
    - Live weight display applies unit/precision correctly.

- [ ] Add bulk actions for scale operations.
  - Why: enterprise warehouses often onboard/deactivate many scales together.
  - Done when:
    - Multi-select with bulk activate/deactivate and warehouse reassignment exists.

## 2) Core Logic & Data Integrity (High Priority)

- [ ] Wrap stock-in and stock-out write paths in DB transactions.
  - Why: create record + update product + create activity currently run as separate operations and can partially fail.
  - Done when:
    - Each flow is atomic via `prisma.$transaction`.

- [ ] Enforce server-side validation with shared Zod schemas.
  - Why: forms validate client-side, but APIs still accept loosely typed payloads.
  - Done when:
    - Same schema package validates both UI and API routes.
    - API returns field-level validation details.

- [ ] Add idempotency keys for external stock endpoints.
  - Why: retries from device/network issues can create duplicate inventory movements.
  - Done when:
    - External writes require `Idempotency-Key` header.
    - Duplicate key within TTL returns original result.

- [ ] Add concurrency guards for stock-out race conditions.
  - Why: two concurrent withdrawals can pass pre-check and oversell stock.
  - Done when:
    - Conditional update (e.g., `currentStock >= requested`) or serializable transaction enforced.

- [ ] Normalize quantity/weight semantics.
  - Why: model stores both `quantity` and `weight`; current logic often sets both to same value.
  - Done when:
    - Clear domain contract exists per product type (count-based vs weight-based).
    - UI labels and reports match stored meaning.

- [ ] Add warehouse-aware inventory accounting.
  - Why: stock records have optional warehouse, but product stock is global aggregate only.
  - Done when:
    - Introduce per-warehouse stock ledger/table.
    - Prevent stock-out from warehouse with insufficient quantity.

## 3) UI/UX Improvements (Medium Priority)

- [ ] Create a consistent “empty / loading / error” state system across dashboard modules.
  - Why: UX consistency reduces operator confusion and support burden.
  - Done when:
    - Shared state components used in manager lists, reports, and forms.

- [ ] Improve mobile ergonomics for forms and scanner workflows.
  - Why: mobile actions rely on fixed bottom button; scanner and keyboard flow can clash.
  - Done when:
    - Sticky CTA does not overlap scanner status/help content.
    - Focus order and post-scan transitions are optimized.

- [ ] Add inline helper text for units and conversion assumptions.
  - Why: ambiguity between grams/pieces causes entry errors.
  - Done when:
    - Quantity field always displays selected product unit and examples.

- [ ] Introduce command-style quick actions in dashboard header.
  - Why: frequent actions (stock-in, stock-out, product search) should be reachable in 1-2 taps.
  - Done when:
    - Keyboard shortcut + quick action menu is available.

- [ ] Upgrade audit visibility UX.
  - Why: activity log is useful but hard to trace a full transaction story.
  - Done when:
    - Activity items deep-link to product/transaction detail.
    - Filters by entity, user, time range are available.

- [ ] Add optimistic UI with robust rollback messaging.
  - Why: some operations are optimistic in UI; failures should always restore state clearly.
  - Done when:
    - Every optimistic mutation has deterministic rollback + user-visible reason.

## 4) Reporting & Decision Support (Medium Priority)

- [ ] Add forecast-style stock depletion indicators.
  - Why: current low-stock is threshold-based; trend-aware estimates are more actionable.
  - Done when:
    - Product shows “days until min stock” from recent outflow rate.

- [ ] Add scale utilization reports.
  - Why: managers need to know which scales are active, idle, or noisy.
  - Done when:
    - Report includes read frequency, uptime %, and operations linked per scale.

- [ ] Expand export options with locale-safe formats.
  - Why: RTL + Persian numerals can break downstream spreadsheet usage.
  - Done when:
    - CSV/XLSX exports provide configurable numeral/date formats.

## 5) Security, Observability, and Operations (Medium Priority)

- [ ] Add request-level rate limiting for external and scale ingestion endpoints.
  - Why: protects from abuse and malfunctioning devices.
  - Done when:
    - Per-token and per-IP thresholds are enforced with clear errors.

- [ ] Add structured logging + correlation IDs.
  - Why: current logs are basic; troubleshooting across API/UI flows is difficult.
  - Done when:
    - Each request has trace ID propagated through logs and activity records.

- [ ] Add background health checks and alerting hooks.
  - Why: warehouse operations need proactive alerts for stale/offline devices.
  - Done when:
    - Alert produced when scale heartbeat exceeds threshold.

- [ ] Define backup/restore and migration safety runbooks.
  - Why: inventory systems require reliable disaster recovery.
  - Done when:
    - Documented RPO/RTO targets and tested restore procedure.

## 6) Suggested Execution Phases

- [ ] **Phase 1 (Stability):** Transactions, validation unification, concurrency protection, delete/archive policy.
- [ ] **Phase 2 (Scale Platform):** Live endpoint redesign, health states, token rotation, scale metadata.
- [ ] **Phase 3 (UX):** Mobile/scanner flow polish, quick actions, activity traceability.
- [ ] **Phase 4 (Analytics + Ops):** Forecasting, utilization reports, observability and alerting.

## 7) Fast Wins (Can start this week)

- [ ] Convert stock-in/out write paths to `prisma.$transaction`.
- [ ] Add backend guard: reject deleting scale with linked transactions, suggest deactivation.
- [ ] Add “last seen X seconds ago” + stale badge on scale cards.
- [ ] Introduce shared API input schema for stock routes.
- [ ] Add retry-safe idempotency for external stock-in/out endpoints.
