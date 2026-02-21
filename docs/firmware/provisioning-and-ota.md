# Firmware Provisioning and OTA

## Provisioning Flow

1. Flash baseline firmware image.
2. Assign immutable device identifier and target `scaleId`.
3. Inject initial device credential via secure channel.
4. Bootstrap connectivity and fetch remote config.
5. Send first telemetry heartbeat to confirm enrollment.

## Environment Profiles

- **Factory**: manufacturing validation endpoints.
- **Staging**: pre-production integration testing.
- **Production**: live warehouse operations.

## OTA Strategy

- Versioned firmware artifacts with checksum/signature.
- Ring-based rollout: canary -> pilot warehouse -> global.
- Automatic rollback on health-check regressions.

## Safety Checks

- Battery/power threshold before update.
- Connectivity and storage availability checks.
- Resume/retry support for interrupted downloads.

## Operational Metrics

- Firmware adoption by version.
- OTA success/failure rate.
- Mean time to recover from failed update.
