# Architecture Decision Records (ADRs)

## ADR-001: Raw WebSocket (`ws`) over Socket.IO / Abstraction Frameworks
- **Status**: Approved
- **Rationale**: Minimal frame overhead, predictable JSON serialization, transport-independent protocol schemas via Zod, and full control over WebSocket upgrade handshakes.

## ADR-002: HTML5 Canvas 2D without External Rendering Libraries
- **Status**: Approved
- **Rationale**: Direct Canvas 2D context manipulation avoids heavy DOM object overhead (Fabric.js/Konva), ensuring 60+ FPS freehand drawing and High-DPI sharpness.

## ADR-003: Server-Authoritative Monotonic Sequence Ordering
- **Status**: Approved
- **Rationale**: Prevents multi-client path drift without complex CRDT/OT merging overhead. Server assigns a single monotonically increasing `seq` per room.

## ADR-004: Hybrid Incremental / Replay Rendering Strategy
- **Status**: Approved
- **Rationale**: Active drawing renders incremental line segments on `requestAnimationFrame` cadence. Full canvas replay is reserved for structural events (resize, undo, redo, clear).

## ADR-005: Decoupled Plain TypeScript CanvasEngine & React State
- **Status**: Approved
- **Rationale**: High-frequency pointer coordinates and active stroke buffers are kept strictly inside plain TypeScript structures. React state is restricted to low-frequency UI metadata.

## ADR-006: Tombstone Per-User Undo Model
- **Status**: Approved
- **Rationale**: Operations are marked with `isUndone` tombstones rather than deleted, preserving immutable sequence order while allowing users to undo their own strokes.
