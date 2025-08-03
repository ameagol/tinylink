import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { reconnectStrategy: retries => Math.min(retries * 100, 5000) }
});

redis.on('error', err => console.error('Redis Error:', err));
