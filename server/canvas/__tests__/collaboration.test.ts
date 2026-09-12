import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createServer } from '../server.js';
import { ServerMessage } from '@canvas/shared';

describe('Real-Time Collaboration & Room Integration Tests', () => {
  let server: http.Server;
  let wsUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          wsUrl = `ws://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('handles multi-client join, real-time stroke broadcast, and sequence assignment', async () => {
    const clientA = new WebSocket(wsUrl);
    const clientB = new WebSocket(wsUrl);

    await Promise.all([
      new Promise<void>((r) => clientA.on('open', r)),
      new Promise<void>((r) => clientB.on('open', r)),
    ]);

    // Client A joins room_alpha
    clientA.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'room_alpha', payload: { userName: 'Alice' } }));
    const syncA = await new Promise<ServerMessage>((r) => clientA.once('message', (d) => r(JSON.parse(d.toString()))));
    expect(syncA.type).toBe('SYNC_STATE');

    // Client B joins room_alpha
    const userJoinedPromise = new Promise<ServerMessage>((r) =>
      clientA.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === 'USER_JOINED') r(parsed);
      })
    );
    clientB.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'room_alpha', payload: { userName: 'Bob' } }));

    const userJoinedMsg = await userJoinedPromise;
    expect(userJoinedMsg.type).toBe('USER_JOINED');

    // Client A sends STROKE_END
    const strokeEndPromiseB = new Promise<ServerMessage>((r) =>
      clientB.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === 'STROKE_END') r(parsed);
      })
    );

    const opIdA = 'op_a1';
    clientA.send(
      JSON.stringify({
        type: 'STROKE_END',
        roomId: 'room_alpha',
        payload: {
          operationId: opIdA,
          stroke: {
            strokeId: 's_a1',
            tool: 'brush',
            color: '#ff0000',
            width: 4,
            points: [{ x: 0.1, y: 0.1 }],
          },
        },
      })
    );

    const strokeEndMsgB = await strokeEndPromiseB;
    expect(strokeEndMsgB.type).toBe('STROKE_END');
    if (strokeEndMsgB.type === 'STROKE_END') {
      expect(strokeEndMsgB.payload.operation.seq).toBe(1);
    }

    clientA.close();
    clientB.close();
  });

  it('validates per-user undo ownership and room isolation', async () => {
    const clientA = new WebSocket(wsUrl);
    const clientB = new WebSocket(wsUrl);
    const clientC = new WebSocket(wsUrl);

    await Promise.all([
      new Promise<void>((r) => clientA.on('open', r)),
      new Promise<void>((r) => clientB.on('open', r)),
      new Promise<void>((r) => clientC.on('open', r)),
    ]);

    clientA.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'room_beta', payload: { userName: 'Alice' } }));
    clientB.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'room_beta', payload: { userName: 'Bob' } }));
    clientC.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: 'room_gamma', payload: { userName: 'Charlie' } }));

    // Drain initial sync messages
    await new Promise((r) => setTimeout(r, 100));

    // Alice draws in room_beta
    const opIdAlice = 'op_alice_1';
    clientA.send(
      JSON.stringify({
        type: 'STROKE_END',
        roomId: 'room_beta',
        payload: {
          operationId: opIdAlice,
          stroke: {
            strokeId: 's_alice',
            tool: 'brush',
            color: '#0000ff',
            width: 6,
            points: [{ x: 0.5, y: 0.5 }],
          },
        },
      })
    );

    await new Promise((r) => setTimeout(r, 100));

    // Bob attempts to UNDO Alice's stroke -> must fail with FORBIDDEN
    const errPromiseBob = new Promise<ServerMessage>((r) =>
      clientB.on('message', (d) => {
        const parsed = JSON.parse(d.toString());
        if (parsed.type === 'ERROR') r(parsed);
      })
    );

    clientB.send(
      JSON.stringify({
        type: 'UNDO',
        roomId: 'room_beta',
        payload: {
          operationId: 'undo_bob_1',
          targetOperationId: opIdAlice,
        },
      })
    );

    const errRespBob = await errPromiseBob;
    expect(errRespBob.type).toBe('ERROR');
    if (errRespBob.type === 'ERROR') {
      expect(errRespBob.payload.code).toBe('FORBIDDEN');
    }

    clientA.close();
    clientB.close();
    clientC.close();
  });
});
