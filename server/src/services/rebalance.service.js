import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const rebalanceSectionTasks = async (sectionId) => {
  console.log(`[Background Job] Rebalancing tasks for section: ${sectionId}`);
  
  // 1. Fetch all tasks in order
  const tasks = await prisma.task.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' }
  });

  // 2. Map them to fresh, clean multiples of 1000
  const updates = tasks.map((task, index) => {
    return prisma.task.update({
      where: { id: task.id },
      data: { order: (index + 1) * 1000 }
    });
  });

  // 3. Execute all updates in a single transaction
  await prisma.$transaction(updates);
};

export const rebalanceWorkspaceSections = async (workspaceId, parentId = null) => {
  console.log(`[Background Job] Rebalancing sections for workspace: ${workspaceId}`);
  
  const sections = await prisma.section.findMany({
    where: { workspaceId, parentId },
    orderBy: { order: 'asc' }
  });

  const updates = sections.map((sec, index) => {
    return prisma.section.update({
      where: { id: sec.id },
      data: { order: (index + 1) * 1000 }
    });
  });

  await prisma.$transaction(updates);
};