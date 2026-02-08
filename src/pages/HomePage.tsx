import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import PostRenderer from '../components/PostRenderer';
import LoadingSpinner from '../components/LoadingSpinner';
import StoryTray from '../components/StoryTray';
import { Sparkles, Lock } from 'lucide-react';
import './HomePage.css';

const HomePage: React.FC = () => {
    const [feedItems, setFeedItems] = useState<any[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, profile } = useAuth();

    const fetchUnifiedFeed = async () => {
        try {
            // Fetch latest broadcasts for the sidebar
            const { data: broadcastsRes } = await supabase
                .from('admin_broadcasts')
                .select('*')
                .or(`target_role.eq.all,target_role.eq.${profile?.role}`)
                .order('created_at', { ascending: false })
                .limit(3);

            setBroadcasts(broadcastsRes || []);

            // Fetch normal posts (Memory, Photo, Secret, Capsule)
            // Note: Privacy/Visibility logic should be handled by RLS, but we can filter here too if needed
            const { data: postsRes, error: postsError } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, name, avatar_url, hometown, dream_job),
                    media (id, file_url, file_type),
                    likes (id, user_id),
                    comments (id, content, created_at, profiles:user_id (id, name, avatar_url)),
                    tags (id, profiles:tagged_user_id (id, name, avatar_url)),
                    post_collaborations (id, status, profiles:collaborator_id (id, name, avatar_url))
                `)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            // Fetch teacher letters
            const { data: lettersRes, error: lettersError } = await supabase
                .from('teacher_letters')
                .select('*, profiles:teacher_id (id, name, avatar_url)')
                .eq('is_delivered', true)
                .order('created_at', { ascending: false });

            if (lettersError) throw lettersError;

            // Process Posts
            const posts = (postsRes || []).map((p: any) => {
                const acceptedCollabs = p.post_collaborations?.filter((c: any) => c.status === 'accepted') || [];
                return {
                    ...p,
                    item_type: 'post',
                    like_count: p.likes?.length || 0,
                    comment_count: p.comments?.length || 0,
                    is_liked: p.likes?.some((like: any) => like.user_id === user?.id) || false,
                    collaborators: acceptedCollabs.map((c: any) => c.profiles),
                    raw_collaborations: p.post_collaborations // NEW: Pass the raw data for checking pending status
                };
            });

            // Process Teacher Letters
            const letters = (lettersRes || []).map((l: any) => ({
                ...l,
                item_type: 'teacher_letter',
                created_at: l.created_at
            }));

            // Merge and sort by date
            const unified = [...posts, ...letters].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setFeedItems(unified);
        } catch (error) {
            console.error('Error fetching unified feed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchUnifiedFeed();

        // Realtime updates
        const channel = supabase.channel('home-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchUnifiedFeed())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_letters' }, () => fetchUnifiedFeed())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_broadcasts' }, () => fetchUnifiedFeed())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'post_collaborations' }, () => fetchUnifiedFeed())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    if (loading) return <LoadingSpinner fullPage message="Catching up with your class..." />;

    return (
        <div className="home-page animate-fadeIn">
            <StoryTray />

            <div className="home-content">
                <div className="feed-container">
                    {feedItems.length === 0 ? (
                        <div className="empty-state">
                            <Sparkles size={48} className="empty-icon" />
                            <h3>No updates yet</h3>
                            <p>Posts from your classmates and teachers will appear here.</p>
                            <button className="primary-action-btn" onClick={() => window.location.href = '/create-post'}>
                                Share a Memory
                            </button>
                        </div>
                    ) : (
                        feedItems.map(item => {
                            if (item.item_type === 'post') {
                                return <PostRenderer key={`post-${item.id}`} post={item} onUpdate={fetchUnifiedFeed} />;
                            } else if (item.item_type === 'teacher_letter') {
                                return (
                                    <div key={`letter-${item.id}`} className="teacher-letter-card card">
                                        <div className="card-tag">Letter from Teacher</div>
                                        <div className="letter-header">
                                            <Link to={`/profile/${item.teacher_id}`} className="teacher-info">
                                                <div className="teacher-avatar">👨‍🏫</div>
                                                <div>
                                                    <h3 className="teacher-name">{item.profiles?.name || 'Your Teacher'}</h3>
                                                    <span className="post-date">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </Link>
                                        </div>
                                        <div className="letter-content">
                                            <h2 className="letter-title">{item.title}</h2>
                                            <p className="letter-body">{item.content}</p>
                                        </div>
                                        <div className="letter-footer">
                                            <span className="handwritten">With love, {(item.profiles as any)?.name}</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })
                    )}
                </div>

                {/* Right Sidebar for Desktop */}
                <aside className="feed-sidebar">
                    {broadcasts.length > 0 && (
                        <div className="sidebar-section announcements animate-slideInRight">
                            <h4 className="section-title">Latest Announcements 📢</h4>
                            <div className="broadcast-list">
                                {broadcasts.map(b => (
                                    <div key={b.id} className="broadcast-item">
                                        <div className="broadcast-indicator"></div>
                                        <div className="broadcast-body">
                                            <h6>{b.title}</h6>
                                            <p>{b.content}</p>
                                            <span className="broadcast-date">
                                                {new Date(b.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="sidebar-section">
                        <h4 className="section-title">Class Updates</h4>
                        <div className="update-item">
                            <div className="update-icon"><Sparkles size={16} /></div>
                            <div className="update-text">
                                <p>Welcome to <strong>ClassroomX</strong>!</p>
                                <span>Just now</span>
                            </div>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <h4 className="section-title">Locked Capsules</h4>
                        <div className="locked-capsule">
                            <Lock size={16} />
                            <span>Unlocks in 14 days</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default HomePage;
