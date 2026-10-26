import { Router } from 'express';
import {
  createFeedback,
  getStudentFeedback,
  updateFeedback,
} from './progress.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  createFeedback
);
router.get(
  '/students/:studentId',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  getStudentFeedback
);
router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  updateFeedback
);

export default router;
