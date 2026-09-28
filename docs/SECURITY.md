# Security Model

## Authentication

- Passwords are hashed with Node's `scrypt` using a per-password random salt.
- Sessions use opaque 256-bit random tokens.
- Only SHA-256 hashes of session tokens are persisted.
- Session tokens are HTTP-only, SameSite=Lax cookies.
- Login and registration are Redis-rate-limited.

## Authorization

Every room-scoped mutation checks membership and role in the API. UI permissions are convenience only; the API is authoritative.

## CSRF / origin protection

Mutation requests are checked against the configured `APP_URL` origin. Production deployments should also enforce TLS and set `APP_URL` to the canonical origin.

## Code execution threat model

Submitted code is untrusted.

Sandbox controls:

- no network
- capped CPU
- capped memory
- capped process count
- dropped capabilities
- no-new-privileges
- read-only root
- temporary writable filesystem
- non-root UID
- hard timeout
- ephemeral container

### Production hardening still required

Docker-on-host is a portfolio-grade boundary, not a high-assurance multi-tenant sandbox. For hostile multi-tenant workloads use gVisor/Firecracker or an equivalent hardened runtime on isolated worker hosts, with resource accounting, worker-level quotas and egress deny-by-default.

## Upload / content risks

The MVP treats source as text and stores it in Postgres. A production version should scan uploaded binary artifacts, enforce per-room storage quotas, cap total project size and add abuse controls.

## Audit trail

Authentication events, room creation, file operations, joins and execution queueing are written to the audit/event layer.
