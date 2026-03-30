import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export const handleChat = async (req: AuthRequest, res: Response) => {
    const text = req.body.text || req.body.message;
    const userId = req.userId;
    const sessionId = req.body.sessionId || uuidv4();

    let userLang = 'en';

    if (!text || !userId) {
        return res.status(400).json({ error: "Required data missing" });
    }

    try {
        // 1. Fetch user's preferred language from the Database
        const userResult = await query('SELECT preferred_language, religion FROM users WHERE id = $1', [userId]);
        userLang = userResult.rows[0]?.preferred_language || 'en';
        const userReligion = userResult.rows[0]?.religion || 'buddhist';

        let detectedEmotion = "";
        let botResponse = "";
        let mlConfidence = 0;

        if (userLang === 'si') {
            // --- SINHALA STRATEGY: LLaMA 3 Detects + Responds ---
            const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
                model: "llama3",
                prompt: `Role: You are "WellAdapt", a supportive Sinhala-speaking mental health counselor for university students.
User Message: "${text}"

Task:
1. Identify the primary emotion (Stress, Anxiety, Depression, or Positive).
2. Provide a warm, empathetic counselor response in SINHALA script.
3. Include 2-3 practical wellness tips using a CLEAR BULLETED LIST (Markdown).

STRICT FORMATTING RULE:
The very first word of your response MUST be the English emotion label followed by a pipe symbol | and then your Sinhala response.
Example: Depression | ඔයාට දැනෙන මේ කණගාටුව ගැන මම ගොඩක් කණගාටුයි...`,
                stream: false
            });

            const rawResponse = ollamaResponse.data.response;
            // Split the label from the actual message using the pipe separator
            const parts = rawResponse.split('|');
            detectedEmotion = parts[0].trim();
            botResponse = parts[1] ? parts[1].trim() : rawResponse;

        } else {
            // --- ENGLISH STRATEGY: FastAPI Detects -> LLaMA 3 Responds ---
            // Detect emotion via your CNN-LSTM FastAPI server
            const mlResponse = await axios.post('http://localhost:8000/predict/english', { text });
            detectedEmotion = mlResponse.data.emotion;
            const mlConfidence = mlResponse.data.confidence || 0;

            const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
                model: "llama3",
                prompt: `Role: You are "WellAdapt", a supportive English-speaking mental health counselor for university students.
User Message: "${text}"
Detected Emotion: ${detectedEmotion}

Task:
1. Start with 1-2 sentences of warm empathy acknowledging their ${detectedEmotion}.
2. Provide 2-3 practical wellness tips using a CLEAR BULLETED LIST (Markdown).
3. End with 1 brief, encouraging sentence.
4. Respond ONLY in English.
5. Do not mention you are an AI.`,
                stream: false
            });
            botResponse = ollamaResponse.data.response;
        }

        // 2. Save the interaction to chat_history
        await query(
            'INSERT INTO chat_history (user_id, user_message, bot_response, emotion, session_id) VALUES ($1, $2, $3, $4, $5)',
            [userId, text, botResponse, detectedEmotion, sessionId]
        );

        // 2.5 Generate Culturally Adaptive Wellness Tip (Religion-Aware)
        let culturalTip = "";
        const emotionsForCulturalTip = ['Stress', 'Anxiety', 'Fear', 'Sadness', 'Sad', 'Depression', 'Anger', 'Angry'];

        if (emotionsForCulturalTip.includes(detectedEmotion)) {
            // Build religion-specific cultural context
            const religiousContext: Record<string, string> = {
                buddhist: `Buddhist Sri Lankan traditions:
- Mindfulness practices: anapanasati (breath awareness), metta bhavana (loving-kindness meditation), walking meditation at a temple
- Visiting the campus or nearby Bodhi tree for quiet reflection
- Reciting Pirith or listening to Seth Pirith for calming the mind
- Practicing the Five Precepts as a grounding framework
- Seeking guidance from a Bhikkhu (monk) at the university temple
- Reflecting on anicca (impermanence) — this stressful period will pass
- Engaging in dana (giving/sharing) as a way to shift focus from personal stress
- Sri Lankan Buddhist proverbs about patience and perseverance`,

                hindu: `Hindu Sri Lankan traditions:
- Morning or evening puja (prayer ritual) at home or the campus kovil for centering the mind
- Practicing pranayama (yogic breathing) — especially Nadi Shodhana (alternate nostril breathing)
- Reciting a personal mantra or the Gayatri Mantra for focus and calm
- Lighting a lamp (deepam) as a meditative practice to bring clarity
- Seeking blessings at a Ganesh or Saraswati shrine for academic success
- Practicing yoga asanas for stress relief — even 10 minutes helps
- Reflecting on the Bhagavad Gita's teaching about focusing on effort, not outcomes (Karma Yoga)
- Sharing concerns with family — the joint family system is a source of strength`,

                muslim: `Muslim Sri Lankan traditions:
- Performing Salah (prayer) mindfully as a structured break for reflection and peace
- Making Dhikr (remembrance of Allah) — repetitive phrases for calming anxiety
- Reciting or listening to Quran, especially Surah Ar-Rahman or Surah Ad-Duha for comfort
- Making Dua (personal prayer) to express worries and seek guidance
- Practicing Tawakkul (trust in Allah's plan) — surrendering worry about outcomes
- Connecting with the campus Muslim community for group Jummah prayer and support
- Sharing a meal with friends — communal eating is deeply valued in Muslim culture
- Seeking advice from an elder or Moulavi who understands academic pressures`,

                catholic: `Catholic/Christian Sri Lankan traditions:
- Taking a moment for personal prayer or visiting the campus chapel for quiet reflection
- Praying the Rosary as a meditative, repetitive practice that calms the mind
- Reading Psalms for comfort — especially Psalm 23 ("The Lord is my shepherd") or Philippians 4:6-7
- Lighting a candle at church and offering your academic worries to God
- Attending Sunday Mass or a weekday service for community support and spiritual grounding
- Practicing the Examen (Ignatian reflection) at the end of each day to process emotions
- Reaching out to a parish priest or campus Christian fellowship for guidance
- Remembering "Cast all your anxiety on Him, because He cares for you" (1 Peter 5:7)`
            };

            const context = religiousContext[userReligion] || religiousContext['buddhist'];

            try {
                const culturalResponse = await axios.post('http://localhost:11434/api/generate', {
                    model: "llama3",
                    prompt: `You are a cultural wellness advisor for Sri Lankan university students.

The student is feeling: ${detectedEmotion}
Their message: "${text}"
Their religion: ${userReligion}

Using ONLY the following cultural and religious context, provide ONE short coping tip (2-3 sentences MAX):

${context}

RULES:
- Write in English but reference the student's religious/cultural practices naturally
- Keep it warm, personal, and specific to Sri Lankan university student life
- Maximum 2-3 sentences
- Write ONLY the tip itself — no introduction like "Here's a tip" or "As a ${userReligion}"
- Do NOT give generic Western advice like "try journaling"
- Make it feel like advice from a caring Sri Lankan elder who understands both faith and academic pressure`,
                    stream: false
                });
                culturalTip = culturalResponse.data.response.trim();
            } catch (culturalError) {
                console.log("Cultural tip generation skipped:", culturalError);
                culturalTip = "";
            }
        }

        // 3. Return response to Frontend
        const suggestBreathing = ['Stress', 'Anxiety', 'Fear', 'Depression'].includes(detectedEmotion);

        return res.status(200).json({
            status: "success",
            emotion: detectedEmotion,
            reply: botResponse,
            sessionId: sessionId,
            suggestBreathing: suggestBreathing,
            culturalTip: culturalTip || null
        });

    } catch (error: any) {
        console.error("System Error:", error.message);
        return res.status(500).json({
            status: "error",
            reply: userLang === 'si'
                ? "කණගාටුයි, මට පණිවිඩය සැකසීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න."
                : "I'm having trouble processing your message right now. Please try again."
        });
    }
};

// --- Fetch all session titles for sidebar ---
export const getUserSessions = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    try {
        const result = await query(
            `SELECT session_id, MIN(timestamp) as start_time,
             (SELECT user_message FROM chat_history ch2 WHERE ch2.session_id = ch1.session_id ORDER BY timestamp ASC LIMIT 1) as title
             FROM chat_history ch1
             WHERE user_id = $1
             GROUP BY session_id
             ORDER BY start_time DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};

// --- Fetch messages for a specific session ---
export const getSessionMessages = async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.userId;
    try {
        const result = await query(
            'SELECT user_message, bot_response, emotion, timestamp FROM chat_history WHERE session_id = $1 AND user_id = $2 ORDER BY timestamp ASC',
            [sessionId, userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

// --- Delete a session ---
export const deleteSession = async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.userId;
    try {
        const result = await query(
            'DELETE FROM chat_history WHERE session_id = $1 AND user_id = $2',
            [sessionId, userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Session not found or unauthorized" });
        }
        res.json({ message: "Chat session deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Failed to delete chat session" });
    }
};
