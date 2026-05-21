import React, { useEffect, useState } from 'react';
import { 
    Users, 
    UserCheck, 
    UserX, 
    Clock, 
    Activity, 
    AlertTriangle,
    ShieldAlert
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend, 
    Cell 
} from 'recharts';
import ApiService from '../utils/api';

const Dashboard = () => {
    const [kpis, setKpis] = useState({
        total_active_employees: 0,
        physically_present: 0,
        present_on_time: 0,
        late_arrivals: 0,
        absent: 0,
        half_day: 0,
        early_checkout: 0,
        average_check_in: "N/A",
        attendance_rate: 0.0,
        punctuality_rate: 100.0
    });
    const [deptDistribution, setDeptDistribution] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            
            // 1. Load KPIs
            const kpiData = await ApiService.get("/analytics/dashboard-kpis");
            setKpis(kpiData);

            // 2. Load Department Distribution
            const deptData = await ApiService.get("/analytics/department-distribution");
            setDeptDistribution(deptData);

            // 3. Load Recent Logs (Today's Logs)
            const logsData = await ApiService.get("/attendance/logs");
            setRecentLogs(logsData.slice(0, 5)); // past 5 check-ins
        } catch (err) {
            console.error("Dashboard data load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    // Color definitions for charts
    const colors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];

    if (loading && kpis.total_active_employees === 0) {
        return (
            <div className="content-wrapper shimmer-bg" style={{ minHeight: '80vh', borderRadius: '16px' }}>
                <p style={{ textAlign: 'center', margin: 'auto', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Warming up dashboard analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            {/* KPI Cards Grid */}
            <div className="stats-grid">
                {/* Active Employees */}
                <div className="glass-card stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Staff</span>
                        <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                            <Users size={20} />
                        </div>
                    </div>
                    <span className="stat-value">{kpis.total_active_employees}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active profiles</span>
                </div>

                {/* Physically Present */}
                <div className="glass-card stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Present Today</span>
                        <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            <UserCheck size={20} />
                        </div>
                    </div>
                    <span className="stat-value">{kpis.physically_present}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success-text)' }}>
                        {kpis.attendance_rate}% Attendance Rate
                    </span>
                </div>

                {/* Late Arrivals */}
                <div className="glass-card stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Late Arrivals</span>
                        <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            <Clock size={20} />
                        </div>
                    </div>
                    <span className="stat-value">{kpis.late_arrivals}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>
                        Avg check-in: {kpis.average_check_in}
                    </span>
                </div>

                {/* Absent Staff */}
                <div className="glass-card stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Absent Today</span>
                        <div className="stat-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                            <UserX size={20} />
                        </div>
                    </div>
                    <span className="stat-value">{kpis.absent}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Auto-absents marked</span>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="dashboard-grid">
                {/* 1. Bar Chart: Department-wise distribution */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Department Attendance Overview</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        {deptDistribution.length === 0 ? (
                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No department data cached</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="department" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'var(--bg-sidebar)', 
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Bar name="Present" dataKey="present" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                                        {deptDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Bar>
                                    <Bar name="Absent" dataKey="absent" fill="var(--danger)" radius={[4, 4, 0, 0]} opacity={0.3} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 2. Side Panel: Attendance breakdown */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Status Distribution</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* On-Time Present */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>On Time (Present)</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{kpis.present_on_time}</span>
                        </div>

                        {/* Late */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Late Arrivals</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{kpis.late_arrivals}</span>
                        </div>

                        {/* Half Day */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--info)' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Half Day Check-ins</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{kpis.half_day}</span>
                        </div>

                        {/* Early Checkout */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#a855f7' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Early Checkouts</span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{kpis.early_checkout}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Real-time Logs List */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Attendance Updates</h3>
                </div>

                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Date</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Status</th>
                                <th>Work Hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>
                                        No logs registered yet today
                                    </td>
                                </tr>
                            ) : (
                                recentLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontWeight: 600 }}>{log.employee_name} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({log.employee_id})</span></td>
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
                                        <td>{log.work_duration > 0 ? `${log.work_duration} hrs` : '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
