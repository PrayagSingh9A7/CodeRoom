import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import * as Y from 'yjs';
import { prisma } from './db';
import { newRedisConnection } from './redis';
import { getUserFromCookieHeader } from './auth';
import { getMembership } from './permissions';
import { withDistributedLock } from './locks';

function b64(bytes: Uint8Array | Buffer) {
  return Buffer.from(bytes).toString('base64');
}

function bytes(value: string) {
  return Buffer.from(value, 'base64');
}

const roomPresence = new Map<string, Map<string, { userId: string; name: string; socketId: string }>>();
const socketRooms = new Map<string, Set<string>>();

export async function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 2_000_000,
    cors: { origin: false }
  });

  try {
    const pubClient = newRedisConnection();
    const subClient = newRedisConnection();
    io.adapter(createAdapter(pubClient, subClient));
  } catch {
    // Single-instance mode still works without the Redis adapter.
  }

  io.use(async (socket, next) => {
    try {
      const user = await getUserFromCookieHeader(socket.handshake.headers.cookie);
      if (!user) return next(new Error('Unauthorized'));
      socket.data.user = { id: user.id, name: user.name, email: user.email };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', socket => {
    const user = socket.data.user as { id: string; name: string; email: string };
    socketRooms.set(socket.id, new Set());

    socket.on('room:join', async ({ roomId }: { roomId: string }) => {
      const membership = await getMembership(roomId, user.id);
      if (!membership) return socket.emit('error:room', { error: 'Not a room member.' });
      socket.join(`room:${roomId}`);
      socketRooms.get(socket.id)?.add(`room:${roomId}`);
      const members = roomPresence.get(roomId) ?? new Map();
      members.set(socket.id, { userId: user.id, name: user.name, socketId: socket.id });
      roomPresence.set(roomId, members);
      io.to(`room:${roomId}`).emit('presence:room', Array.from(members.values()).map(m => ({ userId: m.userId, name: m.name })));
      await prisma.roomEvent.create({ data: { roomId, userId: user.id, type: 'PRESENCE_JOIN', payload: {} } }).catch(() => undefined);
    });

    socket.on('file:join', async ({ fileId }: { fileId: string }) => {
      const file = await prisma.file.findUnique({ where: { id: fileId }, include: { project: { select: { roomId: true } } } });
      if (!file) return socket.emit('error:file', { error: 'File not found.' });
      const membership = await getMembership(file.project.roomId, user.id);
      if (!membership) return socket.emit('error:file', { error: 'Not allowed.' });
      const roomKey = `file:${fileId}`;
      socket.join(roomKey);
      socketRooms.get(socket.id)?.add(roomKey);
      const state = file.yState ?? Buffer.from(Y.encodeStateAsUpdate((() => { const d = new Y.Doc(); d.getText('content').insert(0, file.content); return d; })()));
      socket.emit('file:sync', { fileId, state: b64(state) });
      socket.to(roomKey).emit('presence:file', { userId: user.id, name: user.name, action: 'join' });
    });

    socket.on('file:update', async ({ fileId, update }: { fileId: string; update: string }) => {
      try {
        let accepted = false;
        await withDistributedLock(`file:${fileId}`, async () => {
          const file = await prisma.file.findUnique({ where: { id: fileId }, include: { project: { select: { roomId: true } } } });
          if (!file) return;
          const membership = await getMembership(file.project.roomId, user.id);
          if (!membership || (membership.role !== 'OWNER' && membership.role !== 'EDITOR')) return;
          const updateBytes = bytes(update);
          const doc = new Y.Doc();
          const baseState = file.yState ?? Buffer.from(Y.encodeStateAsUpdate((() => { const d = new Y.Doc(); d.getText('content').insert(0, file.content); return d; })()));
          Y.applyUpdate(doc, new Uint8Array(baseState));
          Y.applyUpdate(doc, new Uint8Array(updateBytes));
          const nextState = Buffer.from(Y.encodeStateAsUpdate(doc));
          const snapshot = doc.getText('content').toString();
          await prisma.$transaction([
            prisma.file.update({ where: { id: file.id }, data: { yState: nextState, content: snapshot } }),
            prisma.documentUpdate.create({ data: { fileId: file.id, userId: user.id, update: updateBytes, snapshot } })
          ]);
          accepted = true;
        });
        if (accepted) socket.to(`file:${fileId}`).emit('file:update', { fileId, update });
      } catch {
        socket.emit('error:file', { error: 'Update rejected.' });
      }
    });

    socket.on('file:awareness', async ({ fileId, update }: { fileId: string; update: string }) => {
      const file = await prisma.file.findUnique({ where: { id: fileId }, select: { project: { select: { roomId: true } } } });
      if (!file) return;
      const membership = await getMembership(file.project.roomId, user.id);
      if (!membership) return;
      socket.to(`file:${fileId}`).emit('file:awareness', { fileId, update });
    });

    socket.on('room:cursor', ({ roomId, cursor }: { roomId: string; cursor: { fileId: string; line: number; column: number } }) => {
      socket.to(`room:${roomId}`).emit('room:cursor', { userId: user.id, name: user.name, cursor });
    });

    socket.on('disconnect', async () => {
      for (const roomKey of socketRooms.get(socket.id) ?? []) {
        if (!roomKey.startsWith('room:')) continue;
        const roomId = roomKey.slice('room:'.length);
        const members = roomPresence.get(roomId);
        members?.delete(socket.id);
        if (members && members.size === 0) roomPresence.delete(roomId);
        else if (members) io.to(roomKey).emit('presence:room', Array.from(members.values()).map(m => ({ userId: m.userId, name: m.name })));
      }
      socketRooms.delete(socket.id);
    });
  });

  return io;
}
