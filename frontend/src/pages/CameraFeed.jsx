import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, RefreshCw, LogIn, LogOut, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import ApiService from '../utils/api';

const CameraFeed = () => {
    const [cameraActive, setCameraActive] = useState(false);
    const [alertsLog, setAlertsLog] = useState([]);
    const [camError, setCamError] = useState(false);
    const [mode, setMode] = useState('check-in');
    
    // Auto start the camera on mount as requested in specifications ("Auto-start camera")
    useEffect(() => {
        setCameraActive(true);
        fetchActiveMode();
        return () => {
            // Cleanup: send API request to stop camera
            stopCameraOnBackend();
        };
    }, []);

    const fetchActiveMode = async () => {
        try {
            const res = await ApiService.get("/recognition/mode");
            if (res && res.mode) {
                setMode(res.mode);
            }
        } catch (err) {
            console.error("Failed to fetch recognition mode:", err);
        }
    };

    const stopCameraOnBackend = async () => {
        try {
            await ApiService.post("/recognition/stop-feed");
        } catch (err) {
            console.error("Failed to stop video feed:", err);
        }
    };

    // Periodically fetch today's logs to show in real-time alert logs
    useEffect(() => {
        if (!cameraActive) return;

        const fetchFeedLogs = async () => {
            try {
                const logs = await ApiService.get("/attendance/logs");
                // Get past 8 check-ins
                const updates = logs.slice(0, 8).map(l => ({
                    id: l.id,
                    name: l.employee_name,
                    time: l.check_in_time || l.check_out_time || 'Now',
                    status: l.check_out_time ? 'Checked Out' : l.attendance_status
                }));
                setAlertsLog(updates);
            } catch (err) {
                console.error("Alert logs loading error:", err);
            }
        };

        fetchFeedLogs();
        const timer = setInterval(fetchFeedLogs, 4000); // Check every 4 seconds
        return () => clearInterval(timer);
    }, [cameraActive]);

    const handleCameraToggle = async () => {
        if (cameraActive) {
            await stopCameraOnBackend();
            setCameraActive(false);
        } else {
            setCamError(false);
            setCameraActive(true);
        }
    };

    const handleModeChange = async (newMode) => {
        try {
            await ApiService.post("/recognition/mode", { mode: newMode });
            setMode(newMode);
        } catch (err) {
            console.error("Failed to update active mode:", err);
        }
    };

    return (
        <div className="content-wrapper">
            <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 1.2fr', gap: '24px' }}>
                {/* 1. Camera Stream Card */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Camera size={20} style={{ color: cameraActive ? 'var(--success)' : 'var(--text-tertiary)' }} />
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Hardware Camera Feed</h3>
                        </div>
                        
                        <button 
                            className={`btn ${cameraActive ? 'btn-danger' : 'btn-primary'}`} 
                            onClick={handleCameraToggle}
                            style={{ padding: '8px 16px' }}
                        >
                            {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
                            <span>{cameraActive ? 'Deactivate Camera' : 'Activate Camera'}</span>
                        </button>
                    </div>

                    {/* Mode Toggle Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        gap: '12px',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.75px', fontWeight: 600 }}>Attendance Mode</span>
                            <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Live Feed Phase: <span style={{ color: mode === 'check-in' ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 700, textTransform: 'uppercase' }}>{mode === 'check-in' ? 'Check-In' : 'Check-Out'}</span>
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn"
                                onClick={() => handleModeChange('check-in')}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    backgroundColor: mode === 'check-in' ? 'var(--success-bg)' : 'transparent',
                                    border: mode === 'check-in' ? '1px solid var(--success)' : '1px solid var(--border-color)',
                                    color: mode === 'check-in' ? 'var(--success-text)' : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: mode === 'check-in' ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <LogIn size={15} />
                                <span>Check-In</span>
                            </button>
                            <button
                                className="btn"
                                onClick={() => handleModeChange('check-out')}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    backgroundColor: mode === 'check-out' ? 'var(--danger-bg)' : 'transparent',
                                    border: mode === 'check-out' ? '1px solid var(--danger)' : '1px solid var(--border-color)',
                                    color: mode === 'check-out' ? 'var(--danger-text)' : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: mode === 'check-out' ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <LogOut size={15} />
                                <span>Check-Out</span>
                            </button>
                        </div>
                    </div>

                    <div style={{
                        position: 'relative',
                        width: '100%',
                        backgroundColor: '#030712',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        aspectRatio: '16/9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
                    }}>
                        {cameraActive && !camError ? (
                            <img 
                                src="http://127.0.0.1:8000/api/recognition/video-feed" 
                                alt="Real-time recognition overlay"
                                onError={() => {
                                    setCamError(true);
                                    setCameraActive(false);
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-tertiary)' }}>
                                <CameraOff size={48} />
                                <span style={{ fontSize: '0.9rem' }}>
                                    {camError ? "Camera offline or disconnected." : "Webcam feed is inactive."}
                                </span>
                                {camError && (
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => { setCamError(false); setCameraActive(true); }}
                                        style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                                    >
                                        <RefreshCw size={12} />
                                        <span>Retry Connection</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {cameraActive && (
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                left: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.25)',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--success)',
                                backdropFilter: 'blur(8px)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                <span style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'pulse-glow 1.5s infinite' }}></span>
                                Live Recognition Active
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Side Panel Alert Activity Logs */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <Activity size={18} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Camera Event Logs</h3>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        overflowY: 'auto',
                        maxHeight: '400px',
                        paddingRight: '4px'
                    }}>
                        {alertsLog.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: '40px 0' }}>
                                Awaiting scan events...
                            </p>
                        ) : (
                            alertsLog.map((log) => (
                                <div 
                                    key={log.id} 
                                    className="glass-card" 
                                    style={{
                                        padding: '12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        borderRadius: 'var(--radius-sm)',
                                        borderLeft: `3px solid ${
                                            log.status === 'Present' ? 'var(--success)' :
                                            log.status === 'Late' ? 'var(--warning)' : 
                                            log.status === 'Checked Out' ? 'var(--primary)' : 'var(--info)'
                                        }`
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{log.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{log.time}</span>
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        fontWeight: 600, 
                                        color: log.status === 'Present' ? 'var(--success-text)' :
                                               log.status === 'Late' ? 'var(--warning-text)' :
                                               log.status === 'Checked Out' ? 'var(--primary)' : 'var(--info-text)'
                                    }}>
                                        {log.status === 'Checked Out' ? 'Checked Out Successfully' : `Marked ${log.status}`}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraFeed;
