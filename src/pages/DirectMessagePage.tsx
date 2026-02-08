import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Send, Image as ImageIcon, ChevronLeft, Info, Smile, CheckCheck } from 'lucide-react';
import ChatDetailsModal from '../components/ChatDetailsModal';
import './DirectMessagePage.css';

// Using local interface to avoid any type conflicts with generated types
interface MessageWithSender {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    media_url: string | null;
    message_type: 'text' | 'image' | 'post';
    created_at: string;
    sender: {
        name: string;
        avatar_url: string | null;
    };
    message_reactions?: { id: string; emoji: string; user_id: string }[];
    shared_posts?: {
        id: string;
        post_id: string;
        posts: {
            id: string;
            content: string;
            user_id: string;
            profiles: { name: string; avatar_url: string | null };
        };
    }[];
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const DirectMessagePage: React.FC = () => {
    const { id: rawChatId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatInfo, setChatInfo] = useState<any>(null);
    const [chatId, setChatId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'error'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // Main Chat Engine
    useEffect(() => {
        if (!rawChatId || !user) return;

        let isMounted = true;
        let channel: any = null;

        const initializeChat = async () => {
            console.log('[ChatRebuild] Initializing...', rawChatId);
            setConnectionStatus('connecting');
            setErrorMessage(null);

            try {
                let currentId = rawChatId;

                // 1. Resolve ID for Class Group
                if (rawChatId === 'class-group') {
                    // Try to find the Class Group directly by name
                    const { data: classChat, error: classError } = await (supabase
                        .from('chats') as any)
                        .select('id')
                        .eq('name', 'Class Group')
                        .maybeSingle();

                    if (classError) {
                        console.error('Class group resolution failed:', classError);
                        throw new Error(`Connection Error: ${classError.message}`);
                    }

                    if (classChat) {
                        currentId = classChat.id;
                    } else {
                        // Fallback: If it still doesn't exist, create it
                        console.log('Class Group not found, creating...');
                        const { data: newChat, error: createError } = await (supabase.from('chats') as any)
                            .insert({ name: 'Class Group', type: 'group' })
                            .select()
                            .single();

                        if (createError) {
                            console.error('Class group creation failed:', createError);
                            throw new Error(`Failed to initialize group: ${createError.message}`);
                        }
                        currentId = newChat.id;
                    }
                }

                if (!isMounted) return;
                setChatId(currentId);

                // 2. Fetch Chat Details & Participants
                const { data: chatData, error: detailsError } = await (supabase
                    .from('chats') as any)
                    .select('*, chat_participants(user_id, profiles(id, name, avatar_url, role))')
                    .eq('id', currentId as string)
                    .single();

                if (detailsError) {
                    console.error('Chat details fetch failed:', detailsError);
                    throw new Error(`Failed to load chat details: ${detailsError.message}`);
                }

                if (isMounted) {
                    const chat = chatData as any;
                    setParticipants(chat.chat_participants);

                    // Logic to find "Other User" for 1to1
                    if (chat.type === '1to1') {
                        const otherParticipant = chat.chat_participants.find((p: any) => p.user_id !== user.id);
                        setChatInfo({
                            name: otherParticipant?.profiles.name || 'Chat Member',
                            avatar_url: otherParticipant?.profiles.avatar_url,
                            type: '1to1'
                        });
                    } else {
                        setChatInfo({ name: chat.name || 'Group Chat', type: 'group' });
                    }

                    // AUTO-JOIN if not in participants
                    const isInChat = chat.chat_participants.some((p: any) => p.user_id === user.id);
                    if (!isInChat) {
                        console.log('Auto-joining user to chat...');
                        const { error: joinError } = await (supabase.from('chat_participants') as any)
                            .insert({ chat_id: currentId, user_id: user.id });
                        if (joinError) console.warn('Auto-join failed:', joinError);
                    }
                }

                // 3. Fetch Initial Messages
                const { data: msgs, error: fetchError } = await (supabase
                    .from('messages') as any)
                    .select(`
                        *,
                        sender:sender_id(name, avatar_url),
                        message_reactions(id, emoji, user_id),
                        shared_posts: shared_posts(id, post_id, posts(id, content, user_id, profiles(name, avatar_url)))
                    `)
                    .eq('chat_id', currentId as string)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: true });

                if (fetchError) {
                    console.error('Messages fetch failed:', fetchError);
                    throw new Error(`Failed to load messages: ${fetchError.message}`);
                }

                if (isMounted) {
                    setMessages((msgs || []) as MessageWithSender[]);
                    setLoading(false);
                    setConnectionStatus('online');
                    setTimeout(() => scrollToBottom('auto'), 100);
                }

                // 4. Setup Realtime Sync
                channel = supabase
                    .channel(`chat:${currentId}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `chat_id=eq.${currentId}`
                    }, async (payload) => {
                        console.log('[ChatRebuild] New Message Received');
                        // Fetch the full enriched message (sender + shared post)
                        const { data: fullMsg } = await (supabase.from('messages') as any)
                            .select(`
                                *,
                                sender:sender_id(name, avatar_url),
                                message_reactions(id, emoji, user_id),
                                shared_posts: shared_posts(id, post_id, posts(id, content, user_id, profiles(name, avatar_url)))
                            `)
                            .eq('id', payload.new.id)
                            .single();

                        if (isMounted && fullMsg) {
                            setMessages((prev: any[]) => {
                                if (prev.some((m: any) => m.id === fullMsg.id)) return prev;
                                return [...prev, fullMsg];
                            });
                            setTimeout(() => scrollToBottom('smooth'), 50);
                        }
                    })
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'message_reactions'
                    }, (payload) => {
                        if (!isMounted) return;
                        if (payload.eventType === 'INSERT') {
                            setMessages((prev: any[]) => prev.map((m: any) => {
                                if (m.id === payload.new.message_id) {
                                    const reactions = m.message_reactions || [];
                                    if (reactions.some((r: any) => r.id === payload.new.id)) return m;
                                    return { ...m, message_reactions: [...reactions, payload.new] };
                                }
                                return m;
                            }));
                        }
                    })
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'typing_indicators',
                        filter: `chat_id=eq.${currentId}`
                    }, async () => {
                        const { data: typers } = await supabase
                            .from('typing_indicators')
                            .select('user_id, profiles(name)')
                            .eq('chat_id', currentId)
                            .neq('user_id', user.id);

                        if (isMounted) setTypingUsers((typers || []).map((t: any) => t.profiles.name));
                    })
                    .subscribe((status) => {
                        console.log(`[ChatRebuild] Subscription status: ${status}`);
                    });

            } catch (err: any) {
                console.error('[ChatRebuild] Initialization failed:', err);
                if (isMounted) {
                    setErrorMessage(err.message || 'Unknown connection error');
                    setConnectionStatus('error');
                    setLoading(false);
                }
            }
        };

        initializeChat();

        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [rawChatId, user]);

    // Handlers
    const handleTyping = async () => {
        if (!chatId || !user) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        await (supabase.from('typing_indicators') as any)
            .upsert({ chat_id: chatId, user_id: user.id, updated_at: new Date().toISOString() });

        typingTimeoutRef.current = setTimeout(async () => {
            await supabase.from('typing_indicators')
                .delete()
                .eq('chat_id', chatId)
                .eq('user_id', user.id);
        }, 3000);
    };

    const handleSendMessage = async (e?: React.FormEvent, directContent?: string, mediaUrl?: string) => {
        if (e) e.preventDefault();

        const content = directContent || newMessage.trim();
        if (!content && !mediaUrl) return;
        if (!chatId || !user) return;

        if (!directContent) setNewMessage('');

        try {
            const { error } = await (supabase.from('messages') as any)
                .insert([{
                    chat_id: chatId,
                    sender_id: user.id,
                    content: content || '📷 Image',
                    media_url: mediaUrl || null,
                    message_type: mediaUrl ? 'image' : 'text'
                }]);

            if (error) throw error;
        } catch (error: any) {
            console.error('[ChatRebuild] Failed to send:', error);
            alert(`Send failed: ${error.message}`);
            if (!directContent) setNewMessage(content);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !chatId) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `chat/${chatId}/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(filePath);

            await handleSendMessage(undefined, '', publicUrl);
        } catch (error) {
            console.error('[ChatRebuild] Upload failed:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        try {
            await (supabase.from('message_reactions') as any)
                .insert({ message_id: messageId, user_id: user.id, emoji });
            setShowReactionPicker(null);
        } catch (error) {
            console.error('[ChatRebuild] Reaction failed:', error);
        }
    };

    if (loading) return <LoadingSpinner fullPage message="Establishing connection..." />;

    if (connectionStatus === 'error') {
        return (
            <div className="dm-error-state">
                <div className="error-icon">⚠️</div>
                <h3>Connection Failed</h3>
                <p>{errorMessage || "We couldn't reach the class server."}</p>
                <button className="btn primary" onClick={() => window.location.reload()}>Retry Connection</button>
                <button className="btn secondary" onClick={() => navigate('/chat')} style={{ marginTop: '10px' }}>Back to Chats</button>
            </div>
        );
    }

    return (
        <div className="dm-page animate-fadeIn">
            <div className="dm-header">
                <button className="back-btn" onClick={() => navigate('/chat')}>
                    <ChevronLeft size={24} />
                </button>
                <div className="chat-recipient" onClick={() => setIsDetailsOpen(true)} style={{ cursor: 'pointer' }}>
                    <div className="recipient-avatar">
                        {chatInfo?.avatar_url ? (
                            <img src={chatInfo.avatar_url} alt={chatInfo.name} />
                        ) : (
                            <div className="avatar-placeholder">
                                {chatInfo?.name?.[0]?.toUpperCase() || 'G'}
                            </div>
                        )}
                    </div>
                    <div className="recipient-info">
                        <h3 className="recipient-name">{chatInfo?.name}</h3>
                        <p className="recipient-status">
                            {uploading ? 'Sending...' : typingUsers.length > 0 ? `${typingUsers[0]} is typing...` : 'Active now'}
                        </p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="icon-btn" onClick={() => setIsDetailsOpen(true)}><Info size={20} /></button>
                </div>
            </div>

            <div className="messages-container">
                {messages.length === 0 && (
                    <div className="first-message-prompt">
                        <div className="prompt-avatar">
                            {chatInfo?.name?.[0]?.toUpperCase() || 'G'}
                        </div>
                        <h3>Say hi to {chatInfo?.name}!</h3>
                        <p>Instant class communication powered by WebSockets.</p>
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                    const sharedPost = msg.shared_posts?.[0];

                    return (
                        <div key={msg.id} className={`message-wrapper ${isOwn ? 'own' : 'other'} ${showAvatar ? 'first-in-group' : ''}`}>
                            {!isOwn && (
                                <div className="message-avatar">
                                    {showAvatar && (
                                        msg.sender?.avatar_url ? (
                                            <img src={msg.sender.avatar_url} alt={msg.sender.name} />
                                        ) : (
                                            <div className="avatar-placeholder">{msg.sender?.name?.[0]?.toUpperCase() || '?'}</div>
                                        )
                                    )}
                                </div>
                            )}
                            <div className="message-bubble-container">
                                <div className="message-bubble">
                                    {!isOwn && showAvatar && msg.sender && (
                                        <span className="sender-name">{msg.sender.name}</span>
                                    )}

                                    {sharedPost && (
                                        <div className="shared-post-preview" onClick={() => navigate(`/post/${sharedPost.post_id}`)}>
                                            <div className="shared-post-header">
                                                <span className="shared-post-author">@{sharedPost.posts?.profiles?.name}</span>
                                            </div>
                                            <p className="shared-post-content">{sharedPost.posts?.content?.slice(0, 150)}</p>
                                            <button className="view-post-btn" onClick={(e) => { e.stopPropagation(); navigate(`/post/${sharedPost.post_id}`); }}>
                                                View Post
                                            </button>
                                        </div>
                                    )}

                                    {msg.media_url && msg.message_type === 'image' && (
                                        <div className="message-media">
                                            <img src={msg.media_url} alt="Shared" onClick={() => window.open(msg.media_url!, '_blank')} />
                                        </div>
                                    )}

                                    {msg.content && msg.message_type !== 'post' && (
                                        <p className="message-content">{msg.content}</p>
                                    )}

                                    <div className="message-meta">
                                        <span className="message-time">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isOwn && (
                                            <span className="delivery-status">
                                                <CheckCheck size={12} className="status-icon read" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {msg.message_reactions && msg.message_reactions.length > 0 && (
                                    <div className="message-reactions">
                                        {Object.entries(
                                            msg.message_reactions.reduce((acc: any, r: any) => {
                                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                return acc;
                                            }, {})
                                        ).map(([emoji, count]: any) => (
                                            <span key={emoji} className="reaction-badge">
                                                {emoji} {count > 1 && count}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <button className="reaction-btn" onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}>
                                    <Smile size={16} />
                                </button>

                                {showReactionPicker === msg.id && (
                                    <div className="reaction-picker">
                                        {QUICK_REACTIONS.map(emoji => (
                                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}>
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={(e) => handleSendMessage(e)}>
                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                />
                <button
                    type="button"
                    className={`input-action-btn ${uploading ? 'loading' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    <ImageIcon size={22} />
                </button>
                <div className="input-wrapper">
                    <textarea
                        placeholder="Message..."
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        rows={1}
                        disabled={uploading}
                    />
                </div>
                <button
                    type="submit"
                    className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
                    disabled={!newMessage.trim() || uploading}
                >
                    <Send size={22} />
                </button>
            </form>

            <ChatDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                chatName={chatInfo?.name || 'Chat'}
                participants={participants}
            />
        </div>
    );
};

export default DirectMessagePage;
