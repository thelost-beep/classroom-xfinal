import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import type { PostWithDetails } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import PostRenderer from '../components/PostRenderer';
import LoadingSpinner from '../components/LoadingSpinner';
import './PostDetailPage.css';

const PostDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<PostWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchPost = async () => {
        if (!id) return;

        try {
            const { data, error } = await (supabase
                .from('posts') as any)
                .select(`
          *,
          profiles:user_id (*),
          media (*),
          likes (*, profiles:user_id (*)),
          comments (*, profiles:user_id (*)),
          tags (*, profiles:tagged_user_id (*)),
          post_collaborations (id, status, profiles:collaborator_id (id, name, avatar_url))
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            const acceptedCollabs = (data as any).post_collaborations?.filter((c: any) => c.status === 'accepted') || [];

            const postWithDetails: PostWithDetails = {
                ...data,
                like_count: (data as any).likes?.length || 0,
                comment_count: (data as any).comments?.length || 0,
                is_liked: (data as any).likes?.some((like: any) => like.user_id === user?.id) || false,
                collaborators: acceptedCollabs.map((c: any) => c.profiles),
                raw_collaborations: (data as any).post_collaborations
            } as any;

            setPost(postWithDetails);
        } catch (error) {
            console.error('Error fetching post:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPost();

        if (!id) return;

        const channel = supabase
            .channel(`post-detail-${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'likes',
                filter: `post_id=eq.${id}`
            }, () => fetchPost())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'comments',
                filter: `post_id=eq.${id}`
            }, () => fetchPost())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, user?.id]);

    if (loading) {
        return <LoadingSpinner fullPage message="Getting post details..." />;
    }

    if (!post) {
        return (
            <div className="container text-center p-xl">
                <h2>Post not found</h2>
                <button onClick={() => navigate(-1)} className="btn btn-secondary mt-md">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="post-detail-page animate-fadeIn">
            <div className="detail-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <h1>Post Details</h1>
            </div>

            <div className="detail-content">
                <div className="main-post-container">
                    <PostRenderer post={post} onUpdate={fetchPost} />
                </div>

                <div className="detail-extras grid grid-cols-1 lg:grid-cols-2 gap-lg mt-xl">
                    <section className="likes-section glass-card p-lg">
                        <div className="section-header mb-md">
                            <Heart size={20} className="text-secondary" />
                            <h3>Likes ({post.like_count || 0})</h3>
                        </div>
                        <div className="likes-grid">
                            {(!post.likes || (post.likes as any[]).length === 0) ? (
                                <div className="empty-state py-lg text-center">
                                    <p className="text-tertiary">No likes yet. Be the first!</p>
                                </div>
                            ) : (
                                <div className="user-avatars-list">
                                    {(post.likes as any[]).map((like: any) => (
                                        <Link key={like.id} to={`/profile/${like.user_id}`} className="user-avatar-item tooltip" data-tip={like.profiles?.name}>
                                            <div className="avatar-md squircle">
                                                {like.profiles?.avatar_url ? (
                                                    <img src={like.profiles.avatar_url} alt={like.profiles.name} />
                                                ) : (
                                                    <span>{like.profiles?.name?.[0]?.toUpperCase()}</span>
                                                )}
                                            </div>
                                            <span className="user-name-sm">{like.profiles?.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="comments-full-section glass-card p-lg">
                        <div className="section-header mb-md">
                            <MessageCircle size={20} className="text-secondary" />
                            <h3>All Comments ({post.comment_count || 0})</h3>
                        </div>
                        <div className="comments-elaborate-list">
                            {(!post.comments || (post.comments as any[]).length === 0) ? (
                                <div className="empty-state py-lg text-center">
                                    <p className="text-tertiary">No comments yet. Start the conversation!</p>
                                </div>
                            ) : (
                                (post.comments as any[]).map((comment: any) => (
                                    <div key={comment.id} className="comment-premium-item">
                                        <div className="comment-header">
                                            <Link to={`/profile/${comment.user_id}`} className="avatar-sm squircle">
                                                {comment.profiles?.avatar_url ? (
                                                    <img src={comment.profiles.avatar_url} alt={comment.profiles.name} />
                                                ) : (
                                                    <span>{comment.profiles?.name?.[0]?.toUpperCase() || 'U'}</span>
                                                )}
                                            </Link>
                                            <div className="comment-meta">
                                                <Link to={`/profile/${comment.user_id}`} className="commenter-name">
                                                    {comment.profiles?.name}
                                                </Link>
                                                <span className="comment-time">
                                                    {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="comment-content">
                                            <p>{comment.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PostDetailPage;
