# Design Tokens and Status Language

## Design Tokens

Define central tokens for consistency across dashboard, printing workflows, and device admin pages.

- **Color**: success, warning, danger, info, neutral.
- **Typography**: Persian-first readable scale with numeric fallback.
- **Spacing**: 4px base scale.
- **Radius/Borders**: shared container and input standards.

## Inventory Status Language

Use concise and action-oriented Persian labels (with optional English metadata keys):

- `in_stock` -> "موجود"
- `low_stock` -> "رو به اتمام"
- `out_of_stock` -> "ناموجود"
- `pending_sync` -> "در انتظار همگام‌سازی"
- `device_offline` -> "دستگاه آفلاین"

## Device/Command Status Language

- `pending` -> "در صف"
- `delivered` -> "ارسال شد"
- `acked` -> "تایید شد"
- `failed` -> "ناموفق"

## UX Rules

- Always pair critical color with icon/text (no color-only meaning).
- For destructive actions, require clear confirmation copy.
- Show timestamp and source (user/device) on status-critical events.
