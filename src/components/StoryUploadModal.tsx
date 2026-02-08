import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { X, Upload, Send } from 'lucide-react';
import './StoryUploadModal.css';

interface StoryUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const StoryUploadModal: React.FC<StoryUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;
        setUploading(true);
        try {
            // 1. Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Math.random()}.${fileExt}`;
            const filePath = `stories/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(filePath);

            // 2. Create story record
            const { error: storyError } = await (supabase
                .from('stories') as any)
                .insert({
                    user_id: user.id,
                    media_url: publicUrl,
                    media_type: file.type.startsWith('video') ? 'video' : 'image',
                    content: content.trim() || null
                });

            if (storyError) throw storyError;

            showNotification('Story shared! ✨', 'success');
            onSuccess();
            onClose();
            setFile(null);
            setPreviewUrl(null);
            setContent('');
        } catch (error) {
            console.error('Error sharing story:', error);
            showNotification('Failed to share story', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="story-modal-overlay" onClick={onClose}>
            <div className="story-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Share a Story</h3>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="modal-body">
                    {!previewUrl ? (
                        <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={48} />
                            <p>Select Photo or Video</p>
                            <span>Classmates can see this for 24 hours</span>
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="story-preview-container">
                            {file?.type.startsWith('video') ? (
                                <video src={previewUrl} controls />
                            ) : (
                                <img src={previewUrl} alt="Preview" />
                            )}
                            <button className="change-file-btn" onClick={() => setPreviewUrl(null)}>
                                <X size={16} /> Change
                            </button>
                        </div>
                    )}

                    <div className="story-meta">
                        <textarea
                            placeholder="Add a caption... (optional)"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="share-story-btn"
                        disabled={!file || uploading}
                        onClick={handleUpload}
                    >
                        {uploading ? 'Sharing...' : (
                            <>
                                <Send size={20} />
                                Share with Class
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryUploadModal;
