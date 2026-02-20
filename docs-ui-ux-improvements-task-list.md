# UI/UX Improvement Task List

## Scope Reviewed
- Authentication flow (`/login`)
- Dashboard shell (sidebar, header, overview cards)
- Product management (table, filters, create/edit form)
- Stock-in / stock-out workflows (including barcode scanner and scale integration)
- Reports (filters, charts, transaction table)
- Warehouses and scales management screens
- Activity and settings pages

---

## P0 — High Impact / Should be done first

- [ ] **Unify date handling across the app (Gregorian data + Persian display).**
  - Use one shared date component and one formatting utility for all pages.
  - Standardize relative/absolute time usage (e.g., activity list vs reports tables).
  - Show timezone context for operational confidence.

- [ ] **Make destructive actions safer and clearer.**
  - Add contextual warnings for delete actions when related records exist (products, warehouses, scales).
  - Ensure destructive buttons are consistently styled and placed away from primary actions.
  - Add undo where feasible (soft-delete or optimistic rollback on client).

- [ ] **Improve form error prevention in stock workflows.**
  - Disable submission until required fields are valid and numeric values are > 0.
  - Add inline validation for over-withdrawal and threshold breaches before submit.
  - Highlight invalid fields with focused, actionable error text.

- [ ] **Strengthen mobile ergonomics for data-dense screens.**
  - Increase tap targets for icon-only actions.
  - Add sticky bottom action bar for primary actions in long forms (stock in/out, product form).
  - Improve mobile card summaries with clearer hierarchy for status and quantity.

- [ ] **Add global empty/loading/error state patterns.**
  - Replace plain text fallbacks with consistent “empty state” cards + next-best action.
  - Ensure every async area has skeleton/loading and recoverable error UI.
  - Add retry actions where network/API calls can fail (weights, exports, scanner).

---

## P1 — Medium Impact / Quality and productivity gains

- [ ] **Refine dashboard information hierarchy.**
  - Emphasize operationally critical KPIs (critical low stock count, pending actions) over totals.
  - Add trend indicators (compared to previous period) for stock-in/out and net change.
  - Group actions by urgency (e.g., “reorder now”).

- [ ] **Improve filter UX consistency across products/reports/scales.**
  - Standardize placement, naming, and behavior for search + filter + clear controls.
  - Preserve filter state when navigating away and back.
  - Add active filter chips for quick visibility/removal.

- [ ] **Increase accessibility and keyboard navigation quality.**
  - Audit focus order in dialogs, sheets, and popovers.
  - Add full keyboard support for all custom controls (filter selects, scanner toggles, pagination).
  - Verify color contrast for status badges (especially warning/destructive in dark mode).

- [ ] **Reduce cognitive load in forms with progressive disclosure.**
  - Keep required fields visible first and move optional fields into collapsible “More details”.
  - Auto-fill invoice/customer/supplier from recent entries where appropriate.
  - Provide smart defaults for warehouse/scale based on last usage.

- [ ] **Clarify unit/measurement presentation.**
  - Standardize labeling between گرم / کیلوگرم and convert consistently where needed.
  - Show unit badges next to quantity inputs and chart totals.
  - Add helper text when scale weight is copied into quantity.

---

## P2 — Nice-to-have / polish

- [ ] **Enhance reporting readability.**
  - Add chart legends/tooltips in Persian with unit-aware values.
  - Limit long product labels in charts and provide full value on hover.
  - Add quick presets for time ranges (today, last 7 days, this month).

- [ ] **Improve scanner feedback and fallback paths.**
  - Add visual scanning frame guidance and haptic/audio success cue (if supported).
  - Provide manual barcode entry fallback inline with scanner.
  - Add clear recovery CTA when camera permission is blocked.

- [ ] **Strengthen settings and API docs usability.**
  - Add copy buttons for endpoint examples and auth headers.
  - Provide runnable examples (curl + JSON response snippet pairs).
  - Organize by common jobs (inventory sync, stock-in, stock-out).

- [ ] **Support personalization and task continuity.**
  - Save user preferences (page size, last filters, selected warehouse, theme).
  - Add “recently used products” shortcuts in stock forms.
  - Add optional compact density mode for power users.

---

## Suggested Execution Order (Sprint-Friendly)

- [ ] **Sprint 1:** P0 items 1–3 (form safety, state patterns, destructive clarity)
- [ ] **Sprint 2:** P0 items 4–5 + P1 filter consistency
- [ ] **Sprint 3:** P1 accessibility + hierarchy + measurement clarity
- [ ] **Sprint 4:** P2 polish items (reports, scanner, settings, personalization)

## Success Metrics

- [ ] 20% reduction in failed stock submission attempts
- [ ] 30% faster completion time for stock-in/out tasks on mobile
- [ ] 25% reduction in filter-reset/navigation friction (measured via events)
- [ ] Improved accessibility score (axe/lighthouse) to agreed target
