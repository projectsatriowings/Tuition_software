import { Router } from 'express';
import {
  createExam,
  listExams,
  getExamById,
  enterExamMarks,
  toggleExamPublish,
  getStudentReportCard,
} from './exams.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

router.get('/', listExams);
router.post(
  '/',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  createExam
);
router.get('/:id', getExamById);
router.post(
  '/:id/marks',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  enterExamMarks
);
router.patch(
  '/:id/publish',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  toggleExamPublish
);
router.get(
  '/students/:studentId/report-card',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  getStudentReportCard
);

export default router;
