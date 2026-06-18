import { PrismaClient } from '@prisma/client';
import { rebalanceWorkspaceSections } from '../services/rebalance.service.js';
import { broadcastToWorkspace } from '../utils/socket.js';

const prisma = new PrismaClient();

// Helper function to turn a flat array of sections into a nested Tree structure
const buildTree = (sections, parentId = null) => {
  return sections
    .filter(sec => sec.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(sec => ({
      ...sec,
      children: buildTree(sections, sec.id)
    }));
};

// GET /workspaces/:workspaceId/sections -> Full tree
export const getSections = async (req, res) => {
  const { workspaceId } = req.params;
  
  const sections = await prisma.section.findMany({
    where: { workspaceId },
    orderBy: { order: 'asc' }
  });

  const tree = buildTree(sections);
  res.status(200).json(tree);
};

// POST /workspaces/:workspaceId/sections
export const createSection = async (req, res) => {
  const { workspaceId } = req.params;
  const { title, parentId, color } = req.body;

  let depth = 0;
  let order = 1000; // Default gap for fractional indexing

  if (parentId) {
    const parent = await prisma.section.findUnique({ where: { id: parentId } });
    if (!parent) return res.status(404).json({ error: "Parent section not found" });
    
    // Enforce Depth <= 10
    if (parent.depth >= 10) return res.status(400).json({ error: "Maximum nesting depth of 10 reached" });
    depth = parent.depth + 1;
  }

  // Fractional indexing: Find the current highest order among its siblings
  const siblings = await prisma.section.findMany({
    where: { workspaceId, parentId: parentId || null },
    orderBy: { order: 'desc' },
    take: 1
  });

  // If siblings exist, add 1000 to the highest order so we leave room to drag-and-drop between them later
  if (siblings.length > 0) {
    order = siblings[0].order + 1000; 
  }

  const section = await prisma.section.create({
    data: {
      workspaceId,
      parentId: parentId || null,
      title,
      color,
      order,
      depth
    }
  });

  // BROADCAST: Notice we use the actual `section` variable here
  broadcastToWorkspace(
    workspaceId, 
    'section:created', 
    section, 
    req.headers['x-socket-id']
  );

  res.status(201).json(section);
};

// PUT /workspaces/:workspaceId/sections/:sectionId
export const updateSection = async (req, res) => {
  const { sectionId } = req.params;
  const { title, color, collapsed } = req.body;

  const section = await prisma.section.update({
    where: { id: sectionId },
    data: { title, color, collapsed }
  });

  // BROADCAST: Notice we use `section.workspaceId` and `section`
  broadcastToWorkspace(
    section.workspaceId, 
    'section:updated', 
    section, 
    req.headers['x-socket-id']
  );

  res.status(200).json(section);
};

// DELETE /workspaces/:workspaceId/sections/:sectionId
export const deleteSection = async (req, res) => {
  const { sectionId } = req.params;

  // We need to fetch the section BEFORE deleting it so we know which workspace to broadcast to
  const existingSection = await prisma.section.findUnique({ where: { id: sectionId } });
  
  if (!existingSection) {
    return res.status(404).json({ error: "Section not found" });
  }

  // Manual recursive delete to safely wipe out all nested children
  const deleteRecursive = async (id) => {
    const children = await prisma.section.findMany({ where: { parentId: id } });
    for (const child of children) {
      await deleteRecursive(child.id); // Delete children first
    }
    // Delete the parent section. 
    // (Tasks inside the section are automatically cascade-deleted by Prisma)
    await prisma.section.delete({ where: { id } }); 
  };

  await deleteRecursive(sectionId);

  // BROADCAST
  broadcastToWorkspace(
    existingSection.workspaceId, 
    'section:deleted', 
    { id: sectionId }, 
    req.headers['x-socket-id']
  );

  res.status(200).json({ message: "Section and all nested items deleted successfully" });
};

// PATCH /workspaces/:workspaceId/sections/:sectionId/reorder
export const reorderSection = async (req, res) => {
  const { workspaceId, sectionId } = req.params;
  const { order, parentId } = req.body;

  // Prisma needs `null` to represent top-level, not `undefined`
  const targetParentId = parentId === undefined ? undefined : (parentId || null);

  const updatedSection = await prisma.section.update({
    where: { id: sectionId },
    data: { 
      order,
      ...(targetParentId !== undefined && { parentId: targetParentId })
    }
  });

  // BROADCAST: Moving a section is just an update to the rest of the room
  broadcastToWorkspace(
    updatedSection.workspaceId, 
    'section:updated', 
    updatedSection, 
    req.headers['x-socket-id']
  );

  const decimalPart = order.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 5) {
    // Fire and forget
    rebalanceWorkspaceSections(workspaceId, updatedSection.parentId).catch(console.error);
  }

  res.status(200).json(updatedSection);
};