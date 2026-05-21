import React, { useEffect, useState } from 'react';
import { Search, Download, Clock, Edit3, UserCheck, ShieldAlert, Plus, Calendar } from 'lucide-react';
import ApiService from '../utils/api';

const AttendanceLogs = () => {
    // Table logs state
    const [logs, setLogs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters state
    const [searchName, setSearchName] = useState('');
    const [searchId, setSearchId] = useState('');
    const [searchDept, setSearchDept] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal forms state
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [activeLog, setActiveLog] = useState(null);
    
    // Manual check-in fields
    const [manualEmpId, setManualEmpId] = useState('');
    const [manualTime, setManualTime] = useState('');
    const [manualType, setManualType] = useState('check-in'); // check-in or check-out

    // Load filter lists and logs on mount
    const loadLogs = async () => {
        setLoading(true);
        try {
            // Build query params
            let query = "/attendance/logs?";
            if (searchId) query += `employee_id=${searchId}&`;
            if (searchName) query += `name=${searchName}&`;
            if (searchDept) query += `department_id=${searchDept}&`;
            if (searchStatus) query += `status=${searchStatus}&`;
            if (startDate) query += `start_date=${startDate}&`;
            if (endDate) query += `end_date=${endDate}&`;
            
            const logsData = await ApiService.get(query);
            setLogs(logsData);
        } catch (err) {
            console.error("Logs load error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepts = async () => {
        try {
            const depts = await ApiService.get("/departments");
            setDepartments(depts);
        } catch (err) {
            console.error("Depts load error:", err);
        }
    };

    useEffect(() => {
        loadLogs();
        fetchDepts();
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadLogs();
    };

    const handleResetFilters = () => {
        setSearchName('');
        setSearchId('');
        setSearchDept('');
        setSearchStatus('');
        setStartDate('');
        setEndDate('');
        setTimeout(() => {
            loadLogs();
        }, 100);
    };

    // Excel Export Request Handler
    const handleExcelExport = async () => {
        try {
            let query = "/exports/attendance-excel?";
            if (searchId) query += `employee_id=${searchId}&`;
            if (searchName) query += `name=${searchName}&`;
            if (searchDept) query += `department_id=${searchDept}&`;
            if (searchStatus) query += `status=${searchStatus}&`;
            if (startDate) query += `start_date=${startDate}&`;
            if (endDate) query += `end_date=${endDate}&`;
            
            const blob = await ApiService.get(query);
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert(err.message || "Failed to compile and download Excel report.");
        }
    };

    // Manual clock override trigger
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualEmpId) return;

        try {
            const endpoint = manualType === 'check-in' ? "/attendance/check-in" : "/attendance/check-out";
            const timeParam = manualTime ? `&check_in_time=${manualTime}` : '';
            await ApiService.post(`${endpoint}?employee_id=${manualEmpId}${timeParam}`);
            
            setShowManualModal(false);
            setManualEmpId('');
            setManualTime('');
            loadLogs();
        } catch (err) {
            alert(err.message || "Failed to execute manual clock override.");
        }
    };

    // Direct inline log edits trigger
    const handleEditSave = async (e) => {
        e.preventDefault();
        if (!activeLog) return;

        try {
            await ApiService.put(`/attendance/logs/${activeLog.id}?attendance_status=${activeLog.attendance_status}&check_in_time=${activeLog.check_in_time || ''}&check_out_time=${activeLog.check_out_time || ''}&late_minutes=${activeLog.late_minutes}&work_duration=${activeLog.work_duration}`);
            setShowEditModal(false);
            loadLogs();
        } catch (err) {
            alert(err.message || "Failed to update attendance log entry.");
        }
    };

    return (
        <div className="content-wrapper">
            {/* Action Bar (Search filters & modifiers trigger) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1 }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by Employee Name"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        style={{ minWidth: '180px' }}
                    />
                    
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by ID"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        style={{ maxWidth: '120px' }}
                    />

                    <select className="form-input" value={searchDept} onChange={(e) => setSearchDept(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <select className="form-input" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Absent">Absent</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Early Checkout">Early Checkout</option>
                    </select>

                    <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        title="Start Date"
                    />

                    <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        title="End Date"
                    />

                    <button type="submit" className="btn btn-primary" style={{ padding: '10px' }} title="Apply Filters">
                        <Search size={16} />
                    </button>

                    <button type="button" className="btn btn-secondary" onClick={handleResetFilters} style={{ padding: '10px 16px' }}>
                        Reset
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowManualModal(true)} style={{ gap: '8px' }}>
                        <Plus size={16} />
                        <span>Manual Clock</span>
                    </button>
                    
                    <button className="btn btn-secondary" onClick={handleExcelExport} style={{ gap: '8px', borderColor: 'var(--success)' }} title="Download Excel sheet">
                        <Download size={16} style={{ color: 'var(--success)' }} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Core Logs Table */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Date</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Status</th>
                                <th>Late Mins</th>
                                <th>Duration</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0' }}>
                                        Querying attendance logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>
                                        No historical logs matching filters
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {log.employee_name}
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                                {log.employee_id} • {log.department_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{log.date}</td>
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
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="icon-btn" 
                                                onClick={() => { setActiveLog({ ...log }); setShowEditModal(true); }}
                                                style={{ width: '32px', height: '32px', display: 'inline-flex' }}
                                                title="Edit Record"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DIALOG MODAL 1: Edit Attendance Log */}
            {showEditModal && activeLog && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            Adjust Log for {activeLog.employee_name}
                        </h3>

                        <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Status Override</label>
                                <select 
                                    className="form-input" 
                                    value={activeLog.attendance_status} 
                                    onChange={(e) => setActiveLog({ ...activeLog, attendance_status: e.target.value })}
                                >
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Half Day">Half Day</option>
                                    <option value="Early Checkout">Early Checkout</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Check-in Time (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={activeLog.check_in_time || ''}
                                    onChange={(e) => setActiveLog({ ...activeLog, check_in_time: e.target.value })}
                                    placeholder="e.g. 09:05:00"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Check-out Time (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={activeLog.check_out_time || ''}
                                    onChange={(e) => setActiveLog({ ...activeLog, check_out_time: e.target.value })}
                                    placeholder="e.g. 18:00:00"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Late Minutes</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={activeLog.late_minutes}
                                        onChange={(e) => setActiveLog({ ...activeLog, late_minutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Duration (Hours)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={activeLog.work_duration}
                                        onChange={(e) => setActiveLog({ ...activeLog, work_duration: parseFloat(e.target.value) || 0.0 })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DIALOG MODAL 2: Manual Clock-in Override */}
            {showManualModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                            Administrative Manual Clock Override
                        </h3>

                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Employee ID (e.g. EMP-101) *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter employee ID"
                                    value={manualEmpId}
                                    onChange={(e) => setManualEmpId(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Clock Type Selection</label>
                                <select 
                                    className="form-input" 
                                    value={manualType} 
                                    onChange={(e) => setManualType(e.target.value)}
                                >
                                    <option value="check-in">Manual Check-in</option>
                                    <option value="check-out">Manual Check-out</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Clock Time Override (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="HH:MM:SS (e.g. 09:12:00, blank for current time)"
                                    value={manualTime}
                                    onChange={(e) => setManualTime(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
                                    <UserCheck size={16} />
                                    <span>Trigger Clock</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceLogs;
