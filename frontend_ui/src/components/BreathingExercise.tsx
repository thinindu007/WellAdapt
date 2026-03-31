/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './BreathingExercise.css';

// Breathing Technique Definitions
interface BreathingTechnique {
    id: string;
    name: { en: string; si: string };
    description: { en: string; si: string };
    phases: { label: { en: string; si: string }; duration: number; type: 'inhale' | 'hold' | 'exhale' }[];
    color: string;
    rounds: number;
}

const TECHNIQUES: BreathingTechnique[] = [
    {
        id: 'box',
        name: { en: 'Box Breathing', si: 'කොටු ආශ්වාසය' },
        description: {
            en: 'Used by Navy SEALs for calm under pressure. Equal counts of 4 for each phase.',
            si: 'පීඩනය යටතේ සන්සුන්කම සඳහා. සෑම අදියරක්ම සඳහා 4ක් බැගින් සමාන ගණන්.'
        },
        phases: [
            { label: { en: 'Breathe In', si: 'හුස්ම ගන්න' }, duration: 4, type: 'inhale' },
            { label: { en: 'Hold', si: 'රඳවන්න' }, duration: 4, type: 'hold' },
            { label: { en: 'Breathe Out', si: 'හුස්ම පිට කරන්න' }, duration: 4, type: 'exhale' },
            { label: { en: 'Hold', si: 'රඳවන්න' }, duration: 4, type: 'hold' },
        ],
        color: '#38bdf8',
        rounds: 4,
    },
    {
        id: '478',
        name: { en: '4-7-8 Relaxing Breath', si: '4-7-8 ලිහිල් ආශ්වාසය' },
        description: {
            en: 'Developed by Dr. Andrew Weil. Activates the parasympathetic nervous system for deep relaxation.',
            si: 'ආචාර්ය ඇන්ඩෲ වෙයිල් විසින් සංවර්ධනය කරන ලදී. ගැඹුරු ලිහිල්කම සඳහා.'
        },
        phases: [
            { label: { en: 'Breathe In', si: 'හුස්ම ගන්න' }, duration: 4, type: 'inhale' },
            { label: { en: 'Hold', si: 'රඳවන්න' }, duration: 7, type: 'hold' },
            { label: { en: 'Breathe Out', si: 'හුස්ම පිට කරන්න' }, duration: 8, type: 'exhale' },
        ],
        color: '#a78bfa',
        rounds: 4,
    },
    {
        id: 'calm',
        name: { en: 'Calming Breath', si: 'සන්සුන් ආශ්වාසය' },
        description: {
            en: 'A simple technique for beginners. Extended exhale triggers your body\'s relaxation response.',
            si: 'ආරම්භකයින් සඳහා සරල ශිල්පීය ක්‍රමයකි. දීර්ඝ පිටකිරීම ඔබේ ශරීරයේ ලිහිල්කම ක්‍රියාත්මක කරයි.'
        },
        phases: [
            { label: { en: 'Breathe In', si: 'හුස්ම ගන්න' }, duration: 4, type: 'inhale' },
            { label: { en: 'Breathe Out', si: 'හුස්ම පිට කරන්න' }, duration: 6, type: 'exhale' },
        ],
        color: '#34d399',
        rounds: 6,
    },
];

function BreathingExercise() {
    const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>(TECHNIQUES[0]);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [currentRound, setCurrentRound] = useState(1);
    const [countdown, setCountdown] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [totalSecondsElapsed, setTotalSecondsElapsed] = useState(0);

    const navigate = useNavigate();
    const lang = (localStorage.getItem('lang') as 'en' | 'si') || 'en';
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Web Audio API: Generate a soft tone
    const playTone = useCallback((frequency: number, duration: number) => {
        if (!soundEnabled) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            // Soft volume with fade-out
            gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            // Silently fail if AudioContext isn't available
            console.warn("Audio not available:", e);
        }
    }, [soundEnabled]);

    // Phase transition tone
    const playPhaseTransition = useCallback((type: 'inhale' | 'hold' | 'exhale') => {
        const toneMap = { inhale: 523.25, hold: 392.00, exhale: 329.63 }; // C5, G4, E4
        playTone(toneMap[type], 0.3);
    }, [playTone]);

    // Completion chime
    const playCompletionChime = useCallback(() => {
        playTone(523.25, 0.15);
        setTimeout(() => playTone(659.25, 0.15), 150);
        setTimeout(() => playTone(783.99, 0.3), 300);
    }, [playTone]);

    // Timer Logic
    useEffect(() => {
        if (!isActive || isPaused) return;

        const phase = selectedTechnique.phases[currentPhaseIndex];

        if (countdown <= 0) {
            // Move to next phase
            const nextPhaseIndex = currentPhaseIndex + 1;

            if (nextPhaseIndex >= selectedTechnique.phases.length) {
                // Completed a round
                if (currentRound >= selectedTechnique.rounds) {
                    // All rounds complete
                    setIsActive(false);
                    setIsComplete(true);
                    playCompletionChime();
                    return;
                }
                setCurrentRound(prev => prev + 1);
                setCurrentPhaseIndex(0);
                const nextPhase = selectedTechnique.phases[0];
                setCountdown(nextPhase.duration);
                playPhaseTransition(nextPhase.type);
            } else {
                setCurrentPhaseIndex(nextPhaseIndex);
                const nextPhase = selectedTechnique.phases[nextPhaseIndex];
                setCountdown(nextPhase.duration);
                playPhaseTransition(nextPhase.type);
            }
            return;
        }

        timerRef.current = setTimeout(() => {
            setCountdown(prev => prev - 1);
            setTotalSecondsElapsed(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isActive, isPaused, countdown, currentPhaseIndex, currentRound, selectedTechnique, playPhaseTransition, playCompletionChime]);

    // Controls
    const startExercise = () => {
        setIsActive(true);
        setIsPaused(false);
        setIsComplete(false);
        setCurrentPhaseIndex(0);
        setCurrentRound(1);
        setTotalSecondsElapsed(0);
        const firstPhase = selectedTechnique.phases[0];
        setCountdown(firstPhase.duration);
        playPhaseTransition(firstPhase.type);
    };

    const pauseExercise = () => setIsPaused(true);
    const resumeExercise = () => setIsPaused(false);

    const stopExercise = () => {
        setIsActive(false);
        setIsPaused(false);
        setIsComplete(false);
        setCurrentPhaseIndex(0);
        setCurrentRound(1);
        setCountdown(0);
        setTotalSecondsElapsed(0);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const selectTechnique = (technique: BreathingTechnique) => {
        if (isActive) stopExercise();
        setSelectedTechnique(technique);
        setIsComplete(false);
    };

    // Compute animation state
    const currentPhase = selectedTechnique.phases[currentPhaseIndex];
    const getCircleScale = (): number => {
        if (!isActive) return 0.6;
        const phase = currentPhase;
        const progress = 1 - (countdown / phase.duration);
        if (phase.type === 'inhale') return 0.6 + (0.4 * progress); // 0.6 -> 1.0
        if (phase.type === 'exhale') return 1.0 - (0.4 * progress); // 1.0 -> 0.6
        return phase.type === 'hold' ? (currentPhaseIndex === 1 ? 1.0 : 0.6) : 0.8;
    };

    // Total exercise time calculation
    const totalExerciseSeconds = selectedTechnique.phases.reduce((sum, p) => sum + p.duration, 0) * selectedTechnique.rounds;
    const progressPercent = isActive ? (totalSecondsElapsed / totalExerciseSeconds) * 100 : 0;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
            }
        };
    }, []);

    return (
        <div className="app-root">
            <div className="breathing-layout">
                {/* --- Header --- */}
                <header className="breathing-header">
                    <div className="breathing-header-left">
                        <button className="back-to-chat-btn" onClick={() => navigate('/chat')}>
                            ← {lang === 'si' ? 'චැට් එකට ආපසු' : 'Back to Chat'}
                        </button>
                        <h2 className="breathing-title">
                            {lang === 'si' ? '🧘 සන්සුන්කම අභ්‍යාස' : '🧘 Mindfulness Exercises'}
                        </h2>
                    </div>
                    <button
                        className={`sound-toggle ${soundEnabled ? 'on' : 'off'}`}
                        onClick={() => setSoundEnabled(prev => !prev)}
                        title={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
                    >
                        {soundEnabled ? '🔊' : '🔇'}
                    </button>
                </header>

                <div className="breathing-content">
                    {/* --- Left: Technique Selector --- */}
                    <div className="technique-panel">
                        <h3 className="panel-title">
                            {lang === 'si' ? 'ක්‍රමයක් තෝරන්න' : 'Choose a Technique'}
                        </h3>
                        {TECHNIQUES.map(tech => (
                            <div
                                key={tech.id}
                                className={`technique-card ${selectedTechnique.id === tech.id ? 'selected' : ''}`}
                                onClick={() => selectTechnique(tech)}
                                style={{
                                    borderColor: selectedTechnique.id === tech.id ? tech.color : 'transparent'
                                }}
                            >
                                <div className="technique-dot" style={{ backgroundColor: tech.color }} />
                                <div className="technique-info">
                                    <span className="technique-name">{tech.name[lang]}</span>
                                    <span className="technique-phases">
                                        {tech.phases.map(p => `${p.duration}s`).join(' · ')} × {tech.rounds}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Technique Description */}
                        <div className="technique-detail">
                            <p>{selectedTechnique.description[lang]}</p>
                            <div className="technique-timeline">
                                {selectedTechnique.phases.map((phase, idx) => (
                                    <div key={idx} className="timeline-phase">
                                        <div
                                            className="timeline-bar"
                                            style={{
                                                width: `${(phase.duration / selectedTechnique.phases.reduce((s, p) => s + p.duration, 0)) * 100}%`,
                                                backgroundColor: selectedTechnique.color,
                                                opacity: phase.type === 'hold' ? 0.4 : phase.type === 'exhale' ? 0.7 : 1
                                            }}
                                        />
                                        <span className="timeline-label">
                                            {phase.label[lang]} ({phase.duration}s)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats for current session */}
                        {isActive && (
                            <div className="session-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{currentRound}/{selectedTechnique.rounds}</span>
                                    <span className="stat-label">{lang === 'si' ? 'වට' : 'Round'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{Math.floor(totalSecondsElapsed / 60)}:{(totalSecondsElapsed % 60).toString().padStart(2, '0')}</span>
                                    <span className="stat-label">{lang === 'si' ? 'කාලය' : 'Elapsed'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Animated Breathing Circle */}
                    <div className="breathing-circle-area">
                        {isComplete ? (
                            /* Completion Screen */
                            <div className="completion-screen">
                                <div className="completion-icon">✨</div>
                                <h3>{lang === 'si' ? 'සම්පූර්ණයි!' : 'Well Done!'}</h3>
                                <p>
                                    {lang === 'si'
                                        ? `ඔබ ${selectedTechnique.rounds} වට සාර්ථකව සම්පූර්ණ කළා. ඔබට දැන් වඩා සන්සුන්ව දැනෙන්න ඕන.`
                                        : `You completed ${selectedTechnique.rounds} rounds of ${selectedTechnique.name.en}. You should feel calmer now.`}
                                </p>
                                <div className="completion-stats">
                                    <span>⏱️ {Math.floor(totalSecondsElapsed / 60)}m {totalSecondsElapsed % 60}s</span>
                                    <span>🔄 {selectedTechnique.rounds} {lang === 'si' ? 'වට' : 'rounds'}</span>
                                </div>
                                <div className="completion-actions">
                                    <button className="restart-btn" onClick={startExercise}>
                                        🔄 {lang === 'si' ? 'නැවත ආරම්භ කරන්න' : 'Restart'}
                                    </button>
                                    <button className="back-chat-btn" onClick={() => navigate('/chat')}>
                                        💬 {lang === 'si' ? 'චැට් එකට යන්න' : 'Back to Chat'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Active Breathing Circle */
                            <>
                                {/* Progress ring */}
                                {isActive && (
                                    <svg className="progress-ring" viewBox="0 0 300 300">
                                        <circle
                                            cx="150" cy="150" r="140"
                                            fill="none"
                                            stroke="#334155"
                                            strokeWidth="3"
                                        />
                                        <circle
                                            cx="150" cy="150" r="140"
                                            fill="none"
                                            stroke={selectedTechnique.color}
                                            strokeWidth="3"
                                            strokeDasharray={`${2 * Math.PI * 140}`}
                                            strokeDashoffset={`${2 * Math.PI * 140 * (1 - progressPercent / 100)}`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 150 150)"
                                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                                        />
                                    </svg>
                                )}

                                {/* The breathing circle */}
                                <div
                                    className={`breathing-circle ${isActive ? 'active' : ''} ${isPaused ? 'paused' : ''}`}
                                    style={{
                                        transform: `scale(${getCircleScale()})`,
                                        borderColor: selectedTechnique.color,
                                        boxShadow: isActive
                                            ? `0 0 60px ${selectedTechnique.color}30, 0 0 120px ${selectedTechnique.color}15`
                                            : 'none',
                                        transition: `transform ${isActive && !isPaused ? '1s' : '0.5s'} ease-in-out`
                                    }}
                                >
                                    <div className="circle-inner">
                                        {isActive ? (
                                            <>
                                                <span className="phase-label" style={{ color: selectedTechnique.color }}>
                                                    {currentPhase.label[lang]}
                                                </span>
                                                <span className="countdown-number">{countdown}</span>
                                                {isPaused && (
                                                    <span className="paused-label">
                                                        {lang === 'si' ? 'විරාමය' : 'Paused'}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="idle-label">
                                                {lang === 'si' ? 'ආරම්භ කිරීමට ඔබන්න' : 'Press Start'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                <div className="breathing-controls">
                                    {!isActive ? (
                                        <button
                                            className="control-btn start"
                                            onClick={startExercise}
                                            style={{ backgroundColor: selectedTechnique.color }}
                                        >
                                            ▶ {lang === 'si' ? 'ආරම්භ කරන්න' : 'Start Exercise'}
                                        </button>
                                    ) : (
                                        <>
                                            {isPaused ? (
                                                <button className="control-btn resume" onClick={resumeExercise}>
                                                    ▶ {lang === 'si' ? 'ඉදිරියට' : 'Resume'}
                                                </button>
                                            ) : (
                                                <button className="control-btn pause" onClick={pauseExercise}>
                                                    ⏸ {lang === 'si' ? 'විරාම' : 'Pause'}
                                                </button>
                                            )}
                                            <button className="control-btn stop" onClick={stopExercise}>
                                                ⏹ {lang === 'si' ? 'නවත්වන්න' : 'Stop'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tip Section */}
                <div className="breathing-tip">
                    <span className="tip-icon">💡</span>
                    <p>
                        {lang === 'si'
                            ? 'වඩාත් ඵලදායී ප්‍රතිඵල සඳහා, සුවපහසු ඉරියව්වකින් වාඩිවී, ඇස් පියන්න, සහ නාසයෙන් හුස්ම ගන්න.'
                            : 'For best results, sit comfortably, close your eyes, and breathe through your nose. Practice daily for cumulative benefits.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default BreathingExercise;