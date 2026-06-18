import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { 
  getTasksBySection, 
  createTask, 
  updateTask, 
  deleteTask, 
  archiveTask, 
  reorderTask,
  getSmartTasks,
  uploadAttachment,
  linkTask,
  getTaskLinks,
  deleteAttachment,
  searchTasks // <-- Imported new search controller
} from '../controllers/task.controller.js';

const router = Router();

// --- Multer Configuration ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// --- Validation Schemas ---
const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.any().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
  sectionId: z.string().optional(),
  assigneeId: z.string().optional().nullable()
});

const reorderTaskSchema = z.object({
  order: z.number(),
  sectionId: z.string().optional()
});

// --- Routes ---
// All routes require authentication
router.use(requireAuth);

// --- Global / Cross-Workspace Routes ---
router.get('/tasks/smart', asyncHandler(getSmartTasks));
router.get('/search', asyncHandler(searchTasks)); // <-- New TF-048 Search Route

// --- Section-scoped task routes ---
router.get('/sections/:sectionId/tasks', asyncHandler(getTasksBySection));
router.post('/sections/:sectionId/tasks', validate(createTaskSchema), asyncHandler(createTask));

// --- Direct task routes ---
router.put('/tasks/:taskId', validate(updateTaskSchema), asyncHandler(updateTask));
router.delete('/tasks/:taskId', asyncHandler(deleteTask));
router.patch('/tasks/:taskId/archive', asyncHandler(archiveTask));
router.patch('/tasks/:taskId/reorder', validate(reorderTaskSchema), asyncHandler(reorderTask));

// --- Task Linking Routes ---
router.post('/tasks/:taskId/links', asyncHandler(linkTask));
router.get('/tasks/:taskId/links', asyncHandler(getTaskLinks));

// --- Attachment Routes ---
router.post('/tasks/:taskId/attachments', upload.single('file'), asyncHandler(uploadAttachment));
router.delete('/attachments/:attachmentId', asyncHandler(deleteAttachment));

export default router;