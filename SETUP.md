# ClassroomX Setup Instructions

## Prerequisites
- Node.js installed
- A Supabase account and project

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Note down your project URL and anon key

### Run Database Schema
1. Open your Supabase project
2. Go to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the schema

### Create Storage Buckets
1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `post-media`
   - Make it public
   - Allow file uploads for authenticated users
3. Create a new bucket named `avatars`
   - Make it public
   - Allow file uploads for authenticated users

### Create Initial Users
1. Go to Authentication > Users in Supabase Dashboard
2. For each of the students, click "Add user" and create:
   - Email: `[firstname]@classroomx.com`
   - Password: `[a-secure-password]`
   - Auto-confirm user: Yes
3. After creating all Supabase Auth users, you need to update their profiles:
   - Go to Table Editor > profiles
   - Find each user's UUID from the auth.users table
   - Update the profile with correct name, role, etc.

**Class 10 Students:**
Aftab, Aban, Saalik, Rehan, Anas, Akshita, Anushka, Nishtha, Bhoomika, Anushka Sinha, Darshana, Madhvi, Devishi, Chhavi, Yogita, Yashi, Vidhosi, Kamal, Arjun, Aaron Bhatt, Varun, Vans, Tanish

## 2. Frontend Setup

### Install Dependencies
```bash
npm install
```

### Configure Environment
1. Copy `.env.example` to `.env`
```bash
copy .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 3. Test the Application

### Login
1. Open the app in your browser
2. Use your assigned credentials:
   - Email: `[your-email]@classroomx.com`
   - Password: `[your-secure-password]`
3. You'll be forced to reset your password on first login

### Test Features
- Create a post (text, image, or video)
- Like and comment on posts
- Tag classmates
- Navigate through different pages

## Current Status

### ✅ Completed
- Project setup with Vite + React + TypeScript
- Supabase integration
- Authentication system with force password reset
- Main layout with sidebar and mobile navigation
- Instagram-like home feed
- Post creation with media upload
- Like and comment functionality
- Real-time updates
- Design system with calm aesthetics

### 🚧 Placeholder Pages (Coming Soon)
- Post detail view
- Memory Vault (gallery)
- Personal Space (journal)
- Confessions
- Time Capsules
- Teacher Letters
- Class Insights
- Alumni Updates
- Notifications
- Admin Dashboard

## Next Steps

1. Set up Supabase project and database
2. Create all 23 user accounts
3. Test authentication flow
4. Test post creation and interactions
5. Implement remaining features as needed
