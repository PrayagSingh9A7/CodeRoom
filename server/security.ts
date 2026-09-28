import type { Request, Response, NextFunction } from 'express';
import { redis } from './redis';

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const bucket = `rl:${key}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const allowed = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  if (origin !== allowed) return res.status(403).json({ error: 'Cross-origin mutation blocked.' });
  return next();
}

export function clientIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || 'unknown';
}
