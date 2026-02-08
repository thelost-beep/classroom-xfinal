import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, Send, Search, Users, UserPlus } from 'lucide-react';
import type { Chat, Profile } from '../types/database';
import './ShareToChatModal.css';

interface ShareToChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    postPreview: {
        author: string;
        content: string;
        mediaUrl?: string;
    };
}

interface ChatWithParticipants extends Chat {
    other_user?: Profile;
    participants_count?: number;
}

const ShareToChatModal: React.FC<ShareToChatModalProps> = ({ isOpen, onClose, postId, postPreview }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [chats, setChats] = useState<ChatWithParticipants[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalUsers, setGlobalUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchingGlobal, setSearchingGlobal] = useState(false);
    const [sharing, setSharing] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchChats();
        }
    }, [isOpen, user]);

    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.length < 2) {
                setGlobalUsers([]);
                return;
            }
            try {
                setSearchingGlobal(true);
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('name', `%${searchQuery}%`)
                    .neq('id', user?.id)
                    .limit(5);
                setGlobalUsers(data || []);
            } catch (error) {
                console.error('Error searching users:', error);
            } finally {
                setSearchingGlobal(false);
            }
        };

        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, user]);

    const fetchChats = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data: participants, error } = await supabase
                .from('chat_participants')
                .select('chat_id, chats(id, name, type, created_at)')
                .eq('user_id', user.id);

            if (error) throw error;

            const processedChats: ChatWithParticipants[] = await Promise.all((participants || []).map(async (p: any) => {
                const chat = p.chats as Chat;
                let otherUser: Profile | undefined;
                let participantsCount = 0;

                if (chat.type === '1to1') {
                    const { data: otherP } = await supabase
                        .from('chat_participants')
                        .select('user_id, profiles(*)')
                        .eq('chat_id', chat.id)
                        .neq('user_id', user.id)
                        .maybeSingle();

                    if (otherP && (otherP as any).profiles) {
                        otherUser = (otherP as any).profiles;
                    }
                } else {
                    const { count } = await supabase
                        .from('chat_participants')
                        .select('*', { count: 'exact', head: true })
                        .eq('chat_id', chat.id);
                    participantsCount = count || 0;
                }

                return {
                    ...chat,
                    other_user: otherUser,
                    participants_count: participantsCount
                };
            }));

            setChats(processedChats);
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShareToUser = async (targetUserId: string) => {
        if (!user) return;
        try {
            setSharing(targetUserId);
            // Find chats where both users are participants
            const { data: myChats } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('user_id', user.id);

            const myChatIds = (myChats as any[])?.map(c => c.chat_id) || [];

            const { data: commonChat } = await (supabase
                .from('chat_participants')
                .select('chat_id, chats!inner(type)')
                .in('chat_id', myChatIds)
                .eq('user_id', targetUserId)
                .eq('chats.type', '1to1')
                .maybeSingle() as any);

            let chatId = commonChat?.chat_id;

            if (!chatId) {
                // Create new chat
                const { data: newChat, error: chatError } = await (supabase.from('chats') as any)
                    .insert({ type: '1to1' })
                    .select()
                    .single();
                if (chatError) throw chatError;
                chatId = newChat.id;

                // Add participants
                await (supabase.from('chat_participants') as any)
                    .insert([
                        { chat_id: chatId, user_id: user.id },
                        { chat_id: chatId, user_id: targetUserId }
                    ]);
            }

            await handleShareToChat(chatId);
        } catch (error) {
            console.error('Error sharing to user:', error);
            alert('Failed to start chat');
        } finally {
            setSharing(null);
        }
    };

    const handleShareToChat = async (chatId: string) => {
        if (!user || !postId) return;
        try {
            setSharing(chatId);

            const { data: message, error: messageError } = await (supabase.from('messages') as any)
                .insert([{
                    chat_id: chatId,
                    sender_id: user.id,
                    content: `📮 Shared a post`,
                    message_type: 'post'
                }])
                .select()
                .single();

            if (messageError) throw messageError;

            const { error: sharedPostError } = await (supabase.from('shared_posts') as any)
                .insert([{
                    message_id: message.id,
                    post_id: postId
                }]);

            if (sharedPostError) throw sharedPostError;

            onClose();
            navigate(`/chat/${chatId}`);
        } catch (error) {
            console.error('Error sharing post:', error);
            alert('Failed to share post');
        } finally {
            setSharing(null);
        }
    };

    const filteredChats = chats.filter(chat => {
        if (!searchQuery.trim()) return true;
        const name = chat.type === '1to1' ? chat.other_user?.name : chat.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (!isOpen) return null;

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal-content" onClick={e => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h3>Share to Chat</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="post-preview-card">
                    <p className="preview-author">@{postPreview.author}</p>
                    <p className="preview-content">{postPreview.content.slice(0, 100)}{postPreview.content.length > 100 ? '...' : ''}</p>
                    {postPreview.mediaUrl && (
                        <img src={postPreview.mediaUrl} alt="Post preview" className="preview-media" />
                    )}
                </div>

                <div className="search-chats">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search conversations or people..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="chats-list">
                    {loading ? (
                        <p className="loading-text">Loading...</p>
                    ) : (
                        <>
                            {filteredChats.length > 0 && (
                                <div className="list-section">
                                    <h4 className="section-title">Messages</h4>
                                    {filteredChats.map(chat => (
                                        <button
                                            key={chat.id}
                                            className="chat-item-btn"
                                            onClick={() => handleShareToChat(chat.id)}
                                            disabled={sharing !== null}
                                        >
                                            <div className={`chat-avatar ${chat.type === 'group' ? 'group-icon' : ''}`}>
                                                {chat.type === '1to1' ? (
                                                    chat.other_user?.avatar_url ? (
                                                        <img src={chat.other_user.avatar_url} alt={chat.other_user.name} />
                                                    ) : (
                                                        <span>{chat.other_user?.name?.[0]?.toUpperCase() || 'G'}</span>
                                                    )
                                                ) : (
                                                    <Users size={24} />
                                                )}
                                            </div>
                                            <div className="chat-info">
                                                <p className="chat-name">
                                                    {chat.type === '1to1' ? chat.other_user?.name : (chat.name || 'Group Chat')}
                                                </p>
                                                <p className="chat-meta">
                                                    {chat.type === 'group' && `${chat.participants_count} members`}
                                                </p>
                                            </div>
                                            {sharing === chat.id ? <span className="sharing-indicator">...</span> : <Send size={20} className="send-icon" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchingGlobal ? (
                                <div className="list-section">
                                    <h4 className="section-title">Global Search</h4>
                                    <p className="loading-text">Searching class...</p>
                                </div>
                            ) : globalUsers.length > 0 ? (
                                <div className="list-section">
                                    <h4 className="section-title">Global Search</h4>
                                    {globalUsers.map(u => (
                                        <button
                                            key={u.id}
                                            className="chat-item-btn"
                                            onClick={() => handleShareToUser(u.id)}
                                            disabled={sharing !== null}
                                        >
                                            <div className="chat-avatar">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt={u.name} />
                                                ) : (
                                                    <div className="avatar-placeholder">{u.name[0].toUpperCase()}</div>
                                                )}
                                            </div>
                                            <div className="chat-info">
                                                <p className="chat-name">{u.name}</p>
                                                <p className="chat-meta">New conversation</p>
                                            </div>
                                            <UserPlus size={20} className="send-icon" />
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            {filteredChats.length === 0 && globalUsers.length === 0 && searchQuery && !searchingGlobal && (
                                <p className="empty-text">No results found for "{searchQuery}"</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareToChatModal;
