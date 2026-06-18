import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceAccess } from '../middleware/workspaceAccess.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { 
  getSections, 
  createSection, 
  updateSection, 
  deleteSection, 
  reorderSection 
} from '../controllers/section.controller.js';

// CRITICAL: mergeParams: true allows us to read the :workspaceId from the parent router!
const router = Router({ mergeParams: true });

// --- Validation Schemas ---
const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  parentId: z.string().optional(),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid hex color").optional()
});

const updateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).optional().nullable(),
  collapsed: z.boolean().optional()
});

const reorderSectionSchema = z.object({
  order: z.number(),
  parentId: z.string().nullable().optional()
});

// --- Routes ---
router.use(requireAuth);

// Anyone in the workspace can view sections
router.get('/', requireWorkspaceAccess('VIEWER'), asyncHandler(getSections));

// Only Editors and Owners can create, edit, reorder, or delete sections
router.post('/', requireWorkspaceAccess('EDITOR'), validate(createSchema), asyncHandler(createSection));
router.put('/:sectionId', requireWorkspaceAccess('EDITOR'), validate(updateSchema), asyncHandler(updateSection));
router.patch('/:sectionId/reorder', requireWorkspaceAccess('EDITOR'), validate(reorderSectionSchema), asyncHandler(reorderSection));
router.delete('/:sectionId', requireWorkspaceAccess('EDITOR'), asyncHandler(deleteSection));

// Export only ONCE at the very bottom
export default router;