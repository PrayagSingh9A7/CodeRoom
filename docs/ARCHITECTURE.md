# CodeRoom Architecture

## Planes

### 1. Control plane

Owns authentication, rooms, membership, files metadata, tests, comments, audit events and execution records.

**Stack:** Express + Prisma + PostgreSQL.

### 2. Collaboration plane

Owns persistent WebSocket connections, room presence, Yjs document synchronization and cursor awareness.

**Stack:** Socket.IO + Yjs + y-monaco + optional Redis adapter.

A file is represented as a Y.Doc. The server stores its current Yjs state in Postgres and stores document updates/snapshots for replay. Clients send batched CRDT updates rather than replacing entire files.

### 3. Execution plane

Owns asynchronous code execution.

**Flow:**

Browser → API → BullMQ → Executor Worker → Docker Sandbox → result → Postgres/Redis pub-sub → room sockets.

The executor never mounts the host workspace into a sandbox.

## Data flow: collaborative edit

```text
Monaco
  ↓
Y.Text transaction
  ↓
Yjs update
  ↓
client batch (≈80ms)
  ↓
Socket.IO
  ↓
server membership check
  ↓
merge into latest Yjs state
  ↓
Postgres
  ├── current state
  └── replay snapshot
  ↓
Socket.IO broadcast
  ↓
other clients
```

## Data flow: execution

```text
Run
 ↓
POST /api/rooms/:id/executions
 ↓
Execution row = QUEUED
 ↓
BullMQ
 ↓
executor worker
 ↓
Docker sandbox
 ↓
status/result
 ↓
Postgres
 ↓
Redis pub/sub
 ↓
Socket.IO room
```

## Scaling path

The current project is honest about being a strong single-region MVP:

- Postgres is the source of truth for metadata and document state.
- Redis handles queueing, rate limiting and optional Socket.IO fanout.
- The collaboration service can be scaled horizontally with sticky routing by room and the Redis adapter.
- The execution plane scales independently by increasing worker concurrency/replicas.

A production-grade multi-region design would add room sharding, regional execution pools, cross-region session handoff and stronger consistency/lease semantics.
