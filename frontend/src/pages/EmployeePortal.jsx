import React, { useState } from 'react';
import { Search, User, Clock, Award, History } from 'lucide-react';
import ApiService from '../utils/api';

const EmployeePortal = () => {
    const [empId, setEmpId] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [employeeName, setEmployeeName] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!empId) return;

        setLoading(true);
        setError('');
        setLogs([]);
        setEmployeeName('');

        try {
            // Fetch logs for this specific employee
            const data = await ApiService.get(`/attendance/logs?employee_id=${empId}`);
            
            if (data.length === 0) {
                setError("No logs registered for this Employee ID.");
            } else {
                setLogs(data);
                setEmployeeName(data[0].employee_name);
            }
        } catch (err) {
            setError(err.message || "Failed to search logs. Please check your Employee ID.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics in-memory
    const totalPresent = logs.filter(l => ['Present', 'Late', 'Half Day', 'Early Checkout'].includes(l.attendance_status)).length;
    const totalLate = logs.filter(l => l.attendance_status === 'Late').length;
    const totalAbsent = logs.filter(l => l.attendance_status === 'Absent').length;
    const punctuality = logs.length > 0 ? Math.round((totalPresent - totalLate) / totalPresent * 100) || 100 : 100;

    return (
        <div className="content-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Search Card */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Employee Self-Service Portal</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Verify check-in history and track personal punctuality records
                </p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                        <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your Employee ID (e.g. EMP-101)"
                            value={empId}
                            onChange={(e) => setEmpId(e.target.value)}
                            style={{ width: '100%', paddingLeft: '48px' }}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ gap: '8px' }}>
                        <Search size={16} />
                        <span>Search</span>
                    </button>
                </form>

                {error && (
                    <div className="badge badge-absent" style={{ padding: '10px', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Results & KPI overview */}
            {logs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
                    {/* Header */}
                    <div className="glass-card" style={{ padding: '16px 24px', borderLeft: '4px solid var(--primary)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Employee Profile Found</span>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{employeeName}</h2>
                    </div>

                    {/* Personal KPIs */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="glass-card stat-card">
                            <span className="stat-label">Checked In</span>
                            <span className="stat-value">{totalPresent}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--success-text)' }}>Days physically present</span>
                        </div>
                        <div className="glass-card stat-card">
                            <span className="stat-label">Late Marks</span>
                            <span className="stat-value">{totalLate}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>Late arrivals registered</span>
                        </div>
                        <div className="glass-card stat-card">
                            <span className="stat-label">Punctuality</span>
                            <span className="stat-value">{punctuality}%</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Overall accuracy rating</span>
                        </div>
                    </div>

                    {/* Historical Table */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <History size={18} style={{ color: 'var(--primary)' }} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Personal Logs History</h3>
                        </div>

                        <div className="table-container">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Check-in</th>
                                        <th>Check-out</th>
                                        <th>Status</th>
                                        <th>Late Minutes</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ fontWeight: 600 }}>{log.date}</td>
                                            <td>{log.check_in_time || '-'}</td>
                                            <td>{log.check_out_time || '-'}</td>
                                            <td>
                                                <span className={`badge badge-${
                                                    log.attendance_status === 'Present' ? 'present' :
                                                    log.attendance_status === 'Late' ? 'late' :
                                                    log.attendance_status === 'Absent' ? 'absent' : 'halfday'
                                                }`}>
                                                    {log.attendance_status}
                                                </span>
                                            </td>
                                            <td>{log.late_minutes > 0 ? `${log.late_minutes} min` : '-'}</td>
                                            <td>{log.work_duration > 0 ? `${log.work_duration} hrs` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePortal;
