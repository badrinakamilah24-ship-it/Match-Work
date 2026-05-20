import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Briefcase, 
  FileText, 
  LogOut,
  Shield,
  X,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebaseService';

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = React.useState('dashboard');

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', path: '/admin/overview' },
    { id: 'users', icon: Users, label: 'Kelola Pengguna', path: '/admin/users' },
    { id: 'lowongan', icon: Briefcase, label: 'Kelola Lowongan', path: '/admin/jobs' },
    { id: 'sampah', icon: Trash2, label: 'Sampah', path: '/admin/trash' },
    { id: 'laporan', icon: FileText, label: 'Laporan', path: '/admin/reports' },
    { id: 'reported', icon: AlertCircle, label: 'Reported Users', path: '/admin/reported' },
  ];

  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/' || path === '/admin/overview') {
      setActiveMenu('dashboard');
    } else if (path.includes('users')) {
      setActiveMenu('users');
    } else if (path.includes('jobs')) {
      setActiveMenu('lowongan');
    } else if (path.includes('trash')) {
      setActiveMenu('sampah');
    } else if (path.includes('reports')) {
      setActiveMenu('laporan');
    } else if (path.includes('reported')) {
      setActiveMenu('reported');
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-72 shadow-2xl shadow-gray-200/50">
      <div className="p-10 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-400 p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-gray-900 italic">AdminPanel</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              setActiveMenu(item.id);
              onClose?.();
            }}
            className={() => `
              flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group
              ${activeMenu === item.id 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black shadow-xl shadow-indigo-200' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMenu === item.id ? 'text-white' : 'text-gray-400'}`} />
            <span className="text-sm uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-8 border-t border-gray-100">
        <button
          onClick={() => {
            auth.signOut();
            logout();
            navigate('/');
          }}
          className="flex items-center gap-4 w-full px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em]"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
