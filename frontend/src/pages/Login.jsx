import React, { useState } from 'react';
import { ShieldAlert, User, Lock, ArrowRight } from 'lucide-react';
import ApiService from '../utils/api';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            setError("Please fill in all credentials.");
            return;
        }

        setError('');
        setLoading(true);

        try {
            const data = await ApiService.post("/auth/login", { username, password });
            
            // Store token & user profile
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("admin_user", JSON.stringify({
                username: data.username,
                full_name: data.full_name,
                role: data.role
            }));

            // Notify parent
            onLoginSuccess();
        } catch (err) {
            setError(err.message || "Failed to establish secure session.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'radial-gradient(circle at center, #111827 0%, #030712 100%)',
            padding: '24px'
        }}>
            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        background: 'linear-gradient(135deg, var(--primary), var(--info))',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
                    }}>
                        <ShieldAlert size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Secure Admin Access</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        AI Face Recognition Employee Attendance & Monitoring System
                    </p>
                </div>

                {error && (
                    <div className="badge badge-absent" style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        padding: '10px', 
                        borderRadius: 'var(--radius-md)' 
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ 
                                position: 'absolute', 
                                left: '16px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: 'var(--text-tertiary)' 
                            }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ width: '100%', paddingLeft: '48px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ 
                                position: 'absolute', 
                                left: '16px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: 'var(--text-tertiary)' 
                            }} />
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter admin password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', paddingLeft: '48px' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                    >
                        <span>{loading ? "Authenticating..." : "Login Securely"}</span>
                        <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
