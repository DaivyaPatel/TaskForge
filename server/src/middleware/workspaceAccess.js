import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 1. Define the role hierarchy using numeric values for easy >= comparisons
const ROLE_HIERARCHY = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
  MEMBER: 1 // Treating MEMBER and VIEWER as the same base level
};

export const requireWorkspaceAccess = (requiredRole = 'VIEWER') => async (req, res, next) => {
  try {
    const userId = req.user.id; // This is already verified by requireAuth
    
    // Support routes like /workspaces/:id AND /workspaces/:workspaceId/tasks
    const workspaceId = req.params.workspaceId || req.params.id; 

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    // 2. Query the database to ensure the role is always fresh and accurate
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId }
      }
    });

    if (!member) {
      return res.status(403).json({ error: "Forbidden: You are not a member of this workspace" });
    }

    // 3. Check role >= required
    const userLevel = ROLE_HIERARCHY[member.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: `Forbidden: Requires ${requiredRole} access or higher` });
    }

    // 4. Attach the data exactly as requested by the ticket
    req.user.workspaceId = member.workspaceId;
    req.user.workspaceRole = member.role;

    next();
  } catch (error) {
    next(error);
  }
};