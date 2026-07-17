import { Router } from 'express';
import {
  getTransactions,
  getTransaction,
  getTransactionStats,
} from '../controllers/transactionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', getTransaction);

export default router;
