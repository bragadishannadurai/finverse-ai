import { Router } from 'express';
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  archiveBudget,
  getBudgetHistory,
  syncBudgetSpending,
} from '../controllers/budgetController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getBudgets);
router.post('/', createBudget);
router.get('/history', getBudgetHistory);
router.post('/sync', syncBudgetSpending);
router.get('/:id', getBudget);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);
router.patch('/:id/archive', archiveBudget);

export default router;
