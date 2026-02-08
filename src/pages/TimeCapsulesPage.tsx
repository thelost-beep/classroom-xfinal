import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './TimeCapsulesPage.css';

const TimeCapsulesPage: React.FC = () => {
    const [capsules, setCapsules] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [unlockDate, setUnlockDate] = useState('');
    const [type, setType] = useState<'personal' | 'class' | 'teacher'>('personal');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    const fetchCapsules = async () => {
        try {
            const { data, error } = await (supabase
                .from('time_capsules') as any)
                .select('*, profiles:creator_id(name)')
                .order('unlock_date', { ascending: true });

            if (error) throw error;
            setCapsules(data || []);
        } catch (error) {
            console.error('Error fetching capsules:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCapsules();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !unlockDate || !user) return;

        setSaving(true);
        try {
            const { error } = await (supabase
                .from('time_capsules') as any)
                .insert({
                    creator_id: user.id,
                    content: content.trim(),
                    unlock_date: new Date(unlockDate).toISOString(),
                    capsule_type: type,
                    is_locked: true
                });

            if (error) throw error;

            setContent('');
            setUnlockDate('');
            fetchCapsules();
        } catch (error) {
            console.error('Error burying capsule:', error);
        } finally {
            setSaving(false);
        }
    };

    const isUnlocked = (date: string) => {
        return new Date(date).getTime() <= new Date().getTime();
    };

    return (
        <div className="time-capsules animate-fadeIn">
            <div className="capsules-header">
                <h1>Time Capsules</h1>
                <p className="text-secondary">Bury memories today, unlock them years later.</p>
            </div>

            <div className="capsules-layout">
                <section className="capsule-builder card">
                    <h3>Bury a New Memory</h3>
                    <form onSubmit={handleSubmit} className="capsule-form">
                        <select
                            className="input"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <option value="personal">Personal Capsule (Only me)</option>
                            <option value="class">Class Capsule (Everyone)</option>
                        </select>
                        <textarea
                            className="input textarea"
                            placeholder="What do you want to tell your future self/class?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                        <div className="form-group">
                            <label>Unlock Date</label>
                            <input
                                type="date"
                                className="input"
                                value={unlockDate}
                                onChange={(e) => setUnlockDate(e.target.value)}
                                required
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !content.trim()}
                        >
                            {saving ? 'Burying...' : '🔒 Bury Capsule'}
                        </button>
                    </form>
                </section>

                <section className="capsule-inventory">
                    <h3>The Burial Ground</h3>
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <div className="capsule-list">
                            {capsules.length === 0 ? (
                                <p className="text-tertiary">No capsules found.</p>
                            ) : (
                                capsules.map((c) => {
                                    const unlocked = isUnlocked(c.unlock_date);
                                    const canView = c.capsule_type === 'class' || c.creator_id === user?.id;

                                    if (!canView) return null;

                                    return (
                                        <div key={c.id} className={`capsule-item card ${unlocked ? 'unlocked' : 'locked'} animate-slideUp`}>
                                            <div className="capsule-status">
                                                <span className="type-badge">{c.capsule_type}</span>
                                                <span className="status-icon">{unlocked ? '🔓' : '🔒'}</span>
                                            </div>

                                            {unlocked ? (
                                                <div className="unlocked-content">
                                                    <p className="capsule-content-text">{c.content}</p>
                                                    <div className="capsule-footer">
                                                        <span className="text-xs">Burying by {c.profiles?.name}</span>
                                                        <span className="text-xs">Unlocked on {new Date(c.unlock_date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="locked-content">
                                                    <p className="locked-msg">Locked until {new Date(c.unlock_date).toLocaleDateString()}</p>
                                                    <div className="countdown-hint">
                                                        Wait for the time to pass...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default TimeCapsulesPage;
