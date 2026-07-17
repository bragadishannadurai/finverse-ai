import { Router } from 'express';
import { getDashboardData, getNetWorthHistory } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDashboardData);
router.get('/net-worth', getNetWorthHistory);

export default router;
