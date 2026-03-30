import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../config/db';
import axios from 'axios';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Renders Markdown-formatted text into a PDFKit document.
 * Handles: **bold**, * bullet points, and line breaks.
 */
function renderMarkdownToPDF(doc: PDFKit.PDFDocument, text: string, color: string = '#334155') {
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            doc.moveDown(0.3);
            continue;
        }

        // Check if it's a bullet point (starts with * or -)
        const isBullet = /^[\*\-]\s+/.test(trimmed);
        const cleanLine = isBullet ? trimmed.replace(/^[\*\-]\s+/, '') : trimmed;

        // Add bullet indent
        if (isBullet) {
            doc.fillColor(color).font('Helvetica').fontSize(10).text('', { continued: false });
        }

        // Parse bold segments: split by **...**
        const segments = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const prefix = isBullet ? '    • ' : '';

        let isFirst = true;
        for (const segment of segments) {
            if (!segment) continue;

            const isBold = segment.startsWith('**') && segment.endsWith('**');
            const content = isBold ? segment.slice(2, -2) : segment;
            const displayText = isFirst ? prefix + content : content;
            const isLast = segment === segments[segments.length - 1];

            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                .fillColor(isBold ? '#0f172a' : color)
                .fontSize(10)
                .text(displayText, { continued: !isLast, lineGap: 2 });

            isFirst = false;
        }
    }
}
/**
 * Generates a comprehensive Wellness Report for the user.
 * This report acts as a bridge between the student and a university counselor.
 */
export const generateWellnessReport = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    try {
        // 1. Fetch Chat Data for the last 30 days
        // We use PostgreSQL INTERVAL syntax to get a rolling 30-day window
        const chatData = await query(
            `SELECT user_message, bot_response, emotion, timestamp 
             FROM chat_history 
             WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
             ORDER BY timestamp ASC`,
            [userId]
        );

        if (chatData.rows.length === 0) {
            return res.status(404).json({
                message: "Insufficient data to generate a report. Please interact more with WellAdapt first."
            });
        }

        // 2. Data Aggregation (Mood Distribution)
        const moodStats: Record<string, number> = {};
        chatData.rows.forEach((row: any) => {
            const emotion = row.emotion || 'Unknown';
            moodStats[emotion] = (moodStats[emotion] || 0) + 1;
        });

        // 3. AI Trigger Analysis (The Intelligence Layer)
        // We feed the LLM all stress/anxiety related messages to identify patterns
        const stressInputs = chatData.rows
            .filter((row: any) => row.emotion === 'Stress' || row.emotion === 'Anxiety')
            .map((row: any) => row.user_message)
            .join(". ");

        let aiAnalysisResponse = "No specific stress patterns identified in the last 30 days.";

        if (stressInputs.length > 0) {
            try {
                const aiAnalysis = await axios.post('http://localhost:11434/api/generate', {
                    model: "llama3",
                    prompt: `Summarize the top 3 recurring stress triggers for a university student based on these messages: "${stressInputs}". 
                             Return only 3 short bullet points. Be professional and objective for a counselor's review.`,
                    stream: false
                });
                aiAnalysisResponse = aiAnalysis.data.response;
            } catch (aiError) {
                console.error("AI Analysis Error:", aiError);
                aiAnalysisResponse = "Analytics engine temporarily unavailable. Please review manual situational logs below.";
            }
        }

        // 4. Initialize PDF Generation
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `WellAdapt_Report_${userId}_${Date.now()}.pdf`;

        // Setting headers for browser download
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // --- PDF DESIGN & CONTENT ---

        // Header Section
        doc.fillColor('#0369a1').fontSize(22).text('WellAdapt: Wellness Summary Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#64748b').text(`Reporting Period: Last 30 Days`, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Section 1: Emotional Overview
        doc.fillColor('#0369a1').fontSize(14).text('1. Emotional Distribution', { underline: true });
        doc.moveDown();
        doc.fillColor('#334155').fontSize(11);

        const totalInteractions = chatData.rows.length;
        Object.entries(moodStats).forEach(([mood, count]) => {
            const percentage = ((count / totalInteractions) * 100).toFixed(1);
            doc.text(`• ${mood}: ${count} interactions (${percentage}%)`);
        });
        doc.moveDown(2);

        // Section 2: Stress Trigger Analysis
        doc.fillColor('#0369a1').fontSize(14).text('2. AI-Identified Stress Triggers', { underline: true });
        doc.moveDown();
        renderMarkdownToPDF(doc, aiAnalysisResponse, '#334155');
        doc.moveDown(2);

        // Section 3: Counseling Bridge (Situational Advice)
        doc.fillColor('#0369a1').fontSize(14).text('3. Recent Situational Wellness Advice', { underline: true });
        doc.moveDown();

        // Retrieve the 3 most recent high-impact (Non-Positive) interactions
        const recentAdvice = chatData.rows
            .filter((r: any) => r.emotion !== 'Positive' && r.emotion !== 'CRISIS')
            .slice(-3);

        if (recentAdvice.length > 0) {
            recentAdvice.forEach((r: any, index: number) => {
                doc.fillColor('#64748b').fontSize(10).text(`Scenario ${index + 1}: "${r.user_message.substring(0, 80)}${r.user_message.length > 80 ? '...' : ''}"`);
                doc.fillColor('#0369a1').font('Helvetica-Bold').fontSize(10).text('Guidance Provided:');
                doc.font('Helvetica');
                renderMarkdownToPDF(doc, r.bot_response, '#334155');
                doc.moveDown();
            });
        } else {
            doc.fillColor('#64748b').fontSize(11).text("No distress-related advice required in the recent period.");
        }

        // Section 4: PHQ-2/GAD-2 Clinical Screening History (NEW)
        doc.moveDown(2);
        doc.fillColor('#0369a1').fontSize(14).text('4. Standardized Self-Assessment Screening (PHQ-2 / GAD-2)', { underline: true });
        doc.moveDown();

        try {
            const assessmentData = await query(
                `SELECT phq2_total, gad2_total, created_at 
                 FROM assessments 
                 WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
                 ORDER BY created_at DESC`,
                [userId]
            );

            if (assessmentData.rows.length > 0) {
                doc.fillColor('#334155').fontSize(10).text(
                    'The following scores are from the PHQ-2 (depression) and GAD-2 (anxiety) screening instruments, ' +
                    'validated by Kroenke et al. (2003, 2007). Scores >= 3 suggest further clinical evaluation.',
                    { lineGap: 3 }
                );
                doc.moveDown();

                assessmentData.rows.forEach((row: any, index: number) => {
                    const date = new Date(row.created_at).toLocaleDateString();
                    const phqFlag = row.phq2_total >= 3 ? ' ⚠' : '';
                    const gadFlag = row.gad2_total >= 3 ? ' ⚠' : '';
                    doc.fillColor('#334155').fontSize(10).text(
                        `${date}  —  PHQ-2: ${row.phq2_total}/6${phqFlag}  |  GAD-2: ${row.gad2_total}/6${gadFlag}`
                    );
                });
            } else {
                doc.fillColor('#64748b').fontSize(10).text('No self-assessment data recorded in the last 30 days.');
            }
        } catch (assessErr) {
            doc.fillColor('#64748b').fontSize(10).text('Self-assessment data unavailable.');
        }

        // Section 5: Emergency Contacts (Standardized Safety)
        doc.moveDown();
        doc.fillColor('#ef4444').fontSize(12).font('Helvetica-Bold').text('5.Emergency Support Resources (Sri Lanka)');
        doc.font('Helvetica');
        doc.fontSize(10).fillColor('#334155');
        doc.text('• National Mental Health Helpline: 1926');
        doc.text('• Sumithrayo Crisis Support: 011 269 6666');
        doc.text('• Suwa Seriya Ambulance: 1990');

        // --- FIXED FOOTER LOGIC ---
        const footerText = 'Disclaimer: This wellness summary is an AI-generated tool for reflection and support. It is not a clinical diagnosis. Please present this report to a qualified university counselor or medical professional for specialized care.';
        const margin = 50;
        const footerY = doc.page.height - 80; // Calculating Y based on page height

        doc.fontSize(8)
            .fillColor('#94a3b8')
            .text(
                footerText,
                margin,
                footerY,
                {
                    align: 'center',
                    width: doc.page.width - (margin * 2),
                    lineGap: 2
                }
            );

        // Finalize the PDF
        doc.end();

    } catch (error: any) {
        console.error("PDF Generation Error:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ status: "error", message: "Failed to generate wellness report." });
        }
    }
};