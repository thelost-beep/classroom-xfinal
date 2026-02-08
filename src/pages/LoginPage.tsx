import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: signInError } = await signIn(email, password);

            if (signInError) {
                setError(signInError.message || 'Invalid email or password');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Left Section: Landing */}
            <div className="login-landing">
                <div className="landing-content animate-fadeIn">
                    <h1>ClassroomX</h1>
                    <p>Where Class 10 memories live forever. Reconnect, reminisce, and stay updated with your classmates.</p>
                </div>

                {/* Floating Class Memories */}
                <div className="floating-assets">
                    <img src="/class_memory_1_1770227451615.png" alt="Class Memory 1" className="floating-img img-1" />
                    <img src="/class_memory_2_1770227472680.png" alt="Class Memory 2" className="floating-img img-2" />
                    <img src="/class_memory_3_1770227494617.png" alt="Class Memory 3" className="floating-img img-3" />
                    <img src="/class_memory_4_1770227512365.png" alt="Class Memory 4" className="floating-img img-4" />
                </div>
            </div>

            {/* Right Section: Auth */}
            <div className="login-auth">
                <div className="login-container animate-scaleIn">
                    <div className="login-card">
                        <div className="login-header">
                            <h2>Welcome Back</h2>
                            <p className="text-secondary">Sign in to your private class space</p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="firstname@classroomx.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            {error && (
                                <div className="error-message animate-slideUp">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p className="text-secondary text-xs">
                                ClassroomX is a private platform for verified classmates only.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
