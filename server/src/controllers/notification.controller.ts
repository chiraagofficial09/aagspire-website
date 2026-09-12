import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Notification } from '../models/Notification.js';

function getUserFilter(req: AuthenticatedRequest) {
  const userId = req.user!._id;
  const role = req.user!.role;

  if (role === 'admin') {
    return {
      $or: [
        { recipient: userId },
        { role: { $in: ['admin', 'all'] } },
      ],
    };
  }

  return {
    $or: [
      { recipient: userId },
      { role: { $in: ['employee', 'all'] } },
    ],
  };
}

export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const filter = getUserFilter(req);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found.' });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const filter = getUserFilter(req);
    await Notification.updateMany({ ...filter, isRead: false }, { isRead: true });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function clearReadNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const filter = getUserFilter(req);
    await Notification.deleteMany({ ...filter, isRead: true });

    res.json({ success: true, message: 'Read notifications cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
