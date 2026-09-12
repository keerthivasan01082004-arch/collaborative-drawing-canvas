import {
  ClientMessage,
  ServerMessage,
  ServerMessageSchema,
  Point,
  Stroke,
  ToolType,
  Operation,
} from '@shared/index';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionManagerCallbacks {
  onStatusChange?: (status: ConnectionStatus) => void;
  onSyncState?: (baselineSeq: number, operations: Operation[]) => void;
  onUserJoined?: (userId: string, userName?: string) => void;
  onUserLeft?: (userId: string) => void;
  onStrokeBegin?: (userId: string, strokeId: string, tool: ToolType, color: string, width: number, point: Point) => void;
  onStrokeAppend?: (userId: string, strokeId: string, points: Point[]) => void;
  onStrokeEnd?: (userId: string, operation: Operation) => void;
  onUndoApplied?: (userId: string, operation: Operation) => void;
  onRedoApplied?: (userId: string, operation: Operation) => void;
  onClearApplied?: (userId: string, operation: Operation) => void;
  onCursorMove?: (userId: string, position: Point) => void;
  onAck?: (operationId: string, seq: number) => void;
  onError?: (code: string, message: string) => void;
}

export class ConnectionManager {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private currentRoomId: string | null = null;
  private currentUserName: string | undefined = undefined;

  private pingIntervalTimer: number | null = null;
  private reconnectTimeoutTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelayMs = 10000;

  private appendBuffer = new Map<string, Point[]>();
  private rafBatchTimer: number | null = null;

  constructor(private callbacks: ConnectionManagerCallbacks = {}) {}

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public connect(url: string, roomId?: string, userName?: string): void {
    if (this.socket && (this.status === 'connecting' || this.status === 'connected')) {
      return;
    }

    if (roomId) this.currentRoomId = roomId;
    if (userName) this.currentUserName = userName;

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      this.socket = new WebSocket(url);
      this.setupSocketListeners();
    } catch (err) {
      this.handleDisconnect();
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnectTimer();

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  public joinRoom(roomId: string, userName?: string): void {
    this.currentRoomId = roomId;
    this.currentUserName = userName;
    this.send({
      type: 'JOIN_ROOM',
      roomId,
      payload: { userName },
    });
  }

  public leaveRoom(): void {
    if (this.currentRoomId) {
      this.send({
        type: 'LEAVE_ROOM',
        roomId: this.currentRoomId,
        payload: {},
      });
      this.currentRoomId = null;
    }
  }

  public sendStrokeBegin(strokeId: string, tool: ToolType, color: string, width: number, point: Point): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'STROKE_BEGIN',
      roomId: this.currentRoomId,
      payload: { strokeId, tool, color, width, point },
    });
  }

  public queueStrokeAppend(strokeId: string, points: Point[]): void {
    if (!this.currentRoomId || points.length === 0) return;

    let buf = this.appendBuffer.get(strokeId);
    if (!buf) {
      buf = [];
      this.appendBuffer.set(strokeId, buf);
    }
    buf.push(...points);

    this.scheduleRafFlush();
  }

  public sendStrokeEnd(operationId: string, stroke: Stroke): void {
    if (!this.currentRoomId) return;
    this.flushAppendBuffer();
    this.send({
      type: 'STROKE_END',
      roomId: this.currentRoomId,
      payload: { operationId, stroke },
    });
  }

  public sendUndo(operationId: string, targetOperationId: string): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'UNDO',
      roomId: this.currentRoomId,
      payload: { operationId, targetOperationId },
    });
  }

  public sendRedo(operationId: string, targetOperationId: string): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'REDO',
      roomId: this.currentRoomId,
      payload: { operationId, targetOperationId },
    });
  }

  public sendClear(operationId: string): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'CLEAR',
      roomId: this.currentRoomId,
      payload: { operationId },
    });
  }

  public sendCursorMove(position: Point): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'CURSOR_MOVE',
      roomId: this.currentRoomId,
      payload: { position },
    });
  }

  public sendSyncRequest(lastKnownSeq: number): void {
    if (!this.currentRoomId) return;
    this.send({
      type: 'SYNC_REQUEST',
      roomId: this.currentRoomId,
      payload: { lastKnownSeq },
    });
  }

  public sendPing(): void {
    this.send({
      type: 'PING',
      payload: {},
    });
  }

  private send(msg: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(msg));
      } catch {
        // Ignore send errors
      }
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();

      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId, this.currentUserName);
      }
    };

    this.socket.onmessage = (event) => {
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(event.data);
      } catch {
        return;
      }

      const parseResult = ServerMessageSchema.safeParse(rawJson);
      if (!parseResult.success) return;

      this.handleServerMessage(parseResult.data);
    };

    this.socket.onclose = () => {
      this.handleDisconnect();
    };

    this.socket.onerror = () => {
      // Disconnect listener handles cleanup
    };
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'SYNC_STATE':
        if (this.callbacks.onSyncState) {
          this.callbacks.onSyncState(msg.payload.baselineSeq, msg.payload.operations);
        }
        break;
      case 'USER_JOINED':
        if (this.callbacks.onUserJoined) {
          this.callbacks.onUserJoined(msg.payload.userId, msg.payload.userName);
        }
        break;
      case 'USER_LEFT':
        if (this.callbacks.onUserLeft) {
          this.callbacks.onUserLeft(msg.payload.userId);
        }
        break;
      case 'STROKE_BEGIN':
        if (this.callbacks.onStrokeBegin) {
          this.callbacks.onStrokeBegin(
            msg.payload.userId,
            msg.payload.strokeId,
            msg.payload.tool,
            msg.payload.color,
            msg.payload.width,
            msg.payload.point
          );
        }
        break;
      case 'STROKE_APPEND':
        if (this.callbacks.onStrokeAppend) {
          this.callbacks.onStrokeAppend(msg.payload.userId, msg.payload.strokeId, msg.payload.points);
        }
        break;
      case 'STROKE_END':
        if (this.callbacks.onStrokeEnd) {
          this.callbacks.onStrokeEnd(msg.payload.userId, msg.payload.operation);
        }
        break;
      case 'UNDO_APPLIED':
        if (this.callbacks.onUndoApplied) {
          this.callbacks.onUndoApplied(msg.payload.userId, msg.payload.operation);
        }
        break;
      case 'REDO_APPLIED':
        if (this.callbacks.onRedoApplied) {
          this.callbacks.onRedoApplied(msg.payload.userId, msg.payload.operation);
        }
        break;
      case 'CLEAR_APPLIED':
        if (this.callbacks.onClearApplied) {
          this.callbacks.onClearApplied(msg.payload.userId, msg.payload.operation);
        }
        break;
      case 'CURSOR_MOVE':
        if (this.callbacks.onCursorMove) {
          this.callbacks.onCursorMove(msg.payload.userId, msg.payload.position);
        }
        break;
      case 'ACK':
        if (this.callbacks.onAck) {
          this.callbacks.onAck(msg.payload.operationId, msg.payload.seq);
        }
        break;
      case 'ERROR':
        if (this.callbacks.onError) {
          this.callbacks.onError(msg.payload.code, msg.payload.message);
        }
        break;
      case 'PONG':
        // Heartbeat ACK received
        break;
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.stopReconnectTimer();

    this.reconnectAttempts++;
    // Exponential backoff with jitter
    const delay = Math.min(
      this.maxReconnectDelayMs,
      Math.pow(2, this.reconnectAttempts) * 500 + Math.random() * 500
    );

    this.reconnectTimeoutTimer = window.setTimeout(() => {
      if (this.socket) {
        const url = this.socket.url;
        this.connect(url);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalTimer = window.setInterval(() => {
      this.sendPing();
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalTimer !== null) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimeoutTimer !== null) {
      clearTimeout(this.reconnectTimeoutTimer);
      this.reconnectTimeoutTimer = null;
    }
  }

  private scheduleRafFlush(): void {
    if (this.rafBatchTimer !== null) return;
    this.rafBatchTimer = requestAnimationFrame(() => {
      this.rafBatchTimer = null;
      this.flushAppendBuffer();
    });
  }

  private flushAppendBuffer(): void {
    if (!this.currentRoomId) return;

    for (const [strokeId, points] of this.appendBuffer.entries()) {
      if (points.length > 0) {
        this.send({
          type: 'STROKE_APPEND',
          roomId: this.currentRoomId,
          payload: { strokeId, points: [...points] },
        });
      }
    }
    this.appendBuffer.clear();
  }
}
