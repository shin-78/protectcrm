import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getOperatorStats } from '../controllers/users.controller';

const router = Router();

router.use(authenticate);
router.get('/', authorize('MASTER', 'SUPERVISOR'), getUsers);
router.get('/stats', authorize('MASTER', 'SUPERVISOR'), getOperatorStats);
router.get('/:id', getUserById);
router.post('/', authorize('MASTER'), createUser);
router.put('/:id', authorize('MASTER', 'SUPERVISOR'), updateUser);
router.delete('/:id', authorize('MASTER'), deleteUser);

export default router;
