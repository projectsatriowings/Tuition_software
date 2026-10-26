import { Router } from 'express';
import {
  listBatches,
  createBatch,
  listSubjects,
  createSubject,
} from './academics.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

// Batch endpoints
router.get('/batches', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'), listBatches);
router.post('/batches', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createBatch);

// Subject endpoints
router.get('/subjects', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT', 'STUDENT'), listSubjects);
router.post('/subjects', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), createSubject);

export default router;
