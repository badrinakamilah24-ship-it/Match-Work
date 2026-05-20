import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronRight, Clock, Star, MapPin, Briefcase, Trash2, CheckSquare, Square, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService, auth } from '../services/firebaseService';
import { Link } from 'react-router-dom';

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let unsubApps = () => {};
    let unsubJobs = () => {};

    const loadLocalData = () => {
        if (!user?.email) return;

        // 1. Get from localStorage
        const localAppsStr = localStorage.getItem('applications') || '[]';
        try {
            const allApps = JSON.parse(localAppsStr);
            const myLocalApps = allApps.filter((a: any) => 
                a.seekerEmail?.toLowerCase() === user.email?.toLowerCase()
            );
            if (myLocalApps.length > 0) {
                setApplications(myLocalApps);
                setLoading(false);
            }
        } catch (e) { console.error(e); }
    };

    // Load local data immediately on mount/user change
    loadLocalData();

    const loadApplications = () => {
        if (!user?.email) return;

        // 2. Fetch from Firebase and Sync
        unsubApps = FirebaseService.subscribeToUserApplications(user.email, (userApps) => {
          const localAppsStr = localStorage.getItem('applications') || '[]';
          let localApps: any[] = [];
          try { localApps = JSON.parse(localAppsStr); } catch (e) {}
          
          const myLocalApps = localApps.filter((a: any) => 
            a.seekerEmail?.toLowerCase() === user.email?.toLowerCase()
          );
          const merged = [...userApps];
          
          myLocalApps.forEach(lApp => {
              if (!merged.some(m => m.jobId === lApp.jobId)) {
                  merged.push(lApp);
              }
          });
          
          merged.sort((a, b) => {
            const dateA = new Date(a.appliedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.appliedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          setApplications(merged);
          setLoading(false);
        });

        unsubJobs = FirebaseService.subscribeToJobs((allJobs) => {
          setJobs(allJobs);
        });
    };

    const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser && user?.email) {
        loadApplications();
      } else if (user?.email) {
        // Fallback for user without firebase yet
        loadLocalData();
        setLoading(false);
      } else {
        setLoading(false);
        setApplications([]);
      }
    });

    const handleStorage = () => loadLocalData();
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubAuth();
      unsubApps();
      unsubJobs();
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.email]);

  if (!user || user.isGuest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
           <FileText className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Login to View Applications</h1>
        <p className="text-gray-500 mb-8">Guest users don't have application history. Create an account to track your job seekers.</p>
        <Link to="/login" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Login Now</Link>
      </div>
    );
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map(app => app.id));
    }
  };

  const handleDelete = async () => {
    try {
        // 1. Remove from localStorage
        const localAppsStr = localStorage.getItem('applications') || '[]';
        const allLocalApps = JSON.parse(localAppsStr);
        const filteredLocal = allLocalApps.filter((app: any) => !selectedIds.includes(app.id));
        localStorage.setItem('applications', JSON.stringify(filteredLocal));

        // 2. Remove from Firebase (Silent attempt)
        for (const id of selectedIds) {
            try {
                await FirebaseService.deleteApplication(id);
            } catch (e) {
                console.warn(`Firebase delete failed for ${id}, might be local-only:`, e);
            }
        }

        // 3. Update UI
        setApplications(prev => prev.filter(app => !selectedIds.includes(app.id)));
        setSelectedIds([]);
        setIsSelectMode(false);
        setShowDeleteConfirm(false);

        // 4. Trigger storage event for Dashboard sync
        window.dispatchEvent(new Event('storage'));
        
    } catch (error) {
        console.error("Critical delete error:", error);
        alert("Terjadi kesalahan saat menghapus data.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-4xl font-display font-bold text-gray-900">Submitted Resumes</h1>
            <p className="text-gray-500 mt-2">Track the status of your applications and match scores.</p>
        </div>

        {applications.length > 0 && (
            <div className="flex items-center gap-3">
                {isSelectMode ? (
                    <>
                        <button 
                            onClick={() => {
                                setIsSelectMode(false);
                                setSelectedIds([]);
                            }}
                            className="flex items-center px-4 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-all border border-gray-100"
                        >
                            <X className="w-3.5 h-3.5 mr-2" />
                            Cancel
                        </button>
                        <button 
                            disabled={selectedIds.length === 0}
                            onClick={() => setShowDeleteConfirm(true)}
                            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                selectedIds.length > 0 
                                ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                                : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                            }`}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Hapus ({selectedIds.length})
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setIsSelectMode(true)}
                        className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                        <CheckSquare className="w-3.5 h-3.5 mr-2" />
                        Select
                    </button>
                )}
            </div>
        )}
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
                    <h3 className="text-xl font-black text-gray-900 mb-4">Hapus Lamaran?</h3>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                        Apakah Anda yakin ingin menghapus <span className="text-red-600 font-bold">{selectedIds.length}</span> lamaran yang dipilih daring daftar riwayat?
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleDelete}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all font-display"
                        >
                            Ya, Hapus
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

      {loading ? (
          <div className="py-20 text-center text-gray-400">Loading your applications...</div>
      ) : applications.length === 0 ? (
          <div className="bg-white rounded-[40px] border-2 border-dashed border-gray-100 p-20 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-200" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Applications Yet</h2>
              <p className="text-gray-500 mb-8">Start your journey by applying to roles that match your skills.</p>
              <Link to="/dashboard" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">Find Jobs</Link>
          </div>
      ) : (
    <div className="grid grid-cols-1 gap-4">
        {/* Header Row - visible on md+ */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-8 py-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <div className="col-span-5 flex items-center">
                {isSelectMode && (
                    <button 
                        onClick={handleSelectAll}
                        className="mr-4 p-1 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                        {selectedIds.length === applications.length ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                        )}
                    </button>
                )}
                Job and Company
            </div>
            <div className="col-span-2">Applied Date</div>
            <div className="col-span-2">Match Score</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
        </div>

        {applications.map((app) => {
            const job = jobs.find(j => j.id === app.jobId);
            const isSelected = selectedIds.includes(app.id);

            return (
                <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => isSelectMode && toggleSelect(app.id)}
                    className={`bg-white rounded-3xl p-6 md:p-8 border transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-50/40 relative overflow-hidden group ${
                        isSelected 
                        ? 'border-indigo-400 bg-indigo-50/10' 
                        : 'border-gray-100 hover:border-indigo-100'
                    } ${isSelectMode ? 'cursor-pointer' : ''}`}
                >
                    {isSelected && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-600/5 rotate-45 translate-x-8 -translate-y-8" />
                    )}

                    <div className="md:grid md:grid-cols-12 gap-4 items-center relative">
                        {/* Mobile Status Badge */}
                        <div className="md:hidden mb-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {isSelectMode && (
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 border-gray-200'
                                    }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                )}
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    app.status?.toLowerCase() === 'approved' 
                                    ? 'bg-green-50 text-green-600 border-green-100' 
                                    : app.status?.toLowerCase() === 'rejected'
                                    ? 'bg-red-50 text-red-600 border-red-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                    {app.status || 'Pending'}
                                </div>
                             </div>
                             <div className="text-[10px] font-bold text-gray-400">
                                {(() => {
                                    const dateValue = app.appliedAt || app.createdAt;
                                    if (!dateValue) return '';
                                    if (dateValue.seconds) return new Date(dateValue.seconds * 1000).toLocaleDateString();
                                    return new Date(dateValue).toLocaleDateString();
                                })()}
                             </div>
                        </div>

                        <div className="col-span-5 flex items-center">
                            {isSelectMode && (
                                <div className={`hidden md:flex w-6 h-6 mr-6 rounded-lg items-center justify-center border transition-all ${
                                    isSelected ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 border-gray-200 group-hover:border-indigo-300'
                                }`}>
                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                </div>
                            )}
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mr-4 md:mr-6 group-hover:scale-110 transition-transform">
                                {job?.logo || '🏢'}
                            </div>
                            <div>
                                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-0.5 md:mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{job?.title || app.jobTitle || 'Unknown Position'}</h3>
                                <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider">{job?.company || app.company || 'Company'}</p>
                            </div>
                        </div>

                        <div className="hidden md:block col-span-2 text-sm font-medium text-gray-500">
                            {(() => {
                                const dateValue = app.appliedAt || app.createdAt;
                                if (!dateValue) return 'N/A';
                                if (dateValue.seconds) return new Date(dateValue.seconds * 1000).toLocaleDateString();
                                return new Date(dateValue).toLocaleDateString();
                            })()}
                        </div>

                        <div className="col-span-2 mt-4 md:mt-0">
                            <div className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Match Score</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden hidden md:block">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full" 
                                        style={{ width: `${app.aiScore || 0}%` }}
                                    />
                                </div>
                                <span className="text-xl md:text-2xl font-black text-gray-900">{app.aiScore}%</span>
                            </div>
                        </div>

                        <div className="hidden md:block col-span-2">
                             <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                app.status?.toLowerCase() === 'approved' 
                                ? 'bg-green-50 text-green-600 border-green-100 shadow-green-100/20' 
                                : app.status?.toLowerCase() === 'rejected'
                                ? 'bg-red-50 text-red-600 border-red-100 shadow-red-100/20'
                                : 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/20'
                             }`}>
                                {app.status || 'Pending'}
                             </div>
                        </div>

                        <div className="col-span-1 text-right mt-6 md:mt-0 flex md:block justify-center">
                            <button 
                                onClick={() => alert(`Reviewing your submitted CV\n\nJob: ${job?.title || app.jobTitle}\nFile: ${app.fileName || 'CV_Resume.pdf'}\n\nAI Insight: Your profile matches ${app.aiScore}% of this job's requirements.`)}
                                className="w-full md:w-auto p-3 bg-gray-50 text-gray-900 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center border border-gray-100 active:scale-95"
                            >
                                <span className="md:hidden mr-2">View CV</span>
                                <FileText className="w-5 h-5 text-indigo-500" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )
        })}
    </div>
      )}
    </div>
  );
}
