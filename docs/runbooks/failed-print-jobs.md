# Runbook: Failed Print Jobs

## Trigger

- Label/receipt print command marked `failed`.
- Operator reports missing or garbled labels.

## Triage

1. Confirm affected scale and printer type/connection.
2. Inspect last queued print command payload.
3. Check device acknowledgment error details.
4. Verify printer paper, ribbon, and connectivity.

## Immediate Actions

- Retry print command once with same payload.
- If repeated failure, route to backup printer profile.
- Allow manual label fallback for urgent shipments.

## Root Cause Categories

- Device offline or unstable network.
- Printer transport issue (paper jam/out-of-stock).
- Invalid payload template or unsupported encoding.
- Firmware regression after update.

## Recovery Criteria

- 3 consecutive successful print acknowledgments.
- No stale failed print commands older than 15 minutes.
- Operators confirm physical output quality.

## Follow-up

- Attach failed command IDs and logs to incident.
- Update template validation if payload was malformed.
