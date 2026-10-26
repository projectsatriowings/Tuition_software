import { Router } from 'express';
import {
  authenticateToken,
  requireRole,
  requireInstituteContext,
} from '../../middleware/auth.js';
import {
  createFeeStructure,
  listFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  assignFeeToStudent,
  assignFeeToBatch,
  listFeeAssignments,
  getFeeAssignmentById,
  getStudentFeeStatement,
  recordPayment,
  listPayments,
  getReceipt,
  processRefund,
  createFeeAdjustment,
  listAdjustments,
  getFinancialSummary,
  getCollectionsReport,
  getOutstandingReport,
} from './fees.controller.js';

const router = Router();

// Apply base authentication and institute context to all fee routes
router.use(authenticateToken);
router.use(requireInstituteContext);

// ============================================================================
// MODULE A: FEE STRUCTURES
// ============================================================================
router.post(
  '/structures',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  createFeeStructure
);
router.get(
  '/structures',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  listFeeStructures
);
router.get(
  '/structures/:id',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  getFeeStructureById
);
router.patch(
  '/structures/:id',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  updateFeeStructure
);

// ============================================================================
// MODULE B: STUDENT FEE ASSIGNMENTS
// ============================================================================
router.post(
  '/assignments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  assignFeeToStudent
);
router.post(
  '/assignments/batch',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  assignFeeToBatch
);
router.get(
  '/assignments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  listFeeAssignments
);
router.get(
  '/assignments/:id',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  getFeeAssignmentById
);
router.get(
  '/students/:studentId/statement',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  getStudentFeeStatement
);

// ============================================================================
// MODULE C & D: PAYMENTS & RECEIPTS
// ============================================================================
router.post(
  '/payments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'),
  recordPayment
);
router.get(
  '/payments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  listPayments
);
router.get(
  '/payments/:id/receipt',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'),
  getReceipt
);

// ============================================================================
// MODULE E: REFUNDS & ADJUSTMENTS (STRICT RBAC: ADMIN ONLY)
// ============================================================================
router.post(
  '/payments/:id/refunds',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  processRefund
);
router.post(
  '/assignments/:id/adjustments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  createFeeAdjustment
);
router.get(
  '/adjustments',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  listAdjustments
);

// ============================================================================
// MODULE F: FINANCIAL REPORTS & DASHBOARD
// ============================================================================
router.get(
  '/reports/summary',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  getFinancialSummary
);
router.get(
  '/reports/collections',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  getCollectionsReport
);
router.get(
  '/reports/outstanding',
  requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'),
  getOutstandingReport
);

export default router;
