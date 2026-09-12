import { z } from 'zod';
import {
  PointSchema,
  ToolTypeSchema,
  StrokeSchema,
  OperationSchema,
} from './models.js';

// Client -> Server Message Schemas
export const ClientJoinRoomMessageSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  roomId: z.string().min(1).max(64),
  payload: z.object({
    userName: z.string().min(1).max(32).optional(),
  }),
});

export const ClientLeaveRoomMessageSchema = z.object({
  type: z.literal('LEAVE_ROOM'),
  roomId: z.string().min(1).max(64),
  payload: z.object({}),
});

export const ClientStrokeBeginMessageSchema = z.object({
  type: z.literal('STROKE_BEGIN'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    strokeId: z.string().min(1).max(64),
    tool: ToolTypeSchema,
    color: z.string().min(1).max(32),
    width: z.number().positive().max(200),
    point: PointSchema,
  }),
});

export const ClientStrokeAppendMessageSchema = z.object({
  type: z.literal('STROKE_APPEND'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    strokeId: z.string().min(1).max(64),
    points: z.array(PointSchema).min(1).max(500),
  }),
});

export const ClientStrokeEndMessageSchema = z.object({
  type: z.literal('STROKE_END'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    operationId: z.string().min(1).max(64),
    stroke: StrokeSchema,
  }),
});

export const ClientUndoMessageSchema = z.object({
  type: z.literal('UNDO'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    operationId: z.string().min(1).max(64),
    targetOperationId: z.string().min(1).max(64),
  }),
});

export const ClientRedoMessageSchema = z.object({
  type: z.literal('REDO'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    operationId: z.string().min(1).max(64),
    targetOperationId: z.string().min(1).max(64),
  }),
});

export const ClientClearMessageSchema = z.object({
  type: z.literal('CLEAR'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    operationId: z.string().min(1).max(64),
  }),
});

export const ClientCursorMoveMessageSchema = z.object({
  type: z.literal('CURSOR_MOVE'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    position: PointSchema,
  }),
});

export const ClientSyncRequestMessageSchema = z.object({
  type: z.literal('SYNC_REQUEST'),
  roomId: z.string().min(1).max(64).optional(),
  payload: z.object({
    lastKnownSeq: z.number().int().nonnegative(),
  }),
});

export const ClientPingMessageSchema = z.object({
  type: z.literal('PING'),
  payload: z.object({}),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientJoinRoomMessageSchema,
  ClientLeaveRoomMessageSchema,
  ClientStrokeBeginMessageSchema,
  ClientStrokeAppendMessageSchema,
  ClientStrokeEndMessageSchema,
  ClientUndoMessageSchema,
  ClientRedoMessageSchema,
  ClientClearMessageSchema,
  ClientCursorMoveMessageSchema,
  ClientSyncRequestMessageSchema,
  ClientPingMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server -> Client Message Schemas
export const ServerSyncStateMessageSchema = z.object({
  type: z.literal('SYNC_STATE'),
  payload: z.object({
    baselineSeq: z.number().int().nonnegative(),
    operations: z.array(OperationSchema),
  }),
});

export const ServerUserJoinedMessageSchema = z.object({
  type: z.literal('USER_JOINED'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    userName: z.string().min(1).max(32).optional(),
  }),
});

export const ServerUserLeftMessageSchema = z.object({
  type: z.literal('USER_LEFT'),
  payload: z.object({
    userId: z.string().min(1).max(64),
  }),
});

export const ServerStrokeBeginMessageSchema = z.object({
  type: z.literal('STROKE_BEGIN'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    strokeId: z.string().min(1).max(64),
    tool: ToolTypeSchema,
    color: z.string().min(1).max(32),
    width: z.number().positive().max(200),
    point: PointSchema,
  }),
});

export const ServerStrokeAppendMessageSchema = z.object({
  type: z.literal('STROKE_APPEND'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    strokeId: z.string().min(1).max(64),
    points: z.array(PointSchema).min(1).max(500),
  }),
});

export const ServerStrokeEndMessageSchema = z.object({
  type: z.literal('STROKE_END'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    operation: OperationSchema,
  }),
});

export const ServerUndoAppliedMessageSchema = z.object({
  type: z.literal('UNDO_APPLIED'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    operation: OperationSchema,
  }),
});

export const ServerRedoAppliedMessageSchema = z.object({
  type: z.literal('REDO_APPLIED'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    operation: OperationSchema,
  }),
});

export const ServerClearAppliedMessageSchema = z.object({
  type: z.literal('CLEAR_APPLIED'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    operation: OperationSchema,
  }),
});

export const ServerCursorMoveMessageSchema = z.object({
  type: z.literal('CURSOR_MOVE'),
  payload: z.object({
    userId: z.string().min(1).max(64),
    position: PointSchema,
  }),
});

export const ServerAckMessageSchema = z.object({
  type: z.literal('ACK'),
  payload: z.object({
    operationId: z.string().min(1).max(64),
    seq: z.number().int().nonnegative(),
  }),
});

export const ServerErrorMessageSchema = z.object({
  type: z.literal('ERROR'),
  payload: z.object({
    code: z.string().min(1).max(64),
    message: z.string().min(1).max(256),
    operationId: z.string().min(1).max(64).optional(),
  }),
});

export const ServerPongMessageSchema = z.object({
  type: z.literal('PONG'),
  payload: z.object({}),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ServerSyncStateMessageSchema,
  ServerUserJoinedMessageSchema,
  ServerUserLeftMessageSchema,
  ServerStrokeBeginMessageSchema,
  ServerStrokeAppendMessageSchema,
  ServerStrokeEndMessageSchema,
  ServerUndoAppliedMessageSchema,
  ServerRedoAppliedMessageSchema,
  ServerClearAppliedMessageSchema,
  ServerCursorMoveMessageSchema,
  ServerAckMessageSchema,
  ServerErrorMessageSchema,
  ServerPongMessageSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
