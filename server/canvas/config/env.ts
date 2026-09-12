export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  HOST: process.env.HOST || '0.0.0.0',
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  MAX_PAYLOAD_BYTES: process.env.MAX_PAYLOAD_BYTES
    ? parseInt(process.env.MAX_PAYLOAD_BYTES, 10)
    : 131072, // 128 KB
};
