# Domain Map

## Inventory & Warehouse

- **Entities**: `Product`, `Warehouse`, `StockIn`, `StockOut`.
- **Responsibilities**:
  - Maintain product master data.
  - Record inbound and outbound operations.
  - Produce inventory snapshots and exports.

## Scale Device Management

- **Entities**: `Scale`, `ScaleTelemetry`, `ScaleCommand`.
- **Responsibilities**:
  - Track registration, status, and heartbeat.
  - Store recent weight and telemetry history.
  - Queue, dispatch, and confirm remote commands.

## Barcode Workflow

- **Entities**: known product barcodes + unknown barcode events.
- **Responsibilities**:
  - Resolve barcodes into product actions.
  - Capture unresolved scans for triage and mapping.

## Identity & Access

- **Entities**: user sessions, API secrets, per-device keys.
- **Responsibilities**:
  - Interactive auth for dashboard users.
  - Token auth for external APIs.
  - Device-to-cloud authentication for scale endpoints.

## Platform Settings

- **Entities**: runtime settings for API, security, and general behavior.
- **Responsibilities**:
  - Allow safe operations tuning without redeploy.
  - Keep centralized policy for rotation intervals and limits.

## Reporting & Operations

- **Entities**: report exports, activity logs, operational telemetry.
- **Responsibilities**:
  - Deliver business metrics.
  - Support investigations and incident timelines.
