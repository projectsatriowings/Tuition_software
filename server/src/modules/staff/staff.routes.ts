import { Router } from 'express';
import {
  listStaff,
  createStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
  assignStaffBatches,
} from './staff.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

// Staff management endpoints (Academic Admin & Super Admin)
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), listStaff);
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createStaff);
router.get('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getStaffById);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateStaff);
router.patch('/:id/status', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateStaffStatus);
router.post('/:id/assignments', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), assignStaffBatches);

export default router;
