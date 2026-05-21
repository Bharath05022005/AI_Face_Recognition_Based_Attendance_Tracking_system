import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Award, ShieldAlert } from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip, 
    BarChart, 
    Bar, 
    Cell, 
    Legend 
} from 'recharts';
import ApiService from '../utils/api';

const Analytics = () => {
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [deptDistribution, setDeptDistribution] = useState([]);
    const [kpis, setKpis] = useState({
        attendance_rate: 0.0,
        punctuality_rate: 100.0,
        average_check_in: 'N/A'
    });
    const [loading, setLoading] = useState(true);

    const loadAnalyticsData = async () => {
        try {
            setLoading(true);
            const trend = await ApiService.get("/analytics/monthly-trend");
            setMonthlyTrend(trend);

            const depts = await ApiService.get("/analytics/department-distribution");
            setDeptDistribution(depts);

            const kpiData = await ApiService.get("/analytics/dashboard-kpis");
            setKpis(kpiData);
        } catch (err) {
            console.error("Analytics data load error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    // Department color highlights
    const colors = ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];

    if (loading) {
        return (
            <div className="content-wrapper shimmer-bg" style={{ minHeight: '80vh', borderRadius: '16px' }}>
                <p style={{ textAlign: 'center', margin: 'auto', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Loading analytics data pipelines...
                </p>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            {/* Stat Summary Boxes */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Attendance Rating</span>
                        <Award size={18} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="stat-value">{kpis.attendance_rate}%</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Combined physical attendance across all departments</p>
                </div>

                <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Staff Punctuality Score</span>
                        <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                    </div>
                    <span className="stat-value">{kpis.punctuality_rate}%</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success-text)' }}>Percentage of present employees arriving on-time</p>
                </div>
            </div>

            {/* Line/Area Chart: Attendance Trend curve over past 30 days */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={18} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>30-Day Attendance Trend Curve</h3>
                </div>

                <div style={{ width: '100%', height: '320px' }}>
                    {monthlyTrend.length === 0 ? (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No history logs cached</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
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
                                <Area 
                                    name="Checked-in Staff" 
                                    type="monotone" 
                                    dataKey="present" 
                                    stroke="var(--primary)" 
                                    fillOpacity={1} 
                                    fill="url(#colorPresent)" 
                                    strokeWidth={2.5}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Bottom Section: Performance comparisons */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                {/* Departmental Comparison */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={18} style={{ color: 'var(--info)' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Department Attendance Statistics</h3>
                    </div>

                    <div style={{ width: '100%', height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="department" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                                <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-sidebar)', 
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)',
                                        borderRadius: '8px'
                                    }} 
                                />
                                <Bar dataKey="rate" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                                    {deptDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Punctual rankings */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Department Punctuality Scoreboard</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {deptDistribution.map((dept, index) => (
                            <div key={dept.department} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <span>{dept.department}</span>
                                    <span style={{ color: colors[index % colors.length] }}>{dept.rate}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${dept.rate}%`, 
                                        height: '100%', 
                                        backgroundColor: colors[index % colors.length],
                                        borderRadius: 'var(--radius-full)'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
