import { Router } from 'express';
import {
  listSmsNotifications,
  getSmsNotificationById,
  retrySmsNotification,
  listInAppNotifications,
  markInAppNotificationRead,
  markAllInAppNotificationsRead,
} from './notifications.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// In-app notifications (all authenticated users)
router.get('/in-app', listInAppNotifications);
router.patch('/in-app/:id/read', markInAppNotificationRead);
router.post('/in-app/mark-all-read', markAllInAppNotificationsRead);

// Institute SMS outbox (staff and admin only)
router.use(requireInstituteContext);
router.get('/sms', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listSmsNotifications);
router.get('/sms/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getSmsNotificationById);
router.post('/sms/:id/retry', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), retrySmsNotification);

export default router;

