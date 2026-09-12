import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createServer } from '../server.js';
import { ServerMessage } from '@canvas/shared';

describe('Raw WebSocket & HTTP Backend Server', () => {
  let server: http.Server;
  let baseUrl: string;
  let wsUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          const port = addr.port;
          baseUrl = `http://127.0.0.1:${port}`;
          wsUrl = `ws://127.0.0.1:${port}`;
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

  it('1. server starts cleanly & 2. /health returns success', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('number');
  });

  it('serves the built frontend shell at the root route', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('<div id="root"></div>');
  });

  it('3. WebSocket client connects successfully & 9. closes cleanly', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });
    expect(ws.readyState).toBe(WebSocket.OPEN);

    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
      ws.close();
    });
  });

  it('4. valid PING receives PONG response', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const pingMsg = JSON.stringify({ type: 'PING', payload: {} });
    ws.send(pingMsg);

    const reply = await new Promise<ServerMessage>((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    expect(reply.type).toBe('PONG');
    ws.close();
  });

  it('5. malformed JSON is rejected with INVALID_JSON error', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    ws.send('invalid_json_{{');

    const reply = await new Promise<ServerMessage>((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    expect(reply.type).toBe('ERROR');
    if (reply.type === 'ERROR') {
      expect(reply.payload.code).toBe('INVALID_JSON');
    }
    ws.close();
  });

  it('6. invalid schema message is rejected with INVALID_MESSAGE error', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    ws.send(JSON.stringify({ type: 'UNKNOWN_MSG', payload: { foo: 'bar' } }));

    const reply = await new Promise<ServerMessage>((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    expect(reply.type).toBe('ERROR');
    if (reply.type === 'ERROR') {
      expect(reply.payload.code).toBe('INVALID_MESSAGE');
    }
    ws.close();
  });

  it('7. valid JOIN_ROOM message processes and receives SYNC_STATE', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    ws.send(
      JSON.stringify({
        type: 'JOIN_ROOM',
        roomId: 'room_test',
        payload: { userName: 'Alice' },
      })
    );

    const reply = await new Promise<ServerMessage>((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    expect(reply.type).toBe('SYNC_STATE');
    ws.close();
  });

  it('8. oversized message is rejected', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));

    const hugePayload = 'a'.repeat(150000);
    ws.send(hugePayload);

    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
      ws.on('error', () => resolve());
    });
  });

  it('10. server does not crash on malformed input', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve) => ws.on('open', resolve));
    ws.send(Buffer.from([0xff, 0x00, 0xfe, 0x01]));

    const reply = await new Promise<ServerMessage>((resolve) => {
      ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    });

    expect(reply.type).toBe('ERROR');

    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    ws.close();
  });
});
