import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// --- Subject colors for UI ---
const SUBJECT_COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#60a5fa', '#e879f9'];


// POST /api/study-plan

export const createStudyPlan = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { wakeTime, sleepTime, hoursPerDay, blockDuration, breakDuration, subjects } = req.body;

    if (!subjects || subjects.length === 0) {
        return res.status(400).json({ error: "At least one subject is required." });
    }

    try {
        // Delete existing plan for this user
        const existingPlan = await query('SELECT id FROM study_plans WHERE user_id = $1', [userId]);
        if (existingPlan.rows.length > 0) {
            await query('DELETE FROM study_plans WHERE user_id = $1', [userId]);
        }

        // Create the plan
        const planResult = await query(
            `INSERT INTO study_plans (user_id, wake_time, sleep_time, hours_per_day, block_duration, break_duration)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [userId, wakeTime, sleepTime, hoursPerDay, blockDuration || 25, breakDuration || 10]
        );
        const planId = planResult.rows[0].id;

        // Insert subjects
        const subjectRows = [];
        for (let i = 0; i < subjects.length; i++) {
            const s = subjects[i];
            const result = await query(
                `INSERT INTO study_subjects (plan_id, subject_name, exam_date, difficulty, color)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id, subject_name, exam_date, difficulty, color`,
                [planId, s.name, s.examDate, s.difficulty || 3, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]
            );
            subjectRows.push(result.rows[0]);
        }

        // SCHEDULE GENERATION ALGORITHM
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const blockMin = blockDuration || 25;
        const breakMin = breakDuration || 10;
        const blocksPerDay = Math.floor((hoursPerDay * 60) / (blockMin + breakMin));

        // Calculate urgency scores for each subject
        const subjectsWithUrgency = subjectRows.map(s => {
            const examDate = new Date(s.exam_date);
            const daysUntil = Math.max(1, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            const urgency = s.difficulty / daysUntil; // Higher = more urgent
            return { ...s, daysUntil, urgency };
        });

        // Sort by urgency
        subjectsWithUrgency.sort((a, b) => b.urgency - a.urgency);

        // Calculate total urgency weight for proportional distribution
        const totalUrgency = subjectsWithUrgency.reduce((sum, s) => sum + s.urgency, 0);

        // Find the last exam date to determine schedule range
        const lastExamDate = new Date(Math.max(...subjectsWithUrgency.map(s => new Date(s.exam_date).getTime())));

        // Generate tasks day by day
        const allTasks: any[] = [];
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

        // Parse wake time to get starting hour
        const [wakeH, wakeM] = wakeTime.split(':').map(Number);

        while (currentDate <= lastExamDate) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Filter subjects whose exam hasn't passed yet
            const activeSubjects = subjectsWithUrgency.filter(s => new Date(s.exam_date) >= currentDate);

            if (activeSubjects.length === 0) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            // Recalculate proportional blocks for active subjects
            const activeTotalUrgency = activeSubjects.reduce((sum, s) => sum + s.urgency, 0);
            const subjectBlocks: { subject: any; blocks: number }[] = [];

            let assignedBlocks = 0;
            activeSubjects.forEach((s, idx) => {
                let blocks = Math.round((s.urgency / activeTotalUrgency) * blocksPerDay);
                // Ensure at least 1 block per subject, max 60% of day for one subject
                blocks = Math.max(1, Math.min(blocks, Math.ceil(blocksPerDay * 0.6)));
                if (assignedBlocks + blocks > blocksPerDay) {
                    blocks = blocksPerDay - assignedBlocks;
                }
                if (blocks > 0) {
                    subjectBlocks.push({ subject: s, blocks });
                    assignedBlocks += blocks;
                }
            });

            // Interleave subjects
            const daySchedule: any[] = [];
            let blockPool: any[] = [];
            subjectBlocks.forEach(sb => {
                for (let i = 0; i < sb.blocks; i++) {
                    blockPool.push(sb.subject);
                }
            });

            // Shuffle with constraint: max 2 consecutive same subject
            const interleaved: any[] = [];
            let lastSubjectId = -1;
            let consecutiveCount = 0;

            while (blockPool.length > 0) {
                let picked = false;
                for (let i = 0; i < blockPool.length; i++) {
                    if (blockPool[i].id !== lastSubjectId || consecutiveCount < 2) {
                        const subject = blockPool.splice(i, 1)[0];
                        if (subject.id === lastSubjectId) {
                            consecutiveCount++;
                        } else {
                            consecutiveCount = 1;
                            lastSubjectId = subject.id;
                        }
                        interleaved.push(subject);
                        picked = true;
                        break;
                    }
                }
                if (!picked) {
                    // Force pick if no alternative
                    interleaved.push(blockPool.shift());
                    consecutiveCount = 1;
                }
            }

            // Assign time slots
            let currentMinutes = wakeH * 60 + wakeM + 60; // Start 1 hour after wake (morning routine)

            interleaved.forEach(subject => {
                const startH = Math.floor(currentMinutes / 60);
                const startM = currentMinutes % 60;
                const endMinutes = currentMinutes + blockMin;
                const endH = Math.floor(endMinutes / 60);
                const endM = endMinutes % 60;

                allTasks.push({
                    planId,
                    subjectId: subject.id,
                    date: dateStr,
                    startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
                    endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
                });

                currentMinutes = endMinutes + breakMin; // Add break
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Batch insert all tasks
        for (const task of allTasks) {
            await query(
                `INSERT INTO study_tasks (plan_id, subject_id, task_date, start_time, end_time)
                 VALUES ($1, $2, $3, $4, $5)`,
                [task.planId, task.subjectId, task.date, task.startTime, task.endTime]
            );
        }

        res.status(201).json({
            status: "success",
            data: {
                planId,
                totalDays: Math.ceil((lastExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
                totalTasks: allTasks.length,
                subjects: subjectRows,
                message: `Study plan generated with ${allTasks.length} study blocks across ${subjectRows.length} subjects.`
            }
        });
    } catch (err: any) {
        console.error("Study Plan Creation Error:", err.message);
        res.status(500).json({ error: "Failed to create study plan." });
    }
};


// GET /api/study-plan
// Fetches the current study plan with subjects and today's tasks.

export const getStudyPlan = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        const planResult = await query(
            `SELECT * FROM study_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [userId]
        );

        if (planResult.rows.length === 0) {
            return res.json({ status: "success", data: null });
        }

        const plan = planResult.rows[0];

        // Get subjects
        const subjects = await query(
            `SELECT * FROM study_subjects WHERE plan_id = $1 ORDER BY exam_date ASC`,
            [plan.id]
        );

        // Get all tasks with subject info
        const tasks = await query(
            `SELECT t.*, s.subject_name, s.color, s.exam_date
             FROM study_tasks t
             JOIN study_subjects s ON t.subject_id = s.id
             WHERE t.plan_id = $1
             ORDER BY t.task_date ASC, t.start_time ASC`,
            [plan.id]
        );

        // Calculate stats
        const totalTasks = tasks.rows.length;
        const completedTasks = tasks.rows.filter((t: any) => t.is_completed).length;

        res.json({
            status: "success",
            data: {
                plan,
                subjects: subjects.rows,
                tasks: tasks.rows,
                stats: {
                    totalTasks,
                    completedTasks,
                    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    totalPoints: plan.total_points,
                    currentStreak: plan.current_streak,
                    longestStreak: plan.longest_streak
                }
            }
        });
    } catch (err) {
        console.error("Get Study Plan Error:", err);
        res.status(500).json({ error: "Failed to fetch study plan." });
    }
};


// PATCH /api/study-plan/complete-task/:taskId

export const completeTask = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { taskId } = req.params;

    try {
        // Verify ownership
        const taskResult = await query(
            `SELECT t.*, sp.user_id, sp.id as plan_id, sp.total_points, sp.current_streak, sp.longest_streak
             FROM study_tasks t
             JOIN study_plans sp ON t.plan_id = sp.id
             WHERE t.id = $1 AND sp.user_id = $2`,
            [taskId, userId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: "Task not found." });
        }

        const task = taskResult.rows[0];
        if (task.is_completed) {
            return res.status(400).json({ error: "Task already completed." });
        }

        // Mark complete
        await query(
            `UPDATE study_tasks SET is_completed = true, completed_at = NOW(), points_earned = 10 WHERE id = $1`,
            [taskId]
        );

        let pointsEarned = 10;
        let newStreak = task.current_streak;
        let longestStreak = task.longest_streak;

        // Check if all tasks for today are now complete
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTasks = await query(
            `SELECT COUNT(*)::int as total, 
                    COUNT(*) FILTER (WHERE is_completed OR id = $2)::int as completed
             FROM study_tasks 
             WHERE plan_id = $1 AND task_date = $3`,
            [task.plan_id, taskId, todayStr]
        );

        if (todayTasks.rows[0].total === todayTasks.rows[0].completed && todayTasks.rows[0].total > 0) {
            pointsEarned += 50;

            // Check yesterday for streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const yesterdayComplete = await query(
                `SELECT COUNT(*)::int as total,
                        COUNT(*) FILTER (WHERE is_completed)::int as completed
                 FROM study_tasks
                 WHERE plan_id = $1 AND task_date = $2`,
                [task.plan_id, yesterdayStr]
            );

            if (yesterdayComplete.rows[0].total > 0 && yesterdayComplete.rows[0].total === yesterdayComplete.rows[0].completed) {
                newStreak = task.current_streak + 1;
                pointsEarned += 20; // Streak bonus
            } else {
                newStreak = 1; // Reset streak but count today
            }

            longestStreak = Math.max(longestStreak, newStreak);
        }

        // Update plan totals
        const newTotalPoints = task.total_points + pointsEarned;
        await query(
            `UPDATE study_plans SET total_points = $1, current_streak = $2, longest_streak = $3, updated_at = NOW()
             WHERE id = $4`,
            [newTotalPoints, newStreak, longestStreak, task.plan_id]
        );

        // Determine level
        const level = Math.floor(newTotalPoints / 100) + 1;
        const levelTitles = ['Beginner', 'Focused', 'Dedicated', 'Scholar', 'Master', 'Legend'];
        const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

        res.json({
            status: "success",
            data: {
                pointsEarned,
                totalPoints: newTotalPoints,
                level,
                levelTitle,
                currentStreak: newStreak,
                longestStreak,
                dayComplete: todayTasks.rows[0].total === todayTasks.rows[0].completed
            }
        });
    } catch (err) {
        console.error("Complete Task Error:", err);
        res.status(500).json({ error: "Failed to complete task." });
    }
};


// DELETE /api/study-plan

export const deleteStudyPlan = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    try {
        await query('DELETE FROM study_plans WHERE user_id = $1', [userId]);
        res.json({ status: "success", message: "Study plan deleted." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete study plan." });
    }
};