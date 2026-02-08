import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './PersonalSpacePage.css';

const PersonalSpacePage: React.FC = () => {
    const [journals, setJournals] = useState<any[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    const fetchJournals = async () => {
        if (!user) return;
        try {
            const { data, error } = await (supabase
                .from('journals') as any)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setJournals(data || []);
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchJournals();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !title.trim() || !user) return;

        setSaving(true);
        try {
            const { error } = await (supabase
                .from('journals') as any)
                .insert({
                    user_id: user.id,
                    title: title.trim(),
                    content: content.trim()
                });

            if (error) throw error;

            setTitle('');
            setContent('');
            fetchJournals();
        } catch (error) {
            console.error('Error saving journal:', error);
        } finally {
            setSaving(false);
        }
    };

    const deleteJournal = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this memory?')) return;

        try {
            const { error } = await (supabase
                .from('journals') as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchJournals();
        } catch (error) {
            console.error('Error deleting journal:', error);
        }
    };

    return (
        <div className="personal-space animate-fadeIn">
            <div className="space-header">
                <h1>Personal Space</h1>
                <p className="text-secondary">Your private sanctuary. No classmates, no noise. Just your thoughts.</p>
            </div>

            <div className="space-grid">
                <section className="journal-editor card">
                    <h3>Write a Reflection</h3>
                    <form onSubmit={handleSubmit} className="journal-form">
                        <input
                            type="text"
                            className="input"
                            placeholder="Title of this reflection..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <textarea
                            className="input textarea"
                            placeholder="What are you feeling today?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !content.trim()}
                        >
                            {saving ? 'Saving...' : 'Save to My Space'}
                        </button>
                    </form>
                </section>

                <section className="journal-history">
                    <h3>Past Reflections</h3>
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <div className="journal-list">
                            {journals.length === 0 ? (
                                <p className="text-tertiary">Your journal is currently empty.</p>
                            ) : (
                                journals.map((j) => (
                                    <div key={j.id} className="journal-item card animate-slideUp">
                                        <div className="journal-meta">
                                            <h4>{j.title}</h4>
                                            <div className="journal-actions">
                                                <span className="text-xs text-tertiary">
                                                    {new Date(j.created_at).toLocaleDateString()}
                                                </span>
                                                <button
                                                    onClick={() => deleteJournal(j.id)}
                                                    className="delete-btn"
                                                    title="Delete entry"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <p className="journal-text">{j.content}</p>
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

export default PersonalSpacePage;
