import { Router, type Express, type Request, type Response, type NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { z } from 'zod';
import * as Y from 'yjs';
import { prisma } from './db';
import { clearSession, createSession, getUserFromRequest, hashPassword, verifyPassword } from './auth';
import { clientIp, rateLimit } from './security';
import { executionQueue } from './queue';
import { canEdit, canManageRoom, canManageTests, canRun, getMembership } from './permissions';
import { createStateFromText } from './yjs';
import { PROBLEM_TEMPLATES } from '../lib/problems';

const router = Router();

router.use(cookieParser());

async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  res.locals.user = user;
  return next();
}

async function roomAccess(req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user;
const roomId = String(req.params.id);
const membership = await getMembership(roomId, user.id);
  if (!membership) return res.status(403).json({ error: 'You are not a member of this room.' });
  res.locals.membership = membership;
  return next();
}

async function audit(userId: string | null, roomId: string | null, action: string, req: Request, metadata?: Record<string, unknown>) {
  await prisma.auditEvent.create({
    data: {
      userId,
      roomId,
      action,
      metadata: metadata
  ? JSON.parse(JSON.stringify(metadata))
  : undefined,
      ip: clientIp(req),
      userAgent: req.get('user-agent')?.slice(0, 500)
    }
  }).catch(() => undefined);
}

router.get('/health', async (_req, res) => {
  const [db, queue] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'down'),
    executionQueue.getJobCounts().then(() => 'ok').catch(() => 'down')
  ]);
  res.json({ status: db === 'ok' && queue === 'ok' ? 'ok' : 'degraded', database: db, queue });
});

router.post('/auth/register', async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(128)
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid registration details.', issues: parsed.error.flatten() });
  const allowed = await rateLimit(`register:${clientIp(req)}`, 5, 900);
  if (!allowed.allowed) return res.status(429).json({ error: 'Too many registration attempts. Try again later.' });
  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password) } });
  await createSession(user.id, res);
  await audit(user.id, null, 'AUTH_REGISTER', req);
  return res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/auth/login', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials.' });
  const allowed = await rateLimit(`login:${clientIp(req)}`, 8, 600);
  if (!allowed.allowed) return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await audit(user?.id ?? null, null, 'AUTH_LOGIN_FAILED', req, { email: parsed.data.email.toLowerCase() });
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  await createSession(user.id, res);
  await audit(user.id, null, 'AUTH_LOGIN', req);
  return res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/auth/logout', requireUser, async (req, res) => {
  await clearSession(req, res);
  await audit(res.locals.user.id, null, 'AUTH_LOGOUT', req);
  res.json({ ok: true });
});

router.get('/auth/me', requireUser, async (_req, res) => {
  const user = res.locals.user;
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.patch('/auth/profile', requireUser, async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please enter a valid display name.' });
  const user = await prisma.user.update({ where: { id: res.locals.user.id }, data: { name: parsed.data.name } });
  await audit(user.id, null, 'PROFILE_UPDATED', req);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

router.patch('/auth/password', requireUser, async (req, res) => {
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid password details.' });
  const user = res.locals.user;
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) return res.status(401).json({ error: 'Current password is incorrect.' });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id, res);
  await audit(user.id, null, 'PASSWORD_CHANGED', req);
  res.json({ ok: true });
});

router.get('/rooms', requireUser, async (_req, res) => {
  const user = res.locals.user;
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      _count: { select: { members: true, executions: true } },
      members: { where: { userId: user.id }, select: { role: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ rooms: rooms.map(room => ({
    id: room.id,
    name: room.name,
    description: room.description,
    mode: room.mode,
    updatedAt: room.updatedAt,
    members: room._count.members,
    executions: room._count.executions,
    role: room.members[0]?.role ?? 'VIEWER'
  })) });
});

router.post('/rooms', requireUser, async (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240).optional(),
    mode: z.enum(['PAIR', 'INTERVIEW', 'TEAM']).default('PAIR')
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid room details.' });
  const user = res.locals.user;
  const room = await prisma.$transaction(async tx => {
    const created = await tx.room.create({ data: { name: parsed.data.name, description: parsed.data.description, mode: parsed.data.mode, createdById: user.id } });
    await tx.roomMember.create({ data: { roomId: created.id, userId: user.id, role: 'OWNER' } });
    const project = await tx.project.create({ data: { roomId: created.id, name: 'main' } });
    const defaults = [
      { name: 'main.py', path: 'main.py', language: 'python', content: 'def main():\n    print("Welcome to CodeRoom.")\n\nif __name__ == "__main__":\n    main()\n' },
      { name: 'README.md', path: 'README.md', language: 'markdown', content: '# CodeRoom\n\n## Workspace\n\nThis room is a collaborative coding workspace for pair programming and technical interviews.\n\n- `main.py` — solution workspace\n- `README.md` — room notes and instructions\n\n## Session flow\n\n1. Read the active challenge.\n2. Edit the solution in the shared editor.\n3. Run the solution against the room test cases.\n4. Review failures, comments and execution history.\n' }
    ];
    for (const file of defaults) {
      await tx.file.create({ data: { projectId: project.id, name: file.name, path: file.path, language: file.language, content: file.content, yState: createStateFromText(file.content) } });
    }
    return created;
  });
  await audit(user.id, room.id, 'ROOM_CREATED', req, { mode: room.mode });
  return res.status(201).json({ roomId: room.id });
});

router.get('/rooms/:id', requireUser, roomAccess, async (req, res) => {
  const room = await prisma.room.findUnique({
   where: { id: String(req.params.id) },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: 'asc' } },
      projects: { include: { files: { orderBy: { path: 'asc' }, select: { id: true, name: true, path: true, language: true, updatedAt: true } } } },
      _count: { select: { executions: true, comments: true } }
    }
  });
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  // Repair only known pristine/corrupted seed content. Never overwrite user-authored code.
  const projectIds = room.projects.map(project => project.id);
  if (projectIds.length) {
    const repairFiles = await prisma.file.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, name: true, path: true, language: true, content: true },
      orderBy: { path: 'asc' }
    });
    const readme = repairFiles.find(file => file.path.toLowerCase() === 'readme.md');
    const brokenReadme = Boolean(readme && (readme.content.includes('def main():') || readme.content.includes('Welcome to CodeRoom.')));
    if (brokenReadme && readme) {
      const readmeText = '# CodeRoom\n\n## Workspace\n\nThis room is a collaborative coding workspace for pair programming and technical interviews.\n\n- `main.py` — solution workspace\n- `README.md` — room notes and instructions\n\n## Session flow\n\n1. Read the active challenge.\n2. Edit the solution in the shared editor.\n3. Run the solution against the room test cases.\n4. Review failures, comments and execution history.\n';
      await prisma.file.update({ where: { id: readme.id }, data: { content: readmeText, yState: createStateFromText(readmeText) } });
    }

    const problem = room.problem as any;
    const codeFile = repairFiles.find(file => file.language !== 'markdown');
    const canonicalTemplate = problem?.templateId ? PROBLEM_TEMPLATES.find(template => template.id === problem.templateId) : undefined;
    const starterCode = canonicalTemplate?.starterCode ?? problem?.starterCode;
    const defaultMain = 'def main():\n    print("Welcome to CodeRoom.")\n\nif __name__ == "__main__":\n    main()\n';
    if (problem?.templateId && starterCode && codeFile && (codeFile.content.trim() === '' || codeFile.content === defaultMain || codeFile.content.includes('Welcome to CodeRoom.'))) {
      await prisma.file.update({ where: { id: codeFile.id }, data: { content: starterCode, yState: createStateFromText(starterCode) } });
    }
  }

  res.json({ room: { ...room, passwordHash: undefined }, membership: res.locals.membership });
});

router.patch('/rooms/:id/problem', requireUser, roomAccess, async (req, res) => {
  if (!canManageTests(res.locals.membership.role)) return res.status(403).json({ error: 'Only owners/interviewers can manage a challenge.' });
  const parsed = z.object({
    problem: z.object({
      templateId: z.string().max(80).optional(),
      title: z.string().trim().min(2).max(140),
      difficulty: z.enum(['EASY','MEDIUM','HARD']),
      tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
      description: z.string().trim().min(10).max(12000),
      constraints: z.array(z.string().trim().min(1).max(600)).max(12).default([]),
      examples: z.array(z.object({ input: z.string().max(2000), output: z.string().max(2000), explanation: z.string().max(2000).optional() })).max(10).default([]),
      starterCode: z.string().max(Number(process.env.MAX_SOURCE_BYTES ?? 600000)).optional()
    }).nullable(),
    tests: z.array(z.object({ name: z.string().trim().min(1).max(120), input: z.string().max(10000), expected: z.string().max(10000), hidden: z.boolean().default(false), order: z.number().int().min(0).max(999).optional() })).max(50).default([])
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid challenge details.' });
  
  const roomId = String(req.params.id);
 const problemJson =
  parsed.data.problem === null
    ? Prisma.JsonNull
    : (parsed.data.problem as Prisma.InputJsonValue);

  await prisma.$transaction(async tx => {
    await tx.room.update({
      where: { id: roomId },
      data: { problem: problemJson }
    });

    await tx.testCase.deleteMany({
      where: { roomId }
    });

    if (parsed.data.problem) {
      const file = await tx.file.findFirst({
        where: {
          project: { roomId },
          language: { not: 'markdown' }
        },
        orderBy: { path: 'asc' }
      });

      const defaultMain = 'def main():\n    print("Welcome to CodeRoom.")\n\nif __name__ == "__main__":\n    main()\n';

      if (
        file &&
        parsed.data.problem.templateId &&
        parsed.data.problem.starterCode &&
        (
          file.content.trim() === '' ||
          file.content === defaultMain ||
          file.content.includes('Welcome to CodeRoom.')
        )
      ) {
        await tx.file.update({
          where: { id: file.id },
          data: {
            content: parsed.data.problem.starterCode,
            yState: createStateFromText(parsed.data.problem.starterCode)
          }
        });
      }

      if (parsed.data.tests.length) {
        await tx.testCase.createMany({
          data: parsed.data.tests.map((test, index) => ({
            roomId,
            fileId: file?.id,
            name: test.name,
            input: test.input,
            expected: test.expected,
            hidden: test.hidden,
            order: test.order ?? index
          }))
        });
      }
    }
  });

  await audit(res.locals.user.id, String(req.params.id), 'PROBLEM_UPDATED', req, { title: parsed.data.problem?.title ?? null });
  res.json({ problem: parsed.data.problem });
});

router.delete('/rooms/:id/problem', requireUser, roomAccess, async (req, res) => {
  if (!canManageTests(res.locals.membership.role)) return res.status(403).json({ error: 'Only owners/interviewers can manage a challenge.' });
  await prisma.$transaction([
    prisma.room.update({ where: { id: String(req.params.id) }, data: { problem: Prisma.JsonNull } }),
    prisma.testCase.deleteMany({ where: { roomId: String(req.params.id) } })
  ]);
  await audit(res.locals.user.id, String(req.params.id), 'PROBLEM_REMOVED', req);
  res.json({ ok: true });
});

router.post('/rooms/:id/invites', requireUser, roomAccess, async (req, res) => {
  if (!canManageRoom(res.locals.membership.role)) return res.status(403).json({ error: 'Only the room owner can create invites.' });
  const parsed = z.object({ hours: z.number().int().min(1).max(168).default(48), maxUses: z.number().int().min(1).max(100).default(10) }).safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid invite settings.' });
  const token = crypto.randomBytes(18).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.roomInvite.create({ data: { roomId: String(req.params.id), createdById: res.locals.user.id, tokenHash, maxUses: parsed.data.maxUses, expiresAt: new Date(Date.now() + parsed.data.hours * 3600000) } });
  await audit(res.locals.user.id, String(req.params.id), 'ROOM_INVITE_CREATED', req);
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  res.json({ inviteUrl: `${appUrl}/join?token=${encodeURIComponent(token)}` });
});

router.post('/rooms/join/:token', requireUser, async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
  const invite = await prisma.roomInvite.findUnique({ where: { tokenHash } });
  if (!invite || invite.expiresAt <= new Date() || invite.uses >= invite.maxUses) return res.status(410).json({ error: 'Invite expired or exhausted.' });
  const existing = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: invite.roomId, userId: res.locals.user.id } } });
  if (!existing) {
    await prisma.$transaction([
      prisma.roomMember.create({ data: { roomId: invite.roomId, userId: res.locals.user.id, role: 'EDITOR' } }),
      prisma.roomInvite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } })
    ]);
  }
  await audit(res.locals.user.id, invite.roomId, 'ROOM_JOINED', req);
  res.json({ roomId: invite.roomId });
});

router.get('/rooms/:id/files', requireUser, roomAccess, async (req, res) => {
  const files = await prisma.file.findMany({ where: { project: { roomId: String(req.params.id) } }, orderBy: { path: 'asc' }, select: { id: true, name: true, path: true, language: true, projectId: true, updatedAt: true } });
  res.json({ files });
});

router.post('/rooms/:id/files', requireUser, roomAccess, async (req, res) => {
  if (!canEdit(res.locals.membership.role)) return res.status(403).json({ error: 'You cannot edit this room.' });
  const parsed = z.object({ name: z.string().trim().min(1).max(120), language: z.string().trim().min(1).max(40), content: z.string().max(Number(process.env.MAX_SOURCE_BYTES ?? 600000)).default('') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid file details.' });
  const project = await prisma.project.findFirst({ where: { roomId: String(req.params.id) }, orderBy: { createdAt: 'asc' } });
  if (!project) return res.status(500).json({ error: 'Project not found.' });
  const file = await prisma.file.create({ data: { projectId: project.id, name: parsed.data.name, path: parsed.data.name, language: parsed.data.language, content: parsed.data.content, yState: createStateFromText(parsed.data.content) } });
  await audit(res.locals.user.id, String(req.params.id), 'FILE_CREATED', req, { fileId: file.id });
  res.status(201).json({ file });
});

router.patch('/files/:id', requireUser, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: String(req.params.id) }, include: { project: { select: { roomId: true } } } });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const membership = await getMembership(file.project.roomId, res.locals.user.id);
  if (!membership || !canEdit(membership.role)) return res.status(403).json({ error: 'You cannot edit this file.' });
  const parsed = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    content: z.string().max(Number(process.env.MAX_SOURCE_BYTES ?? 600000)).optional()
  }).refine(v => v.name !== undefined || v.content !== undefined, { message: 'No changes supplied.' }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid file update.' });
  const data: { name?: string; path?: string; content?: string; yState?: Buffer } = {};
  if (parsed.data.name) { data.name = parsed.data.name; data.path = parsed.data.name; }
  if (parsed.data.content !== undefined) { data.content = parsed.data.content; data.yState = createStateFromText(parsed.data.content); }
  const updated = await prisma.file.update({ where: { id: file.id }, data });
  await audit(res.locals.user.id, file.project.roomId, parsed.data.content !== undefined ? 'FILE_CONTENT_REPLACED' : 'FILE_RENAMED', req, { fileId: file.id });
  res.json({ file: updated });
});

router.delete('/files/:id', requireUser, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: String(req.params.id) }, include: { project: { select: { roomId: true, id: true } } } });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const membership = await getMembership(file.project.roomId, res.locals.user.id);
  if (!membership || !canEdit(membership.role)) return res.status(403).json({ error: 'You cannot delete files in this room.' });
  const remaining = await prisma.file.count({ where: { projectId: file.project.id } });
  if (remaining <= 1) return res.status(400).json({ error: 'A room must keep at least one workspace file.' });
  await prisma.file.delete({ where: { id: file.id } });
  await audit(res.locals.user.id, file.project.roomId, 'FILE_DELETED', req, { fileId: file.id });
  res.json({ ok: true });
});

router.get('/files/:id/state', requireUser, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: String(req.params.id) }, include: { project: { select: { roomId: true } } } });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const membership = await getMembership(file.project.roomId, res.locals.user.id);
  if (!membership) return res.status(403).json({ error: 'Forbidden.' });
  res.json({ file: { id: file.id, name: file.name, path: file.path, language: file.language }, state: Buffer.from(file.yState ?? createStateFromText(file.content)).toString('base64'), text: file.content });
});

router.post('/files/:id/comments', requireUser, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: String(req.params.id) }, include: { project: { select: { roomId: true } } } });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const membership = await getMembership(file.project.roomId, res.locals.user.id);
  if (!membership) return res.status(403).json({ error: 'Forbidden.' });
  const parsed = z.object({ line: z.number().int().min(1), content: z.string().trim().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid comment.' });
  const comment = await prisma.comment.create({ data: { roomId: file.project.roomId, fileId: file.id, userId: res.locals.user.id, line: parsed.data.line, content: parsed.data.content } });
  await prisma.roomEvent.create({ data: { roomId: file.project.roomId, userId: res.locals.user.id, type: 'COMMENT_ADDED', payload: { fileId: file.id, line: parsed.data.line } } });
  res.status(201).json({ comment });
});

router.get('/files/:id/comments', requireUser, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: String(req.params.id) }, include: { project: { select: { roomId: true } } } });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const membership = await getMembership(file.project.roomId, res.locals.user.id);
  if (!membership) return res.status(403).json({ error: 'Forbidden.' });
  const comments = await prisma.comment.findMany({ where: { fileId: file.id }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } });
  res.json({ comments });
});

router.patch('/comments/:id', requireUser, async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: String(req.params.id) } });
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  const membership = await getMembership(comment.roomId, res.locals.user.id);
  if (!membership) return res.status(403).json({ error: 'Forbidden.' });
  const resolved = z.boolean().parse(req.body?.resolved);
  const updated = await prisma.comment.update({ where: { id: comment.id }, data: { resolved } });
  res.json({ comment: updated });
});

router.get('/rooms/:id/tests', requireUser, roomAccess, async (req, res) => {
  const tests = await prisma.testCase.findMany({ where: { roomId: String(req.params.id) }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  const isPrivileged = canManageTests(res.locals.membership.role);
  res.json({ tests: tests.map(t => ({ ...t, input: isPrivileged || !t.hidden ? t.input : '', expected: isPrivileged || !t.hidden ? t.expected : '' })) });
});

router.post('/rooms/:id/tests', requireUser, roomAccess, async (req, res) => {
  if (!canManageTests(res.locals.membership.role)) return res.status(403).json({ error: 'Only interviewers/owners can manage tests.' });
  const parsed = z.object({ fileId: z.string().cuid().optional(), name: z.string().trim().min(1).max(120), input: z.string().max(10000), expected: z.string().max(10000), hidden: z.boolean().default(false), order: z.number().int().min(0).max(999).default(0) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid test case.' });
  const test = await prisma.testCase.create({ data: { roomId: String(req.params.id), ...parsed.data } });
  res.status(201).json({ test });
});

router.delete('/tests/:id', requireUser, async (req, res) => {
  const test = await prisma.testCase.findUnique({ where: { id: String(req.params.id) } });
  if (!test) return res.status(404).json({ error: 'Test not found.' });
  const membership = await getMembership(test.roomId, res.locals.user.id);
  if (!membership || !canManageTests(membership.role)) return res.status(403).json({ error: 'Forbidden.' });
  await prisma.testCase.delete({ where: { id: test.id } });
  res.json({ ok: true });
});

router.post('/rooms/:id/executions', requireUser, roomAccess, async (req, res) => {
  if (!canRun(res.locals.membership.role)) return res.status(403).json({ error: 'You cannot run code in this room.' });
  const parsed = z.object({ fileId: z.string().cuid(), stdin: z.string().max(100000).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid fileId is required.' });
  const file = await prisma.file.findUnique({ where: { id: parsed.data.fileId }, include: { project: { select: { roomId: true } } } });
  if (!file || file.project.roomId !== String(req.params.id)) return res.status(404).json({ error: 'File not found in this room.' });
  if (Buffer.byteLength(file.content, 'utf8') > Number(process.env.MAX_SOURCE_BYTES ?? 600000)) return res.status(413).json({ error: 'Source file is too large to execute.' });
  const tests = await prisma.testCase.findMany({ where: { roomId: String(req.params.id), OR: [{ fileId: file.id }, { fileId: null }] }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  const room = await prisma.room.findUnique({ where: { id: String(req.params.id) }, select: { problem: true } });
  const problemTemplateId = (room?.problem as any)?.templateId ?? null;
  const execution = await prisma.execution.create({ data: { roomId: String(req.params.id), fileId: file.id, userId: res.locals.user.id, language: file.language, source: file.content, stdin: parsed.data.stdin ?? '' } });
  await executionQueue.add('execute', {
    executionId: execution.id,
    roomId: String(req.params.id),
    language: file.language,
    source: file.content,
    stdin: parsed.data.stdin ?? '',
    problemTemplateId,
    tests: tests.map(t => ({ id: t.id, name: t.name, input: t.input, expected: t.expected, hidden: t.hidden }))
  }, { jobId: execution.id });
  await prisma.roomEvent.create({ data: { roomId: String(req.params.id), userId: res.locals.user.id, type: 'EXECUTION_QUEUED', payload: { executionId: execution.id, fileId: file.id } } });
  res.status(202).json({ execution });
});

router.get('/rooms/:id/executions', requireUser, roomAccess, async (req, res) => {
  const executions = await prisma.execution.findMany({ where: { roomId: String(req.params.id) }, include: { user: { select: { name: true } }, file: { select: { name: true, language: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ executions });
});

router.get('/executions/:id', requireUser, async (req, res) => {
  const execution = await prisma.execution.findUnique({ where: { id: String(req.params.id) }, include: { room: { select: { id: true } } } });
  if (!execution) return res.status(404).json({ error: 'Execution not found.' });
  const membership = await getMembership(execution.room.id, res.locals.user.id);
  if (!membership) return res.status(403).json({ error: 'Forbidden.' });
  res.json({ execution });
});

router.get('/rooms/:id/events', requireUser, roomAccess, async (req, res) => {
  const events = await prisma.roomEvent.findMany({ where: { roomId: String(req.params.id) }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
  const edits = await prisma.documentUpdate.findMany({ where: { file: { project: { roomId: String(req.params.id) } } }, include: { user: { select: { name: true } }, file: { select: { name: true, language: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
  const replayEvents = [
    ...events.map(e => ({ id: e.id, type: e.type, payload: e.payload, user: e.user?.name ?? 'System', createdAt: e.createdAt })),
    ...edits.map(e => ({ id: e.id, type: 'EDIT', payload: { fileId: e.fileId, fileName: e.file.name, language: e.file.language, snapshot: e.snapshot }, user: e.user.name, createdAt: e.createdAt }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json({ events: replayEvents.slice(-1000) });
});

router.get('/metrics', requireUser, async (_req, res) => {
  const [roomCount, executionCounts] = await Promise.all([
    prisma.room.count(),
    prisma.execution.groupBy({ by: ['status'], _count: { _all: true } })
  ]);
  const queueCounts = await executionQueue.getJobCounts();
  res.json({ rooms: roomCount, executionCounts, queueCounts });
});

export function registerApi(app: Express) {
  app.use('/api', router);
}
