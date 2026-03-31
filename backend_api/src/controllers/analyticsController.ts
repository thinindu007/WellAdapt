import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';


// GET /api/chat/analytics/mood-trends

export const getMoodTrends = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        const result = await query(
            `SELECT 
                DATE(timestamp) as date,
                emotion,
                COUNT(*)::int as count
             FROM chat_history
             WHERE user_id = $1 
               AND timestamp > NOW() - INTERVAL '30 days'
               AND emotion IS NOT NULL
               AND emotion != ''
             GROUP BY DATE(timestamp), emotion
             ORDER BY date ASC`,
            [userId]
        );

        res.json({
            status: "success",
            data: result.rows
        });
    } catch (err) {
        console.error("Analytics - Mood Trends Error:", err);
        res.status(500).json({ error: "Failed to fetch mood trends" });
    }
};


// GET /api/chat/analytics/mood-distribution

export const getMoodDistribution = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        const result = await query(
            `SELECT 
                emotion,
                COUNT(*)::int as count
             FROM chat_history
             WHERE user_id = $1 
               AND timestamp > NOW() - INTERVAL '30 days'
               AND emotion IS NOT NULL
               AND emotion != ''
             GROUP BY emotion
             ORDER BY count DESC`,
            [userId]
        );

        res.json({
            status: "success",
            data: result.rows
        });
    } catch (err) {
        console.error("Analytics - Mood Distribution Error:", err);
        res.status(500).json({ error: "Failed to fetch mood distribution" });
    }
};


// GET /api/chat/analytics/summary

export const getMoodSummary = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        // Total messages in last 30 days
        const totalMessages = await query(
            `SELECT COUNT(*)::int as total
             FROM chat_history
             WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'`,
            [userId]
        );

        // Most frequent emotion
        const topEmotion = await query(
            `SELECT emotion, COUNT(*)::int as count
             FROM chat_history
             WHERE user_id = $1 
               AND timestamp > NOW() - INTERVAL '30 days'
               AND emotion IS NOT NULL AND emotion != ''
             GROUP BY emotion
             ORDER BY count DESC
             LIMIT 1`,
            [userId]
        );

        // Total unique sessions
        const sessionCount = await query(
            `SELECT COUNT(DISTINCT session_id)::int as total
             FROM chat_history
             WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'`,
            [userId]
        );

        // Most recent 5 emotions
        const recentEmotions = await query(
            `SELECT emotion, timestamp
             FROM chat_history
             WHERE user_id = $1 
               AND emotion IS NOT NULL AND emotion != ''
             ORDER BY timestamp DESC
             LIMIT 5`,
            [userId]
        );

        // Daily activity 
        const weeklyActivity = await query(
            `SELECT 
                DATE(timestamp) as date,
                COUNT(*)::int as count
             FROM chat_history
             WHERE user_id = $1 
               AND timestamp > NOW() - INTERVAL '7 days'
             GROUP BY DATE(timestamp)
             ORDER BY date ASC`,
            [userId]
        );

        res.json({
            status: "success",
            data: {
                totalMessages: totalMessages.rows[0]?.total || 0,
                topEmotion: topEmotion.rows[0] || null,
                sessionCount: sessionCount.rows[0]?.total || 0,
                recentEmotions: recentEmotions.rows,
                weeklyActivity: weeklyActivity.rows
            }
        });
    } catch (err) {
        console.error("Analytics - Summary Error:", err);
        res.status(500).json({ error: "Failed to fetch mood summary" });
    }
};