import { Router } from 'express';
import { handleChat, getUserSessions, getSessionMessages, deleteSession } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';
import { generateWellnessReport } from '../controllers/reportController';
import { getMoodTrends, getMoodDistribution, getMoodSummary } from '../controllers/analyticsController';


const router = Router();

// Endpoint to get sidebar list
router.get('/sessions', authenticateToken, getUserSessions as any);

// Endpoint to load a specific chat
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages as any);

// Main chat endpoint
router.post('/', authenticateToken, handleChat as any);

router.delete('/sessions/:sessionId', authenticateToken, deleteSession as any);

router.get('/export-report', authenticateToken, generateWellnessReport);

router.get('/analytics/mood-trends', authenticateToken, getMoodTrends as any);
router.get('/analytics/mood-distribution', authenticateToken, getMoodDistribution as any);
router.get('/analytics/summary', authenticateToken, getMoodSummary as any);

export default router;