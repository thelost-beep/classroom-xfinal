import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types/database';
import './ClassmateSearch.css';

interface ClassmateSearchProps {
    query: string;
    onSelect: (student: Profile) => void;
    onClose: () => void;
}

const ClassmateSearch: React.FC<ClassmateSearchProps> = ({ query, onSelect, onClose }) => {
    const [classmates, setClassmates] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        const fetchClassmates = async () => {
            if (query.length === 0) {
                setClassmates([]);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('name', `%${query}%`)
                    .limit(5);

                if (error) throw error;
                setClassmates(data || []);
            } catch (error) {
                console.error('Error fetching classmates for mention:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchClassmates, 200);
        return () => clearTimeout(timer);
    }, [query]);

    if (query.length === 0 && classmates.length === 0) return null;

    return (
        <div className="classmate-search-dropdown shadow-lg">
            {loading ? (
                <div className="search-loading">Searching...</div>
            ) : classmates.length === 0 ? (
                <div className="search-empty">No classmates found</div>
            ) : (
                classmates.map(student => (
                    <div
                        key={student.id}
                        className="search-item"
                        onClick={() => onSelect(student)}
                    >
                        <div className="item-avatar">
                            {student.avatar_url ? (
                                <img src={student.avatar_url} alt={student.name} />
                            ) : (
                                <span>{student.name[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="item-info">
                            <span className="item-name">{student.name}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ClassmateSearch;
