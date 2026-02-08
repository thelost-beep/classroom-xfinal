import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Heart, MessageCircle, Send, MoreHorizontal, Ghost, Lock, Trash2, Flag, Edit2 } from 'lucide-react';
import ShareToChatModal from './ShareToChatModal';
import type { PostWithDetails } from '../types/database';
import './PostRenderer.css';

interface PostRendererProps {
    post: PostWithDetails;
    onUpdate: () => void;
    isDetailView?: boolean;
}

const PostRenderer: React.FC<PostRendererProps> = ({ post, onUpdate, isDetailView = false }) => {
    const [commentText, setCommentText] = useState('');
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || '');
    const [showShareModal, setShowShareModal] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const { user, profile } = useAuth();
    const { showNotification } = useNotification();

    // Determine if it's a "Secret"
    const isSecret = post.post_type === 'secret';

    // Close menu when clicking away
    useEffect(() => {
        if (!showActions) return;
        const handleClickAway = () => setShowActions(false);
        document.addEventListener('click', handleClickAway);
        return () => document.removeEventListener('click', handleClickAway);
    }, [showActions]);

    const handleLike = async () => {
        if (!user) return;
        try {
            if (post.is_liked) {
                await (supabase.from('likes') as any).delete().eq('post_id', post.id).eq('user_id', user.id);
            } else {
                await (supabase.from('likes') as any).insert({ post_id: post.id, user_id: user.id });
            }
            onUpdate();
        } catch (error) {
            console.error('Error liking:', error);
        }
    };

    const handleCollabAction = async (status: 'accepted' | 'rejected') => {
        if (!user || !pendingCollab) return;
        try {
            const { error: collabError } = await (supabase
                .from('post_collaborations') as any)
                .update({ status })
                .eq('id', pendingCollab.id);

            if (collabError) throw collabError;

            // Also find and mark the corresponding notification as processed
            await (supabase
                .from('notifications') as any)
                .update({ processed: true, is_read: true })
                .eq('reference_id', post.id)
                .eq('user_id', user.id)
                .eq('type', 'collab_request');

            showNotification(`Collaboration ${status}! ✨`, 'success');
            onUpdate();
        } catch (error: any) {
            showNotification(error.message, 'error');
        }
    };

    const pendingCollab = (post as any).raw_collaborations?.find(
        (c: any) => c.collaborator_id === user?.id && c.status === 'pending'
    );

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !commentText.trim()) return;
        try {
            await (supabase.from('comments') as any).insert({
                post_id: post.id,
                user_id: user.id,
                content: commentText.trim()
            });
            setCommentText('');
            onUpdate();
        } catch (error) {
            console.error('Error commenting:', error);
        }
    };

    const handleReport = async () => {
        if (!user) return;
        const reason = window.prompt('Why are you reporting this post? (e.g. Inappropriate content, spam)');
        if (!reason || !reason.trim()) return;

        try {
            const { error } = await (supabase.from('post_reports') as any).insert({
                post_id: post.id,
                reporter_id: user.id,
                reason: reason.trim()
            });

            if (error) throw error;
            showNotification('Post reported to admins. Thank you.', 'success');
            setShowActions(false);
        } catch (error) {
            console.error('Error reporting post:', error);
            showNotification('Failed to report post', 'error');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) throw error;
            showNotification('Post deleted', 'success');
            onUpdate();
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification('Failed to delete post', 'error');
        }
    };

    const handleUpdate = async () => {
        if (!editContent.trim()) return;
        try {
            const { error } = await (supabase
                .from('posts') as any)
                .update({ content: editContent.trim() })
                .eq('id', post.id);

            if (error) throw error;
            setIsEditing(false);
            showNotification('Post updated!', 'success');
            onUpdate();
        } catch (error) {
            console.error('Error updating post:', error);
            showNotification('Failed to update post', 'error');
        }
    };

    const renderTextWithMentions = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(@[\w\d.]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const query = part.slice(1);
                return (
                    <Link key={i} to={`/explore?q=${query}`} className="mention-link">
                        {part}
                    </Link>
                );
            }
            return part;
        });
    };

    return (
        <div className={`post-renderer ${isSecret ? 'secret-post' : ''} ${showActions ? 'menu-open' : ''} animate-fadeIn`}>
            {/* Post Header */}
            <div className="post-header">
                <div className="post-author-info">
                    {isSecret ? (
                        <div className="avatar secret-avatar"><Ghost size={20} /></div>
                    ) : (
                        <Link to={`/profile/${post.user_id}`} className="avatar">
                            {post.profiles?.avatar_url ? (
                                <img src={post.profiles.avatar_url} alt={post.profiles.name} />
                            ) : (
                                <span>{post.profiles?.name?.[0]?.toUpperCase()}</span>
                            )}
                        </Link>
                    )}
                    <div className="author-meta">
                        <div className="author-name-row">
                            {isSecret ? (
                                <span className="author-name">Class Secret</span>
                            ) : (
                                <>
                                    <Link to={`/profile/${post.user_id}`} className="author-name">
                                        {post.profiles?.name}
                                    </Link>
                                    {post.collaborators && post.collaborators.length > 0 && (
                                        <span className="collab-meta">
                                            <span className="collab-separator"> and </span>
                                            {post.collaborators.map((collab: any, idx: number) => (
                                                <span key={collab.id} className="collab-item">
                                                    <Link to={`/profile/${collab.id}`} className="author-name hover:underline">
                                                        {collab.name}
                                                    </Link>
                                                    {idx < (post.collaborators?.length || 0) - 1 && <span className="collab-separator">, </span>}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                    {post.tags && post.tags.length > 0 && (
                                        <span className="tagged-users">
                                            {' — with '}
                                            {post.tags.map((tag, idx) => (
                                                <React.Fragment key={tag.id}>
                                                    <Link to={`/profile/${tag.tagged_user_id}`} className="tag-link">
                                                        {tag.profiles?.name}
                                                    </Link>
                                                    {idx < (post.tags?.length || 0) - 1 && ', '}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        <span className="post-date">
                            {new Date(post.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="post-actions-menu">
                    <button
                        className="more-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(!showActions);
                        }}
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {showActions && (
                        <div className="actions-dropdown card shadow-lg">
                            {user?.id === post.user_id || profile?.role === 'admin' ? (
                                <>
                                    {user?.id === post.user_id && (
                                        <button className="action-item" onClick={() => { setIsEditing(true); setShowActions(false); }}>
                                            <Edit2 size={16} /> Edit Post
                                        </button>
                                    )}
                                    <button className="action-item delete" onClick={handleDelete}>
                                        <Trash2 size={16} /> {profile?.role === 'admin' && user?.id !== post.user_id ? 'Admin Delete' : 'Delete'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="action-item" onClick={() => { setShowShareModal(true); setShowActions(false); }}>
                                        <Send size={16} /> Share to Chat
                                    </button>
                                    <button className="action-item" onClick={handleReport}><Flag size={16} /> Report</button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* NEW: Collaboration Invitation Banner */}
            {pendingCollab && (
                <div className="collab-invitation-banner animate-slideDown">
                    <div className="banner-content">
                        <div className="banner-icon">
                            <Send size={18} />
                        </div>
                        <div className="banner-info">
                            <p className="banner-title">Collab Invitation</p>
                            <p className="banner-text">You've been invited to co-author this post.</p>
                        </div>
                        <div className="banner-actions">
                            <button className="btn-xs primary" onClick={() => handleCollabAction('accepted')}>
                                Accept
                            </button>
                            <button className="btn-xs outline" onClick={() => handleCollabAction('rejected')}>
                                Ignore
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Content */}
            <div className="post-body">
                {isEditing ? (
                    <div className="post-edit-area">
                        <textarea
                            className="edit-textarea"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                        />
                        <div className="edit-actions">
                            <button className="btn-sm secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn-sm primary" onClick={handleUpdate}>Save</button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <div className="post-text">
                            <p>{renderTextWithMentions(post.content)}</p>
                        </div>
                    )
                )}

                {post.media && (post.media as any[]).length > 0 && (
                    <div
                        className={`post-media-container ${(post.media as any[]).length > 1 ? 'multi-media' : ''}`}
                        onClick={() => setShowTags(!showTags)}
                    >
                        {(post.media as any[]).map((m: any) => (
                            <div key={m.id} className="media-placeholder">
                                {m.file_type === 'image' ? (
                                    <div className="image-tag-wrapper">
                                        <img src={m.file_url} alt="" loading="lazy" />
                                        {showTags && post.tags && post.tags.length > 0 && (
                                            <div className="image-tags-overlay animate-fadeIn">
                                                {post.tags.map((tag: any, idx: number) => (
                                                    <div
                                                        key={tag.id}
                                                        className="image-tag-bubble"
                                                        style={{
                                                            left: `${15 + (idx * 25) % 70}%`,
                                                            top: `${20 + (idx * 30) % 60}%`
                                                        }}
                                                    >
                                                        <Link to={`/profile/${tag.tagged_user_id}`} onClick={(e) => e.stopPropagation()}>
                                                            {tag.profiles?.name}
                                                        </Link>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <video src={m.file_url} controls muted preload="metadata" onClick={(e) => e.stopPropagation()} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Post Actions */}
            <div className="post-footer">
                <div className="post-actions">
                    <div className="action-group">
                        <button
                            className={`action-btn like-btn ${post.is_liked ? 'liked' : ''}`}
                            onClick={handleLike}
                        >
                            <Heart size={26} fill={post.is_liked ? "currentColor" : "none"} />
                        </button>
                        {/* Only link to detail if NOT already in detail view */}
                        {!isDetailView ? (
                            <Link to={`/post/${post.id}`} className="action-btn">
                                <MessageCircle size={26} />
                            </Link>
                        ) : (
                            <button className="action-btn">
                                <MessageCircle size={26} />
                            </button>
                        )}
                        <button className="action-btn" onClick={() => setShowShareModal(true)}>
                            <Send size={26} />
                        </button>
                    </div>
                </div>

                <div className="post-stats">
                    <span className="likes-count">{post.like_count || 0} likes</span>
                </div>

                {/* Caption only if there is media, otherwise it's redundant with post-text */}
                {post.media && (post.media as any[]).length > 0 && post.content && (
                    <div className="post-caption">
                        <span className="caption-author">
                            {isSecret ? 'Secret' : (
                                <Link to={`/profile/${post.user_id}`} className="profile-link-inherit">
                                    {post.profiles?.name}
                                </Link>
                            )}
                        </span>
                        <p className="caption-text">{renderTextWithMentions(post.content)}</p>
                    </div>
                )}

                {!isDetailView && (
                    <>
                        {post.comment_count! > 0 && (
                            <Link to={`/post/${post.id}`} className="view-comments-link">
                                View all {post.comment_count} comments
                            </Link>
                        )}

                        <div className="post-comments-preview">
                            {(post.comments as any[])?.slice(0, 2).map((c: any) => (
                                <div key={c.id} className="comment-item">
                                    <Link to={`/profile/${c.user_id}`} className="comment-author">
                                        {(c.profiles as any)?.name}
                                    </Link>
                                    <span className="comment-text">{renderTextWithMentions(c.content)}</span>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleComment} className="post-comment-form">
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                            />
                            <button type="submit" disabled={!commentText.trim()}>Post</button>
                        </form>
                    </>
                )}
            </div>

            {post.post_type === 'capsule' && (
                <div className="capsule-overlay">
                    <Lock size={24} />
                    <span>Time Capsule</span>
                </div>
            )}

            {showShareModal && (
                <ShareToChatModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    postId={post.id}
                    postPreview={{
                        author: post.profiles?.name || 'Unknown',
                        content: post.content || '',
                        mediaUrl: post.media?.[0]?.file_url
                    }}
                />
            )}
        </div>
    );
};

export default PostRenderer;
