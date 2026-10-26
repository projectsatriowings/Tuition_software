import { Router } from 'express';
import {
  listParents,
  createParent,
  linkGuardianToStudent,
  revokeGuardianLink,
  getMyChildren,
} from './parents.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Parent's own linked children endpoint
router.get('/my/children', getMyChildren);

// Institute-scoped parent management
router.use(requireInstituteContext);
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), listParents);
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), createParent);

// Student guardian linking endpoints
router.post('/students/:studentId/guardians', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), linkGuardianToStudent);
router.delete('/students/:studentId/guardians/:parentId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), revokeGuardianLink);

export default router;
