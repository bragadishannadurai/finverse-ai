import { Router } from 'express';
import {
  getSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsHistory,
  contributeToGoal,
  configureAutoSave,
  savingsPayNow,
} from '../controllers/savingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSavingsGoals);
router.post('/', createSavingsGoal);
router.get('/history', getSavingsHistory);
router.get('/:id', getSavingsGoal);
router.put('/:id', updateSavingsGoal);
router.delete('/:id', deleteSavingsGoal);
router.post('/:id/contribute', contributeToGoal);
router.post('/:id/auto-pay', configureAutoSave);
router.post('/:id/pay-now', savingsPayNow);

export default router;
