import crypto from 'node:crypto';
import { redis } from './redis';

const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export async function withDistributedLock<T>(key: string, fn: () => Promise<T>, ttlMs = 5000): Promise<T> {
  const token = crypto.randomBytes(16).toString('hex');
  const lockKey = `lock:${key}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    const acquired = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
    if (acquired === 'OK') {
      try { return await fn(); }
      finally { await redis.eval(RELEASE, 1, lockKey, token).catch(() => undefined); }
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Could not acquire distributed lock.');
}
