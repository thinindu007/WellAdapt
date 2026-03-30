/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // Added for Rich Text/Eye-catching bubbles
import { translations } from '../utils/translations';
import BreathingSuggestionCard from './BreathingSuggestionCard';
import '../App.css';

// --- MODULAR IMPORTS ---
import EmergencyContactModal from '../components/EmergencyContactModal';
import { isCrisisMessage } from '../utils/crisisDetection';

function Chat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ text: string, sender: 'user' | 'bot' }[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentMood, setCurrentMood] = useState<string>('');
    const [isTyping, setIsTyping] = useState(false);
    const [showBreathingSuggestion, setShowBreathingSuggestion] = useState(false);

    // --- NEW: MODULAR STATE ---
    const [showSOS, setShowSOS] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const lang = (localStorage.getItem('lang') as 'en' | 'si') || 'en';
    const t = translations[lang];

    useEffect(() => {
        fetchSessions();
        startNewChat();
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/chat/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data);
        } catch (err) { console.error("Error fetching sessions"); }
    };

    const startNewChat = () => {
        setMessages([{ text: lang === 'si' ? "ආයුබෝවන්! මම ඔබට උදව් කිරීමට මෙහි සිටිමි. ඔබට අද කොහොමද දැනෙන්නේ?" : "Hello! I'm here to support you. How are you feeling today?", sender: 'bot' }]);
        setCurrentSessionId(null);
        setCurrentMood('');
    };

    const loadSession = async (sessionId: string) => {
        try {
            setIsTyping(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/chat/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const history = res.data.flatMap((m: any) => [
                { text: m.user_message, sender: 'user' },
                { text: m.bot_response, sender: 'bot' }
            ]);

            setMessages(history);
            setCurrentSessionId(sessionId);
            setCurrentMood(res.data[res.data.length - 1]?.emotion || '');
        } catch (err) {
            console.error("Error loading session");
        } finally {
            setIsTyping(false);
        }
    };

    const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!window.confirm(t.confirmDelete)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/chat/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (currentSessionId === sessionId) {
                startNewChat();
            }
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Error deleting session.");
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input;

        // ==========================================================
        // STEP 3 INTEGRATION: CLIENT-SIDE SAFETY INTERCEPTOR
        // ==========================================================
        if (isCrisisMessage(userMsg)) {
            setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
            setInput('');
            setShowSOS(true);
            return;
        }

        const token = localStorage.getItem('token');
        setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await axios.post('http://localhost:5000/api/chat',
                {
                    text: userMsg,
                    sessionId: currentSessionId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = response.data;

            if (data.isCrisis) {
                setShowSOS(true);
            }

            if (!currentSessionId && data.sessionId) {
                setCurrentSessionId(data.sessionId);
                fetchSessions();
            }

            setCurrentMood(data.emotion);
            setMessages(prev => [...prev, { text: data.reply || data.response, sender: 'bot' }]);
            setShowBreathingSuggestion(data.suggestBreathing || false);

        } catch (err) {
            console.error("Chat Error:", err);
            setMessages(prev => [...prev, { text: "Error connecting to server.", sender: 'bot' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lang');
        navigate('/login');
    };

    // --- PDF EXPORT FEATURE ---
    const handleExportPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/chat/export-report', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                responseType: 'blob', // Crucial: Tells Axios to handle binary data
            });

            // 1. Create a URL for the blob data
            const url = window.URL.createObjectURL(new Blob([response.data]));

            // 2. Create a temporary "a" tag to trigger download
            const link = document.createElement('a');
            link.href = url;

            // Set the filename
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `WellAdapt_Wellness_Report_${date}.pdf`);

            // 3. Append to body, click, and remove
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("PDF Export Error:", err);
            alert(lang === 'si' ? "වාර්තාව සෑදීමේ දෝෂයක් පවතී." : "Failed to generate the report. Please try again.");
        }
    };

    return (
        <div className="app-root">
            <EmergencyContactModal
                isOpen={showSOS}
                onClose={() => setShowSOS(false)}
                lang={lang}
            />

            <div className="chat-layout">
                <aside className="sidebar">
                    <button className="new-chat-btn" onClick={startNewChat}>{t.newChat}</button>

                    {/* NEW: PDF EXPORT BUTTON IN SIDEBAR */}
                    <button className="export-report-btn" onClick={handleExportPDF}>
                        📊 {lang === 'si' ? 'මගේ සුවතා වාර්තාව' : 'Export My Wellness Report'}
                    </button>
                    {/* NEW: Mood Dashboard Navigation */}
                    <button className="export-report-btn" onClick={() => navigate('/dashboard')}>
                        📈 {lang === 'si' ? 'මනෝභාව දර්ශක පුවරුව' : 'My Mood Dashboard'}
                    </button>
                    {/* NEW: Breathing Exercise Navigation */}
                    <button className="export-report-btn" onClick={() => navigate('/breathing')}>
                        🧘 {lang === 'si' ? 'ආශ්වාස අභ්‍යාස' : 'Breathing Exercises'}
                    </button>

                    <div className="session-list">
                        <p className="sidebar-label">{t.history}</p>
                        {sessions.map((s) => (
                            <div
                                key={s.session_id}
                                className={`session-item ${currentSessionId === s.session_id ? 'active' : ''}`}
                                onClick={() => loadSession(s.session_id)}
                            >
                                <span className="session-title">{s.title}</span>
                                <button className="delete-session-btn" onClick={(e) => deleteSession(e, s.session_id)}>🗑️</button>
                            </div>
                        ))}
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout}>{t.logout}</button>
                </aside>

                <div className="chat-container">
                    <header>
                        <div className="header-left">
                            <h2>WellAdapt Assistant</h2>
                            {currentMood && (
                                <div className={`mood-bubble ${currentMood === 'CRISIS' ? 'crisis-mode' : ''}`}>
                                    {t.detectedMood}: {currentMood}
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="message-area">
                        {messages.map((m, i) => (
                            <div key={i} className={`message ${m.sender}`}>
                                {/* UPDATED: USING REACT-MARKDOWN FOR EYE-CATCHING BUBBLES */}
                                <div className="markdown-content">
                                    <ReactMarkdown>{m.text}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {showBreathingSuggestion && !isTyping && (
                            <BreathingSuggestionCard lang={lang} />
                        )}
                        {isTyping && (
                            <div className="message bot typing">
                                <div className="typing-indicator">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    <div className="input-group">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t.placeholder}
                        />
                        <button onClick={handleSend}>{lang === 'si' ? 'යවන්න' : 'Send'}</button>
                    </div>
                </div>

                <aside className="helpline-panel">
                    <div className="helpline-header">
                        <h3>{t.emergencySupport}</h3>
                        <p>{t.notAlone}</p>
                    </div>

                    <div className="helpline-list">
                        <div className="helpline-card">
                            <span className="helpline-name">NIMH Mental Health</span>
                            <a href="tel:1926" className="helpline-num">1926</a>
                        </div>
                        <div className="helpline-card">
                            <span className="helpline-name">CCC Line (24/7 Support)</span>
                            <a href="tel:1333" className="helpline-num">1333</a>
                        </div>
                        <div className="helpline-card">
                            <span className="helpline-name">Sumithrayo (Emotional)</span>
                            <div className="num-group">
                                <a href="tel:0112696666">011 269 6666</a>
                            </div>
                        </div>
                        <div className="helpline-card highlight-card">
                            <span className="helpline-name">Suwa Seriya (Ambulance)</span>
                            <a href="tel:1990" className="helpline-num emergency">1990</a>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Chat;