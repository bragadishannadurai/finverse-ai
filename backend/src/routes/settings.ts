import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  updateProfile,
  uploadUserAvatar,
  deleteAccount,
} from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', updateSettings);
router.put('/profile', updateProfile);
router.post('/avatar', uploadAvatar.single('avatar'), uploadUserAvatar);
router.delete('/account', deleteAccount);

export default router;
