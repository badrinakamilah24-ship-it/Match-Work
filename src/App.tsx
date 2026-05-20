/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardRouter from './pages/DashboardRouter';
import Login from './pages/Login';
import Chat from './pages/Chat';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import Profile from './pages/Profile';
import MyApplications from './pages/MyApplications';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) {
      const checkSession = () => {
        try {
          const invalidated = JSON.parse(localStorage.getItem('matchwork_invalidated_sessions') || '[]');
          if (invalidated.includes(user.email.toLowerCase())) {
            // Remove from invalidated list
            const updated = invalidated.filter((e: string) => e !== user.email.toLowerCase());
            localStorage.setItem('matchwork_invalidated_sessions', JSON.stringify(updated));
            // Force logout
            logout();
            navigate('/login');
            alert('Sesi Anda telah dicabut oleh Admin. Silakan login kembali.');
          }
        } catch (e) {
          console.error("Session check failed", e);
        }
      };

      const interval = setInterval(checkSession, 5000);
      return () => clearInterval(interval);
    }
  }, [user, logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {role !== 'admin' && <Navbar />}
      <main className={`flex-1 ${role !== 'admin' ? 'pt-16' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login initialIsRegister={true} />} />
          <Route path="/dashboard/*" element={<DashboardRouter />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-applications" element={<MyApplications />} />
        </Routes>
      </main>
    </div>
  );
}


