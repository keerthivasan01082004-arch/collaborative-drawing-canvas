import { describe, it, expect, vi } from 'vitest';
import { OperationLogClient } from '../OperationLogClient';
import { Operation } from '@shared/index';

describe('OperationLogClient', () => {
  it('applies operations sequentially when seq matches lastAppliedSeq + 1', () => {
    const client = new OperationLogClient();
    const applied: Operation[] = [];

    const op1: Operation = {
      operationId: 'op_1',
      roomId: 'r1',
      userId: 'u1',
      seq: 1,
      type: 'CLEAR',
      clientTimestamp: 1,
      payload: {},
    };

    client.processOperation(op1, (op) => applied.push(op));

    expect(applied).toHaveLength(1);
    expect(client.getLastAppliedSeq()).toBe(1);
  });

  it('buffers out-of-order operations and flushes them when gap fills', () => {
    const client = new OperationLogClient();
    const applied: Operation[] = [];

    const op1: Operation = { operationId: 'op_1', roomId: 'r1', userId: 'u1', seq: 1, type: 'CLEAR', clientTimestamp: 1, payload: {} };
    const op2: Operation = { operationId: 'op_2', roomId: 'r1', userId: 'u1', seq: 2, type: 'CLEAR', clientTimestamp: 2, payload: {} };
    const op3: Operation = { operationId: 'op_3', roomId: 'r1', userId: 'u1', seq: 3, type: 'CLEAR', clientTimestamp: 3, payload: {} };

    client.processOperation(op1, (op) => applied.push(op));
    client.processOperation(op3, (op) => applied.push(op));

    expect(applied).toHaveLength(1);
    expect(client.getBufferedCount()).toBe(1);

    client.processOperation(op2, (op) => applied.push(op));

    expect(applied).toHaveLength(3);
    expect(applied[1].seq).toBe(2);
    expect(applied[2].seq).toBe(3);
    expect(client.getLastAppliedSeq()).toBe(3);
    expect(client.getBufferedCount()).toBe(0);
  });

  it('ignores duplicate operations by operationId', () => {
    const client = new OperationLogClient();
    const applyFn = vi.fn();

    const op1: Operation = { operationId: 'op_dup', roomId: 'r1', userId: 'u1', seq: 1, type: 'CLEAR', clientTimestamp: 1, payload: {} };

    client.processOperation(op1, applyFn);
    client.processOperation(op1, applyFn);

    expect(applyFn).toHaveBeenCalledTimes(1);
  });
});
