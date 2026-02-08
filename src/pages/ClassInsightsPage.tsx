import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './ClassInsightsPage.css';

const ClassInsightsPage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [postsRes, profilesRes, commentsRes, likesRes] = await Promise.all([
                    (supabase.from('posts') as any).select('*', { count: 'exact', head: true }),
                    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
                    (supabase.from('comments') as any).select('*', { count: 'exact', head: true }),
                    (supabase.from('likes') as any).select('*', { count: 'exact', head: true })
                ]);

                const { data: moodData } = await (supabase
                    .from('posts') as any)
                    .select('mood')
                    .not('mood', 'is', null);

                const moods: Record<string, number> = {};
                moodData?.forEach((m: any) => {
                    if (m.mood) moods[m.mood] = (moods[m.mood] || 0) + 1;
                });

                const topMood = Object.entries(moods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

                setStats({
                    postCount: postsRes.count || 0,
                    memberCount: profilesRes.count || 0,
                    commentCount: commentsRes.count || 0,
                    likeCount: likesRes.count || 0,
                    topMood
                });
            } catch (error) {
                console.error('Error fetching insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="class-insights-page animate-fadeIn">
            <div className="insights-header">
                <h1>Class Insights</h1>
                <p className="text-secondary">Visualizing our collective journey</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="insights-grid">
                    <div className="insight-card card">
                        <span className="insight-label">Class Members</span>
                        <span className="insight-value">{stats.memberCount}</span>
                        <div className="insight-icon">👥</div>
                    </div>

                    <div className="insight-card card">
                        <span className="insight-label">Memories Shared</span>
                        <span className="insight-value">{stats.postCount}</span>
                        <div className="insight-icon">✨</div>
                    </div>

                    <div className="insight-card card">
                        <span className="insight-label">Interactions</span>
                        <span className="insight-value">{stats.commentCount + stats.likeCount}</span>
                        <div className="insight-icon">💬</div>
                    </div>

                    <div className="insight-card card">
                        <span className="insight-label">Current Vibe</span>
                        <span className="insight-value" style={{ textTransform: 'capitalize' }}>
                            {stats.topMood}
                        </span>
                        <div className="insight-icon">🌈</div>
                    </div>
                </div>
            )}

            <div className="insights-charts mt-xl">
                <div className="chart-placeholder card">
                    <h3>Activity History</h3>
                    <p className="text-tertiary">Real-time data visualization coming soon...</p>
                    <div className="simple-bar-container">
                        <div className="simple-bar" style={{ width: '80%', background: 'var(--color-primary)' }}></div>
                        <div className="simple-bar" style={{ width: '60%', background: 'var(--color-secondary)' }}></div>
                        <div className="simple-bar" style={{ width: '95%', background: 'var(--color-accent)' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassInsightsPage;
