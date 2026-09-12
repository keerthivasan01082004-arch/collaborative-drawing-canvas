import { z } from 'zod';

export * from './models.js';
export * from './protocol.js';

export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.number(),
  uptime: z.number(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const SHARED_PROTOCOL_VERSION = '1.0.0';
