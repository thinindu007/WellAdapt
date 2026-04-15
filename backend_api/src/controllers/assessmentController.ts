import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * POST /api/chat/assessment
 * Submits a PHQ-2 + GAD-2 self-assessment response.
 */
export const submitAssessment = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { phq2_q1, phq2_q2, gad2_q1, gad2_q2 } = req.body;

    // Validate inputs
    const scores = [phq2_q1, phq2_q2, gad2_q1, gad2_q2];
    if (scores.some(s => s === undefined || s === null || s < 0 || s > 3)) {
        return res.status(400).json({ error: "Each score must be between 0 and 3." });
    }

    const phq2_total = phq2_q1 + phq2_q2;
    const gad2_total = gad2_q1 + gad2_q2;

    try {
        const result = await query(
            `INSERT INTO assessments (user_id, phq2_q1, phq2_q2, phq2_total, gad2_q1, gad2_q2, gad2_total)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, phq2_total, gad2_total, created_at`,
            [userId, phq2_q1, phq2_q2, phq2_total, gad2_q1, gad2_q2, gad2_total]
        );

        const assessment = result.rows[0];

        // Clinical interpretation
        const phq2_flag = phq2_total >= 3;
        const gad2_flag = gad2_total >= 3;

        res.status(201).json({
            status: "success",
            data: {
                id: assessment.id,
                phq2_total,
                gad2_total,
                phq2_flag,
                gad2_flag,
                created_at: assessment.created_at,
                interpretation: {
                    depression: phq2_flag
                        ? "Your responses suggest you may be experiencing symptoms of depression. Consider speaking with a counselor."
                        : "Your depression screening is within the normal range.",
                    anxiety: gad2_flag
                        ? "Your responses suggest you may be experiencing symptoms of anxiety. Consider speaking with a counselor."
                        : "Your anxiety screening is within the normal range."
                }
            }
        });
    } catch (err) {
        console.error("Assessment Submit Error:", err);
        res.status(500).json({ error: "Failed to save assessment" });
    }
};


// GET /api/chat/assessment/history

export const getAssessmentHistory = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        const result = await query(
            `SELECT id, phq2_q1, phq2_q2, phq2_total, gad2_q1, gad2_q2, gad2_total, created_at
             FROM assessments
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [userId]
        );

        res.json({
            status: "success",
            data: result.rows
        });
    } catch (err) {
        console.error("Assessment History Error:", err);
        res.status(500).json({ error: "Failed to fetch assessment history" });
    }
};


// GET /api/chat/assessment/check-due

export const checkAssessmentDue = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        // Get the most recent assessment
        const lastAssessment = await query(
            `SELECT created_at FROM assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (lastAssessment.rows.length === 0) {
            // check if they have at least 3 chat sessions first
            const sessionCount = await query(
                `SELECT COUNT(DISTINCT session_id)::int as count FROM chat_history WHERE user_id = $1`,
                [userId]
            );
            const hasEnoughHistory = (sessionCount.rows[0]?.count || 0) >= 3;

            return res.json({
                status: "success",
                isDue: hasEnoughHistory,
                reason: hasEnoughHistory ? "no_previous_assessment" : "insufficient_history"
            });
        }

        const lastDate = new Date(lastAssessment.rows[0].created_at);
        const daysSinceLast = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check sessions since last assessment
        const sessionsSince = await query(
            `SELECT COUNT(DISTINCT session_id)::int as count 
             FROM chat_history 
             WHERE user_id = $1 AND timestamp > $2`,
            [userId, lastDate]
        );

        const sessionsCount = sessionsSince.rows[0]?.count || 0;

        const isDue = daysSinceLast >= 7 || sessionsCount >= 5;

        res.json({
            status: "success",
            isDue,
            reason: isDue
                ? (daysSinceLast >= 7 ? "time_interval" : "session_count")
                : "not_due",
            daysSinceLast,
            sessionsSinceLast: sessionsCount
        });
    } catch (err) {
        console.error("Assessment Check Error:", err);
        res.status(500).json({ error: "Failed to check assessment status" });
    }
};