import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess.js'; 
import { asyncHandler } from '../utils/asyncHandler.js';
import { 
  getWorkspaces, createWorkspace, getWorkspaceById, 
  updateWorkspace, deleteWorkspace,
  inviteMember, updateMemberRole, removeMember,
  getWorkspaceTags
} from '../controllers/workspace.controller.js';
import sectionRoutes from './section.routes.js'; 

const router = Router();

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  description: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']).optional()
});

const roleSchema = z.object({
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER'])
});

// All routes require the user to be logged in
router.use(requireAuth);

router.get('/', asyncHandler(getWorkspaces));
router.post('/', validate(workspaceSchema), asyncHandler(createWorkspace));

// --- Upgraded Route Permissions ---

// Needs base access (VIEWER)
router.get('/:id', requireWorkspaceAccess('VIEWER'), asyncHandler(getWorkspaceById));
router.get('/:id/tags', requireWorkspaceAccess('VIEWER'), asyncHandler(getWorkspaceTags));

// Needs EDITOR level or higher to invite or update
router.put('/:id', requireWorkspaceAccess('EDITOR'), validate(workspaceSchema), asyncHandler(updateWorkspace));
router.post('/:id/invites', requireWorkspaceAccess('EDITOR'), validate(inviteSchema), asyncHandler(inviteMember)); // <-- Changed to /invites

// Needs OWNER level to delete workspace or change roles
router.delete('/:id', requireWorkspaceAccess('OWNER'), asyncHandler(deleteWorkspace));
router.patch('/:id/members/:userId', requireWorkspaceAccess('OWNER'), validate(roleSchema), asyncHandler(updateMemberRole)); // <-- Changed to PATCH

// Remove handles its own internal logic, but requires basic entry access
router.delete('/:id/members/:userId', requireWorkspaceAccess('VIEWER'), asyncHandler(removeMember));

// Mount section routes
router.use('/:workspaceId/sections', sectionRoutes);

// Export only ONCE at the very bottom
export default router;

router.get('/:id/archive', requireWorkspaceAccess('VIEWER'), asyncHandler(getArchivedTasks));

