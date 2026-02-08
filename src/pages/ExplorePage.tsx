import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import type { Profile } from '../types/database';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Image, BookOpen, Clock, Grid, List } from 'lucide-react';
import './ExplorePage.css';

const ExplorePage: React.FC = () => {
    const navigate = useNavigate();
    const [classmates, setClassmates] = useState<Profile[]>([]);
    const [content, setContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState<'all' | 'photos' | 'memories' | 'capsules'>('all');

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Classmates
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, bio, hometown, dream_job, dob')
                .order('name', { ascending: true });
            setClassmates(profiles || []);

            // 2. Fetch Media for Photos
            if (filter === 'photos') {
                const { data: media } = await supabase
                    .from('media')
                    .select('*, posts(user_id, profiles:user_id(id, name, avatar_url))')
                    .eq('file_type', 'image');

                // Shuffle photos
                const shuffled = (media || []).sort(() => Math.random() - 0.5);
                setContent(shuffled);
            }
            // 3. Fetch Memories (Normal Posts)
            else if (filter === 'memories') {
                const { data: posts } = await supabase
                    .from('posts')
                    .select('*, profiles:user_id(id, name, avatar_url), tags(id, profiles:tagged_user_id(id, name, avatar_url)), post_collaborations(id, status, profiles:collaborator_id(id, name, avatar_url))')
                    .eq('post_type', 'memory')
                    .order('created_at', { ascending: false });

                const processed = ((posts as any) || []).map((p: any) => ({
                    ...p,
                    collaborators: p.post_collaborations?.filter((c: any) => c.status === 'accepted').map((c: any) => c.profiles) || [],
                    raw_collaborations: p.post_collaborations
                }));
                setContent(processed);
            }
            // 4. Fetch Capsules & Confessions
            else if (filter === 'capsules') {
                const { data: posts } = await supabase
                    .from('posts')
                    .select('*, profiles:user_id(id, name, avatar_url), tags(id, profiles:tagged_user_id(id, name, avatar_url)), post_collaborations(id, status, profiles:collaborator_id(id, name, avatar_url))')
                    .in('post_type', ['capsule', 'secret'])
                    .order('created_at', { ascending: false });

                const processed = ((posts as any) || []).map((p: any) => ({
                    ...p,
                    collaborators: p.post_collaborations?.filter((c: any) => c.status === 'accepted').map((c: any) => c.profiles) || [],
                    raw_collaborations: p.post_collaborations
                }));
                setContent(processed);
            }
        } catch (error) {
            console.error('Error fetching explore data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    const filteredClassmates = classmates.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredContent = content.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        // If it's a post
        if (item.content) {
            return item.content.toLowerCase().includes(q) ||
                item.profiles?.name?.toLowerCase().includes(q);
        }
        // If it's a media item (Photo filter)
        if (item.posts?.profiles?.name) {
            return item.posts.profiles.name.toLowerCase().includes(q);
        }
        return true;
    });

    if (loading) return <LoadingSpinner fullPage message="Exploring your class..." />;

    return (
        <div className="explore-page animate-fadeIn">
            <div className="explore-header">
                <h1 className="page-title">Explore</h1>
                <p className="page-subtitle">
                    {filter === 'all' && "Discover your classmates and their memories"}
                    {filter === 'photos' && "A shuffled gallery of class moments"}
                    {filter === 'memories' && "Read shared stories and memories"}
                    {filter === 'capsules' && "Open time capsules and anonymous confessions"}
                </p>
            </div>

            <div className="explore-actions">
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder={filter === 'all' ? "Search classmates..." : "Search content..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {filter === 'all' && (
                    <div className="view-toggles">
                        <button className={`view-btn ${viewType === 'grid' ? 'active' : ''}`} onClick={() => setViewType('grid')}><Grid size={20} /></button>
                        <button className={`view-btn ${viewType === 'list' ? 'active' : ''}`} onClick={() => setViewType('list')}><List size={20} /></button>
                    </div>
                )}
            </div>

            <div className="filter-chips">
                <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All People</button>
                <button className={`filter-chip ${filter === 'photos' ? 'active' : ''}`} onClick={() => setFilter('photos')}><Image size={16} /> Photos</button>
                <button className={`filter-chip ${filter === 'memories' ? 'active' : ''}`} onClick={() => setFilter('memories')}><BookOpen size={16} /> Memories</button>
                <button className={`filter-chip ${filter === 'capsules' ? 'active' : ''}`} onClick={() => setFilter('capsules')}><Clock size={16} /> Capsules</button>
            </div>

            {filter === 'all' ? (
                <div className={`classmates-view ${viewType}`}>
                    {filteredClassmates.map(student => (
                        <Link to={`/profile/${student.id}`} key={student.id} className="classmate-card">
                            <div className="classmate-avatar">
                                {student.avatar_url ? <img src={student.avatar_url} alt={student.name} /> : <span>{student.name[0].toUpperCase()}</span>}
                            </div>
                            <div className="classmate-info">
                                <h3 className="classmate-name">{student.name}</h3>
                                <p className="classmate-role">{student.role}</p>
                                {viewType === 'list' && student.bio && <p className="classmate-bio">{student.bio}</p>}
                            </div>
                            {viewType === 'grid' && <div className="card-overlay"><span>View Profile</span></div>}
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="explore-content-grid">
                    {filter === 'photos' && (
                        <div className="photos-grid">
                            {filteredContent.map((m: any) => (
                                <div key={m.id} className="photo-item" onClick={() => navigate(`/post/${m.post_id}`)}>
                                    <img src={m.file_url} alt="" loading="lazy" />
                                    <div className="photo-overlay">
                                        <span>By {m.posts?.profiles?.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {(filter === 'memories' || filter === 'capsules') && (
                        <div className="memories-list">
                            {filteredContent.map((item: any) => (
                                <Link to={`/post/${item.id}`} key={item.id} className="memory-card card">
                                    <div className="memory-header">
                                        <span className={`post-type-badge ${item.post_type}`}>{item.post_type}</span>
                                        <span className="memory-date">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="memory-preview">{item.content}</p>
                                    <div className="memory-footer">
                                        <span className="author">By {item.post_type === 'secret' ? 'Anonymous' : item.profiles?.name}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {filteredClassmates.length === 0 && filter === 'all' && (
                <div className="empty-state">
                    <p>No classmates found matching "{searchQuery}"</p>
                </div>
            )}

            {content.length === 0 && filter !== 'all' && (
                <div className="empty-state">
                    <p>No {filter} found yet.</p>
                </div>
            )}
        </div>
    );
};

export default ExplorePage;
