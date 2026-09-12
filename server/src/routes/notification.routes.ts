import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/clear-read', clearReadNotifications);

export default router;
