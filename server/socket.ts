import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import * as Y from 'yjs';
import { prisma } from './db';
import { newRedisConnection } from './redis';
import { getUserFromCookieHeader } from './auth';
import { getMembership } from './permissions';
import { withDistributedLock } from './locks';
import { verifySocketToken } from './socket-auth';

function b64(bytes: Uint8Array | Buffer) {
  return Buffer.from(bytes).toString('base64');
}

function bytes(value: string) {
  return Buffer.from(value, 'base64');
}

const roomPresence = new Map<
  string,
  Map<
    string,
    {
      userId: string;
      name: string;
      socketId: string;
    }
  >
>();

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

  /**
   * Socket authentication
   *
   * The socket token only contains the user id.
   * Fetch the actual user from Prisma so connection handlers
   * can safely use socket.data.user.
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || !token) {
      console.error('❌ Socket authentication failed: token missing');
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = verifySocketToken(token);

      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!dbUser) {
        console.error(
          '❌ Socket authentication failed: user not found',
          payload.sub
        );

        return next(new Error('Unauthorized'));
      }

      socket.data.userId = dbUser.id;
      socket.data.user = dbUser;

      console.log('✅ Socket authenticated:', dbUser.id);

      return next();
    } catch (error) {
      console.error(
        '❌ Socket authentication failed:',
        error instanceof Error ? error.message : error
      );

      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', socket => {
    const user = socket.data.user as {
      id: string;
      name: string;
      email: string;
    };

    socketRooms.set(socket.id, new Set());

    /**
     * Join room
     */
    socket.on(
      'room:join',
      async ({ roomId }: { roomId: string }) => {
        try {
          const membership = await getMembership(
            roomId,
            user.id
          );

          if (!membership) {
            return socket.emit('error:room', {
              error: 'Not a room member.'
            });
          }

          socket.join(`room:${roomId}`);

          socketRooms
            .get(socket.id)
            ?.add(`room:${roomId}`);

          const members =
            roomPresence.get(roomId) ?? new Map();

          members.set(socket.id, {
            userId: user.id,
            name: user.name,
            socketId: socket.id
          });

          roomPresence.set(roomId, members);

          io.to(`room:${roomId}`).emit(
            'presence:room',
            Array.from(members.values()).map(member => ({
              userId: member.userId,
              name: member.name
            }))
          );

          await prisma.roomEvent
            .create({
              data: {
                roomId,
                userId: user.id,
                type: 'PRESENCE_JOIN',
                payload: {}
              }
            })
            .catch(() => undefined);
        } catch (error) {
          console.error(
            '❌ room:join failed:',
            error instanceof Error
              ? error.message
              : error
          );

          socket.emit('error:room', {
            error: 'Failed to join room.'
          });
        }
      }
    );

    /**
     * Join file
     */
    socket.on(
      'file:join',
      async ({ fileId }: { fileId: string }) => {
        try {
          const file =
            await prisma.file.findUnique({
              where: { id: fileId },
              include: {
                project: {
                  select: {
                    roomId: true
                  }
                }
              }
            });

          if (!file) {
            return socket.emit('error:file', {
              error: 'File not found.'
            });
          }

          const membership =
            await getMembership(
              file.project.roomId,
              user.id
            );

          if (!membership) {
            return socket.emit('error:file', {
              error: 'Not allowed.'
            });
          }

          const roomKey = `file:${fileId}`;

          socket.join(roomKey);

          socketRooms
            .get(socket.id)
            ?.add(roomKey);

          const state =
            file.yState ??
            Buffer.from(
              Y.encodeStateAsUpdate(
                (() => {
                  const doc = new Y.Doc();

                  doc
                    .getText('content')
                    .insert(0, file.content);

                  return doc;
                })()
              )
            );

          socket.emit('file:sync', {
            fileId,
            state: b64(state)
          });

          socket
            .to(roomKey)
            .emit('presence:file', {
              userId: user.id,
              name: user.name,
              action: 'join'
            });
        } catch (error) {
          console.error(
            '❌ file:join failed:',
            error instanceof Error
              ? error.message
              : error
          );

          socket.emit('error:file', {
            error: 'Failed to join file.'
          });
        }
      }
    );

    /**
     * Collaborative Yjs file update
     *
     * Flow:
     * client update
     * → distributed lock
     * → load current DB Yjs state
     * → apply incoming update
     * → persist new Yjs state + text snapshot
     * → persist document update for replay
     * → broadcast update to other clients
     */
    socket.on(
      'file:update',
      async ({
        fileId,
        update
      }: {
        fileId: string;
        update: string;
      }) => {
        try {
          let accepted = false;

          await withDistributedLock(
            `file:${fileId}`,
            async () => {
              const file =
                await prisma.file.findUnique({
                  where: { id: fileId },
                  include: {
                    project: {
                      select: {
                        roomId: true
                      }
                    }
                  }
                });

              if (!file) {
                return;
              }

              const membership =
                await getMembership(
                  file.project.roomId,
                  user.id
                );

              if (
                !membership ||
                (membership.role !== 'OWNER' &&
                  membership.role !== 'EDITOR')
              ) {
                return;
              }

              const updateBytes = bytes(update);

              const doc = new Y.Doc();

              const baseState =
                file.yState ??
                Buffer.from(
                  Y.encodeStateAsUpdate(
                    (() => {
                      const d = new Y.Doc();

                      d
                        .getText('content')
                        .insert(0, file.content);

                      return d;
                    })()
                  )
                );

              /**
               * Rebuild the current shared document
               * from the persisted state.
               */
              Y.applyUpdate(
                doc,
                new Uint8Array(baseState)
              );

              /**
               * Apply the incoming client change.
               */
              Y.applyUpdate(
                doc,
                new Uint8Array(updateBytes)
              );

              /**
               * Store a compact current Yjs snapshot.
               */
              const nextState = Buffer.from(
                Y.encodeStateAsUpdate(doc)
              );

              /**
               * Store plain text too.
               *
               * The execution system reads file.content,
               * so keeping this synchronized is important.
               */
              const snapshot =
                doc.getText('content').toString();

              await prisma.$transaction([
                prisma.file.update({
                  where: {
                    id: file.id
                  },
                  data: {
                    yState: nextState,
                    content: snapshot
                  }
                }),

                prisma.documentUpdate.create({
                  data: {
                    fileId: file.id,
                    userId: user.id,
                    update: updateBytes,
                    snapshot
                  }
                })
              ]);

              accepted = true;
            }
          );

          if (accepted) {
            socket
              .to(`file:${fileId}`)
              .emit('file:update', {
                fileId,
                update
              });
          }
        } catch (error) {
          console.error(
            '❌ file:update failed:',
            error instanceof Error
              ? error.message
              : error
          );

          socket.emit('error:file', {
            error: 'Update rejected.'
          });
        }
      }
    );

    /**
     * Awareness / cursor updates
     */
    socket.on(
      'file:awareness',
      async ({
        fileId,
        update
      }: {
        fileId: string;
        update: string;
      }) => {
        try {
          const file =
            await prisma.file.findUnique({
              where: { id: fileId },
              select: {
                project: {
                  select: {
                    roomId: true
                  }
                }
              }
            });

          if (!file) {
            return;
          }

          const membership =
            await getMembership(
              file.project.roomId,
              user.id
            );

          if (!membership) {
            return;
          }

          socket
            .to(`file:${fileId}`)
            .emit('file:awareness', {
              fileId,
              update
            });
        } catch (error) {
          console.error(
            '❌ file:awareness failed:',
            error instanceof Error
              ? error.message
              : error
          );
        }
      }
    );

    /**
     * Room cursor
     */
    socket.on(
      'room:cursor',
      ({
        roomId,
        cursor
      }: {
        roomId: string;
        cursor: {
          fileId: string;
          line: number;
          column: number;
        };
      }) => {
        socket
          .to(`room:${roomId}`)
          .emit('room:cursor', {
            userId: user.id,
            name: user.name,
            cursor
          });
      }
    );

    /**
     * Disconnect cleanup
     */
    socket.on('disconnect', async () => {
      try {
        for (const roomKey of
          socketRooms.get(socket.id) ?? []) {
          if (!roomKey.startsWith('room:')) {
            continue;
          }

          const roomId =
            roomKey.slice('room:'.length);

          const members =
            roomPresence.get(roomId);

          members?.delete(socket.id);

          if (
            members &&
            members.size === 0
          ) {
            roomPresence.delete(roomId);
          } else if (members) {
            io.to(roomKey).emit(
              'presence:room',
              Array.from(
                members.values()
              ).map(member => ({
                userId: member.userId,
                name: member.name
              }))
            );
          }
        }

        socketRooms.delete(socket.id);
      } catch (error) {
        console.error(
          '❌ Socket disconnect cleanup failed:',
          error instanceof Error
            ? error.message
            : error
        );
      }
    });
  });

  return io;
}