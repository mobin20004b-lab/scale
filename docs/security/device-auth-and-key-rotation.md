# Device Authentication and Key Rotation

## Current Model

- Each scale authenticates with a per-device credential.
- Device endpoints reject unauthorized or unknown scale IDs.
- Credentials are stored server-side and compared on each call.

## Rotation Policy

- **Standard interval**: every 90 days.
- **Emergency rotation**: immediately on suspected compromise.
- **Overlap window**: optional short dual-key period during coordinated rollouts.

## Operational Procedure

1. Generate new key using cryptographically strong random source.
2. Update backend credential for target scale(s).
3. Securely deliver key to device provisioning channel.
4. Validate successful authenticated heartbeat.
5. Revoke old key and log completion.

## Security Controls

- Never log full raw keys.
- Store only hashed or encrypted-at-rest values when possible.
- Restrict key visibility to privileged operators.
- Alert on repeated auth failures per device.

## Audit Requirements

Track: who rotated, when, why, impacted scales, and post-rotation verification result.
