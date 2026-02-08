import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Eye, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './StoryViewer.css';

interface Story {
    id: string;
    media_url: string;
    media_type: 'image' | 'video';
    content: string | null;
    created_at: string;
    user_id: string;
    profiles: {
        name: string;
        avatar_url: string | null;
    };
}

interface StoryViewerProps {
    stories: Story[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onInteraction?: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, isOpen, onClose, onInteraction }) => {
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [showViewers, setShowViewers] = useState(false);
    const [viewers, setViewers] = useState<any[]>([]);
    const [likes, setLikes] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLiked, setIsLiked] = useState(false);



    // Helper functions defined before effects to avoid hoisting issues
    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex((prev: number) => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev: number) => prev - 1);
            setProgress(0);
        }
    };

    const fetchInteractions = async (storyId: string) => {
        if (!storyId) return;
        try {
            const [vRes, lRes, cRes] = await Promise.all([
                supabase.from('story_views').select('*, profiles:viewer_id(name, avatar_url)').eq('story_id', storyId),
                supabase.from('story_likes').select('*').eq('story_id', storyId),
                supabase.from('story_comments').select('*, profiles:user_id(name, avatar_url)').eq('story_id', storyId).order('created_at', { ascending: true })
            ]);

            setViewers(vRes.data || []);
            setLikes(lRes.data || []);
            setComments(cRes.data || []);
            setIsLiked((lRes.data as any[])?.some((l: any) => l.user_id === user?.id) || false);
        } catch (err) {
            console.error('Error fetching interactions:', err);
        }
    };

    const recordView = async (storyId: string) => {
        if (!user || !storyId) return;
        try {
            const { error } = await (supabase.from('story_views') as any).upsert({
                story_id: storyId,
                viewer_id: user.id
            }, { onConflict: 'story_id, viewer_id' });

            if (!error) {
                onInteraction?.();
            }
        } catch (err) {
            console.error('Error recording view:', err);
        }
    };

    const handleLike = async () => {
        if (!user || !stories[currentIndex]) return;
        const storyId = stories[currentIndex].id;
        try {
            if (isLiked) {
                await (supabase.from('story_likes') as any).delete().eq('story_id', storyId).eq('user_id', user.id);
            } else {
                await (supabase.from('story_likes') as any).insert({ story_id: storyId, user_id: user.id });
            }
            setIsLiked(!isLiked);
            fetchInteractions(storyId);
            onInteraction?.();
        } catch (err) {
            console.error('Error liking story:', err);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim() || !stories[currentIndex]) return;
        const storyId = stories[currentIndex].id;
        try {
            await (supabase.from('story_comments') as any).insert({
                story_id: storyId,
                user_id: user.id,
                content: newComment.trim()
            });
            setNewComment('');
            fetchInteractions(storyId);
        } catch (err) {
            console.error('Error commenting on story:', err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setProgress(0);
            if (stories[initialIndex]) {
                fetchInteractions(stories[initialIndex].id);
                recordView(stories[initialIndex].id);
            }
        }
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (isOpen && stories[currentIndex]) {
            fetchInteractions(stories[currentIndex].id);
            recordView(stories[currentIndex].id);
        }
    }, [currentIndex]);

    useEffect(() => {
        if (!isOpen) return;

        const duration = 5000; // 5 seconds per story
        const interval = 50; // Update progress every 50ms
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isOpen, currentIndex]);

    if (!isOpen || stories.length === 0) return null;

    const currentStory = stories[currentIndex];

    return (
        <div className="story-viewer-overlay">
            <div className="story-viewer-content">
                {/* Progress Bars */}
                <div className="progress-bars">
                    {stories.map((_, index) => (
                        <div key={index} className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: index < currentIndex ? '100%' : (index === currentIndex ? `${progress}%` : '0%')
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="story-viewer-header">
                    <div className="user-info">
                        <div className="user-avatar">
                            {currentStory.profiles?.avatar_url ? (
                                <img src={currentStory.profiles.avatar_url} alt={currentStory.profiles.name} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {currentStory.profiles?.name?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{currentStory.profiles?.name}</span>
                            <span className="story-time">
                                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <button className="close-viewer-btn" onClick={onClose}><X size={32} /></button>
                </div>

                {/* Media Content */}
                <div className="story-viewer-media">
                    {currentStory.media_type === 'video' ? (
                        <video src={currentStory.media_url} autoPlay playsInline muted onEnded={handleNext} />
                    ) : (
                        <img src={currentStory.media_url} alt="Story content" />
                    )}

                    {currentStory.content && (
                        <div className="story-caption-overlay">
                            <p>{currentStory.content}</p>
                        </div>
                    )}
                </div>

                {/* Navigation Controls */}
                <button className="nav-btn prev" onClick={handlePrev} disabled={currentIndex === 0}>
                    <ChevronLeft size={32} />
                </button>
                <button className="nav-btn next" onClick={handleNext}>
                    <ChevronRight size={32} />
                </button>

                {/* Interaction Footer */}
                <div className="story-viewer-footer">
                    <form className="story-comment-form" onSubmit={handleComment}>
                        <input
                            type="text"
                            placeholder="Send a message..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}><Send size={20} /></button>
                    </form>
                    <div className="story-actions">
                        <button className={`story-action-btn like ${isLiked ? 'active' : ''}`} onClick={handleLike}>
                            <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
                            {likes.length > 0 && <span>{likes.length}</span>}
                        </button>
                        {user?.id === currentStory.user_id && (
                            <button className="story-action-btn viewers" onClick={() => setShowViewers(!showViewers)}>
                                <Eye size={28} />
                                <span>{viewers.length}</span>
                            </button>
                        )}
                        <button className="story-action-btn comments-toggle" onClick={() => { }}>
                            <MessageCircle size={28} />
                            {comments.length > 0 && <span>{comments.length}</span>}
                        </button>
                    </div>
                </div>

                {/* Floating Comments Overlay */}
                <div className="floating-comments">
                    {comments.slice(-5).map((c: any, i: number) => (
                        <div key={c.id} className="floating-comment-item" style={{ animationDelay: `${i * 0.2}s` }}>
                            <span className="commenter-name">{c.profiles?.name}</span>
                            <p className="commenter-text">{c.content}</p>
                        </div>
                    ))}
                </div>

                {/* Viewers Modal */}
                {showViewers && (
                    <div className="viewers-modal-overlay" onClick={() => setShowViewers(false)}>
                        <div className="viewers-modal card" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Viewers ({viewers.length})</h3>
                                <button onClick={() => setShowViewers(false)}><X size={20} /></button>
                            </div>
                            <div className="viewers-list">
                                {viewers.map((v: any) => (
                                    <div key={v.id} className="viewer-item">
                                        <div className="viewer-avatar">
                                            {v.profiles?.avatar_url ? <img src={v.profiles.avatar_url} /> : v.profiles?.name[0]}
                                        </div>
                                        <span>{v.profiles?.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryViewer;
