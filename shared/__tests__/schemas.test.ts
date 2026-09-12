import { describe, it, expect } from 'vitest';
import {
  PointSchema,
  StrokeSchema,
  ClientMessageSchema,
} from '../index.js';

describe('Shared Protocol & Model Validation Schemas', () => {
  // 1. Valid normalized point
  it('1. accepts a valid normalized point in [0, 1]', () => {
    const validPoint = { x: 0.5, y: 0.5 };
    const result = PointSchema.safeParse(validPoint);
    expect(result.success).toBe(true);
  });

  // 2. x < 0 rejected
  it('2. rejects x < 0', () => {
    const invalidPoint = { x: -0.1, y: 0.5 };
    const result = PointSchema.safeParse(invalidPoint);
    expect(result.success).toBe(false);
  });

  // 3. x > 1 rejected
  it('3. rejects x > 1', () => {
    const invalidPoint = { x: 1.1, y: 0.5 };
    const result = PointSchema.safeParse(invalidPoint);
    expect(result.success).toBe(false);
  });

  // 4. y < 0 rejected
  it('4. rejects y < 0', () => {
    const invalidPoint = { x: 0.5, y: -0.01 };
    const result = PointSchema.safeParse(invalidPoint);
    expect(result.success).toBe(false);
  });

  // 5. y > 1 rejected
  it('5. rejects y > 1', () => {
    const invalidPoint = { x: 0.5, y: 1.05 };
    const result = PointSchema.safeParse(invalidPoint);
    expect(result.success).toBe(false);
  });

  // 6. Valid brush stroke
  it('6. accepts a valid brush stroke', () => {
    const validBrush = {
      strokeId: 'stroke_123',
      tool: 'brush',
      color: '#ff0000',
      width: 5,
      points: [{ x: 0.1, y: 0.1 }],
    };
    const result = StrokeSchema.safeParse(validBrush);
    expect(result.success).toBe(true);
  });

  // 7. Valid eraser stroke
  it('7. accepts a valid eraser stroke', () => {
    const validEraser = {
      strokeId: 'stroke_124',
      tool: 'eraser',
      color: '#000000',
      width: 20,
      points: [{ x: 0.2, y: 0.2 }],
    };
    const result = StrokeSchema.safeParse(validEraser);
    expect(result.success).toBe(true);
  });

  // 8. Empty points rejected
  it('8. rejects a stroke with empty points array', () => {
    const emptyStroke = {
      strokeId: 'stroke_125',
      tool: 'brush',
      color: '#000000',
      width: 4,
      points: [],
    };
    const result = StrokeSchema.safeParse(emptyStroke);
    expect(result.success).toBe(false);
  });

  // 9. Invalid brush width rejected
  it('9. rejects an invalid brush width (negative or 0)', () => {
    const invalidWidth = {
      strokeId: 'stroke_126',
      tool: 'brush',
      color: '#000000',
      width: -5,
      points: [{ x: 0.5, y: 0.5 }],
    };
    const result = StrokeSchema.safeParse(invalidWidth);
    expect(result.success).toBe(false);
  });

  // 10. Invalid message type rejected
  it('10. rejects an invalid client message type', () => {
    const invalidTypeMsg = {
      type: 'INVALID_TYPE',
      payload: {},
    };
    const result = ClientMessageSchema.safeParse(invalidTypeMsg);
    expect(result.success).toBe(false);
  });

  // 11. Valid STROKE_END accepted
  it('11. accepts a valid STROKE_END message', () => {
    const validStrokeEnd = {
      type: 'STROKE_END',
      roomId: 'room_1',
      payload: {
        operationId: 'op_100',
        stroke: {
          strokeId: 'stroke_1',
          tool: 'brush',
          color: '#000000',
          width: 4,
          points: [{ x: 0.1, y: 0.2 }],
        },
      },
    };
    const result = ClientMessageSchema.safeParse(validStrokeEnd);
    expect(result.success).toBe(true);
  });

  // 12. Invalid STROKE_END rejected
  it('12. rejects an invalid STROKE_END message with missing operationId', () => {
    const invalidStrokeEnd = {
      type: 'STROKE_END',
      roomId: 'room_1',
      payload: {
        stroke: {
          strokeId: 'stroke_1',
          tool: 'brush',
          color: '#000000',
          width: 4,
          points: [],
        },
      },
    };
    const result = ClientMessageSchema.safeParse(invalidStrokeEnd);
    expect(result.success).toBe(false);
  });

  // 13. Valid UNDO
  it('13. accepts a valid UNDO message', () => {
    const validUndo = {
      type: 'UNDO',
      roomId: 'room_1',
      payload: {
        operationId: 'op_101',
        targetOperationId: 'op_100',
      },
    };
    const result = ClientMessageSchema.safeParse(validUndo);
    expect(result.success).toBe(true);
  });

  // 14. Valid REDO
  it('14. accepts a valid REDO message', () => {
    const validRedo = {
      type: 'REDO',
      roomId: 'room_1',
      payload: {
        operationId: 'op_102',
        targetOperationId: 'op_100',
      },
    };
    const result = ClientMessageSchema.safeParse(validRedo);
    expect(result.success).toBe(true);
  });

  // 15. Valid CLEAR
  it('15. accepts a valid CLEAR message', () => {
    const validClear = {
      type: 'CLEAR',
      roomId: 'room_1',
      payload: {
        operationId: 'op_103',
      },
    };
    const result = ClientMessageSchema.safeParse(validClear);
    expect(result.success).toBe(true);
  });

  // 16. Valid CURSOR_MOVE
  it('16. accepts a valid CURSOR_MOVE message', () => {
    const validCursor = {
      type: 'CURSOR_MOVE',
      roomId: 'room_1',
      payload: {
        position: { x: 0.4, y: 0.6 },
      },
    };
    const result = ClientMessageSchema.safeParse(validCursor);
    expect(result.success).toBe(true);
  });

  // 17. Valid SYNC_REQUEST
  it('17. accepts a valid SYNC_REQUEST message', () => {
    const validSyncReq = {
      type: 'SYNC_REQUEST',
      roomId: 'room_1',
      payload: {
        lastKnownSeq: 42,
      },
    };
    const result = ClientMessageSchema.safeParse(validSyncReq);
    expect(result.success).toBe(true);
  });

  // 18. Invalid malformed message rejected
  it('18. rejects a completely malformed message envelope', () => {
    const malformed = {
      foo: 'bar',
      baz: 123,
    };
    const result = ClientMessageSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });
});
