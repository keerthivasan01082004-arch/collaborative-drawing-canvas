import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientMessageSchema, HealthCheckResponse, ServerMessage } from '../../shared/index.js';
import { config } from './config/env.js';
import { logger } from './logging/logger.js';
import { RoomManager } from './rooms/RoomManager.js';
import { ProtocolHandler, ConnectionMeta } from './protocol/messageHandler.js';

export const activeConnections = new Map<string, ConnectionMeta>();
export const globalRoomManager = new RoomManager();
export const globalProtocolHandler = new ProtocolHandler(globalRoomManager);
const startTime = Date.now();
const publicDir = path.resolve(process.cwd(), 'dist', 'public');

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveFile(res: http.ServerResponse, requestedPath: string) {
  const safePath = requestedPath.replace(/^\/+/, '');
  const candidate = path.resolve(publicDir, safePath || 'index.html');
  if (!candidate.startsWith(`${publicDir}${path.sep}`) && candidate !== publicDir) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid path' }));
    return;
  }

  const filePath = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.resolve(publicDir, 'index.html');
  if (!fs.existsSync(filePath)) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Frontend build not found' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(res);
}

export function createServer() {
  const httpServer = http.createServer((req, res) => {
    const url = req.url || '/';

    if (req.method === 'GET' && (url === '/health' || url === '/health/')) {
      const healthData: HealthCheckResponse = {
        status: 'ok',
        timestamp: Date.now(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(healthData));
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveFile(res, decodeURIComponent(url.split('?')[0] || '/'));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: config.MAX_PAYLOAD_BYTES,
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;

    if (config.ALLOWED_ORIGIN !== '*' && origin && origin !== config.ALLOWED_ORIGIN) {
      logger.warn({ origin, allowed: config.ALLOWED_ORIGIN }, 'Rejected WebSocket connection due to invalid origin');
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const meta: ConnectionMeta = {
      connectionId,
      socket: ws,
      connectedAt: now,
      lastHeartbeatAt: now,
    };

    activeConnections.set(connectionId, meta);
    logger.info({ connectionId }, 'Client WebSocket connected');

    ws.on('message', (rawData: Buffer | string) => {
      let rawString: string;
      try {
        rawString = typeof rawData === 'string' ? rawData : rawData.toString('utf-8');
      } catch {
        const errResp: ServerMessage = {
          type: 'ERROR',
          payload: { code: 'INVALID_MESSAGE', message: 'Payload must be UTF-8 string' },
        };
        ws.send(JSON.stringify(errResp));
        return;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawString);
      } catch {
        const errResp: ServerMessage = {
          type: 'ERROR',
          payload: { code: 'INVALID_JSON', message: 'Payload is not valid JSON' },
        };
        ws.send(JSON.stringify(errResp));
        return;
      }

      const parseResult = ClientMessageSchema.safeParse(parsedJson);
      if (!parseResult.success) {
        const errResp: ServerMessage = {
          type: 'ERROR',
          payload: {
            code: 'INVALID_MESSAGE',
            message: `Validation failed: ${parseResult.error.issues.map((issue) => issue.message).join(', ')}`,
          },
        };
        ws.send(JSON.stringify(errResp));
        return;
      }

      globalProtocolHandler.handleClientMessage(meta, parseResult.data);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      activeConnections.delete(connectionId);
      const session = globalRoomManager.removeSession(ws);
      if (session) {
        session.room.broadcast({
          type: 'USER_LEFT',
          payload: { userId: session.user.userId },
        });
      }
      logger.info({ connectionId, code, reason: reason.toString() }, 'Client WebSocket disconnected');
    });

    ws.on('error', (error: Error) => {
      logger.error({ connectionId, error: error.message }, 'WebSocket error occurred');
    });
  });

  return httpServer;
}
