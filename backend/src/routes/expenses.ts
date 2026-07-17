import { Router } from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  uploadExpenseReceipt,
} from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { uploadDocument } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getExpenses);
router.post('/', createExpense);
router.get('/stats/summary', getExpenseSummary);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
router.post('/:id/receipt', uploadDocument.single('receipt'), uploadExpenseReceipt);

export default router;
