import { Router } from 'express';
import {
  listInstitutes,
  createInstitute,
  getInstituteById,
  updateInstitute,
  updateInstituteStatus,
  getDashboardSummary,
} from './institutes.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

// Dashboard summary (Super Admin gets platform metrics, Academic Admin gets institute-scoped metrics)
router.get('/dashboard/summary', authenticateToken, requireInstituteContext, getDashboardSummary);

// Institute CRUD
router.get('/', authenticateToken, requireRole('SUPER_ADMIN'), listInstitutes);
router.post('/', authenticateToken, requireRole('SUPER_ADMIN'), createInstitute);
router.get('/:id', authenticateToken, requireInstituteContext, getInstituteById);
router.patch('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), requireInstituteContext, updateInstitute);
router.patch('/:id/status', authenticateToken, requireRole('SUPER_ADMIN'), updateInstituteStatus);

export default router;
