import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './ConfessionsPage.css';

const ConfessionsPage: React.FC = () => {
    const [confessions, setConfessions] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { user, profile } = useAuth();
    const { showNotification } = useNotification();

    const fetchConfessions = async () => {
        try {
            const { data, error } = await (supabase
                .from('confessions') as any)
                .select('*, profiles:user_id(name)')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConfessions(data || []);
        } catch (error) {
            console.error('Error fetching confessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfessions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) return;

        setSubmitting(true);
        try {
            const { error } = await (supabase
                .from('confessions') as any)
                .insert({
                    user_id: user.id,
                    content: content.trim(),
                    is_anonymous: isAnonymous,
                    status: profile?.role === 'admin' ? 'approved' : 'pending' // Auto-approve for admins
                });

            if (error) throw error;

            setContent('');
            if (profile?.role === 'admin') {
                showNotification('Confession posted!', 'success');
                fetchConfessions();
            } else {
                showNotification('Your confession has been submitted for admin approval! 🤫', 'success');
            }
        } catch (error: any) {
            console.error('Error submitting confession:', error);
            showNotification(error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="confessions-page animate-fadeIn">
            <div className="confessions-header">
                <h1>Confessions</h1>
                <p className="text-secondary">Secret thoughts from our class universe</p>
            </div>

            <form onSubmit={handleSubmit} className="confession-form card">
                <textarea
                    className="input textarea"
                    placeholder="What's your secret?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                />
                <div className="form-bottom">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={() => setIsAnonymous(!isAnonymous)}
                        />
                        <span>Post Anonymously</span>
                    </label>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting || !content.trim()}
                    >
                        {submitting ? 'Sending...' : 'Confess'}
                    </button>
                </div>
            </form>

            <div className="confessions-feed mt-xl">
                {loading ? (
                    <div className="flex justify-center">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className="confessions-list">
                        {confessions.length === 0 ? (
                            <div className="empty-state">
                                <p>No secrets revealed yet...</p>
                            </div>
                        ) : (
                            confessions.map((c) => (
                                <div key={c.id} className="confession-item card animate-slideUp">
                                    <div className="confession-meta">
                                        <span className="confession-author">
                                            {c.is_anonymous ? '👤 Anonymous' : `👤 ${c.profiles?.name}`}
                                        </span>
                                        <span className="confession-date">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="confession-content">{c.content}</p>
                                    <div className="confession-reactions">
                                        <button className="reaction-btn">❤️</button>
                                        <button className="reaction-btn">🥺</button>
                                        <button className="reaction-btn">🤫</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfessionsPage;
