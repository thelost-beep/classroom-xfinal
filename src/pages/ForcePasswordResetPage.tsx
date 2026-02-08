import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ForcePasswordResetPage.css';

const ForcePasswordResetPage: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const getPasswordStrength = (password: string): string => {
        if (password.length === 0) return '';
        if (password.length < 6) return 'weak';
        if (password.length < 10) return 'medium';
        if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong';
        return 'medium';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const { error } = await updatePassword(newPassword);

            if (error) {
                setError(error.message || 'Failed to update password');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="password-reset-page">
            <div className="password-reset-container animate-scaleIn">
                <div className="password-reset-header">
                    <div className="icon-lock">🔒</div>
                    <h1>Set New Password</h1>
                    <p>For security, you must change your password before accessing ClassroomX</p>
                </div>

                <form onSubmit={handleSubmit} className="password-reset-form">
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            id="newPassword"
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            autoComplete="new-password"
                        />
                        {passwordStrength && (
                            <div className={`password-strength password-strength-${passwordStrength}`}>
                                <div className="strength-bar"></div>
                                <span className="strength-text">
                                    {passwordStrength === 'weak' && 'Weak password'}
                                    {passwordStrength === 'medium' && 'Medium password'}
                                    {passwordStrength === 'strong' && 'Strong password'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message animate-slideUp">
                            {error}
                        </div>
                    )}

                    <div className="password-hint">
                        <p>💡 Password should be at least 6 characters. Use uppercase, lowercase, and numbers for a stronger password.</p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Password & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordResetPage;
