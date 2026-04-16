import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      name: 'Editor',
      email: 'editor@example.com',
      passwordHash: await hash('editor123', 10),
      role: 'EDITOR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: {},
    create: {
      name: 'Reviewer',
      email: 'reviewer@example.com',
      passwordHash: await hash('reviewer123', 10),
      role: 'REVIEWER',
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
