import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { prisma } from './db';

const SESSION_COOKIE = process.env.SESSION_COOKIE ?? 'coderoom_session';
const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 14);

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, saltHex, keyHex] = encoded.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1 }, (error, result) => {
      if (error) reject(error);
      else resolve(result as Buffer);
    });
  });
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

export async function createSession(userId: string, res: Response) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash, userId, expiresAt } });

  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

export async function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}

export async function getUserFromRequest(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true }
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function getUserFromCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) return null;
  const token = cookieHeader.split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.split('=').slice(1).join('=');
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
