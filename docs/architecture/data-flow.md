# Data Flow

## 1) Stock-in via Dashboard

1. Operator submits stock-in form.
2. API validates payload and resolves product/warehouse context.
3. Transaction writes `stock_ins` and updates inventory projections.
4. Optional scale metadata (`scaleId`, `scaleWeight`) is attached.
5. Response returns updated state for UI refresh.

## 2) Stock-out via Dashboard / Barcode Scan

1. Operator scans barcode or selects product.
2. System resolves product SKU/barcode and validates availability.
3. Stock-out record is persisted with reason/notes.
4. Inventory reports reflect net changes in near real time.

## 3) External Integration APIs

1. Third-party client authenticates with Bearer token.
2. Client invokes product/inventory or stock mutation endpoints.
3. Idempotency key (for mutating calls) prevents duplicate writes on retries.
4. Responses can be replayed from idempotency storage where applicable.

## 4) Scale Device Loop

1. Device authenticates per scale and posts telemetry/weight updates.
2. Backend stores latest scale state + telemetry history.
3. Device polls `next-command`; server returns oldest pending command.
4. Device executes action and posts command acknowledgment.
5. Server transitions command status for auditability.

## 5) Live Weight Streaming

1. Weight updates are accepted through scale endpoints.
2. In-process pub/sub hub broadcasts updates.
3. Dashboard live endpoints stream the data to connected operators.

## Consistency Notes

- Inventory-changing writes should be wrapped in DB transactions.
- Device command state transitions should be monotonic (`pending -> delivered -> acked/failed`).
- Expiring idempotency records should be cleaned on a recurring schedule.
