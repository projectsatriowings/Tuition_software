import { Router } from 'express';
import {
  listParents,
  createParent,
  linkGuardianToStudent,
  revokeGuardianLink,
  getMyChildren,
  resetParentPassword,
  updateParentLoginIdentifier,
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

// Parent credential management by authorized staff/admin
router.post('/:parentId/reset-password', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), resetParentPassword);
router.patch('/:parentId/account-identifier', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), updateParentLoginIdentifier);

// Student guardian linking endpoints
router.post('/students/:studentId/guardians', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), linkGuardianToStudent);
router.delete('/students/:studentId/guardians/:parentId', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN'), revokeGuardianLink);

export default router;

