import React from 'react';
import { 
    LayoutDashboard, 
    Camera, 
    UserPlus, 
    History, 
    Settings, 
    LogOut 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    // Retrieve logged-in admin details from localStorage
    const adminStr = localStorage.getItem("admin_user");
    const admin = adminStr ? JSON.parse(adminStr) : { full_name: "System Admin", role: "Administrator" };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("admin_user");
        window.location.reload(); // Triggers re-auth verification
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'camera', label: 'Live Camera Feed', icon: Camera },
        { id: 'registration', label: 'Face Registration', icon: UserPlus },
        { id: 'logs', label: 'Attendance Logs', icon: History },
        { id: 'settings', label: 'System Settings', icon: Settings },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">AI</div>
                <div className="sidebar-title">Face Tracking</div>
            </div>

            <nav className="sidebar-menu">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="avatar">
                        {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{admin.full_name}</span>
                        <span className="user-role">{admin.role}</span>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="btn btn-secondary" 
                    style={{ width: '100%', gap: '10px', marginTop: '10px', padding: '8px' }}
                >
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
