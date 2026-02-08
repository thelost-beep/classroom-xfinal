# Database Scripts & Migrations

This directory contains all SQL scripts used for the ClassroomX project.

## 🔑 Key Scripts

### Security & Logic
- **`security-hardening.sql`**: The master script for V2 security (RLS, Private Profiles). **RUN THIS ONE** to secure the app.
- **`supabase-schema.sql`**: The base schema definition.
- **`social-plus.sql`**: Combined features for the social feed, friends, etc.

### Feature-Specific
- `bestie-system.sql`: Friend request logic.
- `chat-system-enhancement.sql`: Real-time chat features.
- `admin-advanced.sql`: Admin user management functions.
- `post-reporting-system.sql`: Logic for reporting content.
- `notification-overhaul.sql`: Notification triggers and types.

### Fixes & Patches
- `db_fix_v3.sql`: Fixes for profile columns (dob, hometown).
- `fix-posts-tags*.sql`: Various fixes for the tagging system.
- `storage-fix.sql`: Storage bucket policies.

## 🛠 Usage
Run these scripts in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) or via CLI if configured.
