import { Router } from 'express';
import {
  listStudents,
  admitStudent,
  getAdmissionPrefixInfo,
  getStudentById,
  getMyStudentProfile,
  updateStudent,
  updateStudentStatus,
  resetStudentPassword,
  updateStudentLoginIdentifier,
} from './students.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

// Student management routes
router.get('/admission-prefix', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getAdmissionPrefixInfo);
router.get('/my/profile', requireRole('STUDENT'), getMyStudentProfile);
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listStudents);
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), admitStudent);
router.get('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'), getStudentById);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), updateStudent);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), updateStudentStatus);

// Student credential management routes
router.post('/:id/reset-password', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), resetStudentPassword);
router.patch('/:id/account-identifier', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), updateStudentLoginIdentifier);

export default router;

