/**
 * Seed script — creates the single Admin account (Req 14.4, Property 13).
 * Run: pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@portfolio.local';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123';

  const existing = await prisma.admin.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin "${email}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.create({ data: { email, passwordHash } });

  // Seed default CV setting
  await prisma.siteSetting.upsert({
    where: { key: 'cv_url' },
    create: { key: 'cv_url', value: '/cv.pdf' },
    update: {},
  });

  console.log(`✅  Admin "${email}" created.`);
  console.log('✅  Default cv_url setting seeded.');
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());
