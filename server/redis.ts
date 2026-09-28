import IORedis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis?: IORedis };

export const redis = globalForRedis.redis ?? new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

redis.on('error', (error) => {
  console.error('[redis] connection error:', error.message);
});

export function newRedisConnection() {
  const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
  connection.on('error', (error) => {
    console.error('[redis] connection error:', error.message);
  });
  return connection;
}
