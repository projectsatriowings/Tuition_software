import { Router } from 'express';
import {
  createReview,
  listReviews,
  replyToReview,
} from './reviews.controller.js';
import { authenticateToken, requireRole, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

router.post('/', requireRole('PARENT'), createReview);
router.get('/', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF', 'PARENT'), listReviews);
router.patch('/:id/reply', requireRole('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'STAFF'), replyToReview);

export default router;
