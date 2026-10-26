import { Router } from 'express';
import {
  listSmsNotifications,
  getSmsNotificationById,
  retrySmsNotification,
} from './notifications.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

router.get('/sms', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listSmsNotifications);
router.get('/sms/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getSmsNotificationById);
router.post('/sms/:id/retry', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), retrySmsNotification);

export default router;
