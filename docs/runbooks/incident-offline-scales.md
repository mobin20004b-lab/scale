# Runbook: Incident - Offline Scales

## Trigger

- Multiple scales stop reporting heartbeat/telemetry.
- Live dashboard shows stale weight timestamps.

## Detection

- Alert on missing heartbeat beyond `2 x heartbeatIntervalSec`.
- Alert on command queue age > SLO for active scales.

## Triage Checklist

1. Confirm scope: single site, single warehouse, or global.
2. Verify app health and database connectivity.
3. Inspect latest telemetry timestamp per affected scale.
4. Confirm device auth failures vs network failures.
5. Check pending command backlog.

## Mitigation

- If network outage: switch site to manual weighing fallback.
- If auth drift: rotate/reissue per-scale keys and redeploy device config.
- If backend regression: rollback to previous known-good release.
- Pause noncritical remote commands until stable.

## Communication

- Open incident channel with Operations + Warehouse leads.
- Publish impact summary every 30 minutes.
- Note manual transaction handling requirements.

## Recovery Validation

- Heartbeats restored for >= 95% impacted devices.
- Command queue returns to baseline.
- Spot-check stock-in entries from restored scales.

## Post-incident

- Produce timeline with root cause and corrective actions.
- Add/adjust alerts to detect this failure mode earlier.
