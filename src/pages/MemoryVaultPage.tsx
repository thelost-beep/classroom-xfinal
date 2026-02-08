import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { Image as ImageIcon, Video, Filter, Download, Maximize2, X } from 'lucide-react';
import './MemoryVaultPage.css';

interface MediaItem {
    id: string;
    file_url: string;
    file_type: 'image' | 'video';
    created_at: string;
    posts: {
        profiles: {
            name: string;
        }
    }
}

const MemoryVaultPage: React.FC = () => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const { data, error } = await supabase
                    .from('media')
                    .select('*, posts(user_id, profiles:user_id(name))')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setMediaItems((data || []) as any);
            } catch (error) {
                console.error('Error fetching vault:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, []);

    const filteredItems = mediaItems.filter(item => {
        if (filter === 'all') return true;
        return item.file_type === filter;
    });

    if (loading) return <LoadingSpinner fullPage message="Opening the class vault..." />;

    return (
        <div className="memory-vault-page animate-fadeIn">
            <div className="vault-header">
                <div className="header-text">
                    <h1 className="page-title">Memory Vault</h1>
                    <p className="page-subtitle">A collection of every moment captured by our class</p>
                </div>
                <div className="vault-stats">
                    <div className="v-stat">
                        <strong>{mediaItems.filter(i => i.file_type === 'image').length}</strong>
                        <span>Photos</span>
                    </div>
                    <div className="v-stat">
                        <strong>{mediaItems.filter(i => i.file_type === 'video').length}</strong>
                        <span>Videos</span>
                    </div>
                </div>
            </div>

            <div className="vault-actions">
                <div className="filter-group">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Media
                    </button>
                    <button
                        className={`filter-tab ${filter === 'image' ? 'active' : ''}`}
                        onClick={() => setFilter('image')}
                    >
                        <ImageIcon size={18} />
                        Photos
                    </button>
                    <button
                        className={`filter-tab ${filter === 'video' ? 'active' : ''}`}
                        onClick={() => setFilter('video')}
                    >
                        <Video size={18} />
                        Videos
                    </button>
                </div>
                <button className="action-icon-btn">
                    <Filter size={20} />
                </button>
            </div>

            <div className="vault-grid">
                {filteredItems.length === 0 ? (
                    <div className="empty-vault">
                        <ImageIcon size={64} />
                        <h3>The vault is empty</h3>
                        <p>Shared photos and videos will appear here automatically.</p>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="vault-card" onClick={() => setSelectedItem(item)}>
                            <div className="vault-media">
                                {item.file_type === 'image' ? (
                                    <img src={item.file_url} alt="Class Memory" loading="lazy" />
                                ) : (
                                    <video src={item.file_url} />
                                )}
                                {item.file_type === 'video' && <div className="video-icon-overlay"><Video size={24} fill="white" /></div>}
                            </div>
                            <div className="vault-overlay">
                                <div className="overlay-top">
                                    <span className="author-tag">{item.posts?.profiles?.name}</span>
                                </div>
                                <div className="overlay-bottom">
                                    <button className="overlay-btn"><Maximize2 size={18} /></button>
                                    <button className="overlay-btn"><Download size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox Modal */}
            {selectedItem && (
                <div className="lightbox-modal" onClick={() => setSelectedItem(null)}>
                    <button className="close-lightbox" onClick={() => setSelectedItem(null)}>
                        <X size={32} />
                    </button>
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        {selectedItem.file_type === 'image' ? (
                            <img src={selectedItem.file_url} alt="Selected Memory" />
                        ) : (
                            <video src={selectedItem.file_url} controls autoPlay />
                        )}
                        <div className="lightbox-info">
                            <div className="info-main">
                                <h3>Memory by {selectedItem.posts?.profiles?.name}</h3>
                                <span>Uploaded on {new Date(selectedItem.created_at).toLocaleDateString()}</span>
                            </div>
                            <button className="download-btn">
                                <Download size={20} />
                                Download High-Res
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemoryVaultPage;
