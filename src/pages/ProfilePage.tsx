import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import type { Profile, PostWithDetails } from '../types/database';
import PostRenderer from '../components/PostRenderer';
import LoadingSpinner from '../components/LoadingSpinner';
import { MapPin, Briefcase, Calendar, Heart, MessageCircle, Grid as GridIcon, List as ListIcon, Settings, UserPlus, Sparkles } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<PostWithDetails[]>([]);
    const [bestFriends, setBestFriends] = useState<any[]>([]);
    const [bfRequestStatus, setBfRequestStatus] = useState<'pending_sent' | 'pending_received' | 'accepted' | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const navigate = useNavigate();

    const fetchProfileData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, banner_url, bio, hometown, dream_job, dob, is_first_login')
                .eq('id', id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                throw profileError;
            }
            setProfile(profileData as Profile);

            // Fetch Best Friends
            const { data: bfData, error: bfError } = await (supabase
                .from('best_friends') as any)
                .select('friend_id, profiles:friend_id(id, name, avatar_url)')
                .eq('user_id', id);

            if (!bfError) setBestFriends((bfData as any[]).map(d => d.profiles) || []);

            // Check BF Request Status
            if (user && user.id !== id) {
                const { data: request } = await (supabase
                    .from('best_friend_requests') as any)
                    .select('*')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
                    .maybeSingle();

                if (request) {
                    if (request.status === 'accepted') {
                        setBfRequestStatus('accepted');
                    } else if (request.sender_id === user.id) {
                        setBfRequestStatus('pending_sent');
                    } else {
                        setBfRequestStatus('pending_received');
                    }
                } else {
                    setBfRequestStatus(null);
                }
            }

            // Fetch Private Data (Role) if it's the current user's profile
            if (user && user.id === id) {
                const { data: privateData } = await supabase
                    .from('private_profiles' as any)
                    .select('role')
                    .eq('id', id)
                    .single();

                if (privateData) {
                    setProfile(prev => prev ? { ...prev, role: (privateData as any).role } : null);
                }
            }

            // Fetch Posts
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (id, name, avatar_url),
                    media (id, file_url, file_type),
                    likes (id, user_id),
                    comments (id, content, created_at, profiles:user_id (id, name, avatar_url)),
                    tags (id, tagged_user_id, profiles:tagged_user_id (id, name, avatar_url))
                `)
                .eq('user_id', id)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            const processedPosts = (postsData || []).map((p: any) => ({
                ...p,
                like_count: p.likes?.length || 0,
                comment_count: p.comments?.length || 0,
                is_liked: p.likes?.some((like: any) => like.user_id === user?.id) || false
            }));

            setPosts(processedPosts);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchProfileData();
    }, [id, user?.id]);

    const handleBFAction = async (action: 'send' | 'accept' | 'reject' | 'cancel') => {
        if (!user || !id) return;
        try {
            if (action === 'send') {
                await (supabase.from('best_friend_requests') as any).insert({ sender_id: user.id, receiver_id: id });
                setBfRequestStatus('pending_sent');
                showNotification('Best friend request sent! ✨', 'success');
            } else if (action === 'accept') {
                await (supabase.from('best_friend_requests') as any)
                    .update({ status: 'accepted' })
                    .eq('sender_id', id)
                    .eq('receiver_id', user.id);
                setBfRequestStatus('accepted');
                showNotification('You are now Best Friends! 💖', 'success');
            } else if (action === 'reject' || action === 'cancel') {
                await (supabase.from('best_friend_requests') as any)
                    .delete()
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`);
                setBfRequestStatus(null);
                showNotification(action === 'reject' ? 'Request ignored' : 'Request cancelled', 'info');
            }
        } catch (error) {
            console.error('Error in BF action:', error);
            showNotification('Action failed', 'error');
        }
    };

    if (loading) return <LoadingSpinner fullPage message="Unlocking the profile..." />;

    if (!profile) return (
        <div className="empty-state">
            <h2>Classmate not found</h2>
            <button onClick={() => navigate(-1)} className="primary-action-btn">Go Back</button>
        </div>
    );

    const isOwnProfile = user?.id === profile.id;

    return (
        <div className="profile-page animate-fadeInUp">
            <div className="profile-header-container">
                <div className={`profile-header ${!profile.banner_url ? 'default-banner' : ''}`}>
                    {profile.banner_url && (
                        <img src={profile.banner_url} alt="Profile Banner" className="profile-banner-img" />
                    )}
                    <div className="banner-overlay"></div>
                </div>
            </div>

            <div className="profile-essentials">
                <div className="profile-avatar-wrapper">
                    <div className="profile-avatar-large">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.name} />
                        ) : (
                            <span>{profile.name[0].toUpperCase()}</span>
                        )}
                    </div>
                </div>

                <div className="profile-main-info">
                    <div className="name-row">
                        <h1 className="profile-name">{profile.name}</h1>
                        {profile.role === 'teacher' && <span className="teacher-badge">Teacher</span>}
                    </div>
                    <p className="profile-handle">@classmate_{profile.id.substring(0, 4)}</p>
                    <div className="profile-stats-row">
                        <div className="stat-item"><strong>{posts.length}</strong> memories</div>
                        <div className="stat-item"><strong>{bestFriends.length}</strong> friends</div>
                    </div>
                    {profile.bio && (
                        <div className="profile-bio-box">
                            <p className="profile-bio">{profile.bio}</p>
                        </div>
                    )}
                </div>

                <div className="profile-actions-column">
                    {isOwnProfile ? (
                        <Link to="/settings" className="profile-btn secondary">
                            <Settings size={18} />
                            Edit Profile
                        </Link>
                    ) : (
                        <div className="profile-actions-buttons">
                            {bfRequestStatus === 'accepted' ? (
                                <button className="profile-btn secondary">
                                    <Heart size={18} fill="currentColor" />
                                    Besties
                                </button>
                            ) : bfRequestStatus === 'pending_sent' ? (
                                <button className="profile-btn outline" onClick={() => handleBFAction('cancel')}>
                                    Request Sent
                                </button>
                            ) : bfRequestStatus === 'pending_received' ? (
                                <div className="dual-actions">
                                    <button className="profile-btn primary" onClick={() => handleBFAction('accept')}>
                                        Accept
                                    </button>
                                    <button className="profile-btn outline" onClick={() => handleBFAction('reject')}>
                                        Ignore
                                    </button>
                                </div>
                            ) : (
                                <button className="profile-btn primary" onClick={() => handleBFAction('send')}>
                                    <UserPlus size={18} />
                                    Add Bestie
                                </button>
                            )}
                            <button className="profile-btn outline" onClick={() => navigate(`/chat/${id}`)}>
                                Message
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="profile-content-container">
                {bestFriends.length > 0 && (
                    <div className="profile-besties-bar">
                        <h4>Besties</h4>
                        <div className="besties-avatars">
                            {bestFriends.map(friend => (
                                <Link to={`/profile/${friend.id}`} key={friend.id} title={friend.name} className="bestie-avatar-small">
                                    {friend.avatar_url ? (
                                        <img src={friend.avatar_url} alt={friend.name} />
                                    ) : (
                                        <span>{friend.name[0]}</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="profile-details-grid">
                    {profile.hometown && (
                        <div className="p-detail">
                            <MapPin size={16} />
                            <span>{profile.hometown}</span>
                        </div>
                    )}
                    {profile.dream_job && (
                        <div className="p-detail">
                            <Briefcase size={16} />
                            <span>{profile.dream_job}</span>
                        </div>
                    )}
                    {profile.dob && (
                        <div className="p-detail">
                            <Calendar size={16} />
                            <span>Born {new Date(profile.dob).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                <div className="profile-tabs">
                    <div className="tabs-header">
                        <button
                            className={`tab-link ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <GridIcon size={18} />
                            Memories
                        </button>
                        <button
                            className={`tab-link ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon size={18} />
                            Timeline
                        </button>
                    </div>

                    <div className={`tab-content ${viewMode}`}>
                        {posts.length === 0 ? (
                            <div className="empty-feed">
                                <Sparkles size={48} />
                                <p>No memories shared yet</p>
                                {isOwnProfile && <Link to="/create-post" className="link">Share your first one</Link>}
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <div className="memory-grid">
                                    {posts.map(post => (
                                        <Link to={`/post/${post.id}`} key={post.id} className="memory-grid-item">
                                            {post.media && (post.media as any[]).length > 0 ? (
                                                <img src={(post.media as any[])[0].file_url} alt="" />
                                            ) : (
                                                <div className="text-memory-preview">
                                                    <p>{post.content}</p>
                                                </div>
                                            )}
                                            <div className="grid-overlay">
                                                <span><Heart size={16} fill="white" /> {post.like_count}</span>
                                                <span><MessageCircle size={16} fill="white" /> {post.comment_count}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="memory-list">
                                    {posts.map(post => (
                                        <PostRenderer key={post.id} post={post} onUpdate={fetchProfileData} />
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
