# Monitoring, Alerts, and SLOs

## Golden Signals

- **Availability**: API success rate by endpoint class.
- **Latency**: P50/P95 for dashboard, external API, and device API.
- **Errors**: 5xx rate, auth failures, validation failures.
- **Saturation**: DB connection pressure and queue backlog.

## Key Alerts

1. **Scale offline burst**: >10% active scales missing heartbeat.
2. **Command backlog**: pending commands older than 5 minutes.
3. **Inventory write failures**: stock mutation error rate >2% over 5m.
4. **Idempotency conflicts spike**: potential client bug or replay attack.

## Suggested SLOs

- Dashboard/API availability: **99.9% monthly**.
- P95 external API latency: **< 500 ms**.
- P95 device command delivery delay: **< 30 sec**.
- Scale heartbeat freshness: **95% within expected interval**.

## Error Budget Policy

- Burn >25% budget in 7 days: freeze noncritical releases.
- Burn >50% budget in 30 days: initiate reliability sprint.

## Dashboards

- Operations overview (system health).
- Device fleet health (online ratio, heartbeat age, command status).
- Inventory pipeline (mutation throughput and failures).
