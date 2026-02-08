import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile, loading } = useAuth();
    if (loading) return <LoadingSpinner fullPage message="Verifying access..." />;
    if (!user) return <Navigate to="/login" replace />;
    if (profile?.is_first_login) return <Navigate to="/force-reset-password" replace />;
    return <>{children}</>;
};
export default ProtectedRoute;
