import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import MainLayout from './components/MainLayout';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load pages for performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForcePasswordResetPage = lazy(() => import('./pages/ForcePasswordResetPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const MemoryVaultPage = lazy(() => import('./pages/MemoryVaultPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DirectMessagePage = lazy(() => import('./pages/DirectMessagePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage message="Initializing ClassroomX..." />;
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Suspense fallback={<LoadingSpinner fullPage />}>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route path="/force-reset-password" element={<ForcePasswordResetPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<HomePage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="vault" element={<MemoryVaultPage />} />
              <Route path="create-post" element={<CreatePostPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="chat/:id" element={<DirectMessagePage />} />
              <Route path="profile/:id" element={<ProfilePage />} />

              {/* Secondary Routes */}
              <Route path="post/:id" element={<PostDetailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<ProfileSettingsPage />} />
              <Route path="admin" element={<AdminDashboardPage />} />

              {/* Legacy/Redirects if needed or Remove */}
              <Route path="directory" element={<Navigate to="/explore" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
