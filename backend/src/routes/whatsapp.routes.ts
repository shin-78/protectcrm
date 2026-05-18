import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  connectWhatsapp, getSessionStatus, disconnectWhatsapp,
  getConversations, getMessages, sendMessage, handleWebhook,
  linkConversationToLead,
} from '../controllers/whatsapp.controller';

const router = Router();

// Webhook (no auth - called by Evolution API)
router.post('/webhook/:userId', handleWebhook);

// Authenticated routes
router.use(authenticate);
router.post('/connect', connectWhatsapp);
router.get('/status', getSessionStatus);
router.post('/disconnect', disconnectWhatsapp);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/send', sendMessage);
router.post('/conversations/link', linkConversationToLead);

export default router;
