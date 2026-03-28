import { Router } from 'express';
import { handleChat, getUserSessions, getSessionMessages, deleteSession } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';
import { generateWellnessReport } from '../controllers/reportController';

const router = Router();

// Endpoint to get sidebar list
router.get('/sessions', authenticateToken, getUserSessions as any);

// Endpoint to load a specific chat
router.get('/sessions/:sessionId', authenticateToken, getSessionMessages as any);

// Main chat endpoint
router.post('/', authenticateToken, handleChat as any);

router.delete('/sessions/:sessionId', authenticateToken, deleteSession as any);

router.get('/export-report', authenticateToken, generateWellnessReport);

export default router;