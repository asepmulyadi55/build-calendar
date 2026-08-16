import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * One client per process. Next.js dev reloads the module graph on every edit, so
 * without this the connection pool grows until Supabase refuses new connections.
 */
export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
