import { prisma } from './db';
import type { RoomRole } from '@prisma/client';

export async function getMembership(roomId: string, userId: string) {
  return prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
}

export function canEdit(role: RoomRole) {
  return role === 'OWNER' || role === 'EDITOR';
}

export function canRun(role: RoomRole) {
  return role !== 'VIEWER';
}

export function canManageTests(role: RoomRole) {
  return role === 'OWNER' || role === 'INTERVIEWER';
}

export function canManageRoom(role: RoomRole) {
  return role === 'OWNER';
}
