import React, { useEffect, useState } from 'react';
import { Sun, Moon, Bell, ShieldCheck } from 'lucide-react';
import ApiService from '../utils/api';

const Navbar = ({ activeTab, theme, toggleTheme }) => {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const getTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Admin Dashboard';
            case 'camera': return 'Live Real-time Attendance Feed';
            case 'registration': return 'Employee Face Enrollment';
            case 'logs': return 'Historical Attendance Logs';
            case 'settings': return 'System Settings & Config';
            default: return 'AI Attendance System';
        }
    };

    // Load recent notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // To keep notifications extremely robust without adding extra database endpoints, we fetch from a common log query
                // or we can query direct logs as a mock list or write a custom endpoint if needed.
                // Let's query notifications by calling SQLite directly using a generic logs query or mock notifications.
                // For direct reliability, let's return some real-time warnings and info items that feel extremely responsive!
                const data = await ApiService.get("/attendance/logs?status=Late");
                const alerts = data.slice(0, 5).map(l => ({
                    id: l.id,
                    type: 'warning',
                    title: 'Late Arrival',
                    message: `${l.employee_name} arrived late at ${l.check_in_time}.`
                }));
                setNotifications(alerts);
            } catch (err) {
                console.error("Notifications fetch error:", err);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="top-header glass-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} style={{ color: 'var(--primary)' }} />
                <h1 className="page-title">{getTitle()}</h1>
            </div>

            <div className="header-actions">
                {/* Theme Toggle Buttons */}
                <button className="icon-btn" onClick={toggleTheme} title="Toggle Color Theme">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notifications Bell Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="System Alerts">
                        <Bell size={18} />
                        {notifications.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '8px',
                                height: '8px',
                                background: 'var(--danger)',
                                borderRadius: '50%'
                            }}></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="glass-card" style={{
                            position: 'absolute',
                            right: 0,
                            top: '50px',
                            width: '320px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            padding: '16px',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                Recent Alerts
                            </h4>
                            {notifications.length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                                    No new alerts
                                </p>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning-text)' }}>{n.title}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
