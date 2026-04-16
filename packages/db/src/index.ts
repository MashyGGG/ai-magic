import { PrismaClient } from '@prisma/client';

// Ensure Prisma can always read DATABASE_URL in monorepo dev.
// Next.js only auto-loads env from the app folder, while this repo keeps `.env` at workspace root.
// We load root `.env` here as a safe fallback (server-only code).
declare const require: any;
try {
  const { loadRootEnvFile } = require('./load-root-env');
  if (typeof loadRootEnvFile === 'function') loadRootEnvFile();
} catch {
  // Ignore: environment might already be correctly configured.
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export * from '@prisma/client';
