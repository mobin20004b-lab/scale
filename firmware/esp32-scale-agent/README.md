# ESP32 Scale Agent Firmware

ESP32 firmware for one-scale-per-device deployments.

## New local management capabilities

- ✅ AP mode enabled (ESP32 runs AP + STA together).
- ✅ Captive DNS redirect (`*`) to local index page.
- ✅ Local management on `/` with save + reboot flow.
- ✅ Configure endpoint URL, scale ID, token, intervals, SSID/password.
- ✅ Configure scale/printer connectivity data (pins, baud, printer type).
- ✅ Internet/backend connectivity test from local portal.

## Features

- Reads continuous weight stream from scale UART.
- Pushes weight to backend (`POST /api/scales/:id/weight`) with Bearer token.
- Pushes telemetry (`POST /api/scales/:id/device/telemetry`).
- Pulls pending commands (`GET /api/scales/:id/device/next-command`).
- ACK/FAIL command execution (`POST /api/scales/:id/device/command-ack`).
- Pulls effective config + version (`GET /api/scales/:id/device/config`) and persists locally.
- Supports printer actions: `PRINT_TEST`, `PRINT_LABEL`, `SET_CONFIG`, `RESTART`.
- Printer transport via UART with TSPL/ESC-POS output.

## Hardware wiring (defaults)

- Scale UART (Serial1): RX=GPIO16, TX=GPIO17
- Printer UART (Serial2): RX=GPIO26, TX=GPIO27

These values are now editable from local management page.

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
- For production hardening, add TLS certificate pinning and signed command validation.
