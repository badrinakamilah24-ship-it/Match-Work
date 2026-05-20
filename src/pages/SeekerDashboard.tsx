import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, DollarSign, Filter, Sparkles, Star, ChevronRight, Clock, X, Paperclip, Send, Brain, Loader2, UploadCloud, Target, CheckCircle2, AlertCircle, Plus, Minus, ChevronDown, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService, auth } from '../services/firebaseService';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minSalary: '',
    shift: '',
    type: '',
    ageRange: '',
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    
    let unsubJobs = () => {};
    let unsubApps = () => {};

    // 1. Load local jobs first
    const localJobsStr = localStorage.getItem('recruiterJobs');
    if (localJobsStr) {
        try {
            const localJobs = JSON.parse(localJobsStr);
            setJobs(localJobs);
        } catch (e) { console.error(e); }
    }

    // 2. Subscribe to jobs (public)
    unsubJobs = FirebaseService.subscribeToJobs((allJobs) => {
      setJobs(allJobs);
      setLoading(false);
      localStorage.setItem('recruiterJobs', JSON.stringify(allJobs));
    });

    // 3. Load applications from localStorage and subscribe
    const loadLocalApplications = () => {
        if (user?.email) {
            const localAppsStr = localStorage.getItem('applications');
            if (localAppsStr) {
                try {
                    const allApps = JSON.parse(localAppsStr);
                    const myApps = allApps.filter((a: any) => 
                        a.seekerEmail?.toLowerCase() === user.email?.toLowerCase()
                    );
                    setApplications(myApps);
                } catch (e) {
                    console.error("Error loading local apps", e);
                }
            }
        }
    };

    loadLocalApplications();

    const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
      // Always load local applications immediately for fast UI feedback
      const localAppsStr = localStorage.getItem('applications') || '[]';
      let localApps: any[] = [];
      try {
          localApps = JSON.parse(localAppsStr);
      } catch (e) {}

      if (firebaseUser && user?.email) {
        unsubApps = FirebaseService.subscribeToUserApplications(user.email, (userApps) => {
          const myLocalApps = localApps.filter((a: any) => 
            a.seekerEmail?.toLowerCase() === user.email?.toLowerCase()
          );
          const merged = [...userApps];
          
          myLocalApps.forEach(lApp => {
              if (!merged.some(m => m.jobId === lApp.jobId)) {
                  merged.push(lApp);
              }
          });
          setApplications(merged);
        });
      } else if (user?.email) {
        // Even if Firebase is not connected yet, show local data for this user
        const myLocalApps = localApps.filter((a: any) => 
            a.seekerEmail?.toLowerCase() === user.email?.toLowerCase()
        );
        setApplications(myLocalApps);
      } else {
        setApplications([]);
      }
    });

    const handleStorageChange = () => {
        loadLocalApplications();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      unsubAuth();
      unsubJobs();
      unsubApps();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.email]);

  const filteredJobs = jobs.filter(job => {
    // Only show verified jobs to seekers
    const status = (job.status || '').toLowerCase();
    // Accept 'success', 'approved', or 'verified' status
    if (status !== 'success' && status !== 'approved' && status !== 'verified') return false;

    const matchesSearch = (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (job.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !filters.location || (job.location || '').toLowerCase().includes(filters.location.toLowerCase());
    
    // Normalize shift/type for filtering
    const jobShift = (job.shiftName || job.jobType || job.shift || '').toLowerCase();
    const matchesShift = !filters.shift || jobShift.includes(filters.shift.toLowerCase());
    
    // Type filter check
    const matchesType = !filters.type || jobShift.includes(filters.type.toLowerCase());
    
    const matchesAge = !filters.ageRange || job.ageRange === filters.ageRange;
    
    // Simple salary numeric check
    let matchesSalary = true;
    if (filters.minSalary && job.salary) {
        const salaryVal = parseInt(job.salary.replace(/[^0-9]/g, ''));
        const filterVal = parseInt(filters.minSalary);
        if (!isNaN(salaryVal) && !isNaN(filterVal)) {
            matchesSalary = salaryVal >= filterVal;
        }
    }

    return matchesSearch && matchesLocation && matchesShift && matchesType && matchesAge && matchesSalary;
  }).sort((a, b) => {
    // Sort recently created/updated approved jobs first
    const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
    const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
    return dateB - dateA;
  });

  const myAppliedJobsCount = applications.length;
  const averageAiScore = applications.length > 0 
    ? Math.round(applications.reduce((acc, curr) => acc + (curr.aiScore || 0), 0) / applications.length)
    : 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[120px] -z-10 -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[100px] -z-10 -ml-20 -mb-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Compact Poster Section */}
        <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-indigo-600 shadow-2xl h-64 sm:h-72 group">
            {/* Background elements for poster info */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                        Find Your Perfect Match, {user.firstName}!
                    </h1>
                    <p className="text-indigo-100 text-sm font-medium flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {filteredJobs.length} Verified opportunities wait for your skills
                    </p>
                </motion.div>
            </div>

            {/* Search Bar at the bottom of the poster */}
            <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex items-center gap-2 shadow-xl">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search jobs, skills, or companies..."
                            className="w-full pl-12 pr-4 py-3 bg-white/10 text-white placeholder:text-white/60 rounded-xl focus:bg-white/20 transition-all outline-none text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setFilterModalOpen(true)}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                    <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
                        Search Matches
                    </button>
                </div>
            </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Job List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recommended for you</p>
            <div className="flex items-center text-indigo-600 text-sm font-medium">
              Sort by: Real-time Matches
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Loader2 className="w-10 h-10 animate-spin mb-4" />
               <p className="font-medium">Finding the best matches for you...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-3xl py-20 px-10 text-center">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">📭</div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Found</h3>
               <p className="text-gray-500 max-w-sm mx-auto">
                 Recruiters haven't posted any jobs that match your search yet. Try a different keyword!
               </p>
            </div>
          ) : filteredJobs.map((job, index) => {
            const hasApplied = applications.some(a => a.jobId === job.id);
            return (
                <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedJob(job)}
                >
                    <JobCard job={job} hasApplied={hasApplied} />
                </motion.div>
            );
          })}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* AI Helper Widget - Banner Shortcut */}
          <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-200">
            <div className="relative z-10">
              <Brain className="w-8 h-8 mb-4 text-indigo-200" />
              <h3 className="text-xl font-bold mb-2">
                ✨ AI Resume Analyzer
              </h3>
              <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                Stand out to top recruiters! Upload your resume and let our AI extract your skills and provide smart insights to boost your career.
              </p>
              <button 
                onClick={() => navigate('/resume-analyzer')}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center group/btn"
              >
                Scan My Resume
                <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-black text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Target className="w-4 h-4 text-indigo-600" />
                    </div>
                    My Applied Jobs
                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">{myAppliedJobsCount}</span>
                </h3>
                <Link to="/my-applications" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">View All</Link>
            </div>
            
            {applications.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-xs text-gray-400 italic">No applications yet.</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Your career journey starts here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.slice(0, 3).map(app => (
                        <div key={app.id} className="group cursor-pointer">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                                    {jobs.find(j => j.id === app.jobId)?.logo || '🏢'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                                            {jobs.find(j => j.id === app.jobId)?.title || app.jobTitle || 'Applied Job'}
                                        </p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                            app.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' : 
                                            app.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {app.status || 'Pending'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                                        {jobs.find(j => j.id === app.jobId)?.company || app.company}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pl-14">
                                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden mr-3">
                                    <div className="h-full bg-indigo-500" style={{ width: `${app.aiScore || 0}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500">{app.aiScore}%</span>
                            </div>
                        </div>
                    ))}
                    
                    {applications.length > 3 && (
                        <div className="pt-2 border-t border-gray-50 text-center">
                            <p className="text-[9px] font-bold text-gray-400">+{applications.length - 3} more applications</p>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filterModalOpen && (
            <FilterModal 
                filters={filters} 
                setFilters={setFilters} 
                onClose={() => setFilterModalOpen(false)} 
            />
        )}
        {selectedJob && (
            <JobApplyModal 
                job={selectedJob} 
                onClose={() => setSelectedJob(null)} 
                user={user}
                hasApplied={applications.some(a => a.jobId === selectedJob.id)}
                applications={applications}
            />
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}

function JobApplyModal({ job, onClose, user, hasApplied, applications }: { job: any, onClose: () => void, user: any, hasApplied: boolean, applications: any[] }) {
    const [file, setFile] = useState<any>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Disable body scroll when modal is open
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const handleApply = async () => {
        if (!user || user.isGuest) {
            alert("Harap login terlebih dahulu untuk mengajukan lamaran.");
            return;
        }

        if (!file && !hasApplied) {
            alert("Silakan unggah resume/CV Anda terlebih dahulu.");
            return;
        }

        // 1. Validasi Format Nama File: Wajib diawali dengan 'CV_'
        if (file && !file.name.toLowerCase().startsWith('cv_')) {
            setErrorMessage('Format nama file salah! Gunakan format CV_Nama');
            return;
        }

        setErrorMessage('');

        // 2. Anti-Spam (Check local and state)
        const isDuplicate = applications.some(a => a.jobId === job.id);
        if (isDuplicate) {
            setErrorMessage('Anda sudah pernah mengajukan lamaran untuk posisi ini.');
            return;
        }

        setIsApplying(true);
        const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100
        
        try {
            const appData = {
                jobId: job.id,
                jobTitle: job.title,
                company: job.company,
                seekerId: user.id || user.uid || '',
                recruiterId: job.recruiterId || '',
                recruiterEmail: job.postedBy || '',
                seekerName: `${user.firstName || 'User'} ${user.lastName || ''}`,
                seekerEmail: user.email,
                seekerLocation: user.location || 'Unknown Location',
                fileName: file ? file.name : 'Unknown',
                resumeText: file ? "Simulated Resume: " + file.name : "Simulated Resume Content",
                resumeUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                aiScore: mockScore,
                status: 'pending',
                appliedAt: new Date().toISOString()
            };

            // BRUTE FORCE PERMANENT SAVE: Save to localStorage IMMEDIATELY before Firebase
            const localAppsStr = localStorage.getItem('applications') || '[]';
            const localApps = JSON.parse(localAppsStr);
            const newLocalApps = [...localApps, { ...appData, id: 'local-' + Date.now() }];
            localStorage.setItem('applications', JSON.stringify(newLocalApps));

            // Create local notification
            try {
                const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
                notifications.push({
                    id: Date.now().toString(),
                    recruiterEmail: job.postedBy || '',
                    message: `${user.firstName} melamar pada lowongan ${job.title}`,
                    timestamp: Date.now(),
                    isRead: false
                });
                localStorage.setItem('notifications', JSON.stringify(notifications));
                window.dispatchEvent(new Event('storage'));
            } catch (e) {}

            // Attempt Firebase (if fails, it's still in localStorage)
            try {
                await FirebaseService.applyToJob(appData);
            } catch (fbErr) {
                console.warn("Firebase sync failed, but data is saved locally:", fbErr);
            }
            
            alert("Application submitted successfully!");
            onClose();
            // Force refresh data in parent
            window.dispatchEvent(new Event('storage'));
        } catch (e: any) {
            console.error(e);
            setErrorMessage("Gagal mengirim lamaran. Silakan coba lagi.");
        } finally {
            setIsApplying(false);
        }
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-md pointer-events-auto"
                onClick={onClose}
            />
            
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="min-h-full flex items-start justify-center p-4 pt-12 sm:pt-32 pb-20 pointer-events-none">
                    <motion.div 
                        initial={{ scale: 0.9, y: 40, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 40, opacity: 0 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-2xl p-6 sm:p-10 relative z-10 shadow-2xl overflow-hidden pointer-events-auto"
                    >
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-3xl mr-4 sm:mr-5 shadow-inner">
                                {job.logo || '🏢'}
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 leading-tight">{job.title}</h2>
                                <p className="text-indigo-600 font-bold tracking-tight text-sm sm:text-base">{job.company} • {job.location}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                    </div>

                    <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Highlights</h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    {job.applicantCount || 0} {job.maxApplicants ? `/ ${job.maxApplicants}` : ''} Applicants
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-xs sm:text-sm font-bold flex items-center"><DollarSign className="w-4 h-4 mr-1 text-indigo-400" /> {job.salary}</span>
                                <span className="px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl text-xs sm:text-sm font-bold flex items-center"><Clock className="w-4 h-4 mr-1 text-purple-400" /> {job.shiftName || job.jobType || job.shift}</span>
                                <span className="px-4 py-2 bg-green-50 text-green-600 rounded-2xl text-xs sm:text-sm font-bold flex items-center"><MapPin className="w-4 h-4 mr-1 text-green-400" /> {job.location}</span>
                                {job.ageRange && (
                                    <span className="px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl text-xs sm:text-sm font-bold flex items-center"><Target className="w-4 h-4 mr-1 text-orange-400" /> Age: {job.ageRange}</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Description</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                {job.description || "No detailed description provided by recruiter."}
                            </p>
                        </div>

                        {!hasApplied ? (
                            <div className="space-y-6 pt-6 border-t border-gray-100">
                               <div className="flex items-center justify-between">
                                 <h3 className="text-sm font-bold text-gray-900">Your Resume</h3>
                                 <p className="text-xs text-indigo-600 font-medium">AI will analyze this for best match</p>
                               </div>
                               
                               <label 
                                    onClick={() => {
                                        if (job.maxApplicants && (job.applicantCount || 0) >= job.maxApplicants) {
                                            alert("Mohon maaf, batasan kuota pelamar untuk pekerjaan ini sudah tercapai. Silahkan cari dan lamar pekerjaan lain yang masih tersedia.");
                                            return;
                                        }
                                        fileInputRef.current?.click();
                                    }}
                                    className={`border-2 border-dashed border-indigo-100 rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all group ${
                                        (job.maxApplicants && (job.applicantCount || 0) >= job.maxApplicants) 
                                        ? 'bg-gray-50 opacity-50 cursor-not-allowed border-gray-200' 
                                        : 'cursor-pointer hover:bg-indigo-50/30'
                                    }`}
                               >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        accept=".pdf,.doc,.docx" 
                                        onChange={(e) => {
                                            const selectedFile = e.target.files?.[0];
                                            setFile(selectedFile);
                                            setErrorMessage(''); // Reset error when picking new file
                                        }}
                                        disabled={job.maxApplicants && (job.applicantCount || 0) >= job.maxApplicants}
                                    />
                                    {file ? (
                                        <div className="text-center">
                                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                <Paperclip className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">{file.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Click to change file</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">Upload PDF or Word Resume</p>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest leading-loose text-center">Supported formats: PDF, DOCX (Max 5MB)</p>
                                        </>
                                    )}
                               </label>

                                {errorMessage && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                        <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-4 h-4" />
                                        </div>
                                        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                                    </div>
                                )}

                               <div className="flex gap-4">
                                    <button
                                        onClick={handleApply}
                                        disabled={isApplying || user.isGuest}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-bold flex items-center justify-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg active:scale-95"
                                    >
                                        {isApplying ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                                        {user.isGuest ? 'Login to Apply' : (job.maxApplicants && (job.applicantCount || 0) >= job.maxApplicants) ? 'Limit Reached' : 'Submit Application'}
                                    </button>
                               </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center mt-6">
                               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                   <Sparkles className="w-8 h-8" />
                               </div>
                               <p className="text-green-700 font-bold text-lg">Application Submitted!</p>
                               <p className="text-green-600/70 text-sm mt-1 italic font-medium">We've sent your profile to the recruiter for review.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    </div>
    );
}
function FilterModal({ filters, setFilters, onClose }: { filters: any, setFilters: any, onClose: () => void }) {
    const [tempFilters, setTempFilters] = useState({ ...filters });
    const [isSalaryExpanded, setIsSalaryExpanded] = useState(true);
    const [showLocationList, setShowLocationList] = useState(false);
    const [locationSearch, setLocationSearch] = useState(tempFilters.location);

    const jabodetabekLocations = [
        "Jakarta Pusat", "Jakarta Utara", "Jakarta Timur", "Jakarta Selatan", "Jakarta Barat",
        "Kota Bogor", "Kabupaten Bogor", "Cibinong", "Kota Depok", "Margonda",
        "Kota Tangerang", "Kabupaten Tangerang", "Serpong", "BSD", "Kota Tangerang Selatan", 
        "Kota Bekasi", "Kabupaten Bekasi", "Cikarang", "Tambun"
    ].sort();

    const filteredLocations = jabodetabekLocations.filter(loc => 
        loc.toLowerCase().includes(locationSearch.toLowerCase())
    );

    const handleReset = () => {
        const resetData = { location: '', minSalary: '', shift: '', type: '', ageRange: '' };
        setTempFilters(resetData);
        setLocationSearch('');
    };

    const handleApply = () => {
        const isEmpty = !tempFilters.location && 
                        !tempFilters.minSalary && 
                        !tempFilters.shift && 
                        !tempFilters.type && 
                        !tempFilters.ageRange;

        if (isEmpty) {
            alert('Silakan isi atau pilih minimal satu filter terlebih dahulu!');
            return;
        }

        setFilters(tempFilters);
        onClose();
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        >
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-md p-6 sm:p-10 relative z-10 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col"
            >
                <div className="flex justify-between items-start mb-8 shrink-0">
                    <div>
                        <h2 className="text-2xl font-display font-black text-gray-900 tracking-tight">Filters</h2>
                        <p className="text-xs text-gray-400 font-medium">Refine your job search preferences</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="space-y-7 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-2">
                    {/* Location Autocomplete */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Location</label>
                        <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 group-focus-within:scale-110 transition-transform" />
                            <input 
                                value={locationSearch}
                                onChange={e => {
                                    setLocationSearch(e.target.value);
                                    setTempFilters({...tempFilters, location: e.target.value});
                                    setShowLocationList(true);
                                }}
                                onFocus={() => setShowLocationList(true)}
                                placeholder="Search Jakarta, Bogor, Bekasi..."
                                className="w-full pl-11 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none text-sm font-bold text-gray-900 transition-all"
                            />
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        </div>

                        <AnimatePresence>
                            {showLocationList && filteredLocations.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                                >
                                    {filteredLocations.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => {
                                                setLocationSearch(loc);
                                                setTempFilters({...tempFilters, location: loc});
                                                setShowLocationList(false);
                                            }}
                                            className="w-full px-5 py-3 text-left text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-between"
                                        >
                                            {loc}
                                            {tempFilters.location === loc && <Check className="w-3 h-3 text-indigo-500" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Salary Stepper */}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Salary Est. (Rupiah)</label>
                        <div className="flex items-center justify-between gap-4">
                            <button 
                                onClick={() => {
                                    const current = parseInt(tempFilters.minSalary || '0');
                                    setTempFilters({...tempFilters, minSalary: String(Math.max(0, current - 100000))});
                                }}
                                className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f4f6f8] rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all shadow-sm shrink-0"
                            >
                                <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                            
                            <div className="flex-1 h-14 sm:h-16 bg-white border border-indigo-100 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-lg sm:text-2xl font-black text-indigo-600 shadow-sm overflow-hidden min-w-0">
                                <span className="text-indigo-400 mr-1.5 font-black">Rp</span>
                                {new Intl.NumberFormat('id-ID').format(parseInt(tempFilters.minSalary) || 0)}
                            </div>

                            <button 
                                onClick={() => {
                                    const current = parseInt(tempFilters.minSalary || '0');
                                    setTempFilters({...tempFilters, minSalary: String(current + 100000)});
                                }}
                                className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f4f6f8] rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all shadow-sm shrink-0"
                            >
                                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Shift Locking Logic */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Education / Shift</label>
                            <select 
                                value={tempFilters.shift}
                                disabled={!!tempFilters.type}
                                onChange={e => setTempFilters({...tempFilters, shift: e.target.value})}
                                className={`w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold appearance-none transition-all ${
                                    !!tempFilters.type ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'text-gray-900 cursor-pointer hover:bg-white'
                                }`}
                            >
                                <option value="">Select Shift</option>
                                <option value="Pagi">Pagi</option>
                                <option value="Siang">Siang</option>
                                <option value="Malam">Malam</option>
                            </select>
                            {!!tempFilters.type && <p className="text-[9px] text-orange-500 mt-1 font-bold italic">Shift is disabled because TYPE is selected</p>}
                        </div>

                        {/* Type Dropdown */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Job Type</label>
                            <select 
                                value={tempFilters.type}
                                disabled={!!tempFilters.shift}
                                onChange={e => setTempFilters({...tempFilters, type: e.target.value})}
                                className={`w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold appearance-none transition-all ${
                                    !!tempFilters.shift ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'text-gray-900 cursor-pointer hover:bg-white'
                                }`}
                            >
                                <option value="">Select Type</option>
                                <option value="WFH">WFH</option>
                                <option value="WFO">WFO</option>
                                <option value="Hybrid Working">Hybrid Working</option>
                                <option value="WFA">WFA</option>
                                <option value="Digital Nomad">Digital Nomad</option>
                                <option value="On-site Working">On-site Working</option>
                                <option value="Remote Working">Remote Working</option>
                                <option value="Freelance">Freelance</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Full-time">Full-time</option>
                            </select>
                            {!!tempFilters.shift && <p className="text-[9px] text-orange-500 mt-1 font-bold italic">Type is disabled because SHIFT is selected</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Age Requirement</label>
                            <select 
                                value={tempFilters.ageRange}
                                onChange={e => setTempFilters({...tempFilters, ageRange: e.target.value})}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold text-gray-900 appearance-none cursor-pointer hover:bg-white transition-all"
                            >
                                <option value="">Any Age</option>
                                <option value="18-25">18-25</option>
                                <option value="26-35">26-35</option>
                                <option value="36-45">36-45</option>
                                <option value="45+">45+</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-10">
                    <button 
                        onClick={handleReset}
                        className="flex-1 py-4 text-gray-400 font-bold text-sm hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
                    >
                        Reset All
                    </button>
                    <button 
                        onClick={handleApply}
                        className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                        Apply Filters
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
function JobCard({ job, hasApplied }: { job: any, hasApplied: boolean }) {
  const [posterName, setPosterName] = useState<string>('Recruiter');

  useEffect(() => {
    if (!job.postedBy) return;
    try {
      const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      const found = recruiters.find((u: any) => u.email.toLowerCase() === job.postedBy.toLowerCase());
      if (found) {
        setPosterName(`${found.firstName} ${found.lastName || ''}`.trim());
      } else {
        const profile = JSON.parse(localStorage.getItem(`matchwork_profile_${job.postedBy.toLowerCase()}`) || '{}');
        if (profile.firstName) {
          setPosterName(`${profile.firstName} ${profile.lastName || ''}`.trim());
        }
      }
    } catch (e) {}
  }, [job.postedBy]);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Posted By Info */}
      <div className="mb-4 text-[10px] font-medium text-gray-400">
        Posted by: <span className="text-gray-900 font-bold">{posterName}</span> <span className="italic opacity-60">({job.postedBy})</span>
      </div>

      {hasApplied && (
        <div className="absolute top-0 right-0 py-1.5 px-4 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-2xl">
            Applied
        </div>
      )}
      <div className="flex items-start">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl mr-4 group-hover:scale-110 transition-transform shadow-inner">
          {job.logo || '🏢'}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h3>
                {(job.status?.toLowerCase() === 'approved' || job.status?.toLowerCase() === 'success') && (
                  <div className="flex items-center text-green-500 bg-green-50 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-100">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    Verified
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-indigo-600 font-bold">{job.company}</p>
                <span className="text-gray-300">•</span>
                <p className="text-gray-400 text-xs font-bold flex items-center">
                  <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                  {job.applicantCount || 0} applicants
                </p>
              </div>
            </div>
            <div className="flex items-center px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
              <Brain className="w-3.5 h-3.5 text-indigo-600 mr-1.5 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Match Candidate</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400 mb-4 uppercase tracking-tighter">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1.5 opacity-60" />
              {job.location}
            </div>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-1.5 opacity-60 text-green-500" />
              {job.salary}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5 opacity-60" />
              {job.shiftName || job.jobType || job.shift}
            </div>
            {job.ageRange && (
                <div className="flex items-center text-orange-500">
                    <Target className="w-4 h-4 mr-1.5 opacity-60" />
                    {job.ageRange}
                </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(job.skills || []).map((skill: string) => (
              <span key={skill} className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-lg border border-gray-100 uppercase tracking-widest">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
