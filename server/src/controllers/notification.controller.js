import prisma from '../config/db.js';

// GET /notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { read: 'asc' },      // Unread first
        { createdAt: 'desc' } // Newest first
      ],
      take: 50 // Limit to the 50 most recent to ensure fast load times
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// POST /notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.status(200).json(updatedNotification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

// POST /notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        read: false 
      },
      data: { read: true }
    });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};