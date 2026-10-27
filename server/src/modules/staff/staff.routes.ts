import { Router } from 'express';
import {
  listStaff,
  getNextEmployeeCodeHandler,
  createStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  assignStaffBatches,
  resetStaffPassword,
} from './staff.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

// Staff management endpoints (Academic Admin & Super Admin)
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), listStaff);
router.get('/next-code', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), getNextEmployeeCodeHandler);
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createStaff);
router.get('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getStaffById);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateStaff);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateStaffStatus);
router.post('/:id/assignments', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), assignStaffBatches);
router.post('/:id/reset-password', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), resetStaffPassword);

export default router;
