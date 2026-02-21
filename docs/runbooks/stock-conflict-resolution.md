# Runbook: Stock Conflict Resolution

## Purpose

Resolve discrepancies between expected and observed inventory caused by concurrent writes, retries, or delayed device sync.

## Inputs

- Product ID/SKU
- Warehouse ID
- Time window of mismatch
- Related stock-in/out record IDs

## Steps

1. **Freeze edits** for the affected product/warehouse pair.
2. Pull ordered transaction history (stock in/out) for window.
3. Identify duplicate submissions (same idempotency key or identical payload/time).
4. Validate barcode events and any manual overrides.
5. Compare physical recount to computed balance.
6. Apply corrective entry (preferred) or controlled adjustment with reason code.
7. Capture approver and incident reference in notes.

## Decision Rules

- Never hard-delete historical stock transactions.
- Use additive correction records to preserve auditability.
- Require supervisor approval for negative inventory corrections.

## Validation

- Recompute inventory report after correction.
- Confirm no open conflict alert remains for product.
- Notify warehouse manager with final variance summary.
