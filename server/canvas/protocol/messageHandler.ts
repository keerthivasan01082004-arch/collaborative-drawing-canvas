import { WebSocket } from 'ws';
import { ClientMessage, ServerMessage, Operation, UndoRedoPayload } from '../../../shared/index.js';
import { logger } from '../logging/logger.js';
import { RoomManager } from '../rooms/RoomManager.js';

export interface ConnectionMeta {
  connectionId: string;
  socket: WebSocket;
  connectedAt: number;
  lastHeartbeatAt: number;
}

export class ProtocolHandler {
  constructor(private roomManager: RoomManager) {}

  public handleClientMessage(meta: ConnectionMeta, message: ClientMessage): void {
    logger.debug({ connectionId: meta.connectionId, messageType: message.type }, 'Handling client message');

    switch (message.type) {
      case 'PING': {
        meta.lastHeartbeatAt = Date.now();
        const response: ServerMessage = {
          type: 'PONG',
          payload: {},
        };
        meta.socket.send(JSON.stringify(response));
        break;
      }

      case 'JOIN_ROOM': {
        const { roomId, payload } = message;
        const room = this.roomManager.getOrCreateRoom(roomId);

        if (room.isFull()) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'ROOM_FULL', message: 'Room has reached maximum capacity' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        this.roomManager.removeSession(meta.socket);

        const roomUser = room.addUser(meta.socket, payload.userName);
        this.roomManager.registerUserSession(meta.socket, room, roomUser);

        const syncMsg: ServerMessage = {
          type: 'SYNC_STATE',
          payload: {
            baselineSeq: room.operationLog.getNextSeq() - 1,
            operations: room.operationLog.getAllOperations(),
          },
        };
        meta.socket.send(JSON.stringify(syncMsg));

        room.broadcast(
          {
            type: 'USER_JOINED',
            payload: { userId: roomUser.userId, userName: roomUser.userName },
          },
          roomUser.userId
        );

        logger.info({ roomId, userId: roomUser.userId, userName: roomUser.userName }, 'User joined room');
        break;
      }

      case 'LEAVE_ROOM': {
        const session = this.roomManager.removeSession(meta.socket);
        if (session) {
          session.room.broadcast({
            type: 'USER_LEFT',
            payload: { userId: session.user.userId },
          });
        }
        break;
      }

      case 'STROKE_BEGIN': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        session.room.broadcast(
          {
            type: 'STROKE_BEGIN',
            payload: {
              userId: session.user.userId,
              strokeId: message.payload.strokeId,
              tool: message.payload.tool,
              color: message.payload.color,
              width: message.payload.width,
              point: message.payload.point,
            },
          },
          session.user.userId
        );
        break;
      }

      case 'STROKE_APPEND': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        session.room.broadcast(
          {
            type: 'STROKE_APPEND',
            payload: {
              userId: session.user.userId,
              strokeId: message.payload.strokeId,
              points: message.payload.points,
            },
          },
          session.user.userId
        );
        break;
      }

      case 'STROKE_END': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'NOT_IN_ROOM', message: 'You must join a room before drawing' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        const { operationId, stroke } = message.payload;
        const opData: Omit<Operation, 'seq'> = {
          operationId,
          roomId: session.room.roomId,
          userId: session.user.userId,
          type: 'STROKE',
          clientTimestamp: Date.now(),
          payload: stroke,
        };

        const authoritativeOp = session.room.operationLog.append(opData);

        const ackMsg: ServerMessage = {
          type: 'ACK',
          payload: { operationId, seq: authoritativeOp.seq },
        };
        meta.socket.send(JSON.stringify(ackMsg));

        session.room.broadcast(
          {
            type: 'STROKE_END',
            payload: {
              userId: session.user.userId,
              operation: authoritativeOp,
            },
          },
          session.user.userId
        );
        break;
      }

      case 'UNDO': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        const { operationId, targetOperationId } = message.payload;
        const targetOp = session.room.operationLog.getOperationById(targetOperationId);

        if (!targetOp) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'NOT_FOUND', message: 'Target operation not found' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        // Authoritative ownership validation: user can only undo their own operation!
        if (targetOp.userId !== session.user.userId) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'FORBIDDEN', message: 'You can only undo operations you authored' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        session.room.operationLog.setUndoneStatus(targetOperationId, true);

        const undoPayload: UndoRedoPayload = { targetOperationId };
        const opData: Omit<Operation, 'seq'> = {
          operationId,
          roomId: session.room.roomId,
          userId: session.user.userId,
          type: 'UNDO',
          clientTimestamp: Date.now(),
          payload: undoPayload,
        };

        const authoritativeOp = session.room.operationLog.append(opData);

        const ackMsg: ServerMessage = {
          type: 'ACK',
          payload: { operationId, seq: authoritativeOp.seq },
        };
        meta.socket.send(JSON.stringify(ackMsg));

        session.room.broadcast({
          type: 'UNDO_APPLIED',
          payload: {
            userId: session.user.userId,
            operation: authoritativeOp,
          },
        });
        break;
      }

      case 'REDO': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        const { operationId, targetOperationId } = message.payload;
        const targetOp = session.room.operationLog.getOperationById(targetOperationId);

        if (!targetOp) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'NOT_FOUND', message: 'Target operation not found' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        // Authoritative ownership validation
        if (targetOp.userId !== session.user.userId) {
          const errResp: ServerMessage = {
            type: 'ERROR',
            payload: { code: 'FORBIDDEN', message: 'You can only redo operations you authored' },
          };
          meta.socket.send(JSON.stringify(errResp));
          return;
        }

        session.room.operationLog.setUndoneStatus(targetOperationId, false);

        const redoPayload: UndoRedoPayload = { targetOperationId };
        const opData: Omit<Operation, 'seq'> = {
          operationId,
          roomId: session.room.roomId,
          userId: session.user.userId,
          type: 'REDO',
          clientTimestamp: Date.now(),
          payload: redoPayload,
        };

        const authoritativeOp = session.room.operationLog.append(opData);

        const ackMsg: ServerMessage = {
          type: 'ACK',
          payload: { operationId, seq: authoritativeOp.seq },
        };
        meta.socket.send(JSON.stringify(ackMsg));

        session.room.broadcast({
          type: 'REDO_APPLIED',
          payload: {
            userId: session.user.userId,
            operation: authoritativeOp,
          },
        });
        break;
      }

      case 'CLEAR': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        const { operationId } = message.payload;
        const opData: Omit<Operation, 'seq'> = {
          operationId,
          roomId: session.room.roomId,
          userId: session.user.userId,
          type: 'CLEAR',
          clientTimestamp: Date.now(),
          payload: {},
        };

        const authoritativeOp = session.room.operationLog.append(opData);

        const ackMsg: ServerMessage = {
          type: 'ACK',
          payload: { operationId, seq: authoritativeOp.seq },
        };
        meta.socket.send(JSON.stringify(ackMsg));

        session.room.broadcast({
          type: 'CLEAR_APPLIED',
          payload: {
            userId: session.user.userId,
            operation: authoritativeOp,
          },
        });
        break;
      }

      case 'CURSOR_MOVE': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        session.room.broadcast(
          {
            type: 'CURSOR_MOVE',
            payload: {
              userId: session.user.userId,
              position: message.payload.position,
            },
          },
          session.user.userId
        );
        break;
      }

      case 'SYNC_REQUEST': {
        const session = this.roomManager.getSession(meta.socket);
        if (!session) return;

        const fromSeq = message.payload.lastKnownSeq + 1;
        const missingOps = session.room.operationLog.getOperationsFrom(fromSeq);

        const syncMsg: ServerMessage = {
          type: 'SYNC_STATE',
          payload: {
            baselineSeq: session.room.operationLog.getNextSeq() - 1,
            operations: missingOps,
          },
        };
        meta.socket.send(JSON.stringify(syncMsg));
        break;
      }

      default: {
        const response: ServerMessage = {
          type: 'ERROR',
          payload: {
            code: 'NOT_IMPLEMENTED',
            message: `Message type '${(message as any).type}' is not implemented`,
          },
        };
        meta.socket.send(JSON.stringify(response));
        break;
      }
    }
  }
}
