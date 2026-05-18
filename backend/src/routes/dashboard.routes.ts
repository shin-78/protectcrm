import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getDashboardStats, getOperatorRanking,
  getTasks, createTask, updateTask, deleteTask,
  getNotifications, markNotificationsRead,
} from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', getDashboardStats);
router.get('/ranking', authorize('MASTER', 'SUPERVISOR'), getOperatorRanking);

// Tasks
router.get('/tasks', getTasks);
router.post('/tasks', createTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);

export default router;
