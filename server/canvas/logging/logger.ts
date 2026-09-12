import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  name: 'canvas-backend',
  level: config.LOG_LEVEL,
});
