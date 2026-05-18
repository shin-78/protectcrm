import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import {
  getPipelines, getPipelineWithLeads, createPipeline,
  updatePipeline, moveLeadStage, createStage, updateStage
} from '../controllers/pipeline.controller';

const router = Router();

router.use(authenticate);
router.get('/', getPipelines);
router.post('/', authorize('MASTER', 'SUPERVISOR'), createPipeline);
router.get('/:id', getPipelineWithLeads);
router.put('/:id', authorize('MASTER', 'SUPERVISOR'), updatePipeline);
router.post('/move', moveLeadStage);
router.post('/:id/stages', authorize('MASTER', 'SUPERVISOR'), createStage);
router.put('/:id/stages/:stageId', authorize('MASTER', 'SUPERVISOR'), updateStage);

export default router;
