import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './AlumniUpdatesPage.css';

const AlumniUpdatesPage: React.FC = () => {
    const [updates, setUpdates] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    const fetchUpdates = async () => {
        try {
            const { data, error } = await (supabase
                .from('alumni_updates') as any)
                .select('*, profiles:user_id(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUpdates(data || []);
        } catch (error) {
            console.error('Error fetching updates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUpdates();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setSaving(true);
        try {
            const { error } = await (supabase
                .from('alumni_updates') as any)
                .insert({
                    user_id: user.id,
                    content: content.trim()
                });

            if (error) throw error;

            setContent('');
            fetchUpdates();
        } catch (error) {
            console.error('Error saving update:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="alumni-updates animate-fadeIn">
            <div className="updates-header">
                <h1>Alumni Updates</h1>
                <p className="text-secondary">Where are we now? Share your life milestones after school.</p>
            </div>

            <div className="updates-layout">
                <section className="update-poster card">
                    <h3>Share your milestone</h3>
                    <form onSubmit={handleSubmit} className="update-form">
                        <textarea
                            className="input textarea"
                            placeholder="What's new in your life? (Job, move, achievement...)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !content.trim()}
                        >
                            {saving ? 'Posting...' : 'Post Update'}
                        </button>
                    </form>
                </section>

                <section className="updates-timeline">
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <div className="updates-list">
                            {updates.length === 0 ? (
                                <p className="text-tertiary">No updates yet. Be the first to share!</p>
                            ) : (
                                updates.map((u) => (
                                    <div key={u.id} className="update-item card animate-slideUp">
                                        <div className="update-user">
                                            <div className="avatar-sm">
                                                {u.profiles?.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <span className="font-semibold">{u.profiles?.name}</span>
                                                <span className="text-xs text-tertiary ml-sm">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="update-content">{u.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AlumniUpdatesPage;
