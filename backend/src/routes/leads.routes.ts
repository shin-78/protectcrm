import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { getLeads, getLeadById, createLead, updateLead, deleteLead, importLeads, getLeadStats } from '../controllers/leads.controller';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/dashboard.controller';
import { createNote } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/', getLeads);
router.get('/stats', getLeadStats);
router.post('/import', importLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', authorize('MASTER', 'SUPERVISOR'), deleteLead);

// Notes
router.post('/notes', createNote);

// Tasks per lead
router.get('/:id/tasks', getTasks);
router.post('/:id/tasks', createTask);

export default router;
