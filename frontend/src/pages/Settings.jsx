import React, { useEffect, useState } from 'react';
import { Settings, Save, Camera, Plus, Trash2, List } from 'lucide-react';
import ApiService from '../utils/api';

const SettingsPage = () => {
    // Timings & policy settings
    const [loginStart, setLoginStart] = useState('09:00');
    const [graceEnd, setGraceEnd] = useState('09:15');
    const [closeTime, setCloseTime] = useState('09:30');
    const [checkoutTime, setCheckoutTime] = useState('18:00');
    const [lateMark, setLateMark] = useState(true);
    const [autoAbsent, setAutoAbsent] = useState(true);
    const [workHours, setWorkHours] = useState(8.0);
    const [cameraSource, setCameraSource] = useState('0');
    
    // Hardware camera options list
    const [cameraList, setCameraList] = useState([]);
    
    // Department CRUD states
    const [departments, setDepartments] = useState([]);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const loadSettings = async () => {
        try {
            const data = await ApiService.get("/settings");
            setLoginStart(data.login_start_time);
            setGraceEnd(data.grace_end_time);
            setCloseTime(data.attendance_close_time);
            setCheckoutTime(data.checkout_time);
            setLateMark(data.late_mark_enabled);
            setAutoAbsent(data.auto_absent_enabled);
            setWorkHours(data.working_hours_threshold);
            setCameraSource(data.camera_source);

            // Fetch scanned camera hardware list
            const cameras = await ApiService.get("/settings/camera-list");
            setCameraList(cameras);
        } catch (err) {
            console.error("Settings load error:", err);
        }
    };

    const loadDepartments = async () => {
        try {
            const depts = await ApiService.get("/departments");
            setDepartments(depts);
        } catch (err) {
            console.error("Departments load error:", err);
        }
    };

    useEffect(() => {
        loadSettings();
        loadDepartments();
    }, []);

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSaveSuccess(false);

        try {
            await ApiService.put("/settings", {
                login_start_time: loginStart,
                grace_end_time: graceEnd,
                attendance_close_time: closeTime,
                checkout_time: checkoutTime,
                late_mark_enabled: lateMark,
                auto_absent_enabled: autoAbsent,
                working_hours_threshold: parseFloat(workHours) || 8.0,
                camera_source: cameraSource
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            alert(err.message || "Failed to update system settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        if (!newDeptName) return;

        try {
            await ApiService.post("/departments", {
                name: newDeptName,
                description: newDeptDesc
            });
            setNewDeptName('');
            setNewDeptDesc('');
            loadDepartments();
        } catch (err) {
            alert(err.message || "Failed to create department.");
        }
    };

    return (
        <div className="content-wrapper">
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* 1. Timings & System Settings Form */}
                <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <Settings size={18} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Office timing parameters</h3>
                    </div>

                    {saveSuccess && (
                        <div className="badge badge-present" style={{ width: '100%', justifyContent: 'center', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                            System settings updated successfully!
                        </div>
                    )}

                    <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Shift Start Time</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={loginStart}
                                    onChange={(e) => setLoginStart(e.target.value)}
                                    placeholder="HH:MM (e.g. 09:00)"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Grace Period End</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={graceEnd}
                                    onChange={(e) => setGraceEnd(e.target.value)}
                                    placeholder="HH:MM (e.g. 09:15)"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Attendance Close Time</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={closeTime}
                                    onChange={(e) => setCloseTime(e.target.value)}
                                    placeholder="HH:MM (e.g. 09:30)"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Checkout Start Time</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkoutTime}
                                    onChange={(e) => setCheckoutTime(e.target.value)}
                                    placeholder="HH:MM (e.g. 18:00)"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Webcam Source Device</label>
                            <div style={{ position: 'relative' }}>
                                <Camera size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <select 
                                    className="form-input" 
                                    value={cameraSource} 
                                    onChange={(e) => setCameraSource(e.target.value)}
                                    style={{ width: '100%', paddingLeft: '48px' }}
                                >
                                    {cameraList.map((cam, idx) => (
                                        <option key={idx} value={idx.toString()}>{cam}</option>
                                    ))}
                                    {/* Support IP camera custom addition */}
                                    {!cameraList.some(c => c.includes(cameraSource)) && cameraSource !== '0' && (
                                        <option value={cameraSource}>{cameraSource}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Working Hours Threshold</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    className="form-input"
                                    value={workHours}
                                    onChange={(e) => setWorkHours(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Rules Toggles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={lateMark}
                                    onChange={(e) => setLateMark(e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                />
                                <span>Enable Late Marking Threshold</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={autoAbsent}
                                    onChange={(e) => setAutoAbsent(e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                />
                                <span>Enable Auto-mark Absent (at closing time)</span>
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ gap: '8px', alignSelf: 'flex-end', marginTop: '10px' }}>
                            <Save size={16} />
                            <span>{loading ? 'Saving Settings...' : 'Save Settings'}</span>
                        </button>
                    </form>
                </div>

                {/* 2. Department Creation & Management Card */}
                <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <List size={18} style={{ color: 'var(--info)' }} />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Corporate Departments</h3>
                    </div>

                    {/* Department list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                        {departments.map((dept) => (
                            <div 
                                key={dept.id} 
                                className="glass-card" 
                                style={{ 
                                    padding: '10px 16px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{dept.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{dept.description || 'No description'}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Create Department Form */}
                    <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Create New Department</h4>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Department Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Finance"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Brief department description"
                                value={newDeptDesc}
                                onChange={(e) => setNewDeptDesc(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn btn-secondary" style={{ gap: '6px', alignSelf: 'flex-end', marginTop: '6px' }}>
                            <Plus size={16} />
                            <span>Add Department</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
