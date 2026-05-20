import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Mail, Shield, Settings, FileText, Bell, Globe, 
  Camera, Sparkles, LogIn, Check, X, Languages, 
  Trash2, Smartphone, Monitor, ChevronRight, Phone, MapPin, Plus, Lock, AlertCircle
} from 'lucide-react';
import { Role, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FirebaseService, auth } from '../services/firebaseService';
import LocationSearchSelect from '../components/LocationSearchSelect';

export default function Profile() {
  const { user, role, setUser } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'info';

  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotifs, setSelectedNotifs] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    old: '',
    new: '',
    confirm: ''
  });

  const [securityStep, setSecurityStep] = useState<'index' | '2fa' | 'password'>('index');
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isDeactivationModalOpen, setIsDeactivationModalOpen] = useState(false);

  const loadLocalNotifs = () => {
    if (user?.email) {
      try {
        const allNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
        // Ensure all notifications have a unique ID
        const allNotifsWithId = allNotifs.map((n: any) => ({
            ...n,
            id: n.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9))
        }));
        
        let hasChanges = false;
        if (JSON.stringify(allNotifs) !== JSON.stringify(allNotifsWithId)) {
            localStorage.setItem('notifications', JSON.stringify(allNotifsWithId));
            hasChanges = true;
        }

        const myNotifs = allNotifsWithId.filter((n: any) => n.recruiterEmail === user.email || n.seekerEmail === user.email || n.targetEmail === user.email);
        setNotifications([...myNotifs].sort((a, b) => b.timestamp - a.timestamp));
        if (hasChanges) window.dispatchEvent(new Event('storage'));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications' && user?.email) {
      const allNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
      const hasUnread = allNotifs.some((n: any) => (n.recruiterEmail === user.email || n.seekerEmail === user.email || n.targetEmail === user.email) && !n.isRead);
      
      if (hasUnread) {
        const updated = allNotifs.map((n: any) => 
          (n.recruiterEmail === user.email || n.seekerEmail === user.email || n.targetEmail === user.email) ? { ...n, isRead: true } : n
        );
        localStorage.setItem('notifications', JSON.stringify(updated));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event('storage'));
      }
    }
  }, [activeTab, user?.email]);

  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const [customLanguage, setCustomLanguage] = useState('');

  const INDONESIAN_CITIES = [
    'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 
    'Palembang', 'Tangerang', 'South Tangerang', 'Batam', 'Pekanbaru', 
    'Bogor', 'Denpasar', 'Yogyakarta', 'Malang', 'Balikpapan', 'Banjarmasin'
  ].sort();

  const GLOBAL_COUNTRIES = [
    'Indonesia', 'Malaysia', 'Singapore', 'Thailand', 'Vietnam', 'Philippines',
    'USA', 'United Kingdom', 'Canada', 'Australia', 'Japan', 'South Korea',
    'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Brazil', 'India'
  ].sort();

  const currentLang = (user?.language as any) || 'English (US)';

  const translations = {
    'English (US)': {
      personal_info: 'Personal Information',
      resume_skills: 'Resume & Skills',
      notifications: 'Notifications',
      security: 'Security',
      privacy: 'Privacy',
      settings: 'Settings',
      edit_profile: 'Edit Profile',
      save_changes: 'Save Changes',
      first_name: 'First Name',
      last_name: 'Last Name',
      phone: 'Phone Number',
      location: 'Location',
      bio: 'Bio / Headline',
      expertise: 'Expertise',
      add_skill: 'Add a skill (e.g. React)',
      add_industry: 'Add an industry (e.g. Fintech)',
      security_title: 'Security & Privacy',
      connected_devices: 'Connected Devices',
      privacy_settings: 'Privacy Settings',
      general_settings: 'General Settings',
      language_pref: 'Interface Language',
      danger_zone: 'Danger Zone',
      deactivate: 'Deactivate Account',
      change_password: 'Change Password',
      new_password: 'New Password',
      old_password: 'Old Password',
      confirm_password: 'Confirm Password',
      profile_visibility: 'Profile Visibility',
      online_status: 'Show Online Status',
      marketing: 'Email Marketing',
      country_pref: 'Country Preference'
    },
    'Indonesian': {
      personal_info: 'Informasi Pribadi',
      resume_skills: 'Resume & Keahlian',
      notifications: 'Notifikasi',
      security: 'Keamanan',
      privacy: 'Privasi',
      settings: 'Pengaturan',
      edit_profile: 'Edit Profil',
      save_changes: 'Simpan Perubahan',
      first_name: 'Nama Depan',
      last_name: 'Nama Belakang',
      phone: 'Nomor Telepon',
      location: 'Lokasi',
      bio: 'Bio / Headline',
      expertise: 'Keahlian',
      add_skill: 'Tambah keahlian (misal: React)',
      add_industry: 'Tambah industri (misal: Fintech)',
      security_title: 'Keamanan & Privasi',
      connected_devices: 'Perangkat Terhubung',
      privacy_settings: 'Pengaturan Privasi',
      general_settings: 'Pengaturan Umum',
      language_pref: 'Bahasa Antarmuka',
      danger_zone: 'Zona Berbahaya',
      deactivate: 'Nonaktifkan Akun',
      change_password: 'Ubah Kata Sandi',
      new_password: 'Kata Sandi Baru',
      old_password: 'Kata Sandi Lama',
      confirm_password: 'Konfirmasi Kata Sandi',
      profile_visibility: 'Visibilitas Profil',
      online_status: 'Tampilkan Status Online',
      marketing: 'Pemasaran Email',
      country_pref: 'Preferensi Negara'
    }
  };

  const t = (key: string) => (translations[currentLang] as any)?.[key] || (translations['English (US)'] as any)?.[key] || key;

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
      });

      // Fetch Latest Skills from Database (Direct Request from User)
      const fetchSkills = async () => {
          if (isGuest || !user.id) return;
          try {
              const dbProfile = await FirebaseService.getUserProfile(user.id);
              if (dbProfile) {
                  const dbSkills = user.role === 'seeker' ? (dbProfile.skills || []) : (dbProfile.fields || []);
                  setSkills(dbSkills);
                  
                  // Also update context if mismatch found
                  const currentSkills = user.role === 'seeker' ? ((user as any).skills || []) : ((user as any).fields || []);
                  if (JSON.stringify(dbSkills) !== JSON.stringify(currentSkills)) {
                      setUser({ ...user, ...dbProfile });
                  }
              }
          } catch (err) {
              console.error("Failed to fetch fresh skills:", err);
          }
      };
      
      fetchSkills();

      // Fallback/Initial skills from current user state
      if (user.role === 'seeker') {
        setSkills((user as any).skills || []);
      } else if (user.role === 'recruiter') {
        setSkills((user as any).fields || []);
      }

      // Sync Notifications
      loadLocalNotifs();
      window.addEventListener('storage', loadLocalNotifs);
      return () => window.removeEventListener('storage', loadLocalNotifs);
    }
  }, [user]);

  if (!user) return null;

  const isGuest = user.isGuest || user.id === 'guest';

  const handleSaveProfile = async () => {
    if (isGuest || !user.email) return;
    try {
      const updatedUser = { ...user, ...formData };
      
      // Update database
      await FirebaseService.updateUserProfile(user.id, formData);
      
      // Update persistent storage keyed by email
      const profileKey = `matchwork_profile_${user.email.toLowerCase()}`;
      localStorage.setItem(profileKey, JSON.stringify(updatedUser));
      
      // Update app state
      setUser(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || isGuest) return;
    const updatedSkills = [...skills, newSkill.trim()];
    setSkills(updatedSkills);
    setNewSkill('');
    
    const updateObj: Partial<UserProfile> = user.role === 'seeker' ? { skills: updatedSkills } : { fields: updatedSkills };
    await FirebaseService.updateUserProfile(user.id, updateObj);
    setUser({ ...user, ...updateObj });
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (isGuest) return;
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
    
    const updateObj: Partial<UserProfile> = user.role === 'seeker' ? { skills: updatedSkills } : { fields: updatedSkills };
    await FirebaseService.updateUserProfile(user.id, updateObj);
    setUser({ ...user, ...updateObj });
  };

  const handleAvatarAction = (action: 'gallery' | 'camera' | 'delete') => {
    if (isGuest) {
      navigate('/login');
      return;
    }

    if (action === 'delete') {
      setUser({ ...user, avatar: undefined });
      FirebaseService.updateUserProfile(user.id, { avatar: '' });
      setShowAvatarMenu(false);
      return;
    }

    if (action === 'gallery' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (action === 'camera' && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setShowAvatarMenu(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUser({ ...user, avatar: result });
        FirebaseService.updateUserProfile(user.id, { avatar: result });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabChange = (tab: string) => {
    if (isGuest && tab !== 'info') {
      navigate('/login');
      return;
    }
    setActiveTab(tab);
  };

  const languages = ['English (US)', 'Indonesian', 'Japanese', 'Korean', 'Spanish', 'French', 'German'];

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'notifications':
        const isAllSelected = notifications.length > 0 && selectedNotifs.length === notifications.length && notifications.length > 0;
        const handleSelectAll = (shouldSelect: boolean) => {
            if (shouldSelect) {
                const allIds = notifications.map(n => String(n.id));
                setSelectedNotifs(allIds);
            } else {
                setSelectedNotifs([]);
            }
        };

        return (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-display font-bold text-gray-900">Notifications</h2>
                    <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">Live</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {isSelectMode ? (
                        <>
                            <button 
                                onClick={() => {
                                    setIsSelectMode(false);
                                    setSelectedNotifs([]);
                                }}
                                className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleSelectAll(!isAllSelected)}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100"
                            >
                                {isAllSelected ? "Unselect All" : "Select All"}
                            </button>
                            {notifications.length > 0 && selectedNotifs.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="relative z-50 pointer-events-auto flex items-center text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all border border-red-200 active:scale-95 group cursor-pointer shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5 group-hover:rotate-12 transition-transform" />
                                    Hapus ({selectedNotifs.length})
                                </button>
                            )}
                        </>
                    ) : (
                        notifications.length > 0 && (
                            <button 
                                onClick={() => setIsSelectMode(true)}
                                className="flex items-center px-3 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100 shadow-sm"
                            >
                                <Settings className="w-3 h-3 mr-1.5" />
                                Select
                            </button>
                        )
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100"
                        >
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-4">Konfirmasi Hapus</h3>
                            <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                Apakah Anda yakin untuk menghapus notifikasi ini?
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => {
                                        try {
                                            const storageKey = "notifications";
                                            const currentDataRaw = localStorage.getItem(storageKey) || "[]";
                                            const currentData = JSON.parse(currentDataRaw);
                                            
                                            const stringSelected = selectedNotifs.map(String);
                                            const newData = currentData.filter((item: any) => !stringSelected.includes(String(item.id)));
                                            
                                            localStorage.setItem(storageKey, JSON.stringify(newData));
                                            
                                            // Update local state for immediate feedback
                                            if (user?.email) {
                                                const myNewList = newData.filter((n: any) => 
                                                    n.recruiterEmail === user.email || 
                                                    n.seekerEmail === user.email || 
                                                    n.targetEmail === user.email
                                                );
                                                setNotifications([...myNewList].sort((a, b) => b.timestamp - a.timestamp));
                                            } else {
                                                setNotifications(newData);
                                            }
                                            
                                            setSelectedNotifs([]);
                                            setIsSelectMode(false);
                                            setShowDeleteConfirm(false);
                                            
                                            // Trigger storage event to update Navbar count
                                            window.dispatchEvent(new Event('storage'));
                                        } catch (err) {
                                            console.error("Gagal menghapus:", err);
                                            setShowDeleteConfirm(false);
                                        }
                                    }}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all font-display"
                                >
                                    Ya
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all font-display"
                                >
                                    Batal
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isSelectMode && notifications.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 bg-indigo-50/20 rounded-2xl border border-indigo-100/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        Selection Mode Active
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                        {selectedNotifs.length} terpilih dari {notifications.length}
                    </span>
                </div>
            )}

            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm font-medium">Belum ada notifikasi baru.</p>
                </div>
              ) : (
                notifications.map(n => (
                    <NotificationItem 
                      key={n.id} 
                      title={n.message.includes('🎉') ? 'Job Status Update' : 'New Interaction'}
                      desc={n.message} 
                      time={getRelativeTime(n.timestamp)} 
                      type={n.message.includes('🎉') ? 'match' : 'update'} 
                      isRead={n.isRead}
                      isSelected={selectedNotifs.includes(String(n.id))}
                      isDeleted={n.isDeleted}
                      isSelectMode={isSelectMode}
                      onSelect={(checked: boolean) => {
                          const stringId = String(n.id);
                          if (checked) setSelectedNotifs(prev => [...prev, stringId]);
                          else setSelectedNotifs(prev => prev.filter(id => id !== stringId));
                      }}
                    />
                ))
              )}
            </div>
          </section>
        );
      case 'security':
        return (
          <section className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-gray-900">{t('security')}</h2>
            
            {securityStep === 'password' && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm ring-4 ring-indigo-50"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-900">{t('change_password')}</h3>
                        </div>
                        <button onClick={() => setSecurityStep('index')} className="text-xs font-bold text-gray-400 hover:text-gray-900">Cancel</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('old_password')}</label>
                            <input 
                                type="password"
                                value={passwordForm.old}
                                onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                                className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('new_password')}</label>
                            <input 
                                type="password"
                                value={passwordForm.new}
                                onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                                className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('confirm_password')}</label>
                            <input 
                                type="password"
                                value={passwordForm.confirm}
                                onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                                className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            alert('Password successfully updated!');
                            setPasswordForm({ old: '', new: '', confirm: '' });
                            setSecurityStep('index');
                        }}
                        className="w-full py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all"
                    >
                        Update Password
                    </button>
                </motion.div>
            )}

            <div className="space-y-4">
              <SecuritySetting 
                label="Password" 
                value="••••••••••••" 
                action="Change" 
                onAction={() => {
                    setSecurityStep('2fa');
                    setShow2FAVerification(true);
                }}
              />
              <SecuritySetting 
                label="Two-Factor Authentication" 
                value={user.twoFactorEnabled ? "Enabled" : "Disabled"} 
                action={user.twoFactorEnabled ? "Configure" : "Enable"} 
                onAction={() => {
                    setSecurityStep('index');
                    setShow2FAVerification(true);
                }}
              />
              
              <AnimatePresence>
                {show2FAVerification && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    >
                        <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative">
                            <button onClick={() => setShow2FAVerification(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="text-center">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Shield className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-4">Identity Verification</h3>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                    Enter the 6-digit verification code from your authenticator app to proceed.
                                </p>
                                
                                <div className="relative mb-6">
                                    <input 
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val && !/^\d*$/.test(val)) {
                                                setOtpError('Kode Verifikasi salah + mohon ditulis dengan angka');
                                                return;
                                            }
                                            setOtpError('');
                                            setOtpCode(val);
                                        }}
                                        className={`w-full p-4 bg-gray-50 rounded-2xl border text-center text-2xl font-black tracking-[0.5em] outline-none transition-all ${
                                            otpError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-100 focus:ring-4 focus:ring-indigo-500/10'
                                        }`}
                                    />
                                    <AnimatePresence>
                                        {otpError && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute -bottom-6 left-0 right-0 text-[9px] font-black uppercase text-red-500 tracking-widest"
                                            >
                                                {otpError}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button 
                                    onClick={() => {
                                        if (otpCode.length !== 6) {
                                            setOtpError('Mohon masukkan 6 digit angka');
                                            return;
                                        }
                                        
                                        if (securityStep === '2fa') {
                                            setSecurityStep('password');
                                            setShow2FAVerification(false);
                                            setOtpCode('');
                                        } else {
                                            const next = !user.twoFactorEnabled;
                                            setUser({...user, twoFactorEnabled: next});
                                            FirebaseService.updateUserProfile(user.id, { twoFactorEnabled: next });
                                            setShow2FAVerification(false);
                                            setOtpCode('');
                                            alert(`2FA is now ${next ? 'enabled' : 'disabled'}!`);
                                        }
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-gray-900 transition-all mt-4"
                                >
                                    Verify & Proceed
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                   <h3 className="font-bold text-gray-900 text-sm mb-1">Connected Devices</h3>
                   <p className="text-xs text-gray-500">Manage sessions on your other devices.</p>
                </div>
                <div className="space-y-4">
                    {/* Current Device - Always shown */}
                    <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                        <div className="flex items-center">
                            <Monitor className="w-5 h-5 text-indigo-600 mr-3" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Current Session</p>
                                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Active Now</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">This device</span>
                    </div>

                    {(user.connectedDevices || []).filter((d: any) => d.lastActive !== 'Active Now').map((device: any) => (
                        <div key={device.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl group hover:border-red-100 transition-all">
                            <div className="flex items-center">
                                {device.type === 'mobile' ? <Smartphone className="w-5 h-5 text-gray-400 mr-3" /> : <Monitor className="w-5 h-5 text-gray-400 mr-3" />}
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{device.name}</p>
                                    <p className="text-[10px] text-gray-400">{device.lastActive}</p>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    const updatedDevices = (user.connectedDevices || []).filter((d: any) => d.id !== device.id);
                                    setUser({ ...user, connectedDevices: updatedDevices });
                                    await FirebaseService.updateUserProfile(user.id, { connectedDevices: updatedDevices });
                                }}
                                className="text-xs font-bold text-gray-400 group-hover:text-red-500"
                            >
                                Revoke
                            </button>
                        </div>
                    ))}
                    
                    {(!user.connectedDevices || user.connectedDevices.length === 0) && (
                        <p className="text-center text-[10px] text-gray-400 py-2 italic font-medium uppercase tracking-widest">No other devices connected</p>
                    )}
                </div>
              </div>
            </div>
          </section>
        );
      case 'privacy':
        return (
          <section className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-gray-900">{t('privacy_settings')}</h2>
            <div className="space-y-4">
              <PrivacyToggle 
                 label={t('profile_visibility')} 
                 desc="Allow recruiters to find you in search results." 
                 enabled={true} 
              />
              <PrivacyToggle 
                 label={t('online_status')} 
                 desc="Show when you are active on the platform." 
                 enabled={user.showOnlineStatus !== false} 
                 onToggle={(val: boolean) => {
                    setUser({ ...user, showOnlineStatus: val });
                    FirebaseService.updateUserProfile(user.id, { showOnlineStatus: val });
                 }}
              />
              <PrivacyToggle 
                 label={t('marketing')} 
                 desc="Receive updates about new features and promotions." 
                 enabled={true} 
              />
            </div>
          </section>
        );
      case 'settings':
        return (
          <section className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-gray-900">{t('settings')}</h2>
            <div className="space-y-6">
              {/* Simplified Language Selection */}
              <div className="p-6 bg-white border border-gray-100 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Languages className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest text-[10px]">{t('language_pref')}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['English (US)', 'Indonesian'].map(lang => (
                        <button 
                            key={lang}
                            onClick={() => {
                                const updatedUser = {...user, language: lang};
                                setUser(updatedUser);
                                FirebaseService.updateUserProfile(user.id, { language: lang });
                                if (user.email) {
                                  localStorage.setItem(`matchwork_profile_${user.email.toLowerCase()}`, JSON.stringify(updatedUser));
                                }
                            }}
                            className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all border ${
                                (user.language || 'English (US)') === lang 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' 
                                : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                            }`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>
              </div>
              
              <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest text-[10px] mb-4">Manage Account</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                          <p className="text-sm font-bold text-gray-900">{user.email}</p>
                        </div>
                      </div>
                      <button onClick={() => alert('Email change verification sent!')} className="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Change</button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                    <InfoField label="Timezone" value="Asia/Jakarta (GMT+7)" />
                </div>

                <div className="mt-8 pt-8 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-4 italic">{t('danger_zone')}</p>
                    <button 
                      onClick={() => setIsDeactivationModalOpen(true)}
                      className="flex items-center text-red-500 font-bold text-sm hover:bg-red-50 px-5 py-3 rounded-2xl transition-all border border-transparent hover:border-red-100"
                    >
                        <Trash2 className="w-4 h-4 mr-3" />
                        {t('deactivate')}
                    </button>
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return (
          <>
            <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h2 className="text-2xl font-display font-bold text-gray-900">{t('personal_info')}</h2>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => { setIsEditing(false); setFormData({ firstName: user.firstName, lastName: user.lastName || '', phone: user.phone || '', location: user.location || '', bio: user.bio || '' }); }}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleSaveProfile}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-display"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    {t('save_changes')}
                                </button>
                             </div>
                        ) : (
                            <button 
                                onClick={() => !isGuest && setIsEditing(true)}
                                className={`px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all font-display ${isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {t('edit_profile')}
                            </button>
                        )}
                        {role === 'seeker' && (
                            <div className="flex items-center px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm ml-2">
                                <Sparkles className="w-3 h-3 text-indigo-600 mr-2" />
                                <span className="text-[10px] font-bold text-indigo-600">Score: {user.hasUploadedCV ? 85 : 0}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {isEditing ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('first_name')}</label>
                                <input 
                                    value={formData.firstName}
                                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('last_name')}</label>
                                <input 
                                    value={formData.lastName}
                                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('phone')}</label>
                                <input 
                                    placeholder="+62"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('location')}</label>
                                <LocationSearchSelect 
                                    scope="national"
                                    type="district"
                                    value={formData.location || ''}
                                    onChange={(val) => setFormData({...formData, location: val})}
                                    placeholder="Search Kecamatan / Kota..."
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t('bio')}</label>
                                <textarea 
                                    placeholder="Tell us about yourself..."
                                    value={formData.bio || ''}
                                    onChange={e => setFormData({...formData, bio: e.target.value})}
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium resize-none"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <InfoField label={t('first_name')} value={isGuest ? 'Guest' : (user.firstName || 'User')} />
                            <InfoField label={t('last_name')} value={isGuest ? '---' : (user.lastName || '-')} />
                            <InfoField label="Email Address" value={isGuest ? '---' : (user.email || 'not provided')} />
                            <InfoField label={t('phone')} value={isGuest ? '---' : (user.phone || '-')} />
                            <InfoField label={t('location')} value={isGuest ? '---' : (user.location || '-')} />
                            <InfoField label={t('bio')} value={isGuest ? '---' : (user.bio || '-')} />
                        </>
                    )}
                </div>
            </section>

            <div className="py-8 border-t border-gray-50">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{t('expertise')}</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-8">
                    {isGuest ? (
                        <p className="text-gray-400 italic text-xs">No expertise data available for guest users.</p>
                    ) : (
                        <>
                            {skills.map(skill => (
                                <span key={skill} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-2 group">
                                    {skill}
                                    {!isGuest && (
                                        <button 
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-indigo-100 rounded-md transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </span>
                            ))}
                        </>
                    )}
                </div>
                
                {!isGuest && (
                    <div className="flex gap-2 mb-12">
                        <input 
                            type="text"
                            placeholder={role === 'seeker' ? t('add_skill') : t('add_industry')}
                            className="flex-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                        />
                        <button 
                            onClick={handleAddSkill}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-gray-900 transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                )}
                
                <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 relative overflow-hidden mt-8">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Shield className="w-32 h-32" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-4 font-display">Match Work Badge</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-lg leading-relaxed font-medium">
                        {isGuest 
                          ? "Complete your profile to earn verified badges and increase your engagement with recruiters."
                          : "Verified profiles have a 3x higher chance of finding successful matches. Complete your verification to unlock more features."}
                    </p>
                    <button 
                      disabled={isGuest}
                      onClick={() => !isGuest && alert('Identity verification process started! Please follow the instructions in your email.')}
                      className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isGuest ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-gray-900 hover:-translate-y-1 active:scale-95'}`}>
                        Verify Profile Now
                    </button>
                </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Profile Header */}
        <div className="h-48 bg-indigo-600 relative overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute -bottom-16 left-8 right-8 flex flex-col md:flex-row items-center md:items-end gap-8 translate-y-4 md:translate-y-0 z-20">
            <div className="relative group shrink-0">
               <div className="w-40 h-40 bg-white rounded-[2rem] p-1.5 shadow-2xl overflow-hidden ring-8 ring-white/20">
                  {user.avatar ? (
                    <img key={user.avatar} src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-[1.75rem]" />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 rounded-[1.75rem] flex items-center justify-center text-5xl font-display font-black text-indigo-600">
                      {user.firstName?.charAt(0) || 'G'}
                    </div>
                  )}
               </div>
               
               {/* Advanced Avatar Menu */}
               <div className="absolute -bottom-2 -right-2">
                 <button 
                   onClick={() => isGuest ? navigate('/login') : setShowAvatarMenu(!showAvatarMenu)}
                   className={`p-3.5 rounded-2xl shadow-xl transition-all cursor-pointer border z-30 ${
                      isGuest ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-50 hover:rotate-12'
                   }`}
                 >
                   <Camera className={`w-5 h-5 ${isUploading ? 'animate-pulse' : ''}`} />
                 </button>
                 
                  <AnimatePresence>
                    {showAvatarMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full right-0 mb-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 min-w-[180px] z-50 text-left"
                            >
                                <button 
                                    onClick={() => handleAvatarAction('gallery')}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-2xl transition-all text-xs font-bold"
                                >
                                    <Globe className="w-4 h-4" />
                                    Choose from Gallery
                                </button>
                                <button 
                                    onClick={() => handleAvatarAction('camera')}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-2xl transition-all text-xs font-bold"
                                >
                                    <Camera className="w-4 h-4" />
                                    Take Photo
                                </button>
                                {user.avatar && (
                                    <button 
                                        onClick={() => handleAvatarAction('delete')}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all text-xs font-bold mt-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove Photo
                                    </button>
                                )}
                            </motion.div>
                        </>
                    )}
                  </AnimatePresence>
               </div>
               
               {/* Hidden Inputs */}
               <input 
                 ref={fileInputRef} 
                 type="file" 
                 className="hidden" 
                 accept="image/*" 
                 onChange={onFileChange} 
               />
               <input 
                 ref={cameraInputRef} 
                 type="file" 
                 className="hidden" 
                 accept="image/*" 
                 capture="user" 
                 onChange={onFileChange} 
               />
            </div>

            <div className="flex-1 text-center md:text-left pb-8">
               <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight drop-shadow-xl">
                        {isGuest ? 'Guest User' : `${user.firstName} ${user.lastName || ''}`}
                    </h1>
                    {!isGuest && (user.showOnlineStatus !== false) && (
                         <div className="bg-emerald-400 w-3 h-3 rounded-full border-2 border-white animate-pulse" title="Online" />
                    )}
               </div>
               <div className="flex flex-wrap justify-center md:justify-start gap-4">
                 <p className="text-white font-bold tracking-widest bg-indigo-950/80 px-5 py-2.5 rounded-2xl whitespace-nowrap border border-white/10 text-[10px] uppercase shadow-lg backdrop-blur-xl">
                   {isGuest ? '@guest_account' : `@${user.role === 'seeker' ? 'tech_seeker' : 'hr_expert'}`}
                 </p>
                 {!isGuest && (
                    <span className="bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl flex items-center border border-white/20 shadow-lg backdrop-blur-xl">
                      <Shield className="w-3 h-3 mr-2" />
                      Verified Profile
                    </span>
                 )}
                 {isGuest && (
                    <span className="bg-amber-600/90 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl flex items-center border border-white/20 shadow-lg backdrop-blur-xl">
                      <Lock className="w-3 h-3 mr-2" />
                      Limited Access
                    </span>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Profile Content Wrapper */}
        <div className="mt-44 md:mt-24">
          {/* Guest Warning Overlay */}
          <AnimatePresence>
            {isGuest && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-50 border-y border-indigo-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-8 mx-6 rounded-[2rem] shadow-sm mb-4"
                >
                    <div className="flex items-start md:items-center text-indigo-700">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mr-5 shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold leading-relaxed max-w-md">
                            Welcome to Match Work! <span className="hidden md:inline">Log in to save your personal profile, track applications, and unlock premium AI resume tools.</span>
                            <span className="md:hidden">Log in to unlock all professional tools.</span>
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/login')}
                        className="whitespace-nowrap w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black text-sm hover:bg-indigo-700 transition-all flex items-center justify-center shadow-xl shadow-indigo-200"
                    >
                        <LogIn className="w-4 h-4 mr-3" />
                        Log In Now
                    </button>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Main Grid */}
          <div className="pt-12 px-6 md:px-12 pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                  {/* Left Column - Nav */}
                  <div className="space-y-4">
                      <ProfileNavItem icon={<User />} label={t('personal_info')} active={activeTab === 'info'} onClick={() => handleTabChange('info')} />
                      {role === 'seeker' && <ProfileNavItem icon={<FileText />} label={t('resume_skills')} link="/resume-analyzer" isLocked={isGuest} />}
                      <ProfileNavItem icon={<Bell />} label={t('notifications')} active={activeTab === 'notifications'} onClick={() => handleTabChange('notifications')} isLocked={isGuest} />
                      <ProfileNavItem icon={<Shield />} label={t('security')} active={activeTab === 'security'} onClick={() => handleTabChange('security')} isLocked={isGuest} />
                      <ProfileNavItem icon={<Globe />} label={t('privacy')} active={activeTab === 'privacy'} onClick={() => handleTabChange('privacy')} isLocked={isGuest} />
                      <ProfileNavItem icon={<Settings />} label={t('settings')} active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} isLocked={isGuest} />
                      
                      <div className="pt-8 border-t border-gray-50 mt-8">
                        <button 
                              onClick={() => {
                                  auth.signOut();
                                  setUser(null);
                                  navigate('/login');
                              }}
                          className="w-full p-4 rounded-2xl flex items-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all font-bold text-sm group"
                        >
                          <LogIn className="w-4 h-4 mr-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                          Sign Out
                        </button>
                      </div>
                  </div>

                  {/* Right Column - Dynamic Info section */}
                  <div className="lg:col-span-2">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="min-h-[400px]"
                      >
                        {renderContent()}
                      </motion.div>
                  </div>
              </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDeactivationModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center"
                >
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Deactivate Account?</h3>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                        Are you sure you want to deactivate your account? This action cannot be undone. All your data will be permanently removed.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={async () => {
                                if (user.email) {
                                    localStorage.removeItem(`matchwork_profile_${user.email.toLowerCase()}`);
                                }
                                await auth.signOut();
                                setUser(null);
                                navigate('/login');
                            }}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all font-display"
                        >
                            Yes, Deactivate
                        </button>
                        <button 
                            onClick={() => setIsDeactivationModalOpen(false)}
                            className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all font-display"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ title, desc, time, type, isRead, isSelected, onSelect, isDeleted, isSelectMode }: any) {
  return (
    <div className={`flex gap-4 p-5 rounded-3xl transition-all border group items-start ${
      isRead ? 'bg-white border-gray-50 hover:bg-indigo-50/10' : 'bg-indigo-50/30 border-indigo-100/50 shadow-sm'
    }`}>
      {isSelectMode && (
        <div className="pt-3">
           <input 
              type="checkbox" 
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
           />
        </div>
      )}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
        type === 'match' ? 'bg-emerald-100 text-emerald-600' :
        type === 'update' ? 'bg-indigo-100 text-indigo-600' :
        'bg-gray-100 text-gray-600'
      }`}>
        {type === 'match' ? <Sparkles className="w-6 h-6" /> : 
         type === 'update' ? <FileText className="w-6 h-6" /> : 
         <Bell className="w-6 h-6" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h4 className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">{title}</h4>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{time}</span>
        </div>
        <p className={`text-xs leading-relaxed ${isDeleted ? 'text-gray-400 italic font-medium' : 'text-gray-500'}`}>{desc}</p>
      </div>
      <div className="flex items-center">
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600" />
      </div>
    </div>
  );
}

function SecuritySetting({ label, value, action, onAction }: any) {
  return (
    <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1.5">{label}</p>
        <p className="font-bold text-gray-900">{value}</p>
      </div>
      <button 
        onClick={onAction}
        className="px-6 py-2.5 bg-gray-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
      >
        {action}
      </button>
    </div>
  );
}

function PrivacyToggle({ label, desc, enabled, onToggle }: any) {
  const [isOn, setIsOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
      <div className="pr-6">
        <h4 className="font-bold text-gray-900 text-sm mb-1 font-display">{label}</h4>
        <p className="text-xs text-gray-500 leading-relaxed font-medium">{desc}</p>
      </div>
      <button 
        onClick={() => {
            const next = !isOn;
            setIsOn(next);
            if (onToggle) onToggle(next);
        }}
        className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${isOn ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isOn ? 'left-8' : 'left-1'}`} />
      </button>
    </div>
  );
}

function ProfileNavItem({ icon, label, active, link, onClick, isLocked }: { icon: any, label: string, active?: boolean, link?: string, onClick?: () => void, isLocked?: boolean }) {
    const content = (
        <div 
          onClick={onClick}
          className={`p-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer group ${
            active ? 'bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
            <div className="flex items-center">
                <span className={`w-5 h-5 mr-4 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-gray-400'}`}>
                    {icon}
                </span>
                <span className="text-sm font-bold">{label}</span>
            </div>
            {isLocked && !active && (
              <Lock className="w-3.5 h-3.5 text-gray-300" />
            )}
            {active && (
                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
            )}
        </div>
    );

    if (link) {
        return <Link to={link} className="block">{content}</Link>;
    }

    return content;
}

function InfoField({ label, value }: { label: string, value: string }) {
    const isEmpty = value === '-' || value === '---' || !value;
    return (
        <div className="group">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 group-hover:text-indigo-400 transition-colors">{label}</p>
            <p className={`text-sm font-bold ${isEmpty ? 'text-gray-400 italic font-medium' : 'text-gray-900 font-display'}`}>
                {isEmpty ? 'Not set' : value}
            </p>
        </div>
    )
}
