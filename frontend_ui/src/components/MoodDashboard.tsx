/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';
import { translations } from '../utils/translations';
import './MoodDashboard.css';

// --- Emotion Color Map (consistent across all charts) ---
const EMOTION_COLORS: Record<string, string> = {
    'Joy': '#34d399',
    'Happy': '#34d399',
    'Happiness': '#34d399',
    'Love': '#f472b6',
    'Surprise': '#fbbf24',
    'Sadness': '#60a5fa',
    'Sad': '#60a5fa',
    'Anger': '#f87171',
    'Angry': '#f87171',
    'Fear': '#a78bfa',
    'Stress': '#fb923c',
    'Anxiety': '#e879f9',
    'Disgust': '#94a3b8',
    'Neutral': '#64748b',
    'CRISIS': '#ef4444',
    'Unknown': '#475569',
};

const getEmotionColor = (emotion: string): string => {
    return EMOTION_COLORS[emotion] || '#64748b';
};

// --- Emotion Emoji Map ---
const EMOTION_EMOJIS: Record<string, string> = {
    'Joy': '😊', 'Happy': '😊', 'Happiness': '😊',
    'Love': '💜', 'Surprise': '😲',
    'Sadness': '😢', 'Sad': '😢',
    'Anger': '😠', 'Angry': '😠',
    'Fear': '😰', 'Stress': '😓',
    'Anxiety': '😟', 'Disgust': '😣',
    'Neutral': '😐', 'CRISIS': '🚨',
};

function MoodDashboard() {
    const [trends, setTrends] = useState<any[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTimeRange, setActiveTimeRange] = useState<'7' | '14' | '30'>('30');

    const navigate = useNavigate();
    const lang = (localStorage.getItem('lang') as 'en' | 'si') || 'en';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t = translations[lang];

    useEffect(() => {
        fetchAllAnalytics();
    }, []);

    const fetchAllAnalytics = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        try {
            const [trendsRes, distRes, summaryRes] = await Promise.all([
                axios.get('http://localhost:5000/api/chat/analytics/mood-trends', { headers }),
                axios.get('http://localhost:5000/api/chat/analytics/mood-distribution', { headers }),
                axios.get('http://localhost:5000/api/chat/analytics/summary', { headers }),
            ]);

            setTrends(trendsRes.data.data);
            setDistribution(distRes.data.data);
            setSummary(summaryRes.data.data);
        } catch (err) {
            console.error("Analytics fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- Transform trend data for the stacked area chart ---
    const getFilteredTrendData = () => {
        const daysAgo = parseInt(activeTimeRange);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysAgo);

        const filtered = trends.filter(item => new Date(item.date) >= cutoff);

        // Group by date, with each emotion as a key
        const dateMap: Record<string, any> = {};
        const allEmotions = new Set<string>();

        filtered.forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = { date: dateStr };
            }
            dateMap[dateStr][item.emotion] = item.count;
            allEmotions.add(item.emotion);
        });

        return {
            data: Object.values(dateMap),
            emotions: Array.from(allEmotions)
        };
    };

    // --- Custom Tooltip for Area Chart ---
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="mood-tooltip">
                    <p className="mood-tooltip-label">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '0.85rem' }}>
                            {EMOTION_EMOJIS[entry.name] || '•'} {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // --- Custom Tooltip for Pie Chart ---
    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const total = distribution.reduce((sum: number, d: any) => sum + d.count, 0);
            const percentage = ((data.value / total) * 100).toFixed(1);
            return (
                <div className="mood-tooltip">
                    <p style={{ color: data.payload.fill, fontWeight: 700 }}>
                        {EMOTION_EMOJIS[data.name] || '•'} {data.name}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {data.value} messages ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    const { data: trendChartData, emotions: trendEmotions } = getFilteredTrendData();

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>{lang === 'si' ? 'විශ්ලේෂණ පූරණය වෙමින්...' : 'Loading your wellness analytics...'}</p>
            </div>
        );
    }

    const hasData = trends.length > 0 || distribution.length > 0;

    return (
        <div className="app-root">
            <div className="dashboard-layout">
                {/* --- Navigation Header --- */}
                <header className="dashboard-header">
                    <div className="dashboard-header-left">
                        <button className="back-to-chat-btn" onClick={() => navigate('/chat')}>
                            ← {lang === 'si' ? 'චැට් එකට ආපසු' : 'Back to Chat'}
                        </button>
                        <h2 className="dashboard-title">
                            {lang === 'si' ? '📊 මගේ සුවතා දර්ශක පුවරුව' : '📊 My Wellness Dashboard'}
                        </h2>
                    </div>
                    <div className="dashboard-header-right">
                        <span className="dashboard-subtitle">
                            {lang === 'si' ? 'පසුගිය දින 30 ක දත්ත' : 'Last 30 days of emotional data'}
                        </span>
                    </div>
                </header>

                {!hasData ? (
                    <div className="dashboard-empty">
                        <div className="empty-icon">💬</div>
                        <h3>{lang === 'si' ? 'තවම දත්ත නැත' : 'No Data Yet'}</h3>
                        <p>
                            {lang === 'si'
                                ? 'ඔබේ මනෝභාව ප්‍රවණතා බැලීමට WellAdapt සමඟ කතා කිරීම ආරම්භ කරන්න.'
                                : 'Start chatting with WellAdapt to see your mood trends appear here.'}
                        </p>
                        <button className="start-chat-btn" onClick={() => navigate('/chat')}>
                            {lang === 'si' ? 'කතා කිරීම ආරම්භ කරන්න' : 'Start a Conversation'}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* --- Summary Cards Row --- */}
                        <div className="summary-cards">
                            <div className="summary-card">
                                <span className="summary-icon">💬</span>
                                <div className="summary-info">
                                    <span className="summary-value">{summary?.totalMessages || 0}</span>
                                    <span className="summary-label">
                                        {lang === 'si' ? 'මුළු පණිවිඩ' : 'Total Messages'}
                                    </span>
                                </div>
                            </div>

                            <div className="summary-card">
                                <span className="summary-icon">🧠</span>
                                <div className="summary-info">
                                    <span className="summary-value">{summary?.sessionCount || 0}</span>
                                    <span className="summary-label">
                                        {lang === 'si' ? 'සැසි' : 'Sessions'}
                                    </span>
                                </div>
                            </div>

                            <div className="summary-card dominant-mood-card">
                                <span className="summary-icon">
                                    {EMOTION_EMOJIS[summary?.topEmotion?.emotion] || '📊'}
                                </span>
                                <div className="summary-info">
                                    <span className="summary-value" style={{ color: getEmotionColor(summary?.topEmotion?.emotion) }}>
                                        {summary?.topEmotion?.emotion || 'N/A'}
                                    </span>
                                    <span className="summary-label">
                                        {lang === 'si' ? 'ප්‍රධාන මනෝභාවය' : 'Dominant Mood'}
                                    </span>
                                </div>
                            </div>

                            <div className="summary-card">
                                <span className="summary-icon">🔥</span>
                                <div className="summary-info">
                                    <div className="recent-streak">
                                        {summary?.recentEmotions?.slice(0, 5).map((item: any, idx: number) => (
                                            <span key={idx} className="streak-emoji" title={item.emotion}>
                                                {EMOTION_EMOJIS[item.emotion] || '•'}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="summary-label">
                                        {lang === 'si' ? 'මෑත මනෝභාවය' : 'Recent Mood'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* --- Main Chart: Emotion Trend Over Time --- */}
                        <div className="chart-section">
                            <div className="chart-header">
                                <h3>{lang === 'si' ? '📈 කාල මනෝභාව ප්‍රවණතා' : '📈 Mood Trends Over Time'}</h3>
                                <div className="time-range-toggle">
                                    {(['7', '14', '30'] as const).map(range => (
                                        <button
                                            key={range}
                                            className={`range-btn ${activeTimeRange === range ? 'active' : ''}`}
                                            onClick={() => setActiveTimeRange(range)}
                                        >
                                            {range}d
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-container">
                                {trendChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                {trendEmotions.map(emotion => (
                                                    <linearGradient key={emotion} id={`gradient-${emotion}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={getEmotionColor(emotion)} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={getEmotionColor(emotion)} stopOpacity={0} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                            <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {trendEmotions.map(emotion => (
                                                <Area
                                                    key={emotion}
                                                    type="monotone"
                                                    dataKey={emotion}
                                                    stroke={getEmotionColor(emotion)}
                                                    fillOpacity={1}
                                                    fill={`url(#gradient-${emotion})`}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4, strokeWidth: 2 }}
                                                />
                                            ))}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="no-chart-data">
                                        {lang === 'si' ? 'මෙම කාල පරාසය සඳහා දත්ත නැත' : 'No data for this time range'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* --- Bottom Row: Pie Chart + Weekly Activity --- */}
                        <div className="charts-row">
                            {/* Emotion Distribution Pie Chart */}
                            <div className="chart-section half-chart">
                                <div className="chart-header">
                                    <h3>{lang === 'si' ? '🎯 මනෝභාව බෙදාහැරීම' : '🎯 Emotion Distribution'}</h3>
                                </div>
                                <div className="chart-container pie-container">
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={distribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={3}
                                                dataKey="count"
                                                nameKey="emotion"
                                                animationBegin={0}
                                                animationDuration={800}
                                            >
                                                {distribution.map((entry: any, index: number) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={getEmotionColor(entry.emotion)}
                                                        stroke="transparent"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                                        {EMOTION_EMOJIS[value] || ''} {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Weekly Activity Bar Chart */}
                            <div className="chart-section half-chart">
                                <div className="chart-header">
                                    <h3>{lang === 'si' ? '📅 සතිපතා ක්‍රියාකාරිත්වය' : '📅 Weekly Activity'}</h3>
                                </div>
                                <div className="chart-container">
                                    {summary?.weeklyActivity && summary.weeklyActivity.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={summary.weeklyActivity.map((item: any) => ({
                                                ...item,
                                                date: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: '#1e293b',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px',
                                                        color: '#f1f5f9'
                                                    }}
                                                    formatter={(value: any) => [`${value} messages`, 'Activity']}
                                                />
                                                <Bar
                                                    dataKey="count"
                                                    fill="#38bdf8"
                                                    radius={[4, 4, 0, 0]}
                                                    animationDuration={800}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="no-chart-data">
                                            {lang === 'si' ? 'මෙම සතියේ දත්ත නැත' : 'No activity this week'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- Emotion Legend / Key --- */}
                        <div className="emotion-legend-section">
                            <h4>{lang === 'si' ? 'මනෝභාව යතුර' : 'Emotion Key'}</h4>
                            <div className="emotion-legend-grid">
                                {distribution.map((item: any) => {
                                    const total = distribution.reduce((sum: number, d: any) => sum + d.count, 0);
                                    const percentage = ((item.count / total) * 100).toFixed(1);
                                    return (
                                        <div key={item.emotion} className="legend-item">
                                            <div
                                                className="legend-dot"
                                                style={{ backgroundColor: getEmotionColor(item.emotion) }}
                                            />
                                            <span className="legend-emoji">{EMOTION_EMOJIS[item.emotion] || '•'}</span>
                                            <span className="legend-name">{item.emotion}</span>
                                            <span className="legend-percent">{percentage}%</span>
                                            <div className="legend-bar-bg">
                                                <div
                                                    className="legend-bar-fill"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: getEmotionColor(item.emotion)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MoodDashboard;