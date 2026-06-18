import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError.js';
import { rebalanceSectionTasks } from '../services/rebalance.service.js';
import { broadcastToWorkspace } from '../utils/socket.js';
import { fileTypeFromBuffer } from 'file-type';
import NodeClam from 'clamscan';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { Readable } from 'stream';
import { rrulestr } from 'rrule'; // <-- Added RRULE for parsing recurrences

const prisma = new PrismaClient();

// --- Global ClamAV Initialization ---
let clamscanner = null;
new NodeClam().init({
  clamdscan: { host: '127.0.0.1', port: 3310, active: true, timeout: 60000 }
}).then(scanner => {
  clamscanner = scanner;
  console.log("[ClamAV] Scanner initialized successfully.");
}).catch(err => {
  console.warn("[ClamAV] Daemon not found. Virus scanning will be bypassed during development.");
});

// --- Security Helpers ---
const verifySectionAccess = async (sectionId, userId) => {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw new ApiError(404, "Section not found");

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: section.workspaceId, userId } }
  });
  
  if (!member) throw new ApiError(403, "Forbidden: You are not a member of this workspace");
  return { section, member };
};

const verifyTaskAccess = async (taskId, userId) => {
  const task = await prisma.task.findUnique({ 
    where: { id: taskId }, 
    include: { section: true } 
  });
  if (!task) throw new ApiError(404, "Task not found");

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.section.workspaceId, userId } }
  });
  
  if (!member) throw new ApiError(403, "Forbidden: You are not a member of this workspace");
  return { task, member };
};

// --- Controllers ---

// GET /search
export const searchTasks = async (req, res) => {
  const { q, workspaceId, tags, status, priority, dueBefore, dueAfter } = req.query;
  const userId = req.user.id;

  if (workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });
    if (!member) throw new ApiError(403, "Forbidden");
  }

  const tasks = await prisma.task.findMany({
    where: {
      section: workspaceId ? { workspaceId } : { workspace: { members: { some: { userId } } } },
      title: q ? { search: q.split(' ').join(' & ') } : undefined,
      tags: tags ? { hasEvery: tags.split(',') } : undefined,
      status: status || undefined,
      priority: priority || undefined,
      dueDate: {
        lte: dueBefore ? new Date(dueBefore) : undefined,
        gte: dueAfter ? new Date(dueAfter) : undefined,
      },
      isArchived: false
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  res.status(200).json(tasks);
};

// POST /tasks/:id/links
export const linkTask = async (req, res) => {
  const { taskId: sourceId } = req.params;
  const { targetId } = req.body;

  const [source, target] = await Promise.all([
    prisma.task.findUnique({ where: { id: sourceId } }),
    prisma.task.findUnique({ where: { id: targetId } })
  ]);
  if (!source || !target) throw new ApiError(404, "One or both tasks not found");

  await verifyTaskAccess(sourceId, req.user.id);

  const link = await prisma.taskLink.create({
    data: { sourceId, targetId }
  });

  res.status(201).json(link);
};

// GET /tasks/:id/links
export const getTaskLinks = async (req, res) => {
  const { taskId } = req.params;

  const links = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      linksTo: { include: { target: true } },
      linkedFrom: { include: { source: true } }
    }
  });

  res.status(200).json(links);
};

// GET /tasks/smart?view=today|upcoming
export const getSmartTasks = async (req, res) => {
  const { view } = req.query;
  const userId = req.user.id;

  if (!['today', 'upcoming'].includes(view)) {
    throw new ApiError(400, "Invalid view parameter.");
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const upcomingEnd = new Date(todayStart);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  const dateFilter = view === 'today' 
    ? { gte: todayStart, lt: todayEnd } 
    : { gte: todayEnd, lt: upcomingEnd };

  const userMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true }
  });
  const workspaceIds = userMemberships.map(m => m.workspaceId);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: dateFilter,
      isArchived: false,
      section: { workspaceId: { in: workspaceIds } }
    },
    include: {
      section: {
        include: { workspace: { select: { id: true, name: true, color: true } } }
      }
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }]
  });

  res.status(200).json(tasks);
};

// GET /sections/:sectionId/tasks
export const getTasksBySection = async (req, res) => {
  const { sectionId } = req.params;
  await verifySectionAccess(sectionId, req.user.id);
  const tasks = await prisma.task.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
    include: { assignee: { select: { id: true, displayName: true, avatarUrl: true } } }
  });
  res.status(200).json(tasks);
};

// POST /sections/:sectionId/tasks
export const createTask = async (req, res) => {
  const { sectionId } = req.params;
  const { title, priority, dueDate, tags, isRecurring, recurRule } = req.body;
  const { section, member } = await verifySectionAccess(sectionId, req.user.id);
  
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot create tasks");

  const siblings = await prisma.task.findMany({
    where: { sectionId },
    orderBy: { order: 'desc' },
    take: 1
  });
  const order = siblings.length > 0 ? siblings[0].order + 1000 : 1000;

  const task = await prisma.task.create({
    data: { 
      sectionId, 
      title, 
      priority, 
      dueDate, 
      tags: tags || [], 
      isRecurring: isRecurring || false,
      recurRule,
      order, 
      createdById: req.user.id 
    }
  });

  broadcastToWorkspace(section.workspaceId, 'task:created', task, req.headers['x-socket-id']);
  res.status(201).json(task);
};

// PUT /tasks/:taskId
export const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, body, status, priority, dueDate, tags, sectionId, assigneeId, isRecurring, recurRule } = req.body;
  
  const { task: originalTask, member } = await verifyTaskAccess(taskId, req.user.id);
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot edit tasks");
  if (sectionId) await verifySectionAccess(sectionId, req.user.id);

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { title, body, status, priority, dueDate, tags, sectionId, assigneeId, isRecurring, recurRule },
    include: { section: true }
  });

  broadcastToWorkspace(task.section.workspaceId, 'task:updated', task, req.headers['x-socket-id']);

  // --- RECURRENCE LOGIC ---
  // If the task was just marked DONE, and it is a recurring task with a valid rule and due date
  if (originalTask.status !== 'DONE' && status === 'DONE' && task.isRecurring && task.recurRule && task.dueDate) {
    try {
      const rule = rrulestr(task.recurRule);
      const nextDate = rule.after(new Date(task.dueDate)); // Calculate next date strictly after current due date

      if (nextDate) {
        const newTask = await prisma.task.create({
          data: {
            sectionId: task.sectionId,
            title: task.title,
            body: task.body,
            priority: task.priority,
            tags: task.tags,
            isRecurring: true,
            recurRule: task.recurRule,
            dueDate: nextDate,
            order: task.order + 10, // Place it right below the original task
            createdById: req.user.id,
            assigneeId: task.assigneeId
          }
        });
        
        broadcastToWorkspace(task.section.workspaceId, 'task:created', newTask, req.headers['x-socket-id']);
      }
    } catch (err) {
      console.error("[Recurrence] Failed to parse RRULE or spawn next task:", err);
    }
  }

  res.status(200).json(task);
};

// DELETE /tasks/:taskId
export const deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const { task, member } = await verifyTaskAccess(taskId, req.user.id);
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot delete tasks");

  await prisma.task.delete({ where: { id: taskId } });
  broadcastToWorkspace(task.section.workspaceId, 'task:deleted', { id: taskId, sectionId: task.sectionId }, req.headers['x-socket-id']);
  res.status(200).json({ message: "Task deleted successfully" });
};

// PATCH /tasks/:taskId/archive
export const archiveTask = async (req, res) => {
  const { taskId } = req.params;
  const { task, member } = await verifyTaskAccess(taskId, req.user.id);
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot archive tasks");

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { isArchived: !task.isArchived },
    include: { section: true }
  });

  broadcastToWorkspace(updatedTask.section.workspaceId, 'task:updated', updatedTask, req.headers['x-socket-id']);
  res.status(200).json(updatedTask);
};

// PATCH /tasks/:taskId/reorder
export const reorderTask = async (req, res) => {
  const { taskId } = req.params;
  const { sectionId, order } = req.body;
  const { task, member } = await verifyTaskAccess(taskId, req.user.id);
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot reorder tasks");

  if (sectionId && sectionId !== task.sectionId) {
    const sectionCheck = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!sectionCheck || sectionCheck.workspaceId !== member.workspaceId) throw new ApiError(403, "Invalid destination section");
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { order, sectionId: sectionId || task.sectionId },
    include: { section: true }
  });

  broadcastToWorkspace(updatedTask.section.workspaceId, 'task:updated', updatedTask, req.headers['x-socket-id']);

  const decimalPart = order.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 5) rebalanceSectionTasks(updatedTask.sectionId).catch(console.error);

  res.status(200).json(updatedTask);
};

// POST /tasks/:taskId/attachments
export const uploadAttachment = async (req, res) => {
  const { taskId } = req.params;
  const file = req.file;
  if (!file) throw new ApiError(400, "No file uploaded");

  const { task, member } = await verifyTaskAccess(taskId, req.user.id);
  if (member.role === 'VIEWER') throw new ApiError(403, "Viewers cannot upload attachments");

  const fileTypeInfo = await fileTypeFromBuffer(file.buffer);
  if (!fileTypeInfo) throw new ApiError(400, "Could not determine secure file type.");

  if (clamscanner) {
    try {
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      const { isInfected } = await clamscanner.scanStream(stream);
      if (isInfected) throw new ApiError(400, "Malware detected!");
    } catch (error) { if (error instanceof ApiError) throw error; }
  }

  const cloudRes = await new Promise((resolve, reject) => {
    const cld = cloudinary.uploader.upload_stream({ folder: `ws_${task.section.workspaceId}`, resource_type: 'auto' }, (e, r) => e ? reject(e) : resolve(r));
    streamifier.createReadStream(file.buffer).pipe(cld);
  });

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      type: cloudRes.resource_type === 'image' ? 'IMAGE' : 'FILE',
      url: cloudRes.secure_url,
      filename: file.originalname,
      mimeType: fileTypeInfo.mime,
      sizeBytes: file.size
    }
  });

  broadcastToWorkspace(task.section.workspaceId, 'task:updated', task, req.headers['x-socket-id']);
  res.status(201).json(attachment);
};

// DELETE /attachments/:attachmentId
export const deleteAttachment = async (req, res) => {
  const { attachmentId } = req.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { include: { section: true } } }
  });

  if (!attachment) throw new ApiError(404, "Attachment not found");

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { 
      workspaceId: attachment.task.section.workspaceId, 
      userId: req.user.id 
    }}
  });

  if (!member || member.role === 'VIEWER') {
    throw new ApiError(403, "You do not have permission to delete this attachment");
  }

  if (attachment.metadata && attachment.metadata.publicId) {
    try {
      await cloudinary.uploader.destroy(attachment.metadata.publicId);
    } catch (error) {
      console.error("[Cloudinary] Delete failed:", error);
    }
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });

  broadcastToWorkspace(
    attachment.task.section.workspaceId,
    'attachment:deleted',
    { attachmentId, taskId: attachment.taskId },
    req.headers['x-socket-id']
  );

  res.status(200).json({ message: "Attachment deleted successfully" });
};

// GET /workspaces/:workspaceId/archive
export const getArchivedTasks = async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  // Verify workspace access
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  });
  if (!member) throw new ApiError(403, "Forbidden");

  const archivedTasks = await prisma.task.findMany({
    where: {
      section: { workspaceId },
      isArchived: true
    },
    include: {
      section: { select: { name: true } },
      assignee: { select: { displayName: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.status(200).json(archivedTasks);
};