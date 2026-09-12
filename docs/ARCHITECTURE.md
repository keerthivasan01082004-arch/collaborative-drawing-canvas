# System Architecture & Technical Specification

## 1. Core Architecture Overview

```text
Browser Client 1                          Browser Client 2
  |                                          |
  +-- React UI (Zustand state)               +-- React UI (Zustand state)
  +-- CanvasEngine (Plain TS)                +-- CanvasEngine (Plain TS)
  +-- ConnectionManager (ws)                 +-- ConnectionManager (ws)
  +-- OperationLogClient                     +-- OperationLogClient
           |                                          |
           +------------ WebSocket (WSS) -------------+
                              |
                              v
                 Node.js raw `ws` Server
                              |
                              v
                         RoomManager
                              |
                     Map<roomId, Room>
                              |
                   Per-Room OperationLog
                   Append-only / seq-ordered
                   Server-authoritative
```

## 2. Component Responsibilities

### Frontend Architecture
- **`CanvasEngine.ts`**: High-frequency 2D rendering pipeline (plain TypeScript, **zero React dependencies**). Handles DPI backing store scaling (`devicePixelRatio`), container auto-resizing via `ResizeObserver`, pointer events API (`setPointerCapture`), and local path prediction.
- **`ConnectionManager.ts`**: WebSockets lifecycle, application heartbeat (`PING`/`PONG`), message queuing, `requestAnimationFrame` point batching, and exponential backoff reconnection.
- **`OperationLogClient.ts`**: Client mirror of authoritative sequence order (`lastAppliedSeq`), deduplication by `operationId`, and out-of-order gap buffering.
- **Zustand (`roomStore.ts`, `toolStore.ts`)**: Manages low-frequency UI concerns only (active tool, stroke color/width, room participants, connection status).

### Backend Architecture
- **Node.js HTTP Server**: Serves `/health` endpoint and handles WebSocket upgrade requests.
- **`RoomManager.ts`**: In-memory registry (`Map<roomId, Room>`) managing room lifecycle, capacity limits, and automatic 5-minute empty-room TTL cleanup.
- **`Room.ts`**: Room state containing `roomId`, `users` map, and per-room `OperationLog`.
- **`OperationLog.ts`**: Append-only authoritative operation storage. Assigns monotonically increasing `seq` per room and handles idempotency deduplication by `operationId`.

## 3. Sequence Ordering & Gap Recovery Model

- The server is the single source of truth for ordering.
- Every authoritative mutating operation receives a unique monotonically increasing integer `seq`.
- If a client receives an operation with `seq == lastAppliedSeq + 1`, it applies the operation immediately.
- If a client receives `seq > lastAppliedSeq + 1`, it buffers the operation in a gap buffer and dispatches `SYNC_REQUEST` to fetch missing delta operations.

## 4. Per-User Undo / Redo Model

- Users can only undo strokes they authored (`userId === operation.userId`).
- The authoritative operation log is strictly append-only.
- Undo/Redo operations assign a new `seq` and apply a tombstone status (`isUndone = true/false`) to the target stroke operation.
- Clients replay operations upon receiving `UNDO_APPLIED` / `REDO_APPLIED` to render the correct canvas view.

## 5. Rendering Strategy: Hybrid Model

- **Incremental Rendering**: Ordinary active drawing (`STROKE_BEGIN`, `STROKE_APPEND`, `STROKE_END`) renders only newly added line segments directly onto the canvas context.
- **Full Redraw**: Performed only during structural events (container resize, `UNDO`, `REDO`, `CLEAR`, or initial state `SYNC_STATE`).
