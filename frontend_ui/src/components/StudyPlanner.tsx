/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudyPlanner.css';

// Subject Color Palette
const COLORS = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#60a5fa', '#e879f9'];

function StudyPlanner() {
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'setup' | 'schedule'>('setup');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [pointsAnimation, setPointsAnimation] = useState<{ points: number; show: boolean }>({ points: 0, show: false });

    // Setup form state
    const [formData, setFormData] = useState({
        wakeTime: '06:00',
        sleepTime: '23:00',
        hoursPerDay: 6,
        blockDuration: 25,
        breakDuration: 10,
    });
    const [subjects, setSubjects] = useState<{ name: string; examDate: string; difficulty: number }[]>([
        { name: '', examDate: '', difficulty: 3 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const lang = (localStorage.getItem('lang') as 'en' | 'si') || 'en';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/study-plan', { headers });
            if (res.data.data) {
                setPlan(res.data.data);
                setView('schedule');
            } else {
                setView('setup');
            }
        } catch (err) {
            console.error("Fetch plan error:", err);
        } finally {
            setLoading(false);
        }
    };

    // SETUP FORM HANDLERS
    const addSubject = () => {
        if (subjects.length < 8) {
            setSubjects(prev => [...prev, { name: '', examDate: '', difficulty: 3 }]);
        }
    };

    const removeSubject = (index: number) => {
        if (subjects.length > 1) {
            setSubjects(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateSubject = (index: number, field: string, value: any) => {
        setSubjects(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleCreatePlan = async () => {
        const validSubjects = subjects.filter(s => s.name.trim() && s.examDate);
        if (validSubjects.length === 0) {
            alert(lang === 'si' ? 'කරුණාකර අවම වශයෙන් එක් විෂයයක් එක් කරන්න' : 'Please add at least one subject with a name and exam date.');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post('http://localhost:5000/api/study-plan', {
                ...formData,
                subjects: validSubjects,
            }, { headers });
            await fetchPlan();
        } catch (err) {
            console.error("Create plan error:", err);
            alert('Failed to create study plan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!window.confirm(lang === 'si' ? 'ඔබට විශ්වාසද?' : 'Are you sure you want to delete your study plan?')) return;
        try {
            await axios.delete('http://localhost:5000/api/study-plan', { headers });
            setPlan(null);
            setView('setup');
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const handleCompleteTask = async (taskId: number) => {
        try {
            const res = await axios.patch(`http://localhost:5000/api/study-plan/complete-task/${taskId}`, {}, { headers });
            const data = res.data.data;

            // Points animation
            setPointsAnimation({ points: data.pointsEarned, show: true });
            setTimeout(() => setPointsAnimation({ points: 0, show: false }), 2000);

            // Refresh plan
            await fetchPlan();
        } catch (err: any) {
            console.error("Complete task error:", err);
        }
    };

    // COMPUTED VALUES
    const getTodayTasks = () => {
        if (!plan) return [];
        return plan.tasks.filter((t: any) => t.task_date.split('T')[0] === selectedDate);
    };

    const getUniqueDates = (): string[] => {
        if (!plan) return [];
        const dates = [...new Set(plan.tasks.map((t: any) => t.task_date.split('T')[0]))] as string[];
        return dates.sort();
    };

    const getLevel = () => {
        if (!plan) return { level: 1, title: 'Beginner', progress: 0 };
        const points = plan.stats.totalPoints;
        const level = Math.floor(points / 100) + 1;
        const titles = ['Beginner', 'Focused', 'Dedicated', 'Scholar', 'Master', 'Legend'];
        const title = titles[Math.min(level - 1, titles.length - 1)];
        const progress = points % 100;
        return { level, title, progress };
    };

    const getDaysUntilNextExam = () => {
        if (!plan || !plan.subjects) return null;
        const today = new Date();
        const upcoming = plan.subjects
            .map((s: any) => ({ ...s, daysLeft: Math.ceil((new Date(s.exam_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) }))
            .filter((s: any) => s.daysLeft > 0)
            .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
        return upcoming[0] || null;
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>{lang === 'si' ? 'පූරණය වෙමින්...' : 'Loading study planner...'}</p>
            </div>
        );
    }

    return (
        <div className="app-root">
            <div className="planner-layout">
                {/* Points Animation Overlay */}
                {pointsAnimation.show && (
                    <div className="points-popup">+{pointsAnimation.points} pts!</div>
                )}

                {/* Header */}
                <header className="planner-header">
                    <div className="planner-header-left">
                        <button className="back-to-chat-btn" onClick={() => navigate('/chat')}>
                            ← {lang === 'si' ? 'ආපසු' : 'Back to Chat'}
                        </button>
                        <h2 className="planner-title">
                            {lang === 'si' ? 'ස්මාර්ට් අධ්‍යයන සැලසුම්කරු' : 'Smart Study Planner'}
                        </h2>
                    </div>
                    {view === 'schedule' && (
                        <button className="delete-plan-btn" onClick={handleDeletePlan}>
                            {lang === 'si' ? 'සැලැස්ම මකන්න' : 'Reset Plan'}
                        </button>
                    )}
                </header>

                {/* SETUP VIEW */}
                {view === 'setup' && (
                    <div className="planner-setup">
                        <div className="setup-intro">
                            <div className="setup-icon">🎯</div>
                            <h3>{lang === 'si' ? 'ඔබේ අධ්‍යයන සැලැස්ම සාදන්න' : 'Create Your Study Plan'}</h3>
                            <p>{lang === 'si'
                                ? 'ඔබේ විභාග සහ ලබා ගත හැකි කාලය ඇතුළත් කරන්න. අපි ඔබට ප්‍රශස්ත අධ්‍යයන කාලසටහනක් ජනනය කරන්නෙමු.'
                                : 'Enter your exams and available time. We\'ll generate an optimized study schedule with built-in breaks and balanced subject distribution.'}</p>
                        </div>

                        {/* Time Preferences */}
                        <div className="setup-section">
                            <h4>⏰ {lang === 'si' ? 'ඔබේ දෛනික කාලසටහන' : 'Your Daily Schedule'}</h4>
                            <div className="time-grid">
                                <div className="form-field">
                                    <label>{lang === 'si' ? 'අවදි වන වේලාව' : 'Wake Up Time'}</label>
                                    <input type="time" value={formData.wakeTime}
                                        onChange={e => setFormData({ ...formData, wakeTime: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>{lang === 'si' ? 'නිදාගන්න වේලාව' : 'Bedtime'}</label>
                                    <input type="time" value={formData.sleepTime}
                                        onChange={e => setFormData({ ...formData, sleepTime: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>{lang === 'si' ? 'දිනකට අධ්‍යයන පැය' : 'Study Hours/Day'}</label>
                                    <input type="number" min="1" max="12" value={formData.hoursPerDay}
                                        onChange={e => setFormData({ ...formData, hoursPerDay: parseInt(e.target.value) || 4 })} />
                                </div>
                                <div className="form-field">
                                    <label>{lang === 'si' ? 'අධ්‍යයන කොටස (මිනි.)' : 'Study Block (min)'}</label>
                                    <input type="number" min="15" max="60" step="5" value={formData.blockDuration}
                                        onChange={e => setFormData({ ...formData, blockDuration: parseInt(e.target.value) || 25 })} />
                                </div>
                                <div className="form-field">
                                    <label>{lang === 'si' ? 'විරාම කාලය (මිනි.)' : 'Break Time (min)'}</label>
                                    <input type="number" min="5" max="30" step="5" value={formData.breakDuration}
                                        onChange={e => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 10 })} />
                                </div>
                            </div>
                        </div>

                        {/* Subjects */}
                        <div className="setup-section">
                            <h4>📝 {lang === 'si' ? 'ඔබේ විභාග' : 'Your Exams'}</h4>
                            {subjects.map((s, i) => (
                                <div key={i} className="subject-row">
                                    <div className="subject-color" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <input
                                        type="text"
                                        placeholder={lang === 'si' ? 'විෂය නම' : 'Subject name'}
                                        value={s.name}
                                        onChange={e => updateSubject(i, 'name', e.target.value)}
                                        className="subject-input"
                                    />
                                    <input
                                        type="date"
                                        value={s.examDate}
                                        onChange={e => updateSubject(i, 'examDate', e.target.value)}
                                        className="date-input"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <div className="difficulty-select">
                                        <label>{lang === 'si' ? 'දුෂ්කරතාව' : 'Difficulty'}</label>
                                        <select value={s.difficulty} onChange={e => updateSubject(i, 'difficulty', parseInt(e.target.value))}>
                                            <option value={1}>1 - Easy</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3 - Medium</option>
                                            <option value={4}>4</option>
                                            <option value={5}>5 - Hard</option>
                                        </select>
                                    </div>
                                    {subjects.length > 1 && (
                                        <button className="remove-subject-btn" onClick={() => removeSubject(i)}>✕</button>
                                    )}
                                </div>
                            ))}
                            {subjects.length < 8 && (
                                <button className="add-subject-btn" onClick={addSubject}>
                                    + {lang === 'si' ? 'විෂයක් එක් කරන්න' : 'Add Subject'}
                                </button>
                            )}
                        </div>

                        <button
                            className="generate-btn"
                            onClick={handleCreatePlan}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? (lang === 'si' ? 'ජනනය වෙමින්...' : 'Generating...')
                                : (lang === 'si' ? '🚀 මගේ සැලැස්ම ජනනය කරන්න' : '🚀 Generate My Study Plan')}
                        </button>
                    </div>
                )}

                {/* SCHEDULE VIEW */}
                {view === 'schedule' && plan && (
                    <div className="planner-schedule">
                        {/* Stats Bar */}
                        <div className="stats-bar">
                            <div className="stat-card level-card">
                                <span className="stat-emoji">⭐</span>
                                <div>
                                    <span className="stat-number">Lv.{getLevel().level}</span>
                                    <span className="stat-desc">{getLevel().title}</span>
                                </div>
                                <div className="level-bar">
                                    <div className="level-fill" style={{ width: `${getLevel().progress}%` }} />
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-emoji">🏆</span>
                                <div>
                                    <span className="stat-number">{plan.stats.totalPoints}</span>
                                    <span className="stat-desc">{lang === 'si' ? 'ලකුණු' : 'Points'}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-emoji">🔥</span>
                                <div>
                                    <span className="stat-number">{plan.stats.currentStreak}</span>
                                    <span className="stat-desc">{lang === 'si' ? 'දින ධාවනය' : 'Day Streak'}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-emoji">✅</span>
                                <div>
                                    <span className="stat-number">{plan.stats.completionRate}%</span>
                                    <span className="stat-desc">{lang === 'si' ? 'සම්පූර්ණ' : 'Complete'}</span>
                                </div>
                            </div>
                            {getDaysUntilNextExam() && (
                                <div className="stat-card exam-countdown">
                                    <span className="stat-emoji">📅</span>
                                    <div>
                                        <span className="stat-number">{getDaysUntilNextExam()?.daysLeft}d</span>
                                        <span className="stat-desc">{getDaysUntilNextExam()?.subject_name}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date Selector */}
                        <div className="date-selector">
                            <h4>{lang === 'si' ? 'දිනය තෝරන්න' : 'Select Day'}</h4>
                            <div className="date-pills">
                                {getUniqueDates().map((date: string) => {
                                    const d = new Date(date);
                                    const isToday = date === new Date().toISOString().split('T')[0];
                                    const dayTasks = plan.tasks.filter((t: any) => t.task_date.split('T')[0] === date);
                                    const dayComplete = dayTasks.length > 0 && dayTasks.every((t: any) => t.is_completed);

                                    return (
                                        <button
                                            key={date}
                                            className={`date-pill ${selectedDate === date ? 'active' : ''} ${dayComplete ? 'completed' : ''} ${isToday ? 'today' : ''}`}
                                            onClick={() => setSelectedDate(date)}
                                        >
                                            <span className="pill-day">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className="pill-date">{d.getDate()}</span>
                                            {dayComplete && <span className="pill-check">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Today's Tasks */}
                        <div className="daily-tasks">
                            <h4>
                                {selectedDate === new Date().toISOString().split('T')[0]
                                    ? (lang === 'si' ? ' අද කාලසටහන' : ' Today\'s Schedule')
                                    : `📋 ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}
                            </h4>

                            {getTodayTasks().length === 0 ? (
                                <p className="no-tasks">{lang === 'si' ? 'මෙම දිනයට කාර්යයන් නැත' : 'No study blocks scheduled for this day.'}</p>
                            ) : (
                                <div className="task-list">
                                    {getTodayTasks().map((task: any) => (
                                        <div key={task.id} className={`task-item ${task.is_completed ? 'completed' : ''}`}>
                                            <div className="task-time">
                                                <span>{task.start_time}</span>
                                                <span className="task-dash">–</span>
                                                <span>{task.end_time}</span>
                                            </div>
                                            <div className="task-color-bar" style={{ backgroundColor: task.color }} />
                                            <div className="task-info">
                                                <span className="task-subject">{task.subject_name}</span>
                                                <span className="task-duration">{formData.blockDuration || 25} min block</span>
                                            </div>
                                            <button
                                                className={`task-check-btn ${task.is_completed ? 'done' : ''}`}
                                                onClick={() => !task.is_completed && handleCompleteTask(task.id)}
                                                disabled={task.is_completed}
                                            >
                                                {task.is_completed ? '✓' : '○'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Subject Overview */}
                        <div className="subject-overview">
                            <h4>{lang === 'si' ? ' විෂය දළ විసර්ජනය' : ' Subject Overview'}</h4>
                            <div className="subject-cards">
                                {plan.subjects.map((s: any) => {
                                    const subjectTasks = plan.tasks.filter((t: any) => t.subject_id === s.id);
                                    const completed = subjectTasks.filter((t: any) => t.is_completed).length;
                                    const total = subjectTasks.length;
                                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    const daysLeft = Math.ceil((new Date(s.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <div key={s.id} className="subject-card-item">
                                            <div className="subject-card-top">
                                                <div className="subject-dot" style={{ backgroundColor: s.color }} />
                                                <span className="subject-card-name">{s.subject_name}</span>
                                                <span className={`days-badge ${daysLeft <= 3 ? 'urgent' : ''}`}>
                                                    {daysLeft > 0 ? `${daysLeft}d left` : 'Exam day!'}
                                                </span>
                                            </div>
                                            <div className="subject-progress-bar">
                                                <div className="subject-progress-fill" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                                            </div>
                                            <span className="subject-progress-text">{completed}/{total} blocks ({pct}%)</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudyPlanner;