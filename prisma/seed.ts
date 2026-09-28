import 'dotenv/config';
import { prisma } from '../server/db';
import { hashPassword } from '../server/auth';

async function main() {
  const email = 'demo@coderoom.local';
  const password = 'Demo@12345';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo User', passwordHash: await hashPassword(password) }
  });
  console.log(`Demo credentials: ${email} / ${password}`);
  console.log(`User id: ${user.id}`);
}

main().finally(() => prisma.$disconnect());
