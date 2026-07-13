import { PrismaClient } from '@prisma/client';

/**
 * Idempotent database seed. Kept intentionally small in Phase 0 (a single demo
 * user); later phases extend it with categories, accounts and sample
 * transactions. Run with `pnpm db:seed`.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@financehub.dev' },
    update: {},
    create: {
      email: 'demo@financehub.dev',
      displayName: 'Demo User',
      emailVerified: true,
    },
  });

  console.log(`Seeded user: ${demoUser.email} (${demoUser.id})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
