import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, MessageSquare, User, LogOut, Menu, UserCircle, FileText, Bell, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FirebaseService } from '../../services/firebaseService';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { role, logout, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [hasNotifs, setHasNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [localNotifs, setLocalNotifs] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadLocalData = () => {
    if (user?.email) {
      try {
        // Notifications
        const allNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        const myNotifs = allNotifs.filter((n: any) => n.recruiterEmail === user.email || n.seekerEmail === user.email || n.targetEmail === user.email);
        setLocalNotifs([...myNotifs].sort((a, b) => b.timestamp - a.timestamp));

        // Messages
        const allMsgs = JSON.parse(localStorage.getItem('chatMessages') || '[]');
        const myUnreadMsgs = allMsgs.filter((m: any) => m.receiverEmail === user.email && m.isRead === false);
        setHasUnreadMessages(myUnreadMsgs.length > 0);
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadLocalData();
    window.addEventListener('storage', loadLocalData);
    return () => window.removeEventListener('storage', loadLocalData);
  }, [user?.email]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    if (user?.email) {
      try {
        const allNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        const updated = allNotifs.map((n: any) => 
          (n.recruiterEmail === user.email || n.seekerEmail === user.email || n.targetEmail === user.email) ? { ...n, isRead: true } : n
        );
        localStorage.setItem('notifications', JSON.stringify(updated));
        setLocalNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }
  };

  const handleToggleNotifs = () => {
    if (!notifDropdownOpen) {
      markAllAsRead();
    }
    setNotifDropdownOpen(!notifDropdownOpen);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const unreadCount = localNotifs.filter(n => !n.isRead).length;

  useEffect(() => {
    let unsub = () => {};
    if (user && !user.isGuest && user.id !== 'guest') {
      import('../../services/firebaseService').then(({ auth }) => {
        const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
          if (firebaseUser && firebaseUser.uid === user.id) {
            unsub = FirebaseService.subscribeToNotifications(user.id, user.role || '', (notifs) => {
              setHasNotifs(notifs.length > 0);
            });
          }
        });
        return () => { unsubAuth(); unsub(); };
      });
    }
    return () => unsub();
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  if (role === 'admin' || isLoading) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Match Work</span>
            </Link>

            {role ? (
              <>
                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-8">
                  <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                    Dashboard
                  </Link>
                  {role === 'seeker' && (
                    <Link to="/resume-analyzer" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                      Resume AI
                    </Link>
                  )}
                  <Link to="/chat" className="relative text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                    Messages
                    {hasUnreadMessages && (
                      <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Link>
                  
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={handleToggleNotifs}
                      className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      {(unreadCount > 0 || hasNotifs) && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                          {unreadCount > 0 ? unreadCount : ''}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {notifDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
                        >
                          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Notifications</h3>
                            {unreadCount > 0 && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black">{unreadCount} NEW</span>}
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {localNotifs.length === 0 ? (
                              <div className="p-10 text-center">
                                <Bell className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium italic">Belum ada notifikasi baru.</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-50">
                                {localNotifs.map((notif) => (
                                  <div 
                                    key={notif.id}
                                    className={cn(
                                      "p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start",
                                      !notif.isRead && "bg-indigo-50/30"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                      notif.isRead ? "bg-gray-200" : "bg-indigo-600"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-xs font-bold leading-relaxed mb-1", notif.isDeleted ? "text-gray-400 italic font-medium" : "text-gray-800")}>
                                        {notif.message}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-medium italic uppercase tracking-wider">
                                        {getRelativeTime(notif.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {localNotifs.length > 0 && (
                            <Link 
                              to="/profile?tab=notifications" 
                              onClick={() => setNotifDropdownOpen(false)}
                              className="block p-3 text-center text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-gray-50 hover:bg-indigo-50 transition-colors"
                            >
                              See all notifications
                            </Link>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {role === 'seeker' && (
                    <Link to="/my-applications" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                      Applications
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-indigo-50 flex items-center justify-center">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                      {user?.firstName}
                    </span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden text-gray-600">
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 focus:outline-none">
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col space-y-4 shadow-xl animate-in slide-in-from-top duration-300">
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2 text-lg font-bold text-gray-900 border-b border-gray-50">Dashboard</Link>
            {role === 'seeker' && (
              <Link to="/resume-analyzer" onClick={() => setMobileMenuOpen(false)} className="py-2 text-lg font-bold text-gray-900 border-b border-gray-50">Resume AI</Link>
            )}
            <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="py-2 text-lg font-bold text-gray-900 border-b border-gray-50 flex items-center justify-between">
              Messages
              {hasUnreadMessages && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Link>
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="py-2 text-lg font-bold text-gray-900 border-b border-gray-50">Profile</Link>
            {role === 'seeker' && (
              <Link to="/my-applications" onClick={() => setMobileMenuOpen(false)} className="py-2 text-lg font-bold text-gray-900 border-b border-gray-50">My Applications</Link>
            )}
            <button 
              onClick={handleLogout}
              className="py-4 text-lg font-bold text-red-600 flex items-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
