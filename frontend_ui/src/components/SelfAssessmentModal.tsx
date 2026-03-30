/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import axios from 'axios';
import './SelfAssessmentModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    lang: 'en' | 'si';
}

// --- Clinically Validated Questions ---
// PHQ-2: Kroenke, Spitzer & Williams (2003). The Patient Health Questionnaire-2.
// GAD-2: Kroenke, Spitzer, Williams & Löwe (2007). Anxiety disorders in primary care.

const QUESTIONS = {
    phq2: [
        {
            id: 'phq2_q1',
            en: 'Over the last 2 weeks, how often have you been bothered by having little interest or pleasure in doing things?',
            si: 'පසුගිය සති 2 තුළ, දේවල් කිරීමේ උනන්දුව හෝ සතුට අඩු වීම නිසා ඔබට කොපමණ වාරයක් කරදර වී තිබේද?'
        },
        {
            id: 'phq2_q2',
            en: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
            si: 'පසුගිය සති 2 තුළ, මානසිකව පහත වැටීම, මනෝ අවපීඩනය, හෝ බලාපොරොත්තු සුන්වීම නිසා ඔබට කොපමණ වාරයක් කරදර වී තිබේද?'
        }
    ],
    gad2: [
        {
            id: 'gad2_q1',
            en: 'Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?',
            si: 'පසුගිය සති 2 තුළ, නොසන්සුන් බව, කනස්සල්ල, හෝ ආතතිය දැනීම නිසා ඔබට කොපමණ වාරයක් කරදර වී තිබේද?'
        },
        {
            id: 'gad2_q2',
            en: 'Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?',
            si: 'පසුගිය සති 2 තුළ, කනස්සල්ල නැවැත්වීමට හෝ පාලනය කිරීමට නොහැකි වීම නිසා ඔබට කොපමණ වාරයක් කරදර වී තිබේද?'
        }
    ]
};

const RESPONSE_OPTIONS = [
    { value: 0, en: 'Not at all', si: 'කිසිසේත්ම නැත' },
    { value: 1, en: 'Several days', si: 'දින කිහිපයක්' },
    { value: 2, en: 'More than half the days', si: 'දින භාගයකට වඩා' },
    { value: 3, en: 'Nearly every day', si: 'පාහේ සෑම දිනම' },
];

const SelfAssessmentModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
    const [step, setStep] = useState<'intro' | 'questions' | 'results'>('intro');
    const [answers, setAnswers] = useState<Record<string, number | null>>({
        phq2_q1: null,
        phq2_q2: null,
        gad2_q1: null,
        gad2_q2: null,
    });
    const [results, setResults] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);

    const allQuestions = [...QUESTIONS.phq2, ...QUESTIONS.gad2];
    const totalQuestions = allQuestions.length;

    if (!isOpen) return null;

    const handleAnswer = (questionId: string, value: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));

        // Auto-advance to next question after a brief delay
        if (currentQuestion < totalQuestions - 1) {
            setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
        }
    };

    const allAnswered = Object.values(answers).every(v => v !== null);

    const handleSubmit = async () => {
        if (!allAnswered) return;
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5000/api/chat/assessment',
                answers,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setResults(response.data.data);
            setStep('results');
        } catch (err) {
            console.error("Assessment submit error:", err);
            alert(lang === 'si' ? 'ඉදිරිපත් කිරීම අසාර්ථක විය' : 'Failed to submit assessment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        // Reset state for next time
        setStep('intro');
        setAnswers({ phq2_q1: null, phq2_q2: null, gad2_q1: null, gad2_q2: null });
        setResults(null);
        setCurrentQuestion(0);
        onClose();
    };

    const getScoreColor = (score: number, threshold: number) => {
        if (score >= threshold) return '#fb923c';
        return '#34d399';
    };

    const getScoreLabel = (score: number, threshold: number) => {
        if (score >= threshold) {
            return lang === 'si' ? 'තවදුරටත් ඇගයීම නිර්දේශ කෙරේ' : 'Further evaluation recommended';
        }
        return lang === 'si' ? 'සාමාන්‍ය පරාසය තුළ' : 'Within normal range';
    };

    return (
        <div className="assessment-overlay" onClick={handleClose}>
            <div className="assessment-modal" onClick={e => e.stopPropagation()}>

                {/* --- INTRO SCREEN --- */}
                {step === 'intro' && (
                    <div className="assessment-intro">
                        <div className="assessment-badge">📋</div>
                        <h2>{lang === 'si' ? 'ඔබ කොහොමද?' : 'How Are You Feeling?'}</h2>
                        <p className="assessment-intro-desc">
                            {lang === 'si'
                                ? 'ඔබේ සුවතාව පරීක්ෂා කිරීමට මිනිත්තු 1ක් ගත කරන්න. මෙම ප්‍රශ්න 4 සායනිකව වලංගු කරන ලද PHQ-2 සහ GAD-2 තිරගත කිරීමේ මෙවලම් මත පදනම් වේ.'
                                : 'Take 1 minute to check in with yourself. These 4 questions are based on the clinically validated PHQ-2 and GAD-2 screening tools used by mental health professionals worldwide.'}
                        </p>
                        <div className="assessment-meta">
                            <span>⏱️ {lang === 'si' ? 'මිනිත්තු 1ක්' : '~1 minute'}</span>
                            <span>🔒 {lang === 'si' ? 'සම්පූර්ණයෙන්ම පෞද්ගලික' : 'Completely private'}</span>
                            <span>📊 {lang === 'si' ? 'ඔබේ වාර්තාවට එකතු වේ' : 'Added to your wellness report'}</span>
                        </div>
                        <button className="assessment-start-btn" onClick={() => setStep('questions')}>
                            {lang === 'si' ? 'ආරම්භ කරන්න' : 'Begin Check-In'}
                        </button>
                        <button className="assessment-skip-btn" onClick={handleClose}>
                            {lang === 'si' ? 'පසුව කරන්නම්' : 'Maybe Later'}
                        </button>
                    </div>
                )}

                {/* --- QUESTIONS SCREEN --- */}
                {step === 'questions' && (
                    <div className="assessment-questions">
                        {/* Progress Bar */}
                        <div className="assessment-progress">
                            <div
                                className="assessment-progress-fill"
                                style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                            />
                        </div>
                        <span className="assessment-progress-label">
                            {currentQuestion + 1} / {totalQuestions}
                        </span>

                        {/* Section Label */}
                        <div className="assessment-section-label">
                            {currentQuestion < 2
                                ? (lang === 'si' ? '📘 මනෝ අවපීඩන තිරගත කිරීම (PHQ-2)' : '📘 Depression Screening (PHQ-2)')
                                : (lang === 'si' ? '📗 කනස්සල්ල තිරගත කිරීම (GAD-2)' : '📗 Anxiety Screening (GAD-2)')
                            }
                        </div>

                        {/* Current Question */}
                        <div className="assessment-question-card">
                            <p className="assessment-question-text">
                                {allQuestions[currentQuestion][lang]}
                            </p>

                            <div className="assessment-options">
                                {RESPONSE_OPTIONS.map(option => {
                                    const qId = allQuestions[currentQuestion].id;
                                    const isSelected = answers[qId] === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            className={`assessment-option ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleAnswer(qId, option.value)}
                                        >
                                            <span className="option-value">{option.value}</span>
                                            <span className="option-label">{option[lang]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="assessment-nav">
                            {currentQuestion > 0 && (
                                <button
                                    className="assessment-nav-btn back"
                                    onClick={() => setCurrentQuestion(prev => prev - 1)}
                                >
                                    ← {lang === 'si' ? 'ආපසු' : 'Back'}
                                </button>
                            )}
                            {currentQuestion < totalQuestions - 1 ? (
                                <button
                                    className="assessment-nav-btn next"
                                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                                    disabled={answers[allQuestions[currentQuestion].id] === null}
                                >
                                    {lang === 'si' ? 'ඊළඟ' : 'Next'} →
                                </button>
                            ) : (
                                <button
                                    className="assessment-nav-btn submit"
                                    onClick={handleSubmit}
                                    disabled={!allAnswered || isSubmitting}
                                >
                                    {isSubmitting
                                        ? (lang === 'si' ? 'ඉදිරිපත් වෙමින්...' : 'Submitting...')
                                        : (lang === 'si' ? 'ඉදිරිපත් කරන්න' : 'Submit')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* --- RESULTS SCREEN --- */}
                {step === 'results' && results && (
                    <div className="assessment-results">
                        <div className="results-header">
                            <span className="results-icon">✅</span>
                            <h2>{lang === 'si' ? 'ඔබේ ප්‍රතිඵල' : 'Your Results'}</h2>
                        </div>

                        <div className="results-cards">
                            {/* PHQ-2 Result */}
                            <div className="result-card">
                                <div className="result-card-header">
                                    <span>📘 PHQ-2</span>
                                    <span className="result-card-label">
                                        {lang === 'si' ? 'මනෝ අවපීඩනය' : 'Depression'}
                                    </span>
                                </div>
                                <div className="result-score-row">
                                    <span
                                        className="result-score"
                                        style={{ color: getScoreColor(results.phq2_total, 3) }}
                                    >
                                        {results.phq2_total}/6
                                    </span>
                                    <div className="result-bar-bg">
                                        <div
                                            className="result-bar-fill"
                                            style={{
                                                width: `${(results.phq2_total / 6) * 100}%`,
                                                backgroundColor: getScoreColor(results.phq2_total, 3)
                                            }}
                                        />
                                        <div className="result-threshold" style={{ left: '50%' }} />
                                    </div>
                                </div>
                                <p className="result-interpretation" style={{ color: getScoreColor(results.phq2_total, 3) }}>
                                    {getScoreLabel(results.phq2_total, 3)}
                                </p>
                            </div>

                            {/* GAD-2 Result */}
                            <div className="result-card">
                                <div className="result-card-header">
                                    <span>📗 GAD-2</span>
                                    <span className="result-card-label">
                                        {lang === 'si' ? 'කනස්සල්ල' : 'Anxiety'}
                                    </span>
                                </div>
                                <div className="result-score-row">
                                    <span
                                        className="result-score"
                                        style={{ color: getScoreColor(results.gad2_total, 3) }}
                                    >
                                        {results.gad2_total}/6
                                    </span>
                                    <div className="result-bar-bg">
                                        <div
                                            className="result-bar-fill"
                                            style={{
                                                width: `${(results.gad2_total / 6) * 100}%`,
                                                backgroundColor: getScoreColor(results.gad2_total, 3)
                                            }}
                                        />
                                        <div className="result-threshold" style={{ left: '50%' }} />
                                    </div>
                                </div>
                                <p className="result-interpretation" style={{ color: getScoreColor(results.gad2_total, 3) }}>
                                    {getScoreLabel(results.gad2_total, 3)}
                                </p>
                            </div>
                        </div>

                        <p className="results-disclaimer">
                            {lang === 'si'
                                ? '⚕️ මෙය සායනික රෝග විනිශ්චයක් නොවේ. ඔබ කනස්සල්ලට පත්ව සිටී නම්, කරුණාකර සුදුසුකම් ලත් උපදේශකයෙකු හමුවන්න.'
                                : '⚕️ This is not a clinical diagnosis. If you are concerned, please speak with a qualified counselor. Your scores have been saved to your Wellness Report.'}
                        </p>

                        <button className="assessment-done-btn" onClick={handleClose}>
                            {lang === 'si' ? 'ස්තූතියි, වසන්න' : 'Thank You, Close'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelfAssessmentModal;