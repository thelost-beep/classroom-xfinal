import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import './TeacherLettersPage.css';

const TeacherLettersPage: React.FC = () => {
    const [letters, setLetters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLetters = async () => {
            try {
                const { data, error } = await (supabase
                    .from('teacher_letters') as any)
                    .select('*, profiles:teacher_id(name)')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setLetters(data || []);
            } catch (error) {
                console.error('Error fetching letters:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLetters();
    }, []);

    return (
        <div className="teacher-letters-page animate-fadeIn">
            <div className="letters-header">
                <h1>Teacher's Letters</h1>
                <p className="text-secondary">Wisdom and messages shared by our mentors.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-xl">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="letters-list">
                    {letters.length === 0 ? (
                        <div className="empty-state text-center p-xl">
                            <p>No letters from teachers yet. They must be working on something special!</p>
                        </div>
                    ) : (
                        letters.map((letter) => (
                            <div key={letter.id} className="letter-card card animate-slideUp">
                                <div className="letter-meta">
                                    <span className="teacher-name">From: {letter.profiles?.name}</span>
                                    <span className="letter-date">{new Date(letter.created_at).toLocaleDateString()}</span>
                                </div>
                                <h2>{letter.title}</h2>
                                <div className="letter-content">
                                    {letter.content.split('\n').map((para: string, i: number) => (
                                        <p key={i}>{para}</p>
                                    ))}
                                </div>
                                <div className="letter-footer">
                                    <span className="signature">— {letter.profiles?.name}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherLettersPage;
