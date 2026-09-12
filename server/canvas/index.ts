import { createServer } from './server.js';
import { config } from './config/env.js';
import { logger } from './logging/logger.js';

const server = createServer();

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.PORT, config.HOST, () => {
    logger.info({ port: config.PORT, host: config.HOST }, 'Canvas backend HTTP + WebSocket server started');
  });
}
