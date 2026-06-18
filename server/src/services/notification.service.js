import prisma from '../config/db.js';
import { getIo } from '../utils/socket.js';

/**
 * Creates a notification in the database and emits it via WebSockets.
 * * @param {Object} params
 * @param {string} params.userId - The ID of the user receiving the notification
 * @param {string} params.type - Must match NotificationType enum (e.g., 'WORKSPACE_INVITE', 'TASK_ASSIGNED')
 * @param {string} params.message - The text body of the notification
 * @param {string} [params.taskId] - Optional ID of the related task
 */
export const createNotification = async ({ userId, type, message, taskId = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        taskId
      }
    });

    // Emit real-time event to the specific user's socket room
    getIo().to(userId).emit('notification:new', notification);

    return notification;
  } catch (error) {
    console.error("[Notification Service] Failed to create notification:", error);
    // We don't throw the error because notifications should not break the main transaction (e.g., inviting a user shouldn't fail just because the notification failed)
    return null;
  }
};