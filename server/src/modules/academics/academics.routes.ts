import { Router } from 'express';
import {
  listBatches,
  getBatchDetails,
  createBatch,
  updateBatch,
  toggleBatchStatus,
  assignSubjectsToBatch,
  removeSubjectFromBatch,
  assignStaffToBatch,
  removeStaffFromBatch,
  enrollStudentInBatch,
  unenrollStudentFromBatch,
  listInstituteStaff,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from './academics.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

// Staff helper for dropdown assignment
router.get('/staff', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listInstituteStaff);

// Batch endpoints
router.get('/batches', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'), listBatches);
router.get('/batches/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), getBatchDetails);
router.post('/batches', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createBatch);
router.put('/batches/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateBatch);
router.patch('/batches/:id/status', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), toggleBatchStatus);

// Batch Curriculum (Subjects)
router.post('/batches/:id/subjects', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), assignSubjectsToBatch);
router.delete('/batches/:id/subjects/:subjectId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), removeSubjectFromBatch);

// Batch Staff Faculty
router.post('/batches/:id/staff', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), assignStaffToBatch);
router.delete('/batches/:id/staff/:staffProfileId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), removeStaffFromBatch);

// Batch Student Enrollment & Roster
router.post('/batches/:id/enroll', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), enrollStudentInBatch);
router.delete('/batches/:id/enroll/:studentId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), unenrollStudentFromBatch);

// Subject endpoints
router.get('/subjects', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'), listSubjects);
router.post('/subjects', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createSubject);
router.put('/subjects/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), updateSubject);
router.delete('/subjects/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), deleteSubject);

export default router;
