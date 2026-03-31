import { Router } from 'express';
import { createStudyPlan, getStudyPlan, completeTask, deleteStudyPlan } from '../controllers/studyPlanController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createStudyPlan as any);
router.get('/', authenticateToken, getStudyPlan as any);
router.patch('/complete-task/:taskId', authenticateToken, completeTask as any);
router.delete('/', authenticateToken, deleteStudyPlan as any);

export default router;