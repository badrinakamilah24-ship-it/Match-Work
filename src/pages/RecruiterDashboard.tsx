import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Star, BarChart2, ChevronRight, MessageSquare, Briefcase, X, Edit2, Trash2, Target, Minus, Plus as PlusIcon, Clock, Type as TypeIcon, RotateCcw, Send, MapPin, Paperclip } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FirebaseService, db, handleFirestoreError, auth } from '../services/firebaseService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import LocationSearchSelect from '../components/LocationSearchSelect';

export default function RecruiterDashboard() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadJobsFromStorage = () => {
    try {
      const stored = localStorage.getItem('recruiterJobs');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ownership Rule: Only show jobs where postedBy matches current user's email
        if (user && user.email) {
          const userJobs = parsed.filter((j: any) => j.postedBy === user.email);
          setJobs(userJobs);
        }
      }
    } catch (e) {
      console.error("Failed to load jobs from localStorage", e);
    }
  };

  const loadApplicationsFromStorage = () => {
    try {
      const stored = localStorage.getItem('applications');
      if (stored && user?.email) {
        const allApps = JSON.parse(stored);
        // Filter by recruiterEmail
        const myApps = allApps.filter((a: any) => a.recruiterEmail === user.email);
        setApplications(myApps);
      }
    } catch (e) {
      console.error("Failed to load applications from localStorage", e);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadJobsFromStorage();
      loadApplicationsFromStorage();
    }
    
    // Listen for storage changes to keep stats reactive
    const handleStorage = () => {
      loadJobsFromStorage();
      loadApplicationsFromStorage();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.email]);

  useEffect(() => {
    let unsubJobs = () => {};
    let unsubApps = () => {};

    if (!isAuthReady) return;

    const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
      // Ensure we have a valid session and user profile
      if (firebaseUser && user && !user.isGuest && user.id === firebaseUser.uid) {
        // 1. Initial load from storage for zero-latency UI
        loadJobsFromStorage();
        loadApplicationsFromStorage();

        // 2. Real-time sync from Firebase
        unsubJobs = FirebaseService.subscribeToJobs((allJobs) => {
          // Ownership Rule: Strict filtering by postedBy email
          const myJobs = allJobs.filter(j => j.postedBy === user.email);
          setJobs(myJobs);
          
          // Persistence: Store all jobs locally so they are available immediately next time
          localStorage.setItem('recruiterJobs', JSON.stringify(allJobs));
        });

        // 3. Application Privacy: Filter by email to match job ownership (postedBy)
        const q = query(collection(db, 'applications'), where('recruiterEmail', '==', user.email));
        unsubApps = onSnapshot(q, (snapshot) => {
          const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Merge with localStorage apps to ensure seeker-applied-locally apps show up
          const localStored = localStorage.getItem('applications');
          let merged = [...allApps];
          if (localStored) {
            try {
              const localApps = JSON.parse(localStored).filter((a: any) => a.recruiterEmail === user.email);
              localApps.forEach((lApp: any) => {
                if (!merged.some(m => (m as any).id === lApp.id || ((m as any).jobId === lApp.jobId && (m as any).seekerEmail === lApp.seekerEmail))) {
                  merged.push(lApp);
                }
              });
            } catch (e) {}
          }
          setApplications(merged);
        }, (error) => {
          handleFirestoreError(error, 'list', 'applications');
        });
      }
    });

    return () => { 
      unsubAuth();
      unsubJobs(); 
      unsubApps(); 
    };
  }, [user?.id, user?.email, isAuthReady]);

  const myTrashJobs = jobs.filter(j => j.status === 'Trashed');
  const myActiveJobsSorted = jobs.filter(j => j.status !== 'Trashed');
  
  // Filter only applications that belong to my own jobs
  const myRelevantApps = applications.filter(app => jobs.some(j => j.id === app.jobId));
  
  const totalCandidatesCount = myRelevantApps.length;
  const interviewsCount = myRelevantApps.filter(a => a.status === 'Approved').length;
  
  const getDisplayAiScore = (app: any) => {
    // 100% Data-driven: No random fallbacks
    return app.matchPercentage || app.aiScore || 0;
  };

  const aiMatchesCount = myRelevantApps.filter(a => getDisplayAiScore(a) > 80).length;

  const stats = [
    { label: 'Active Jobs', value: myActiveJobsSorted.length.toString(), icon: <Briefcase /> },
    { label: 'Total Candidates', value: totalCandidatesCount.toString(), icon: <Users /> },
    { label: 'Interviews', value: interviewsCount.toString(), icon: <Star /> },
    { label: 'AI Matches', value: aiMatchesCount.toString(), icon: <BarChart2 /> },
  ];

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest text-xs text-gray-400">
            Authenticating Dashboard...
        </div>
    );
  }

  const handleSoftDelete = async (id: string) => {
    // Save current state for rollback
    const originalJobs = [...jobs];
    
    try {
        // Optimistic UI Update
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'Trashed' } : j));

        await FirebaseService.updateJob(id, { status: 'Trashed', updatedAt: new Date() });
        
        // Update localStorage as well
        const stored = localStorage.getItem('recruiterJobs');
        if (stored) {
            const jobsList = JSON.parse(stored);
            const updated = jobsList.map((j: any) => j.id === id ? { ...j, status: 'Trashed' } : j);
            localStorage.setItem('recruiterJobs', JSON.stringify(updated));
        }
        alert("Lowongan berhasil dipindahkan ke Sampah!");
    } catch (e) {
        console.error("Soft delete failed", e);
        setJobs(originalJobs); // Rollback
        alert("Gagal memindahkan ke sampah. Silakan coba lagi.");
    }
  };

  const handleRestore = async (id: string) => {
    const originalJobs = [...jobs];
    try {
        // Optimistic UI Update
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'pending' } : j));

        await FirebaseService.updateJob(id, { status: 'pending', updatedAt: new Date() });
        
        const stored = localStorage.getItem('recruiterJobs');
        if (stored) {
            const jobsList = JSON.parse(stored);
            const updated = jobsList.map((j: any) => j.id === id ? { ...j, status: 'pending' } : j);
            localStorage.setItem('recruiterJobs', JSON.stringify(updated));
        }
        alert("Lowongan berhasil dipulihkan!");
    } catch (e) {
        console.error("Restore failed", e);
        setJobs(originalJobs); // Rollback
        alert("Gagal memulihkan lowongan.");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const originalJobs = [...jobs];
    try {
        // Optimistic UI Update
        setJobs(prev => prev.filter(j => j.id !== id));

        await FirebaseService.deleteJob(id);
        
        const stored = localStorage.getItem('recruiterJobs');
        if (stored) {
            const jobsList = JSON.parse(stored);
            const updated = jobsList.filter((j: any) => j.id !== id);
            localStorage.setItem('recruiterJobs', JSON.stringify(updated));
        }
        alert("Lowongan telah dihapus secara permanen.");
    } catch (e) {
        console.error("Permanent delete failed", e);
        setJobs(originalJobs); // Rollback
        alert("Gagal menghapus lowongan secara permanen.");
    }
  };

  const [activeTab, setActiveTab] = useState<'my-jobs' | 'explore' | 'trash'>('my-jobs');

  const allJobsFromStorage = (() => {
    try {
      const stored = localStorage.getItem('recruiterJobs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const exploredJobs = allJobsFromStorage.filter((j: any) => j.postedBy !== user.email && (j.status === 'success' || j.status === 'Approved' || j.status === 'pending'));

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[120px] -z-10 -mr-40 -mt-40" />
      
      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <div className="text-center space-y-3 mb-10">
              <h3 className="text-2xl font-black text-gray-900 italic tracking-tight">Hapus Secara Permanen?</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus lowongan ini secara permanen? <span className="text-red-500 font-bold block mt-1">Tindakan ini tidak dapat dibatalkan.</span>
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 border border-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (confirmDeleteId) handlePermanentDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Recruiter Poster Section */}
        <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-indigo-900 shadow-2xl h-56 sm:h-64 group flex items-center px-10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-900" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            
            <div className="relative z-10 space-y-2">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Welcome, {user.firstName}! 👋
                    </h1>
                    <p className="text-indigo-200 text-sm font-medium max-w-md leading-relaxed opacity-80">
                        Your recruitment intelligence dashboard is ready. Manage your pipeline and find top talent today.
                    </p>
                </motion.div>
                
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                        <Users className="w-3 h-3" />
                        {totalCandidatesCount} Candidates
                    </div>
                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                        <Briefcase className="w-3 h-3" />
                        {myActiveJobsSorted.length} Active Jobs
                    </div>
                </div>
            </div>
        </div>

        {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              {stat.icon}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Selection */}
      <div className="flex gap-4 mb-8 p-1.5 bg-white border border-gray-100 rounded-2xl w-fit">
        <button 
            onClick={() => setActiveTab('my-jobs')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'my-jobs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
            Manage My Jobs
        </button>
        <button 
            onClick={() => setActiveTab('explore')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'explore' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
            Explore Market
        </button>
        <button 
            onClick={() => setActiveTab('trash')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'trash' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Trash
            </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Jobs Management */}
        <div className="lg:col-span-2 space-y-6">
          <div id="active-jobs-section" className="flex items-center justify-between mb-2">
             <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'my-jobs' ? 'Your Job Postings' : activeTab === 'trash' ? 'Trashed Job Listings' : 'Opportunities Marketplace'}
             </h2>
             {activeTab === 'my-jobs' && (
                <button 
                    onClick={() => { 
                        if (user.id === 'guest' || user.isGuest) {
                            alert("Please login as a Recruiter to post jobs.");
                            navigate('/login?role=recruiter');
                            return;
                        }
                        setEditingJob(null); 
                        setIsModalOpen(true); 
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Post New Job
                </button>
             )}
          </div>

          <div className="space-y-4">
            {activeTab === 'my-jobs' ? (
                <>
                    {myActiveJobsSorted.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No job postings yet. Start by creating one!</p>
                        </div>
                    ) : myActiveJobsSorted.map((job, index) => {
                        const jobAppsCount = applications.filter(a => a.jobId === job.id).length;
                        return (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <JobSummaryCard 
                                    job={job}
                                    applicants={jobAppsCount}
                                    onEdit={() => { setEditingJob(job); setIsModalOpen(true); }}
                                    onDelete={() => handleSoftDelete(job.id)}
                                    onViewApplicants={() => setSelectedJobForApplicants(job)}
                                    isOwner={true}
                                />
                            </motion.div>
                        );
                    })}
                </>
            ) : activeTab === 'trash' ? (
                <>
                    {myTrashJobs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                            <Trash2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Trash is empty. No deleted jobs found.</p>
                        </div>
                    ) : myTrashJobs.map((job, index) => {
                        return (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <JobSummaryCard 
                                    job={job}
                                    applicants={0}
                                    onEdit={() => {}}
                                    onDelete={() => setConfirmDeleteId(job.id)}
                                    onRestore={() => handleRestore(job.id)}
                                    onViewApplicants={() => alert("Lowongan ini ada di sampah. Pulihkan atau hapus permanen.")}
                                    isOwner={true}
                                    isTrashed={true}
                                />
                            </motion.div>
                        );
                    })}
                </>
            ) : (
                <>
                    {exploredJobs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
                            <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">Belum ada lowongan lain di marketplace.</p>
                        </div>
                    ) : exploredJobs.map((job: any, index: number) => {
                        // For explored jobs, we don't have access to the actual applications list normally,
                        // unless we fetch it. But the rule says: "TIDAK BOLEH melihat CV pelamar... kecuali jumlah pelamarnya saja."
                        return (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <JobSummaryCard 
                                    job={job}
                                    applicants={job.applicantCount || 0} 
                                    onEdit={() => {}}
                                    onDelete={() => {}}
                                    onViewApplicants={() => alert("Aturan Privasi: Anda bukan pemilik lowongan ini. Anda hanya dapat melihat detail lowongan, bukan CV pelamar.")}
                                    isOwner={false}
                                />
                            </motion.div>
                        );
                    })}
                </>
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Top Recommendations</h2>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 space-y-4">
                    {myRelevantApps.filter(a => getDisplayAiScore(a) > 80).length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-6 italic">No recommendations yet</p>
                    ) : myRelevantApps.filter(a => getDisplayAiScore(a) > 80).sort((a,b) => getDisplayAiScore(b) - getDisplayAiScore(a)).slice(0, 5).map(app => (
                        <CandidateMiniCard 
                            key={app.id} 
                            name={app.seekerName || 'Anonymous'} 
                            title={jobs.find(j => j.id === app.jobId)?.title || 'Job Opening'} 
                            match={getDisplayAiScore(app)} 
                        />
                    ))}
                </div>
                <button 
                  disabled={user.isGuest}
                  onClick={() => {
                    const el = document.getElementById('active-jobs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-sm font-bold text-indigo-600 py-4 bg-gray-50 hover:bg-indigo-50 transition-colors border-t border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    {user.isGuest ? 'View All (Login Required)' : 'View All Candidates'}
                </button>
            </div>

            <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl">
                 <h3 className="text-lg font-bold mb-4">Recruitment Stats ✨</h3>
                 <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                    You have {totalCandidatesCount} total applications across {myActiveJobsSorted.length} active job postings.
                 </p>
            </div>
        </div>
      </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
            <JobFormModal 
                job={editingJob} 
                onClose={() => setIsModalOpen(false)} 
                onJobPosted={() => {
                  loadJobsFromStorage();
                }}
                recruiterId={user.id}
                isGuest={user.isGuest}
            />
        )}
        {selectedJobForApplicants && (
            <ApplicantsModal 
                job={selectedJobForApplicants} 
                onClose={() => setSelectedJobForApplicants(null)}
            />
        )}
      </AnimatePresence>
    </div>
  );
}

function JobFormModal({ job, onClose, onJobPosted, recruiterId, isGuest }: { job?: any, onClose: () => void, onJobPosted: () => void, recruiterId: string, isGuest?: boolean }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: job?.title || '',
        company: job?.company || '',
        location: job?.location || '',
        salary: job?.salary || 'Rp 5.000.000',
        selectionType: job?.selectionType || 'Type', // 'Shift' or 'Type'
        shiftName: job?.shiftName || '',
        workingHours: job?.workingHours || '',
        jobType: job?.jobType || '',
        ageRange: job?.ageRange || '',
        description: job?.description || '',
        maxApplicants: job?.maxApplicants || '',
    });

    const [salaryNum, setSalaryNum] = useState(() => {
        const clean = (job?.salary || '5000000').replace(/[^0-9]/g, '');
        return parseInt(clean) || 5000000;
    });

    const JOB_TITLE_SUGGESTIONS = ['Software Engineer', 'Product Manager', 'Data Analyst', 'UI/UX Designer', 'DevOps Engineer', 'Human Resources', 'Accountant', 'Sales Representative', 'Marketing Executive', 'Security Guard', 'Cashier', 'Driver'];
    const COMPANY_SUGGESTIONS = ['Match Work Cabang Jakarta', 'Match Work Cabang Bandung', 'Match Work Cabang Surabaya', 'Tech Solutions ID', 'Global Retail Corp'];

    const SHIFT_OPTIONS = ['Pagi', 'Siang', 'Malam', 'Shift Lainnya'];
    const TYPE_OPTIONS = [
        'WFH (Work From Home)', 'WFO (Work From Office)', 'Hybrid Working', 
        'WFA (Work From Anywhere)', 'Digital Nomad', 'On-site Working', 
        'Remote Working', 'Freelance', 'Part-time', 'Full-time'
    ];

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num).replace('IDR', 'Rp');
    };

    const handleSalaryChange = (increment: number) => {
        const next = Math.max(0, salaryNum + increment);
        setSalaryNum(next);
        setFormData({ ...formData, salary: formatRupiah(next) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGuest) {
            alert("Guest recruiters cannot post jobs. Please sign in.");
            return;
        }

        if (!auth.currentUser && !user?.id?.startsWith('mw-user-') && !user?.id?.startsWith('demo-user-')) {
            alert("Sesi Anda telah berakhir. Silakan login ulang.");
            return;
        }

        const finalData = {
            ...formData,
            recruiterId,
            postedBy: (user as any)?.email, // Account Isolation Identity
            status: job?.status || 'pending',
            updatedAt: new Date(),
        };

        try {
            let savedJobId = job?.id;
            if (job) {
                await FirebaseService.updateJob(job.id, finalData);
            } else {
                const jobId = await FirebaseService.createJob({ ...finalData, createdAt: new Date() });
                savedJobId = jobId;
                if (jobId) {
                    await FirebaseService.createJobNotification({ id: jobId, ...finalData });
                }
            }

            // --- LOCAL STORAGE PERSISTENCE (As Requested) ---
            const newJobEntry = { 
                id: savedJobId || `temp-${Date.now()}`, 
                ...finalData, 
                createdAt: new Date().toISOString() 
            };
            
            const existingStr = localStorage.getItem('recruiterJobs');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            
            let updatedList;
            if (job) {
                updatedList = existing.map((j: any) => j.id === job.id ? newJobEntry : j);
            } else {
                updatedList = [newJobEntry, ...existing];
            }
            
            localStorage.setItem('recruiterJobs', JSON.stringify(updatedList));

            if (!job) {
                const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
                seekers.forEach((s: any) => {
                  notifications.push({
                      id: Date.now().toString() + Math.random(),
                      seekerEmail: s.email,
                      message: `Lowongan baru: ${finalData.title} oleh ${finalData.company}`,
                      timestamp: Date.now(),
                      isRead: false
                  });
                });
                localStorage.setItem('notifications', JSON.stringify(notifications));
                window.dispatchEvent(new Event('storage'));
            }
            // ------------------------------------------------

            onClose();
            onJobPosted();

            // Reset form for next time
            if (!job) {
                setFormData({
                    title: '',
                    company: '',
                    location: '',
                    salary: 'Rp 5.000.000',
                    selectionType: 'Type',
                    shiftName: '',
                    workingHours: '',
                    jobType: '',
                    ageRange: '',
                    description: '',
                });
            }
        } catch (error) {
            console.error("Failed to post job:", error);
            alert("Failed to post job. Please try again.");
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div className="absolute inset-0" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] w-full max-w-2xl p-8 sm:p-12 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{job ? 'Update Listing' : 'Post New Opening'}</h2>
                        <p className="text-sm text-gray-400 font-medium mt-1">Fill in the details below to attract top talent.</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="relative group">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Job Title</label>
                            <input 
                                required 
                                list="job-titles"
                                value={formData.title || ''} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-gray-300" 
                                placeholder="e.g. Senior Backend Developer"
                            />
                            <datalist id="job-titles">
                                {JOB_TITLE_SUGGESTIONS.map(t => <option key={t} value={t} />)}
                            </datalist>
                        </div>
                        <div className="relative group">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Company Branch</label>
                            <input 
                                required 
                                value={formData.company || ''} 
                                onChange={e => setFormData({...formData, company: e.target.value})} 
                                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-gray-300"
                                placeholder="Branch Name (Type manually)" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Work Location (Jabodetabek)</label>
                            <LocationSearchSelect 
                                scope="jabodetabek"
                                value={formData.location || ''}
                                onChange={(val) => setFormData({...formData, location: val})}
                                placeholder="Search Kelurahan / Kecamatan..."
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Salary Est. (Rupiah)</label>
                            <div className="flex items-center gap-3 h-[58px]">
                                <button 
                                    type="button"
                                    onClick={() => handleSalaryChange(-100000)}
                                    className="p-4 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-2xl transition-all"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex-1 relative">
                                    <input 
                                        value={formData.salary || ''} 
                                        onChange={e => {
                                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                            const num = parseInt(rawValue) || 0;
                                            setSalaryNum(num);
                                            setFormData({...formData, salary: formatRupiah(num)});
                                        }} 
                                        className="w-full p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl outline-none text-center font-black text-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all" 
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleSalaryChange(100000)}
                                    className="p-4 bg-gray-100 hover:bg-emerald-50 text-gray-500 hover:text-emerald-500 rounded-2xl transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-all ${formData.selectionType === 'Shift' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-100 shadow-sm'}`} onClick={() => setFormData({...formData, selectionType: 'Shift'})}>
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className={`p-3 rounded-xl transition-all ${formData.selectionType === 'Type' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 border border-gray-100 shadow-sm'}`} onClick={() => setFormData({...formData, selectionType: 'Type'})}>
                                <TypeIcon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] ml-2">Job Configuration</span>
                        </div>

                        {formData.selectionType === 'Shift' ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Shift Selection</label>
                                    <select 
                                        value={formData.shiftName || ''} 
                                        onChange={e => setFormData({...formData, shiftName: e.target.value})}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-sm"
                                    >
                                        <option value="">Select Shift</option>
                                        {SHIFT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Working Hours</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="time"
                                            value={(formData.workingHours || '').split(' - ')[0] || ''}
                                            onChange={e => {
                                                const end = (formData.workingHours || '').split(' - ')[1] || '17:00';
                                                setFormData({...formData, workingHours: `${e.target.value} - ${end}`});
                                            }}
                                            className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                                        />
                                        <span className="text-gray-400 font-bold">—</span>
                                        <input 
                                            type="time"
                                            value={(formData.workingHours || '').split(' - ')[1] || ''}
                                            onChange={e => {
                                                const start = (formData.workingHours || '').split(' - ')[0] || '08:00';
                                                setFormData({...formData, workingHours: `${start} - ${e.target.value}`});
                                            }}
                                            className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Environment Type</label>
                                    <select 
                                        value={formData.jobType || ''} 
                                        onChange={e => setFormData({...formData, jobType: e.target.value})}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-sm"
                                    >
                                        <option value="">Select Type</option>
                                        {TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Age Range</label>
                            <select value={formData.ageRange || ''} onChange={e => setFormData({...formData, ageRange: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-bold text-sm">
                                <option value="">Any Age</option>
                                <option value="18-25">18-25</option>
                                <option value="26-35">26-35</option>
                                <option value="36-45">36-45</option>
                                <option value="45+">45+</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Max Applicants (Optional)</label>
                            <input 
                                type="number"
                                value={formData.maxApplicants || ''} 
                                onChange={e => setFormData({...formData, maxApplicants: e.target.value})} 
                                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-gray-300"
                                placeholder="e.g. 50" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Detailed Description</label>
                        <textarea rows={5} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-5 bg-gray-50 border border-transparent rounded-[2rem] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium text-sm leading-relaxed" placeholder="Mention responsibilities, tech stack, and benefits..." />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-gray-900 transition-all transform active:scale-95">
                            {job ? 'Apply Updates' : 'Publish Job Listing'}
                        </button>
                    </div>
                    {isGuest && <p className="text-[10px] text-orange-600 font-black text-center mt-4 uppercase tracking-[0.3em] bg-orange-50 py-3 rounded-xl">⚠️ Restricted in Guest Mode</p>}
                </form>
            </motion.div>
        </motion.div>
    );
}

function ApplicantsModal({ job, onClose }: { job: any, onClose: () => void }) {
    const [localApplicants, setLocalApplicants] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const loadApps = () => {
            const appsStr = localStorage.getItem('applications');
            if (appsStr) {
                try {
                    const allApps = JSON.parse(appsStr);
                    // Filter by jobId
                    const filtered = allApps.filter((a: any) => a.jobId === job.id);
                    setLocalApplicants(filtered);
                } catch (e) {
                    console.error("Failed to parse applications from localStorage", e);
                }
            }
        };
        loadApps();
        
        // Listen for external storage changes (like seeker applying in another tab)
        const handleStorageChange = () => loadApps();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [job.id]);

    const handleUpdateStatus = (appId: string, newStatus: 'Approved' | 'Rejected') => {
        const appsStr = localStorage.getItem('applications');
        if (appsStr) {
            try {
                const allApps = JSON.parse(appsStr);
                // Update the specific application
                const updated = allApps.map((a: any) => 
                    a.id === appId ? { ...a, status: newStatus } : a
                );
                localStorage.setItem('applications', JSON.stringify(updated));
                
                // Update local state for immediate UI feedback
                setLocalApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
                
                // Add notification for seeker
                const theApp = allApps.find((a: any) => a.id === appId);
                if (theApp && theApp.seekerEmail) {
                    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                    notifications.push({
                        id: Date.now().toString() + Math.random(),
                        seekerEmail: theApp.seekerEmail,
                        message: `Status lamaran Anda untuk ${job.title} telah di-${newStatus === 'Approved' ? 'Setujui' : 'Tolak'}.`,
                        timestamp: Date.now(),
                        isRead: false
                    });
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                }

                // Optional: Notify Firebase if we were using it for this
                FirebaseService.updateApplicationStatus(appId, newStatus).catch(e => console.error(e));

                // Dispatch event to sync other components
                window.dispatchEvent(new Event('storage'));
            } catch (e) {
                console.error("Update status failed", e);
            }
        }
    };

    const handleContact = (app: any) => {
        // Redirect to Chat/Messages with seeker info
        navigate('/chat', { 
            state: { 
                contactUser: {
                    id: app.seekerId,
                    name: app.seekerName,
                    role: 'seeker',
                    email: app.seekerEmail
                } 
            } 
        });
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[3rem] w-full max-w-3xl p-8 sm:p-12 relative z-10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
            >
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Users className="w-5 h-5" />
                             </div>
                             <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">Applicant List</h2>
                        </div>
                        <p className="text-gray-400 font-medium ml-1">Total {localApplicants.length} candidates for <span className="text-indigo-600 font-bold">{job.title}</span></p>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-gray-50 rounded-2xl transition-all text-gray-300 hover:text-gray-900 border border-transparent hover:border-gray-100 shadow-sm hover:shadow-none"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {localApplicants.length === 0 ? (
                        <div className="text-center py-24 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Users className="text-gray-200 w-10 h-10" />
                            </div>
                            <h4 className="text-gray-400 font-bold italic tracking-tight">No applications yet for this position.</h4>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {localApplicants.map((app) => (
                                <motion.div 
                                    key={app.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        {/* Avatar Section */}
                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-[1.8rem] flex items-center justify-center text-indigo-600 text-3xl font-black shadow-inner border border-white shrink-0 group-hover:scale-105 transition-transform">
                                            {app.seekerName?.charAt(0).toUpperCase() || 'A'}
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div className="flex items-center flex-wrap gap-3">
                                                <h4 className="font-black text-gray-900 text-xl tracking-tight leading-none uppercase italic">{app.seekerName || 'Anonymous'}</h4>
                                                {app.aiScore && (
                                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">{app.aiScore}% Match</span>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50/50 flex items-center justify-center shrink-0">
                                                        <Send className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <span className="truncate">{app.seekerEmail || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50/50 flex items-center justify-center shrink-0">
                                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <span className="truncate">{app.seekerLocation || '-'}</span>
                                                </div>
                                            </div>

                                            <button 
                                                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-indigo-50/50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all group/file border border-indigo-100/50"
                                                onClick={() => {
                                                    if (app.resumeUrl) {
                                                        window.open(app.resumeUrl, '_blank');
                                                    } else {
                                                        alert(`Viewing CV Content: ${app.resumeText || 'No text content available.'}`);
                                                    }
                                                }}
                                            >
                                                <Paperclip className="w-4 h-4 group-hover/file:rotate-12 transition-transform" />
                                                File: {app.fileName || 'CV_Resume.pdf'}
                                            </button>
                                        </div>
                                        
                                        {/* Actions Section */}
                                        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-gray-50 lg:pl-10 lg:border-l lg:min-w-[180px]">
                                            <button 
                                                onClick={() => handleContact(app)}
                                                className="px-6 py-4 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-gray-100"
                                            >
                                                <MessageSquare className="w-5 h-5" />
                                                Kontak
                                            </button>
                                            
                                            {(app.status === 'Approved' || app.status === 'Rejected') ? (
                                                <div className={`px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest border flex items-center justify-center text-center ${
                                                    app.status === 'Approved' 
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' 
                                                    : 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-100'
                                                }`}>
                                                    {app.status}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleUpdateStatus(app.id, 'Approved')}
                                                        className="flex-1 px-4 py-4 bg-emerald-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(app.id, 'Rejected')}
                                                        className="flex-1 px-4 py-4 bg-red-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function JobSummaryCard({ 
  job, 
  applicants, 
  onEdit, 
  onDelete, 
  onRestore, 
  onViewApplicants, 
  isOwner, 
  isTrashed 
}: { 
  job: any, 
  applicants: number, 
  onEdit: () => void, 
  onDelete: () => void, 
  onRestore?: () => void, 
  onViewApplicants: () => void, 
  isOwner: boolean, 
  isTrashed?: boolean 
}) {
  const [posterName, setPosterName] = useState<string>('Recruiter');

  useEffect(() => {
    if (!job.postedBy) return;
    try {
      const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      const found = recruiters.find((u: any) => u.email.toLowerCase() === job.postedBy.toLowerCase());
      if (found) {
        setPosterName(`${found.firstName} ${found.lastName || ''}`.trim());
      } else {
        // Fallback to profile check
        const profile = JSON.parse(localStorage.getItem(`matchwork_profile_${job.postedBy.toLowerCase()}`) || '{}');
        if (profile.firstName) {
          setPosterName(`${profile.firstName} ${profile.lastName || ''}`.trim());
        }
      }
    } catch (e) {}
  }, [job.postedBy]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all flex items-center justify-between group shadow-sm min-h-[100px]">
      <div className="flex items-center flex-1 min-w-0 h-full">
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform flex-shrink-0">
           <Briefcase className="text-indigo-600 w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 truncate">{job.title}</h3>
          <div className="flex items-center space-x-3 mt-1 flex-wrap gap-y-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isTrashed ? 'bg-red-50 text-red-600' :
                job.status === 'success' || job.status === 'Approved' ? 'bg-green-50 text-green-600' : 
                job.status === 'pending' || !job.status ? 'bg-orange-50 text-orange-600' :
                'bg-red-50 text-red-600'
            }`}>
              {isTrashed ? 'Deleted' : job.status === 'success' || job.status === 'Approved' ? 'Verified' : job.status || 'pending'}
            </span>
            {job.ageRange && (
              <div className="flex items-center text-orange-500 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-md gap-1 border border-orange-100">
                <Target className="w-3 h-3" />
                {job.ageRange}
              </div>
            )}
            {isOwner && !isTrashed && (
               <span className="text-xs text-gray-400 whitespace-nowrap">
                 • {applicants} {job.maxApplicants ? `/ ${job.maxApplicants}` : ''} applicants
               </span>
            )}
            {!isOwner && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{applicants} applied</span>}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-400">
              Posted by: <span className="text-gray-600 font-bold">{posterName}</span> <span className="opacity-60 italic">({job.postedBy})</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-4">
        <div className="flex items-center gap-2">
            {isOwner && (
                <>
                    {/* Restore Button */}
                    {isTrashed && onRestore && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            className="w-10 h-10 flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-100 cursor-pointer"
                            title="Pulihkan Lowongan"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                    
                    {!isTrashed && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-50 cursor-pointer"
                            title="Edit Lowongan"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                        className={`w-10 h-10 flex items-center justify-center transition-all rounded-xl border cursor-pointer ${
                            isTrashed 
                            ? 'text-red-500 bg-red-50 hover:bg-red-600 hover:text-white border-red-100 shadow-sm' 
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 border-gray-50'
                        }`}
                        title={isTrashed ? "Hapus Permanen" : "Pindahkan ke Sampah"}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
        
        {!isTrashed && isOwner && (
          <button 
              onClick={(e) => { e.stopPropagation(); onViewApplicants(); }} 
              className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group/btn border border-gray-100 cursor-pointer"
              title="Lihat Detail"
          >
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover/btn:text-white" />
          </button>
        )}
      </div>
    </div>
  );
}

function CandidateMiniCard({ name, title, match }: any) {
    return (
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
            <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600 mr-3">
                    {name.charAt(0)}
                </div>
                <div>
                    <h4 className="font-bold text-sm text-gray-900">{name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1">{title}</p>
                </div>
            </div>
            <div className="text-right ml-2">
                <p className="text-xs font-bold text-green-600 whitespace-nowrap">{match}% Match</p>
            </div>
        </div>
    )
}
