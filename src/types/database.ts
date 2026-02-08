export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    name: string;
                    email: string;
                    role: 'student' | 'teacher' | 'admin';
                    is_first_login: boolean;
                    avatar_url: string | null;
                    bio: string | null;
                    hometown: string | null;
                    dream_job: string | null;
                    dob: string | null;
                    privacy_settings: {
                        show_email: boolean;
                        show_birthday: boolean;
                        show_socials: boolean;
                    };
                    created_at: string;
                    current_status: string | null;
                    friends_count: number;
                    banner_url: string | null;
                };
                Insert: {
                    id: string;
                    name: string;
                    email: string;
                    role?: 'student' | 'teacher' | 'admin';
                    is_first_login?: boolean;
                    avatar_url?: string | null;
                    bio?: string | null;
                    hometown?: string | null;
                    dream_job?: string | null;
                    dob?: string | null;
                    privacy_settings?: {
                        show_email: boolean;
                        show_birthday: boolean;
                        show_socials: boolean;
                    };
                    created_at?: string;
                    current_status?: string | null;
                    friends_count?: number;
                    banner_url?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    email?: string;
                    role?: 'student' | 'teacher' | 'admin';
                    is_first_login?: boolean;
                    avatar_url?: string | null;
                    bio?: string | null;
                    hometown?: string | null;
                    dream_job?: string | null;
                    dob?: string | null;
                    privacy_settings?: {
                        show_email?: boolean;
                        show_birthday?: boolean;
                        show_socials?: boolean;
                    };
                    created_at?: string;
                    current_status?: string | null;
                    friends_count?: number;
                    banner_url?: string | null;
                };
            };
            posts: {
                Row: {
                    id: string;
                    user_id: string;
                    content: string;
                    post_type: 'memory' | 'photo' | 'secret' | 'capsule' | 'teacher_letter';
                    visibility: 'class' | 'selected' | 'private';
                    mood: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    content: string;
                    post_type: 'memory' | 'photo' | 'secret' | 'capsule' | 'teacher_letter';
                    visibility?: 'class' | 'selected' | 'private';
                    mood?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    content?: string;
                    post_type?: 'memory' | 'photo' | 'secret' | 'capsule' | 'teacher_letter';
                    visibility?: 'class' | 'selected' | 'private';
                    mood?: string | null;
                    created_at?: string;
                };
            };
            media: {
                Row: {
                    id: string;
                    post_id: string;
                    file_url: string;
                    file_type: 'image' | 'video';
                    order_index: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    file_url: string;
                    file_type: 'image' | 'video';
                    order_index?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    file_url?: string;
                    file_type?: 'image' | 'video';
                    order_index?: number;
                    created_at?: string;
                };
            };
            likes: {
                Row: {
                    id: string;
                    post_id: string;
                    user_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    user_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    user_id?: string;
                    created_at?: string;
                };
            };
            comments: {
                Row: {
                    id: string;
                    post_id: string;
                    user_id: string;
                    content: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    user_id: string;
                    content: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    user_id?: string;
                    content?: string;
                    created_at?: string;
                };
            };
            tags: {
                Row: {
                    id: string;
                    post_id: string;
                    tagged_user_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    tagged_user_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    tagged_user_id?: string;
                    created_at?: string;
                };
            };
            confessions: {
                Row: {
                    id: string;
                    user_id: string | null;
                    content: string;
                    is_anonymous: boolean;
                    status: 'pending' | 'approved' | 'rejected';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    content: string;
                    is_anonymous?: boolean;
                    status?: 'pending' | 'approved' | 'rejected';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    content?: string;
                    is_anonymous?: boolean;
                    status?: 'pending' | 'approved' | 'rejected';
                    created_at?: string;
                };
            };
            time_capsules: {
                Row: {
                    id: string;
                    creator_id: string;
                    capsule_type: 'personal' | 'class' | 'teacher';
                    content: string;
                    unlock_date: string;
                    is_locked: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    creator_id: string;
                    capsule_type: 'personal' | 'class' | 'teacher';
                    content: string;
                    unlock_date: string;
                    is_locked?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    creator_id?: string;
                    capsule_type?: 'personal' | 'class' | 'teacher';
                    content?: string;
                    unlock_date?: string;
                    is_locked?: boolean;
                    created_at?: string;
                };
            };
            teacher_letters: {
                Row: {
                    id: string;
                    teacher_id: string;
                    title: string;
                    content: string;
                    is_delivered: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    teacher_id: string;
                    title: string;
                    content: string;
                    is_delivered?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    teacher_id?: string;
                    title?: string;
                    content?: string;
                    is_delivered?: boolean;
                    created_at?: string;
                };
            };
            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    actor_id: string | null;
                    type: 'like' | 'comment' | 'tag' | 'capsule' | 'letter' | 'message';
                    reference_id: string | null;
                    is_read: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    actor_id?: string | null;
                    type: 'like' | 'comment' | 'tag' | 'capsule' | 'letter' | 'message';
                    reference_id?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    actor_id?: string | null;
                    type?: 'like' | 'comment' | 'tag' | 'capsule' | 'letter' | 'message';
                    reference_id?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
            };
            best_friends: {
                Row: {
                    id: string;
                    user_id: string;
                    friend_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    friend_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    friend_id?: string;
                    created_at?: string;
                };
            };
            chats: {
                Row: {
                    id: string;
                    name: string | null;
                    type: '1to1' | 'group';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name?: string | null;
                    type?: '1to1' | 'group';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string | null;
                    type?: '1to1' | 'group';
                    created_at?: string;
                };
            };
            chat_participants: {
                Row: {
                    chat_id: string;
                    user_id: string;
                };
                Insert: {
                    chat_id: string;
                    user_id: string;
                };
                Update: {
                    chat_id?: string;
                    user_id?: string;
                };
            };
            messages: {
                Row: {
                    id: string;
                    chat_id: string;
                    sender_id: string;
                    content: string;
                    media_url: string | null;
                    message_type: 'text' | 'image' | 'video' | 'file' | 'post' | 'sticker';
                    reply_to: string | null;
                    edited_at: string | null;
                    deleted_at: string | null;
                    file_name: string | null;
                    file_size: number | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    chat_id: string;
                    sender_id: string;
                    content: string;
                    media_url?: string | null;
                    message_type?: 'text' | 'image' | 'video' | 'file' | 'post' | 'sticker';
                    reply_to?: string | null;
                    edited_at?: string | null;
                    deleted_at?: string | null;
                    file_name?: string | null;
                    file_size?: number | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    chat_id?: string;
                    sender_id?: string;
                    content?: string;
                    media_url?: string | null;
                    message_type?: 'text' | 'image' | 'video' | 'file' | 'post' | 'sticker';
                    reply_to?: string | null;
                    edited_at?: string | null;
                    deleted_at?: string | null;
                    file_name?: string | null;
                    file_size?: number | null;
                    created_at?: string;
                };
            };
            stories: {
                Row: {
                    id: string;
                    user_id: string;
                    media_url: string;
                    media_type: 'image' | 'video';
                    content: string | null;
                    expires_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    media_url: string;
                    media_type: 'image' | 'video';
                    content?: string | null;
                    expires_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    media_url?: string;
                    media_type?: 'image' | 'video';
                    content?: string | null;
                    expires_at?: string;
                    created_at?: string;
                };
            };
            story_views: {
                Row: {
                    id: string;
                    story_id: string;
                    viewer_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    story_id: string;
                    viewer_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    story_id?: string;
                    viewer_id?: string;
                    created_at?: string;
                };
            };
            mentions: {
                Row: {
                    id: string;
                    mentioned_user_id: string;
                    author_id: string;
                    post_id: string | null;
                    story_id: string | null;
                    comment_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    mentioned_user_id: string;
                    author_id: string;
                    post_id?: string | null;
                    story_id?: string | null;
                    comment_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    mentioned_user_id?: string;
                    author_id?: string;
                    post_id?: string | null;
                    story_id?: string | null;
                    comment_id?: string | null;
                    created_at?: string;
                };
            };
            best_friend_requests: {
                Row: {
                    id: string;
                    sender_id: string;
                    receiver_id: string;
                    status: 'pending' | 'accepted' | 'rejected';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    sender_id: string;
                    receiver_id: string;
                    status?: 'pending' | 'accepted' | 'rejected';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    sender_id?: string;
                    receiver_id?: string;
                    status?: 'pending' | 'accepted' | 'rejected';
                    created_at?: string;
                };
            };
            user_settings: {
                Row: {
                    user_id: string;
                    theme: 'light' | 'dark';
                    notification_prefs: {
                        likes: boolean;
                        comments: boolean;
                        mentions: boolean;
                        stories: boolean;
                        bf_requests: boolean;
                    };
                    privacy_visibility: 'class' | 'friends' | 'private';
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    theme?: 'light' | 'dark';
                    notification_prefs?: {
                        likes: boolean;
                        comments: boolean;
                        mentions: boolean;
                        stories: boolean;
                        bf_requests: boolean;
                    };
                    privacy_visibility?: 'class' | 'friends' | 'private';
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    theme?: 'light' | 'dark';
                    notification_prefs?: {
                        likes?: boolean;
                        comments?: boolean;
                        mentions?: boolean;
                        stories?: boolean;
                        bf_requests?: boolean;
                    };
                    privacy_visibility?: 'class' | 'friends' | 'private';
                    updated_at?: string;
                };
            };
            message_reactions: {
                Row: {
                    id: string;
                    message_id: string;
                    user_id: string;
                    emoji: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    message_id: string;
                    user_id: string;
                    emoji: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    message_id?: string;
                    user_id?: string;
                    emoji?: string;
                    created_at?: string;
                };
            };
            shared_posts: {
                Row: {
                    id: string;
                    message_id: string;
                    post_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    message_id: string;
                    post_id: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    message_id?: string;
                    post_id?: string;
                    created_at?: string;
                };
            };
            typing_indicators: {
                Row: {
                    chat_id: string;
                    user_id: string;
                    updated_at: string;
                };
                Insert: {
                    chat_id: string;
                    user_id: string;
                    updated_at?: string;
                };
                Update: {
                    chat_id?: string;
                    user_id?: string;
                    updated_at?: string;
                };
            };
            read_receipts: {
                Row: {
                    message_id: string;
                    user_id: string;
                    read_at: string;
                };
                Insert: {
                    message_id: string;
                    user_id: string;
                    read_at?: string;
                };
                Update: {
                    message_id?: string;
                    user_id?: string;
                    read_at?: string;
                };
            };
        };
    };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Media = Database['public']['Tables']['media']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type Confession = Database['public']['Tables']['confessions']['Row'];
export type TimeCapsule = Database['public']['Tables']['time_capsules']['Row'];
export type TeacherLetter = Database['public']['Tables']['teacher_letters']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type BestFriend = Database['public']['Tables']['best_friends']['Row'];
export type Chat = Database['public']['Tables']['chats']['Row'];
export type ChatParticipant = Database['public']['Tables']['chat_participants']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Story = Database['public']['Tables']['stories']['Row'];
export type StoryView = Database['public']['Tables']['story_views']['Row'];
export type Mention = Database['public']['Tables']['mentions']['Row'];
export type BestFriendRequest = Database['public']['Tables']['best_friend_requests']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];
export type SharedPost = Database['public']['Tables']['shared_posts']['Row'];
export type TypingIndicator = Database['public']['Tables']['typing_indicators']['Row'];
export type ReadReceipt = Database['public']['Tables']['read_receipts']['Row'];

// Extended types for chat with profile data
export interface MessageWithSender extends Message {
    sender?: Profile;
    reactions?: MessageReaction[];
    shared_post?: SharedPost & { post?: Post };
    reply_message?: Message;
}

export interface PostWithDetails extends Post {
    profiles?: Profile;
    media?: Media[];
    likes?: Like[];
    comments?: Comment[];
    tags?: (Tag & { profiles?: Profile })[];
    collaborators?: Profile[];
    is_liked?: boolean;
    like_count?: number;
    comment_count?: number;
}
