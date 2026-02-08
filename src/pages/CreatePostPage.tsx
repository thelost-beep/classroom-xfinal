import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Camera, BookOpen, Ghost, Sparkles, X, ChevronRight, Clock, Users, Scissors, Search } from 'lucide-react';
import type { Profile } from '../types/database';
import ClassmateSearch from '../components/ClassmateSearch';
import ImageCropModal from '../components/ImageCropModal';
import { compressImage } from '../utils/imageCompression';
import { optimizeVideo } from '../utils/videoOptimization';
import './CreatePostPage.css';

type PostType = 'memory' | 'photo' | 'secret' | 'capsule';

const CreatePostPage: React.FC = () => {
    const [content, setContent] = useState('');
    const [activePostType, setActivePostType] = useState<PostType>('memory');
    const [mood, setMood] = useState('');
    const [visibility] = useState<'class' | 'selected' | 'private'>('class');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [classmates, setClassmates] = useState<Profile[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [collabUsers, setCollabUsers] = useState<Profile[]>([]);
    const [isCollabSearching, setIsCollabSearching] = useState(false);
    const [collabQuery, setCollabQuery] = useState('');
    const [isTagSearching, setIsTagSearching] = useState(false);
    const [tagQuery, setTagQuery] = useState('');
    const [croppingImageIndex, setCroppingImageIndex] = useState<number | null>(null);
    const [unlockDate, setUnlockDate] = useState('');
    const [mentionSearch, setMentionSearch] = useState<{ query: string; position: number } | null>(null);
    const [optimizationProgress, setOptimizationProgress] = useState<{ [key: string]: number }>({});
    const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

    const { user } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClassmates = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', user?.id)
                    .order('name');

                if (error) throw error;
                setClassmates(data || []);
            } catch (error) {
                console.error('Error fetching classmates:', error);
            }
        };

        fetchClassmates();
    }, [user?.id]);

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + mediaFiles.length > 5) {
            showNotification('Maximum 5 files allowed', 'error');
            return;
        }

        const newFiles = [...mediaFiles, ...files];
        setMediaFiles(newFiles);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setMediaPreviews([...mediaPreviews, ...newPreviews]);
    };

    const removeMedia = (index: number) => {
        const newFiles = [...mediaFiles];
        newFiles.splice(index, 1);
        setMediaFiles(newFiles);

        const newPreviews = [...mediaPreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setMediaPreviews(newPreviews);
    };

    // ... inside the component ...
    const uploadMedia = async (postId: string) => {
        const uploadedMedia = [];
        for (let i = 0; i < mediaFiles.length; i++) {
            let file = mediaFiles[i];

            // Compress if image, Optimize if video
            if (file.type.startsWith('image/')) {
                try {
                    file = await compressImage(file);
                } catch (err) {
                    console.error('Compression failed, uploading original:', err);
                }
            } else if (file.type.startsWith('video/')) {
                try {
                    const optimizedBlob = await optimizeVideo(file, (progress) => {
                        setOptimizationProgress(prev => ({ ...prev, [file.name]: progress }));
                    });
                    file = new File([optimizedBlob], file.name, { type: 'video/mp4' });
                } catch (err) {
                    console.error('Video optimization failed, uploading original:', err);
                }
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${postId}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(filePath);

            uploadedMedia.push({
                file_url: publicUrl,
                file_type: file.type.startsWith('image/') ? 'image' : 'video',
                order_index: i,
            });
        }
        return uploadedMedia;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!content.trim() && mediaFiles.length === 0)) return;

        setLoading(true);

        try {
            // 1. Create post
            const { data: post, error: postError } = await (supabase
                .from('posts') as any)
                .insert({
                    user_id: user.id,
                    content: content.trim(),
                    post_type: activePostType,
                    visibility,
                    mood: mood || null,
                })
                .select()
                .single();

            if (postError) throw postError;

            // 2. Upload media
            if (mediaFiles.length > 0) {
                const uploadedMedia = await uploadMedia(post.id);
                const { error: mediaError } = await (supabase
                    .from('media') as any)
                    .insert(uploadedMedia.map((m: any) => ({
                        post_id: post.id,
                        ...m,
                    })));

                if (mediaError) throw mediaError;
            }

            // 2.5 Handle Collaboration Invitation (Multi-Collab)
            if (collabUsers.length > 0) {
                const { error: collabError } = await (supabase
                    .from('post_collaborations') as any)
                    .insert(collabUsers.map(u => ({
                        post_id: post.id,
                        collaborator_id: u.id,
                        status: 'pending'
                    })));

                if (collabError) throw collabError;
            }

            // 3. Save tags
            if (selectedTags.length > 0) {
                await (supabase
                    .from('tags') as any)
                    .insert(selectedTags.map(taggedUserId => ({
                        post_id: post.id,
                        tagged_user_id: taggedUserId,
                    })));
            }

            // 4. Special logic for Time Capsules
            if (activePostType === 'capsule' && unlockDate) {
                await (supabase
                    .from('time_capsules') as any)
                    .insert({
                        creator_id: user.id,
                        capsule_type: 'personal',
                        content: content.trim(),
                        unlock_date: unlockDate,
                        is_locked: true
                    });
            }

            showNotification('shared successfully! ✨', 'success');
            navigate('/');
        } catch (error: any) {
            console.error('Final Creation Error:', error);
            showNotification(`Failed to post: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (userId: string) => {
        setSelectedTags(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const renderHeader = () => {
        const types = [
            { id: 'memory', icon: <BookOpen />, label: 'Memory', color: '#6366f1' },
            { id: 'photo', icon: <Camera />, label: 'Photo/Video', color: '#ec4899' },
            { id: 'secret', icon: <Ghost />, label: 'Secret', color: '#8b5cf6' },
            { id: 'capsule', icon: <Clock />, label: 'Capsule', color: '#f59e0b' },
        ];

        return (
            <div className="post-type-selector">
                {types.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        className={`type-btn ${activePostType === t.id ? 'active' : ''}`}
                        onClick={() => setActivePostType(t.id as PostType)}
                        style={{ '--accent': t.color } as any}
                    >
                        <span className="type-icon">{t.icon}</span>
                        <span className="type-label">{t.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="create-page animate-fadeIn">
            <div className="create-container">
                <div className="create-header">
                    <h1 className="page-title">Create Post</h1>
                    <p className="page-subtitle">Share something special with your class</p>
                </div>

                {renderHeader()}

                <form onSubmit={handleSubmit} className="create-form card">
                    <div className="content-area">
                        <div className="user-mini-profile">
                            <div className="mini-avatar">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="mini-info">
                                <span className="mini-name">{(user as any)?.name || 'You'}</span>
                                <div className="visibility-badge">
                                    <Sparkles size={12} />
                                    <span>Sharing with Class</span>
                                </div>
                            </div>
                        </div>

                        <div className="textarea-wrapper" style={{ position: 'relative' }}>
                            <textarea
                                ref={textAreaRef}
                                className="post-textarea"
                                value={content}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setContent(val);

                                    const cursor = e.target.selectionStart;
                                    const textBeforeCursor = val.slice(0, cursor);
                                    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

                                    if (mentionMatch) {
                                        setMentionSearch({
                                            query: mentionMatch[1],
                                            position: cursor
                                        });
                                    } else {
                                        setMentionSearch(null);
                                    }
                                }}
                                placeholder={
                                    activePostType === 'secret' ? "Write a confession or a secret anonymously..." :
                                        activePostType === 'capsule' ? "Write a message to your future self..." :
                                            "What's on your mind?"
                                }
                                required={activePostType !== 'photo'}
                                rows={6}
                            />
                            {mentionSearch && (
                                <ClassmateSearch
                                    query={mentionSearch.query}
                                    onSelect={(student) => {
                                        const before = content.slice(0, mentionSearch.position - mentionSearch.query.length - 1);
                                        const after = content.slice(mentionSearch.position);
                                        const newContent = `${before}@${student.name} ${after}`;
                                        setContent(newContent);
                                        setMentionSearch(null);
                                        toggleTag(student.id);
                                        textAreaRef.current?.focus();
                                    }}
                                    onClose={() => setMentionSearch(null)}
                                />
                            )}
                        </div>

                        {mediaPreviews.length > 0 && (
                            <div className="media-previews-tray">
                                {mediaPreviews.map((preview, index) => (
                                    <div key={index} className="media-preview-item">
                                        <img src={preview} alt="" />
                                        <div className="media-preview-actions">
                                            {mediaFiles[index]?.type.startsWith('image/') && (
                                                <button type="button" className="edit-media-btn" onClick={() => setCroppingImageIndex(index)}>
                                                    <Scissors size={14} />
                                                </button>
                                            )}
                                            <button type="button" className="remove-media-btn" onClick={() => removeMedia(index)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {croppingImageIndex !== null && (
                        <ImageCropModal
                            image={mediaPreviews[croppingImageIndex]}
                            onCropComplete={(croppedBlob) => {
                                const newFiles = [...mediaFiles];
                                newFiles[croppingImageIndex] = new File([croppedBlob], mediaFiles[croppingImageIndex].name, { type: 'image/jpeg' });
                                setMediaFiles(newFiles);

                                const newPreviews = [...mediaPreviews];
                                URL.revokeObjectURL(newPreviews[croppingImageIndex]);
                                newPreviews[croppingImageIndex] = URL.createObjectURL(croppedBlob);
                                setMediaPreviews(newPreviews);

                                setCroppingImageIndex(null);
                            }}
                            onClose={() => setCroppingImageIndex(null)}
                        />
                    )}

                    <div className="create-actions-tray">
                        <div className="secondary-search-section">
                            <div className="collab-search-wrapper">
                                <label className="search-label">
                                    <Users size={16} />
                                    <span>Collab with</span>
                                </label>
                                <div className="search-input-container">
                                    <Search size={14} className="search-icon-inline" />
                                    <input
                                        type="text"
                                        placeholder="Search classmate to collab..."
                                        className="collab-input"
                                        value={collabQuery}
                                        onChange={(e) => {
                                            setCollabQuery(e.target.value);
                                            setIsCollabSearching(true);
                                        }}
                                        onFocus={() => setIsCollabSearching(true)}
                                    />
                                </div>

                                {collabUsers.length > 0 && (
                                    <div className="selected-collabs-list mt-sm">
                                        {collabUsers.map(u => (
                                            <div key={u.id} className="selected-collab-chip">
                                                <span>{u.name}</span>
                                                <button type="button" onClick={() => setCollabUsers(prev => prev.filter(c => c.id !== u.id))}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isCollabSearching && (
                                    <ClassmateSearch
                                        query={collabQuery}
                                        onSelect={(student) => {
                                            if (!collabUsers.find(u => u.id === student.id)) {
                                                setCollabUsers(prev => [...prev, student]);
                                            }
                                            setIsCollabSearching(false);
                                            setCollabQuery('');
                                        }}
                                        onClose={() => setIsCollabSearching(false)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="action-buttons">
                            <label className="action-btn-pill">
                                <Camera size={20} />
                                <span>Add Photo/Video</span>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleMediaChange}
                                    style={{ display: 'none' }}
                                />
                            </label>

                            <select className="action-select" value={mood} onChange={(e) => setMood(e.target.value)}>
                                <option value="">Mood</option>
                                <option value="happy">😊 Happy</option>
                                <option value="nostalgic">🥺 Nostalgic</option>
                                <option value="funny">😂 Funny</option>
                                <option value="inspired">✨ Inspired</option>
                            </select>

                            {activePostType === 'capsule' && (
                                <div className="unlock-date-input">
                                    <Clock size={16} />
                                    <input
                                        type="date"
                                        value={unlockDate}
                                        onChange={(e) => setUnlockDate(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {activePostType !== 'secret' && (
                        <div className="tags-section">
                            <h4 className="section-label">Tag Classmates</h4>
                            <div className="tag-actions">
                                {!isTagSearching ? (
                                    <button
                                        type="button"
                                        className="add-tag-btn"
                                        onClick={() => setIsTagSearching(true)}
                                    >
                                        <Users size={16} />
                                        <span>Tag Classmates</span>
                                    </button>
                                ) : (
                                    <div className="tag-search-input-container">
                                        <Search size={14} className="search-icon-inline" />
                                        <input
                                            type="text"
                                            placeholder="Search classmate to tag..."
                                            className="tag-input"
                                            autoFocus
                                            value={tagQuery}
                                            onChange={(e) => setTagQuery(e.target.value)}
                                            onBlur={() => {
                                                // Small delay to allow clicking search results
                                                setTimeout(() => {
                                                    if (!tagQuery) setIsTagSearching(false);
                                                }, 200);
                                            }}
                                        />
                                        <button type="button" className="close-tag-btn" onClick={() => setIsTagSearching(false)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                {selectedTags.length > 0 && (
                                    <div className="selected-tags-chips mt-sm">
                                        {classmates.filter(c => selectedTags.includes(c.id)).map(m => (
                                            <div key={m.id} className="selected-tag-chip">
                                                <span>{m.name}</span>
                                                <button type="button" onClick={() => toggleTag(m.id)}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isTagSearching && tagQuery.length > 0 && (
                                <div className="tag-search-overlay">
                                    <ClassmateSearch
                                        query={tagQuery}
                                        onSelect={(student) => {
                                            if (!selectedTags.includes(student.id)) {
                                                toggleTag(student.id);
                                            }
                                            setIsTagSearching(false);
                                            setTagQuery('');
                                        }}
                                        onClose={() => setIsTagSearching(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {Object.keys(optimizationProgress).length > 0 && loading && (
                        <div className="optimization-status mt-md">
                            {Object.entries(optimizationProgress).map(([name, progress]) => (
                                <div key={name} className="progress-item">
                                    <span className="text-xs">Optimizing {name}...</span>
                                    <div className="progress-bar-bg">
                                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="submit-section">
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Sharing...' : 'Share Memory'}
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePostPage;
