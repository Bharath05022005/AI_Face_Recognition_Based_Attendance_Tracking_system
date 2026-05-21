import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CameraFeed from './pages/CameraFeed';
import EmployeeRegistration from './pages/EmployeeRegistration';
import AttendanceLogs from './pages/AttendanceLogs';
import SettingsPage from './pages/Settings';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState('dark'); // 'dark' as default sleek corporate mode

    // Check token authentication state on load
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            setIsAuthenticated(true);
        }
        
        // Load stored theme or default to dark
        const savedTheme = localStorage.getItem("theme") || "dark";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
    };

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    // Render active tab view
    const renderActiveView = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'camera':
                return <CameraFeed />;
            case 'registration':
                return <EmployeeRegistration />;
            case 'logs':
                return <AttendanceLogs />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="app-container">
            {/* Sidebar Navigation Panel */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {/* Main Page Layout Container */}
            <main className="main-content">
                <Navbar activeTab={activeTab} theme={theme} toggleTheme={toggleTheme} />
                {renderActiveView()}
            </main>
        </div>
    );
}

export default App;
