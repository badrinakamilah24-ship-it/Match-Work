import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { 
  Users, 
  Briefcase, 
  CheckCircle,
  Menu,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import ManageUsers from './ManageUsers';
import ManageJobs from './ManageJobs';
import Reports from './Reports';
import ReportedUsers from './ReportedUsers';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    seekers: 0,
    recruiters: 0,
    jobs: 0,
    pendingJobs: 0
  });

  const syncStats = () => {
    try {
      // 1. Gather Users from localStorage
      const seekerUsers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
      const recruiterUsers = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      
      // Also fallback to scanning profiles if the lists are empty (migration/compatibility)
      let finalSeekers = seekerUsers;
      let finalRecruiters = recruiterUsers;
      
      if (finalSeekers.length === 0 && finalRecruiters.length === 0) {
        const seekers: any[] = [];
        const recruiters: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('matchwork_profile_')) {
            const profile = JSON.parse(localStorage.getItem(key) || 'null');
            if (profile) {
              if (profile.role === 'seeker') seekers.push(profile);
              else if (profile.role === 'recruiter') recruiters.push(profile);
            }
          }
        }
        finalSeekers = seekers;
        finalRecruiters = recruiters;
        localStorage.setItem('seekerUsers', JSON.stringify(seekers));
        localStorage.setItem('recruiterUsers', JSON.stringify(recruiters));
      }

      // 2. Gather Jobs
      const jobs = JSON.parse(localStorage.getItem('recruiterJobs') || '[]');

      setStats({
        seekers: finalSeekers.length,
        recruiters: finalRecruiters.length,
        jobs: jobs.length,
        pendingJobs: jobs.filter((j: any) => j.status === 'pending' || !j.status).length
      });
    } catch (e) {
      console.error("Failed to sync admin stats", e);
    }
  };

  useEffect(() => {
    syncStats();
    
    // Listen for storage changes across tabs
    window.addEventListener('storage', syncStats);
    
    // Also poll every 3 seconds for same-tab updates (since storage event doesn't fire in same tab)
    const interval = setInterval(syncStats, 3000);

    return () => {
      window.removeEventListener('storage', syncStats);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 h-full lg:sticky lg:top-0 lg:block flex-shrink-0
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        shadow-2xl shadow-gray-200/50
      `}>
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-30 h-20 bg-white border-b border-gray-100 flex items-center pl-20 pr-10 justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 italic tracking-tight uppercase">Admin Dashboard</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden md:block opacity-70">MatchWork Management System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {stats.pendingJobs > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-orange-100 shadow-sm animate-pulse">
                <AlertCircle className="w-3 h-3" />
                {stats.pendingJobs} Approval Pending
              </div>
            )}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
               <div className="text-right hidden sm:block">
                 <div className="text-xs font-black text-gray-900">Super Admin</div>
                 <div className="text-[9px] text-gray-400 font-bold uppercase">Online</div>
               </div>
               <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 italic transition-transform hover:scale-105 cursor-pointer">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pl-20 pr-10 pt-4 pb-12 scroll-smooth bg-gray-50/50">
          <div className="max-w-[1600px] mx-auto w-full">
            <Routes>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<StatsOverview stats={stats} />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="jobs" element={<ManageJobs showTrash={false} />} />
              <Route path="trash" element={<ManageJobs showTrash={true} />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reported" element={<ReportedUsers />} />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsOverview({ stats }: { stats: any }) {
  const navigate = useNavigate();
  const cards = [
    { label: 'Total Seeker', value: stats.seekers, icon: Users, color: 'from-blue-600 to-blue-400', trend: '+12% bln ini' },
    { label: 'Total Recruiter', value: stats.recruiters, icon: CheckCircle, color: 'from-green-600 to-green-400', trend: '+5% bln ini' },
    { label: 'Total Lowongan', value: stats.jobs, icon: Briefcase, color: 'from-indigo-600 to-indigo-400', trend: '+18% bln ini' },
    { label: 'Pending Approval', value: stats.pendingJobs, icon: Clock, color: 'from-orange-600 to-orange-400', trend: 'Mendesak' },
  ];

  const graphData = [
    { label: 'Seeker', value: stats.seekers, color: 'bg-blue-500' },
    { label: 'Recruiter', value: stats.recruiters, color: 'bg-green-500' },
    { label: 'Lowongan', value: stats.jobs, color: 'bg-indigo-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={card.label} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-gray-200 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className={`bg-gradient-to-br ${card.color} p-4 rounded-2xl text-white shadow-lg shadow-gray-200`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100`}>
                  {card.trend}
                </span>
              </div>
              <h3 className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-[0.2em]">{card.label}</h3>
              <p className="text-4xl font-black text-gray-900 tracking-tighter tabular-nums">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3 italic">
              <div className="p-2 bg-indigo-50 rounded-xl">
                 <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              Aktivitas Platform
            </h3>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data Aktual</div>
          </div>
          <div className="h-72 flex items-end justify-center gap-12">
            {graphData.map((item, i) => {
              const maxValue = Math.max(...graphData.map(d => d.value), 1);
              const height = (item.value / maxValue) * 100;
              return (
                <div key={i} className="flex-1 max-w-[80px] flex flex-col items-center gap-4 h-full justify-end">
                  <div className={`w-full ${item.color} rounded-2xl group relative cursor-pointer shadow-lg transition-all hover:brightness-110 min-h-[4px]`} style={{ height: `${height}%` }}>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10 whitespace-nowrap">
                      {item.value} {item.label}
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[3rem] shadow-2xl shadow-indigo-200 flex flex-col justify-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_white_0%,_transparent_50%)] group-hover:scale-150 transition-transform duration-1000" />
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl transform rotate-6 hover:rotate-0 transition-transform">
             <Shield className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl font-black text-white mb-3 italic">MatchWork Admin</h3>
          <p className="text-indigo-100 leading-relaxed max-w-sm mx-auto mb-10 text-sm font-medium opacity-80">
            Control center for the MatchWork ecosystem. Validate, moderate, and monitor growth in real-time.
          </p>
          <div className="flex gap-4 justify-center relative z-10">
            <button 
              onClick={() => navigate('/admin/users')}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:scale-105 transition-all active:scale-95"
            >
              Kelola Pengguna
            </button>
            <button 
              onClick={() => navigate('/admin/reports')}
              className="px-8 py-4 bg-indigo-500/20 backdrop-blur-md text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500/40 transition-all active:scale-95"
            >
              Cek Laporan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
