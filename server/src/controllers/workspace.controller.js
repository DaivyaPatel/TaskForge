import { PrismaClient } from '@prisma/client';
import { getIo } from '../utils/socket.js';
import { ApiError } from '../utils/apiError.js';
import { createNotification } from '../services/notification.service.js'; // <-- NEW IMPORT

const prisma = new PrismaClient();

// GET /workspaces -> Member-scoped
export const getWorkspaces = async (req, res) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: req.user.id } }
    },
    include: {
      _count: { select: { members: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.status(200).json(workspaces);
};

// POST /workspaces
export const createWorkspace = async (req, res) => {
  const { name, description } = req.body;
  
  const workspace = await prisma.$transaction(async (tx) => {
    const newWs = await tx.workspace.create({
      data: { name, description }
    });

    await tx.workspaceMember.create({
      data: {
        userId: req.user.id,
        workspaceId: newWs.id,
        role: 'OWNER'
      }
    });

    return newWs;
  });

  res.status(201).json(workspace);
};

// GET /workspaces/:id -> With members
export const getWorkspaceById = async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } }
      }
    }
  });

  if (!workspace) return res.status(404).json({ error: "Workspace not found" });
  res.status(200).json(workspace);
};

// PUT /workspaces/:id -> EDITOR+
export const updateWorkspace = async (req, res) => {
  const { name, description } = req.body;
  const workspace = await prisma.workspace.update({
    where: { id: req.params.id },
    data: { name, description }
  });
  
  res.status(200).json(workspace);
};

// DELETE /workspaces/:id -> OWNER
export const deleteWorkspace = async (req, res) => {
  const { id } = req.params;

  const workspace = await prisma.workspace.findUnique({ where: { id } });
  await prisma.workspace.delete({ where: { id } });

  if (workspace?.logoPublicId) {
    console.log(`[Background Task] Cleaning up Cloudinary image: ${workspace.logoPublicId}`);
  }

  res.status(200).json({ message: "Workspace deleted successfully" });
};

// POST /workspaces/:id/members -> Invite by email
export const inviteMember = async (req, res) => {
  const { id: workspaceId } = req.params;
  const { email, role = 'VIEWER' } = req.body;

  // 1. Verify requesting user's permission level
  const requestor = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
    include: { workspace: true } // <-- Added to get workspace name for the notification
  });

  if (!requestor || requestor.role === 'VIEWER') {
    return res.status(403).json({ error: "Forbidden: You do not have permission to invite members" });
  }

  // Enforcement: EDITOR can ONLY invite VIEWERS
  if (requestor.role === 'EDITOR' && role !== 'VIEWER') {
    return res.status(403).json({ error: "Forbidden: Editors can only invite Viewers" });
  }

  // 2. Find the user by email
  const userToInvite = await prisma.user.findUnique({ where: { email } });
  if (!userToInvite) {
    return res.status(404).json({ error: "User with this email not found" });
  }

  // 3. Add them to the workspace
  try {
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userToInvite.id,
        role
      },
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } }
    });
    
    // --- NEW: Trigger In-App Notification ---
    await createNotification({
      userId: userToInvite.id,
      type: 'WORKSPACE_INVITE',
      message: `You have been invited to join the workspace "${requestor.workspace.name}"`
    });

    res.status(201).json(member);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "User is already a member of this workspace" });
    }
    throw error;
  }
};

// PATCH/PUT /workspaces/:id/members/:memberId -> Role change (OWNER only)
export const updateMemberRole = async (req, res) => {
  const { id: workspaceId, userId: memberParam } = req.params;
  const { role } = req.body;

  if (!['OWNER', 'EDITOR', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  // 1. Verify requesting user is the OWNER
  const requestor = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } }
  });

  if (!requestor || requestor.role !== 'OWNER') {
    return res.status(403).json({ error: "Forbidden: Only owners can modify member roles" });
  }

  // 2. Resolve targeted member row safely via ID or combined unique keys
  const targetMember = await prisma.workspaceMember.findFirst({
    where: {
      OR: [
        { id: memberParam },
        { AND: [{ workspaceId }, { userId: memberParam }] }
      ]
    }
  });

  if (!targetMember) return res.status(404).json({ error: "Member record not found" });

  const updatedMember = await prisma.workspaceMember.update({
    where: { id: targetMember.id },
    data: { role }
  });

  res.status(200).json(updatedMember);
};

// DELETE /workspaces/:id/members/:memberId -> Remove / Leave
export const removeMember = async (req, res) => {
  const { id: workspaceId, userId: memberParam } = req.params;
  const requestingUserId = req.user.id;

  // 1. Fetch requestor and target configuration
  const [requestor, targetMember] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requestingUserId } }
    }),
    prisma.workspaceMember.findFirst({
      where: {
        OR: [
          { id: memberParam },
          { AND: [{ workspaceId }, { userId: memberParam }] }
        ]
      }
    })
  ]);

  if (!requestor) return res.status(403).json({ error: "Forbidden" });
  if (!targetMember) return res.status(404).json({ error: "Member not found" });

  const isSelfLeaving = targetMember.userId === requestingUserId;

  // 2. Check strict permissions if it's not a self-initiated leave
  if (!isSelfLeaving) {
    if (requestor.role === 'VIEWER') {
      return res.status(403).json({ error: "Forbidden: Viewers cannot remove members" });
    }
    if (requestor.role === 'EDITOR' && targetMember.role !== 'VIEWER') {
      return res.status(403).json({ error: "Forbidden: Editors can only remove Viewers" });
    }
  }

  // 3. Delete the member record
  await prisma.workspaceMember.delete({
    where: { id: targetMember.id }
  });

  // 4. Dispatch real-time eviction event
  getIo().to(targetMember.userId).emit('workspace:kicked', { workspaceId });

  res.status(200).json({ message: "Member removed successfully" });
};

// GET /workspaces/:id/tags -> Get all unique tags used in a workspace
export const getWorkspaceTags = async (req, res) => {
  const { id: workspaceId } = req.params;

  const tasks = await prisma.task.findMany({
    where: {
      section: {
        workspaceId: workspaceId
      }
    },
    select: {
      tags: true
    }
  });

  const allTags = tasks.flatMap(task => task.tags || []);
  const uniqueTags = [...new Set(allTags)].sort();

  res.status(200).json(uniqueTags);
};