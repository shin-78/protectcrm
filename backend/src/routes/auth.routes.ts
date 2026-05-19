import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { login, register, me, changePassword, seedDB } from '../controllers/auth.controller';

const router = Router();

router.get('/seed', seedDB);
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

export default router;
