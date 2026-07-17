import { Router } from 'express';
import {
  getChats,
  createChat,
  getChat,
  sendMessage,
  getInsights,
  deleteChat,
  getInvestmentAdvice,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/chats', getChats);
router.post('/chats', createChat);
router.get('/insights', getInsights);
router.get('/chats/:id', getChat);
router.post('/chats/:id/message', sendMessage);
router.delete('/chats/:id', deleteChat);
router.get('/investment-advice', getInvestmentAdvice);

export default router;
