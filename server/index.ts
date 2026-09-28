import 'dotenv/config';
import next from 'next';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'node:http';
import { attachSocketServer } from './socket';
import { registerApi } from './api';
import { prisma } from './db';
import { newRedisConnection } from './redis';
import { canRun } from './permissions';
import { executionQueue } from './queue';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT ?? 3000);

async function start() {
  const nextApp = next({ dev, dir: process.cwd() });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, nextMiddleware) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return nextMiddleware();
    const origin = req.get('origin');
    const allowed = process.env.APP_URL ?? `http://localhost:${port}`;
    if (origin && origin !== allowed) return res.status(403).json({ error: 'Cross-origin mutation blocked.' });
    return nextMiddleware();
  });

  const httpServer = createServer(app);
  const io = await attachSocketServer(httpServer);
  registerApi(app);

  // Publish executor status events from Redis to the appropriate room sockets.
  const subscriber = newRedisConnection();
  await subscriber.subscribe('coderoom:execution');
  subscriber.on('message', (_channel, raw) => {
    try {
      const event = JSON.parse(raw) as { roomId: string; executionId: string; status: string };
      io.to(`room:${event.roomId}`).emit('execution:update', event);
    } catch {
      // ignore malformed pub/sub messages
    }
  });

  app.use((req, res) => handle(req, res));

  httpServer.listen(port, () => {
    console.log(`CodeRoom running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    await executionQueue.close();
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
