import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import type { Profile } from '../types/database';
import LoadingSpinner from '../components/LoadingSpinner';
import './DirectoryPage.css';

const DirectoryPage: React.FC = () => {
    const [students, setStudents] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('name', { ascending: true });

                if (error) throw error;
                setStudents(data || []);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    if (loading) return <LoadingSpinner fullPage message="Loading Class Directory..." />;

    return (
        <div className="directory-page animate-fadeIn">
            <div className="directory-header">
                <h1>Classmates</h1>
                <p className="text-secondary">Class 10 Directory ({students.length} students)</p>
            </div>

            <div className="students-grid">
                {students.map(student => (
                    <Link to={`/profile/${student.id}`} key={student.id} className="student-card card">
                        <div className="student-avatar">
                            {student.avatar_url ? (
                                <img src={student.avatar_url} alt={student.name} />
                            ) : (
                                <span>{student.name[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="student-info">
                            <h3 className="student-name">{student.name}</h3>
                            <p className="student-role">{student.role}</p>
                            {student.bio && <p className="student-bio">{student.bio}</p>}
                        </div>
                        <div className="view-profile-btn">View Profile</div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default DirectoryPage;
