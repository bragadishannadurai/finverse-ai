import { Router } from 'express';
import {
  getInvestments,
  getInvestment,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestmentSummary,
  getInvestmentHistory,
  archiveInvestment,
  configureAutoPay,
  payNow,
} from '../controllers/investmentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getInvestments);
router.post('/', createInvestment);
router.get('/summary', getInvestmentSummary);
router.get('/history', getInvestmentHistory);
router.get('/:id', getInvestment);
router.put('/:id', updateInvestment);
router.delete('/:id', deleteInvestment);
router.patch('/:id/archive', archiveInvestment);
router.post('/:id/auto-pay', configureAutoPay);
router.post('/:id/pay-now', payNow);

export default router;
