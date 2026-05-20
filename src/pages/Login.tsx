import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, User, Building, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, AlertCircle, Shield } from 'lucide-react';
import { auth, FirebaseService } from '../services/firebaseService';
import { signInAnonymously } from 'firebase/auth';

export default function Login({ initialIsRegister = false }: { initialIsRegister?: boolean }) {
  const { setRole, setUser, setIsLoading, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryRole = new URLSearchParams(location.search).get('role');
  const [isRegister, setIsRegister] = useState(initialIsRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'recruiter'>(queryRole === 'recruiter' ? 'recruiter' : 'seeker');
  
  const [showWarning, setShowWarning] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [showAgreedError, setShowAgreedError] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    setIsRegister(initialIsRegister);
  }, [initialIsRegister]);

  const [loading, setLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Navigation Guard / Back Button Protection
  useEffect(() => {
    if (loading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      const handlePopState = (e: PopStateEvent) => {
        if (loading) {
          window.history.pushState(null, '', window.location.pathname);
          alert('Harap tunggu sebentar, proses sedang berjalan. Sabar dikit lagi ya!');
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsLoading(true); // Sync with context for Navbar hiding
    try {
      const email = formData.email.toLowerCase();
      const isAdminDomain = email.endsWith('@matchwork.com');

      // 0. Block Check (Data-driven logic)
      const emailKeyForCheck = `matchwork_profile_${email}`;
      const existingProfileForCheck = JSON.parse(localStorage.getItem(emailKeyForCheck) || 'null');
      if (existingProfileForCheck?.isBlocked) {
        setShowBlockedModal(true);
        setLoading(false);
        setIsLoading(false);
        return;
      }

      // 1. Restriction for Admin Registration
      if (isRegister && isAdminDomain) {
        alert("Email dengan domain @matchwork.com tidak diizinkan untuk mendaftar baru. Silakan hubungi pusat bantuan.");
        setLoading(false);
        return;
      }

      // 2. Admin Login Logic
      if (!isRegister && isAdminDomain) {
        const ADMIN_PASSWORD = 'b@d-1n4k+m!/4h-';
        if (formData.password === ADMIN_PASSWORD) {
            setRole('admin');
            const adminUser = {
                id: 'admin-' + email.split('@')[0],
                firstName: 'Admin',
                lastName: 'Match Work',
                email: email,
                role: 'admin' as const,
                showOnlineStatus: true,
            };
            setUser(adminUser);
            // Save admin session to localStorage as requested
            localStorage.setItem('matchwork_admin_session', JSON.stringify({ role: 'admin', email: email }));
            navigate('/admin');
            return;
        } else {
            alert("Password Admin Salah!");
            setLoading(false);
            return;
        }
      }

      // 3. Normal User Flow
      // ANTI-RESET DATA PERSISTENCE: 
      // Use localStorage keyed by email to save/retrieve full profile.
      const emailKey = `matchwork_profile_${email}`;
      const savedProfile = JSON.parse(localStorage.getItem(emailKey) || 'null');
      
      if (isRegister) {
        // Build initial profile for new user
        const initialProfile = {
            id: 'mw-user-' + Math.random().toString(36).substr(2, 9),
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            role: selectedRole,
            phone: '',
            location: '',
            bio: '',
            language: 'English (US)',
            showOnlineStatus: true,
            skills: [],
            hasUploadedCV: false
        };
        localStorage.setItem(emailKey, JSON.stringify(initialProfile));

        // Update list for admin panel
        const listKey = selectedRole === 'seeker' ? 'seekerUsers' : 'recruiterUsers';
        const existingList = JSON.parse(localStorage.getItem(listKey) || '[]');
        if (!existingList.some((u: any) => u.email === formData.email)) {
          localStorage.setItem(listKey, JSON.stringify([initialProfile, ...existingList]));
        }
      }

      // Merge saved data or fallback to defaults
      const firstName = savedProfile?.firstName || formData.firstName || (formData.email.split('@')[0]) || (selectedRole === 'seeker' ? 'Candidate' : 'Partner');
      const lastName = savedProfile?.lastName || formData.lastName || '';
      const locationVal = savedProfile?.location || '';
      const bioVal = savedProfile?.bio || '';
      const phoneVal = savedProfile?.phone || '';
      const langVal = savedProfile?.language || 'English (US)';
      const onlineStatus = savedProfile?.showOnlineStatus !== false;

      // Try real Firebase auth first
      let uid = 'demo-user-' + Math.random().toString(36).substr(2, 9);
      try {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      } catch (authErr: any) {
        console.warn("Firebase Auth restricted or disabled, falling back to local UID:", authErr.message);
      }

      // BRUTE FORCE PERSISTENCE: Get from Firestore if available
      const dbProfile = await FirebaseService.getUserProfile(uid);
      
      const currentDevice = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'Chrome on MacBook Pro',
        lastActive: 'Active Now',
        isCurrent: true
      };
      
      setRole(selectedRole);
      const newUser: any = {
        id: uid,
        firstName: dbProfile?.firstName || firstName,
        lastName: dbProfile?.lastName || lastName,
        email: formData.email,
        role: selectedRole,
        phone: dbProfile?.phone || phoneVal,
        location: dbProfile?.location || locationVal,
        bio: dbProfile?.bio || bioVal,
        language: dbProfile?.language || langVal,
        showOnlineStatus: dbProfile?.showOnlineStatus !== undefined ? dbProfile.showOnlineStatus : onlineStatus,
        connectedDevices: [currentDevice],
        skills: dbProfile?.skills || savedProfile?.skills || [],
        fields: dbProfile?.fields || savedProfile?.fields || []
      };
      
      setUser(newUser);
      // Sync to firebase immediately
      await FirebaseService.syncUserProfile(newUser);
      navigate('/dashboard');
    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setIsLoading(true);
    try {
      // Even guests get an anonymous firebase session for some reads if needed, 
      // although jobs are public.
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn("Guest login: Firebase auth unavailable, proceeding without session.");
      }
      
      const role = selectedRole;
      setRole(role);
      setUser({
        id: 'guest',
        firstName: 'Guest',
        lastName: '',
        email: '',
        role: role,
        isGuest: true,
        phone: '---',
        location: '---',
      });
      navigate('/dashboard');
    } catch (error) {
       console.error("Guest login error:", error);
       navigate('/dashboard'); // fallback
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 relative overflow-hidden">
      {/* Background Blobs for consistency */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[120px] -z-10 -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[100px] -z-10 -ml-20 -mb-20" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 relative"
      >
        <AnimatePresence mode="wait">
          {showWarning ? (
            <motion.div 
              key="warning-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-4"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-8 transform rotate-3">
                  <Shield className="w-10 h-10 text-orange-500" />
                </div>
                
                <h2 className="text-3xl font-display font-black text-gray-900 mb-6 italic">
                  Notice & Commitment
                </h2>
                
                <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50 mb-6">
                  <p className="text-sm text-orange-900 leading-relaxed font-medium">
                    Selamat datang! Kami sangat senang Anda menjadi bagian dari komunitas ini. Platform ini dirancang untuk menghubungkan peluang kerja lintas generasi dengan cara yang aman dan transparan. Demi kenyamanan bersama, kami mengundang Anda untuk menjadi Seeker atau Recruiter yang bijak dengan memberikan informasi yang valid, jujur, dan bertanggung jawab. Mari bersama-sama menciptakan ekosistem kerja yang saling menghargai dan mematuhi segala peraturan yang berlaku. Selamat berkarya dan temukan peluang terbaik Anda di sini!
                  </p>
                </div>

                <div className="flex items-center gap-3 mb-6 text-left w-full px-2 group">
                  <input 
                    type="checkbox" 
                    id="terms"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      if (e.target.checked) setShowAgreedError(false);
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-500 font-bold cursor-pointer transition-colors hover:text-indigo-600 pt-0.5">
                    I have read and agree to the terms and conditions.
                  </label>
                </div>

                <AnimatePresence>
                  {showAgreedError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl flex items-center gap-2 border border-red-100"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Silakan ceklis kotak persetujuan terlebih dahulu
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => {
                    if (!agreed) {
                      setShowAgreedError(true);
                      return;
                    }
                    setShowWarning(false);
                  }}
                  className={`w-full py-4 text-white rounded-2xl font-black flex items-center justify-center transition-all shadow-xl group ${
                    agreed 
                      ? 'bg-gray-900 shadow-gray-200 hover:bg-orange-600' 
                      : 'bg-gray-300 shadow-none cursor-default'
                  }`}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button 
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="text-center mb-8 pt-4">
                  <h1 className="text-3xl font-display font-bold text-gray-900">
                      {isRegister ? 'Create Account' : 'Welcome Back'}
                  </h1>
                  <p className="text-gray-500 mt-2">
                      {isRegister ? 'Start your matching journey today' : 'Log in to continue your progress'}
                  </p>
              </div>

              {/* Role Selector */}
              <div className="flex p-1 bg-gray-100/50 rounded-2xl mb-8">
                  <button 
                      onClick={() => setSelectedRole('seeker')}
                      className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                          selectedRole === 'seeker' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                      <User className="w-4 h-4 mr-2" />
                      Seeker
                  </button>
                  <button 
                      onClick={() => setSelectedRole('recruiter')}
                      className={`flex-1 flex items-center justify-center py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                          selectedRole === 'recruiter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Recruiter
                  </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isRegister && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                        <input
                          type="text"
                          required={isRegister}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="First"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="pt-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Last Name (Opt)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="Last"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                    placeholder="name@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full px-4 py-3 bg-white/50 border border-gray-100 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm pr-12"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 group disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'Create Account' : 'Sign In')}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

              <div className="mt-4">
                  <button 
                      onClick={handleGuestLogin}
                      disabled={loading}
                      className="w-full py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Continue as Guest'}
                  </button>
              </div>

              <div className="mt-8 text-center">
                  <button 
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                      {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                  <p className="mt-4 text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed">
                      Match Work Platform • Secure Authentication
                  </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Blocked Modal UI */}
      <AnimatePresence>
        {showBlockedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockedModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 border border-white text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 transform -rotate-6 shadow-inner">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 italic mb-4 leading-tight">
                Akses Akun Ditangguhkan
              </h2>
              
              <div className="bg-red-50/50 p-6 rounded-2xl mb-8 border border-red-100">
                <p className="text-sm font-medium text-red-900/70 leading-relaxed">
                  Akun Anda telah diblokir oleh Admin karena adanya laporan pelanggaran. Silakan hubungi pusat bantuan jika ini adalah kesalahan.
                </p>
              </div>

              <button
                onClick={() => setShowBlockedModal(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


