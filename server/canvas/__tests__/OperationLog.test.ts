import { describe, it, expect } from 'vitest';
import { OperationLog } from '../operations/OperationLog.js';

describe('OperationLog', () => {
  it('appends operations and assigns monotonically increasing seq starting from 1', () => {
    const log = new OperationLog();
    const op1 = log.append({
      operationId: 'op_1',
      roomId: 'room_1',
      userId: 'user_1',
      type: 'STROKE',
      clientTimestamp: Date.now(),
      payload: {
        strokeId: 's1',
        tool: 'brush',
        color: '#000',
        width: 4,
        points: [{ x: 0.1, y: 0.1 }],
      },
    });

    const op2 = log.append({
      operationId: 'op_2',
      roomId: 'room_1',
      userId: 'user_1',
      type: 'CLEAR',
      clientTimestamp: Date.now(),
      payload: {},
    });

    expect(op1.seq).toBe(1);
    expect(op2.seq).toBe(2);
  });

  it('deduplicates operations by operationId without assigning new seq', () => {
    const log = new OperationLog();
    const op1 = log.append({
      operationId: 'op_dup',
      roomId: 'room_1',
      userId: 'user_1',
      type: 'CLEAR',
      clientTimestamp: Date.now(),
      payload: {},
    });

    const op2 = log.append({
      operationId: 'op_dup',
      roomId: 'room_1',
      userId: 'user_1',
      type: 'CLEAR',
      clientTimestamp: Date.now(),
      payload: {},
    });

    expect(op1.seq).toBe(1);
    expect(op2.seq).toBe(1);
    expect(log.getAllOperations()).toHaveLength(1);
  });

  it('retrieves operations from a given sequence number', () => {
    const log = new OperationLog();
    log.append({ operationId: 'op_1', roomId: 'r1', userId: 'u1', type: 'CLEAR', clientTimestamp: 1, payload: {} });
    log.append({ operationId: 'op_2', roomId: 'r1', userId: 'u1', type: 'CLEAR', clientTimestamp: 2, payload: {} });
    log.append({ operationId: 'op_3', roomId: 'r1', userId: 'u1', type: 'CLEAR', clientTimestamp: 3, payload: {} });

    const opsFrom2 = log.getOperationsFrom(2);
    expect(opsFrom2).toHaveLength(2);
    expect(opsFrom2[0].seq).toBe(2);
    expect(opsFrom2[1].seq).toBe(3);
  });
});
