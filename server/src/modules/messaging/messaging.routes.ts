import { Router } from 'express';
import {
  getOrCreateConversation,
  listUserConversations,
  getConversationMessages,
  sendMessage,
} from './messaging.controller.js';
import { authenticateToken, requireInstituteContext } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireInstituteContext);

router.get('/conversations', listUserConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:id/messages', getConversationMessages);
router.post('/conversations/:id/messages', sendMessage);

export default router;
