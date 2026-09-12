import WebSocket from 'ws';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const wsUrl = baseUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
const health = await fetch(`${baseUrl}/health`);
if (!health.ok) throw new Error(`Health status ${health.status}`);
const healthBody = await health.json();
if (healthBody.status !== 'ok') throw new Error(`Unexpected health body: ${JSON.stringify(healthBody)}`);

await new Promise((resolve, reject) => {
  const socket = new WebSocket(wsUrl);
  const timer = setTimeout(() => {
    socket.close();
    reject(new Error('Timed out waiting for SYNC_STATE'));
  }, 5000);

  socket.on('open', () => {
    socket.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomId: 'SMOKE1',
      payload: { userName: 'Smoke Tester' },
    }));
  });

  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === 'SYNC_STATE') {
      clearTimeout(timer);
      if (!Array.isArray(message.payload.operations)) {
        reject(new Error('SYNC_STATE operations is not an array'));
        return;
      }
      socket.close();
      resolve();
    }
  });

  socket.on('error', reject);
});

console.log(JSON.stringify({ health: healthBody.status, websocket: 'SYNC_STATE received', baseUrl }));
