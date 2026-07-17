import { Router } from 'express';
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getAccountTransactions,
  depositToAccount,
  withdrawFromAccount,
  setDefaultAccount,
} from '../controllers/bankAccountController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getBankAccounts);
router.post('/', createBankAccount);
router.get('/:id', getBankAccount);
router.put('/:id', updateBankAccount);
router.delete('/:id', deleteBankAccount);
router.get('/:id/transactions', getAccountTransactions);
router.post('/:id/deposit', depositToAccount);
router.post('/:id/withdraw', withdrawFromAccount);
router.post('/:id/set-default', setDefaultAccount);

export default router;
