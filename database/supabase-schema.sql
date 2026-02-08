-- ======================================================================================
-- ClassroomX COMPLETE PRODUCTION SQL (WITH BATCH USER SETUP)
-- ======================================================================================
-- 1. COPY ALL OF THIS CODE.
-- 2. GO TO SUPABASE DASHBOARD -> SQL EDITOR.
-- 3. PASTE AND CLICK "RUN".
-- ======================================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABLES SETUP
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  is_first_login BOOLEAN DEFAULT true,
  avatar_url TEXT,
  bio TEXT,
  hometown TEXT,
  dream_job TEXT,
  dob DATE,
  privacy_settings JSONB DEFAULT '{"show_email": true, "show_birthday": true, "show_socials": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts, Media, Likes, Comments, Tags, Confessions, Time Capsules, Teacher Letters, Notifications, Journals, Alumni Updates
-- (Ensuring all are defined robustly)

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'memory' CHECK (post_type IN ('memory', 'photo', 'secret', 'capsule', 'teacher_letter')),
  visibility TEXT DEFAULT 'class' CHECK (visibility IN ('class', 'selected', 'private')),
  mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  tagged_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_capsules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  capsule_type TEXT NOT NULL CHECK (capsule_type IN ('personal', 'class', 'teacher')),
  content TEXT NOT NULL,
  unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_locked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_letters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_delivered BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'tag', 'capsule', 'letter', 'message')),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================================
-- NEW TABLES FOR PRD V2
-- ======================================================================================

CREATE TABLE IF NOT EXISTS best_friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL DEFAULT '1to1' CHECK (type IN ('1to1', 'group')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumni_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Base Policies
CREATE POLICY "Public Profiles View" ON profiles FOR SELECT USING (true);
CREATE POLICY "Self Update Profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Class Posts View" ON posts FOR SELECT USING (visibility = 'class');
CREATE POLICY "Own Posts Manage" ON posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Media View" ON media FOR SELECT USING (true);
CREATE POLICY "Likes Manage" ON likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Comments Manage" ON comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Journals Manage" ON journals FOR ALL USING (auth.uid() = user_id);

-- New Policies for PRD v2
CREATE POLICY "Best Friends View" ON best_friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Best Friends Manage" ON best_friends FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Chats View" ON chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = chats.id AND user_id = auth.uid())
);

CREATE POLICY "Chat Participants View" ON chat_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid())
);

CREATE POLICY "Messages View" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Messages Send" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, is_first_login)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================================================================
-- BATCH USER CREATION LOGIC
-- ======================================================================================

CREATE OR REPLACE FUNCTION create_classroom_user(
    user_email TEXT, 
    user_password TEXT, 
    user_name TEXT, 
    user_role TEXT DEFAULT 'student'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Check if user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', 
            user_email, crypt(user_password, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', 
            jsonb_build_object('name', user_name, 'role', user_role),
            now(), now(), '', '', '', ''
        ) RETURNING id INTO new_user_id;
        RETURN new_user_id;
    END IF;
    RETURN (SELECT id FROM auth.users WHERE email = user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================================
-- CREATE THE 23 STUDENTS + ADMINS
-- ======================================================================================
-- Password: [USE_A_SECURE_PASSWORD_HERE]

DO $$
BEGIN
  -- MAIN ACCOUNTS (Replace 'YOUR_SECURE_PASSWORD' with actual secure passwords)
  PERFORM create_classroom_user('aftab@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Aftab', 'admin');
  PERFORM create_classroom_user('admin@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Class Admin', 'admin');
  PERFORM create_classroom_user('teacher@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Class Teacher', 'teacher');
  
  -- STUDENT LIST (Batch)
  PERFORM create_classroom_user('aban@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Aban', 'student');
  PERFORM create_classroom_user('student1@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 1', 'student');
  PERFORM create_classroom_user('student2@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 2', 'student');
  PERFORM create_classroom_user('student3@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 3', 'student');
  PERFORM create_classroom_user('student4@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 4', 'student');
  PERFORM create_classroom_user('student5@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 5', 'student');
  PERFORM create_classroom_user('student6@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 6', 'student');
  PERFORM create_classroom_user('student7@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 7', 'student');
  PERFORM create_classroom_user('student8@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 8', 'student');
  PERFORM create_classroom_user('student9@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 9', 'student');
  PERFORM create_classroom_user('student10@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 10', 'student');
  PERFORM create_classroom_user('student11@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 11', 'student');
  PERFORM create_classroom_user('student12@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 12', 'student');
  PERFORM create_classroom_user('student13@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 13', 'student');
  PERFORM create_classroom_user('student14@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 14', 'student');
  PERFORM create_classroom_user('student15@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 15', 'student');
  PERFORM create_classroom_user('student16@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 16', 'student');
  PERFORM create_classroom_user('student17@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 17', 'student');
  PERFORM create_classroom_user('student18@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 18', 'student');
  PERFORM create_classroom_user('student19@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 19', 'student');
  PERFORM create_classroom_user('student20@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 20', 'student');
  PERFORM create_classroom_user('student21@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 21', 'student');
  PERFORM create_classroom_user('student22@classroomx.com', 'YOUR_SECURE_PASSWORD', 'Student 23', 'student');
END $$;
