import { Router } from 'express';
import { login, getCurrentUser, changePassword, refreshToken } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);

export default router;
