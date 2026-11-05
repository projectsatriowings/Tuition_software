import { Router } from 'express';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';
import {
  listBranches,
  getBranchDetails,
  createBranch,
  updateBranch,
  checkDeactivationSafety,
  deactivateBranch,
  reactivateBranch,
  assignStaff,
  removeStaffAssignment,
  checkScheduleConflict,
  transferStudent,
  getConsolidatedSummary,
} from './branches.controller.js';

const router = Router();

// All branch routes require an authenticated user with an active institute context
router.use(authenticateToken);
router.use(requireInstituteContext);

// 1. Consolidated summary overview
router.get('/summary', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getConsolidatedSummary);

// 2. Schedule conflict checker
router.get('/staff/:staffProfileId/schedule-conflict', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), checkScheduleConflict);

// 3. Student branch transfer
router.post('/students/transfer', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), transferStudent);

// 4. Staff branch assignment management
router.delete('/staff-assignments/:assignmentId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), removeStaffAssignment);

// 5. Branch CRUD & Operations
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listBranches);
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createBranch);

router.get('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getBranchDetails);
router.put('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateBranch);

router.get('/:id/deactivation-safety', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), checkDeactivationSafety);
router.post('/:id/deactivate', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), deactivateBranch);
router.post('/:id/reactivate', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), reactivateBranch);

router.post('/:id/staff', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), assignStaff);

export default router;

