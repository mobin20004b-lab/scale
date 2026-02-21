# ESP32 Scale Agent Firmware

ESP32 firmware for one-scale-per-device deployments in production fleets.

## Device lifecycle model

1. **Provisioning**
   - Factory QR includes `scaleId` + bootstrap token.
   - One-time enrollment endpoint exchanges bootstrap token for device API key.
2. **Configuration**
   - Fleet control plane serves signed profile with `schemaVersion`.
   - Profile includes warehouse, scale ID, intervals, and printer settings.
3. **Operation**
   - Weight stream + heartbeat + telemetry.
   - Device should cache unsent samples and retry when WiFi/backend recovers.
4. **Maintenance**
   - Diagnostics includes RSSI, free heap, uptime, reboot reason.
   - Command polling and command issue endpoints are rate-limited.
5. **Retirement**
   - `RETIRE` command clears local persisted config and reboots device.
   - Control plane retires record and revokes bootstrap access.

## Production hardening checklist

- Device-bound bearer tokens + one-time bootstrap enrollment.
- Config payload signing (`SCALE_CONFIG_SIGNING_SECRET`) and schema versioning.
- Command ack replay protection (`ackNonce` + expiry + one-time use).
- NTP/clock drift guardrails on telemetry payload acceptance.
- OTA policy recommendation: canary (5%) → pilot (25%) → fleet (100%).
- OTA safety recommendation: dual-partition + rollback on failed boot health checks.
- TLS pinning/trust-anchor strategy should be added before internet-scale rollout.

## Fleet operations suggestions

- Fleet dashboard: online/stale/offline and firmware map by warehouse.
- SLA alarms: no heartbeat, telemetry silence, high command failure rate.
- Firmware compliance policy: enforce min secure version per site.
- Site scorecard: network quality, command success rate, median command latency.

## Features

- Reads continuous weight stream from scale UART.
- Pushes weight to backend (`POST /api/scales/:id/weight`) with Bearer token.
- Pushes telemetry (`POST /api/scales/:id/device/telemetry`) with diagnostics.
- Pulls pending commands (`GET /api/scales/:id/device/next-command`).
- ACK/FAIL command execution (`POST /api/scales/:id/device/command-ack`) using ack nonce.
- Pulls effective config + version (`GET /api/scales/:id/device/config`) and persists locally.
- Supports printer actions: `PRINT_TEST`, `PRINT_LABEL`, `SET_CONFIG`, `RESTART`, `RETIRE`.
- Printer transport via UART with TSPL/ESC-POS output.

## Hardware wiring (defaults)

- Scale UART (Serial1): RX=GPIO16, TX=GPIO17
- Printer UART (Serial2): RX=GPIO26, TX=GPIO27

These values are editable from local management page.

## Setup

1. Copy `include/secrets.example.h` to `include/secrets.h`.
2. Fill in initial defaults (WiFi/backend/scale).
3. Build/upload with PlatformIO:

```bash
pio run
pio run -t upload
pio device monitor
```

4. Connect to AP `Scale-Agent-Setup` (or configured AP SSID).
5. Open any URL in browser; DNS redirects to local index page.
6. Save config and device auto-reboots.

## Local endpoints

- `GET /` - management UI (index page)
- `POST /save` - save config and reboot
- `GET /status` - JSON runtime status
- `GET /test-internet` - run internet/backend test

## Notes

- AP mode remains active so field technicians can always access local management.
- Runtime config is persisted in NVS using `Preferences`.
- Add TLS certificate pinning in firmware for production internet deployments.
