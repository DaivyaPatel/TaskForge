import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: 'dummyhash', // We will fix this when we build Auth
      displayName: 'Test User',
      emailVerified: true,
    },
  });

  await prisma.workspace.create({
    data: {
      name: 'Test Workspace',
      description: 'My first workspace',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  console.log('Seed completed: Test user and workspace created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });