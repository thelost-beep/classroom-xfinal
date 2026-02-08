import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, Search, Plus, X } from 'lucide-react';
import type { Chat, Profile } from '../types/database';
import './ChatPage.css';

interface ChatWithDetails extends Chat {
    last_message?: string;
    last_message_time?: string;
    other_user?: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState<ChatWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const navigate = useNavigate();

    const fetchChats = async () => {
        if (!user) return;
        try {
            const { data: participants, error: pError } = await supabase
                .from('chat_participants')
                .select('chat_id, chats(id, name, type, created_at)')
                .eq('user_id', user.id);

            if (pError) throw pError;

            const processedChats: ChatWithDetails[] = await Promise.all((participants || []).map(async (p: any) => {
                const chat = p.chats as Chat;
                let lastMsg = '';
                let lastTime = chat.created_at;
                let otherUser = null;

                const { data: msgs } = await (supabase
                    .from('messages') as any)
                    .select('content, created_at')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (msgs && msgs.length > 0) {
                    lastMsg = msgs[0].content;
                    lastTime = msgs[0].created_at;
                }

                if (chat.type === '1to1') {
                    const { data: otherP } = await supabase
                        .from('chat_participants')
                        .select('user_id, profiles(id, name, avatar_url)')
                        .eq('chat_id', chat.id)
                        .neq('user_id', user.id)
                        .maybeSingle();

                    if (otherP && (otherP as any).profiles) {
                        otherUser = (otherP as any).profiles;
                    }
                }

                return {
                    ...chat,
                    last_message: lastMsg,
                    last_message_time: lastTime,
                    other_user: otherUser
                };
            }));

            setChats(processedChats.sort((a, b) =>
                new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime()
            ));
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*').neq('id', user?.id);
        setAllUsers(data || []);
    };

    useEffect(() => {
        fetchChats();
        if (isCreatingGroup) fetchUsers();

        // Real-time subscription for message previews
        const channel = supabase
            .channel('chat-list-updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, () => fetchChats())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isCreatingGroup]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedUsers.length === 0 || !user) return;
        try {
            setLoading(true);
            const { data: chat, error: cError } = await (supabase.from('chats') as any)
                .insert({ name: newGroupName.trim(), type: 'group' })
                .select()
                .single();

            if (cError) throw cError;

            const participants = [user.id, ...selectedUsers].map(uid => ({
                chat_id: chat.id,
                user_id: uid
            }));

            await (supabase.from('chat_participants') as any).insert(participants);

            setIsCreatingGroup(false);
            navigate(`/chat/${chat.id}`);
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    if (loading && chats.length === 0) return <LoadingSpinner fullPage message="Loading your conversations..." />;

    return (
        <div className="chat-page animate-fadeIn">
            <div className="chat-header">
                <h1 className="page-title">Messages</h1>
                <div className="header-buttons">
                    <button className="icon-btn" onClick={() => setIsCreatingGroup(true)} title="New Group">
                        <Users size={20} />
                    </button>
                    <button className="icon-btn primary-btn" onClick={() => navigate('/explore')} title="New Message">
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="chat-search">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="chats-list">
                <Link to="/chat/class-group" className="chat-item group-chat">
                    <div className="chat-avatar group-icon">
                        <Users size={24} />
                    </div>
                    <div className="chat-info">
                        <div className="chat-name-row">
                            <span className="chat-name">Class Group</span>
                            <span className="chat-time">Live</span>
                        </div>
                        <p className="chat-preview">Connect with all your classmates instantly!</p>
                    </div>
                </Link>

                {chats.map(chat => {
                    const isDirect = chat.type === '1to1';
                    const displayName = isDirect ? chat.other_user?.name : (chat.name || 'Group Chat');
                    const avatarUrl = isDirect ? chat.other_user?.avatar_url : null;
                    const initial = isDirect ? (chat.other_user?.name?.[0] || '?') : (chat.name?.[0] || 'G');

                    return (
                        <Link to={`/chat/${chat.id}`} key={chat.id} className="chat-item">
                            <div className={`chat-avatar ${!avatarUrl && !isDirect ? 'group-icon' : ''}`}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} />
                                ) : (
                                    <span>{initial.toUpperCase()}</span>
                                )}
                            </div>
                            <div className="chat-info">
                                <div className="chat-name-row">
                                    <span className="chat-name">{displayName}</span>
                                    {chat.last_message_time && (
                                        <span className="chat-time">
                                            {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <p className="chat-preview">{chat.last_message || 'No messages yet'}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {isCreatingGroup && (
                <div className="modal-overlay" onClick={() => setIsCreatingGroup(false)}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Group</h2>
                            <button className="close-btn" onClick={() => setIsCreatingGroup(false)}><X size={20} /></button>
                        </div>
                        <input
                            type="text"
                            className="input mb-md"
                            placeholder="Group Name"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                        <div className="user-selection-list">
                            <p className="text-sm font-bold mb-xs">Select Classmates:</p>
                            {allUsers.map(u => (
                                <label key={u.id} className="user-select-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(u.id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                            else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                        }}
                                    />
                                    <span>{u.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="btn outline" onClick={() => setIsCreatingGroup(false)}>Cancel</button>
                            <button className="btn primary" onClick={handleCreateGroup} disabled={!newGroupName.trim() || selectedUsers.length === 0}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;
