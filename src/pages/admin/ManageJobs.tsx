import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, FirebaseService } from '../../services/firebaseService';
import { 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  MapPin,
  DollarSign,
  Building2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Job } from '../../types';

interface ManageJobsProps {
  showTrash?: boolean;
}

export default function ManageJobs({ showTrash = false }: ManageJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'Approved' | 'rejected'>('all');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Subscribe to all jobs in Firestore for the admin
    const unsubscribe = FirebaseService.subscribeToJobs((allJobs) => {
      setJobs(allJobs as Job[]);
      setLoading(false);
      
      // Update local storage for consistency with other parts of the app
      localStorage.setItem('recruiterJobs', JSON.stringify(allJobs));
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, status: 'Approved' | 'rejected' | 'pending' | 'Trashed') => {
    try {
      // Find the job to get recruiter info
      const jobToUpdate = jobs.find(j => j.id === id);
      if (!jobToUpdate) return;

      // Update Firestore
      await FirebaseService.updateJob(id, { status, updatedAt: new Date() });
      
      // Update Local State Optimistically
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
      
      // Sync Local Storage
      const stored = localStorage.getItem('recruiterJobs');
      if (stored) {
        const jobsList = JSON.parse(stored);
        const updated = jobsList.map((j: any) => j.id === id ? { ...j, status } : j);
        localStorage.setItem('recruiterJobs', JSON.stringify(updated));
      }

      // Create Notification if status changed to Approved or Rejected
      if (status === 'Approved' || status === 'rejected') {
        try {
          // Robustly find the email. Seeker uses job.postedBy or job.recruiterEmail
          const j = jobToUpdate as any;
          const targetEmail = j.postedBy || j.recruiterEmail || j.recruiterId;
          
          if (targetEmail) {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const message = status === 'Approved' 
              ? `🎉 Congratulations! Your job posting ${jobToUpdate.title} has been APPROVED by Admin and is now live.`
              : `⚠️ Alert! Your job posting ${jobToUpdate.title} has been REJECTED by Admin. Please review your details.`;

            notifications.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              recruiterEmail: targetEmail, // Key used by Navbar and Seeker
              message: message,
              timestamp: Date.now(),
              isRead: false
            });
            localStorage.setItem('notifications', JSON.stringify(notifications));
            
            // Dispatch storage event to update navbar indicator
            window.dispatchEvent(new Event('storage'));
          }
        } catch (e) {
          console.error("Failed to create admin notification", e);
        }
      }
    } catch (e) {
      console.error("Failed to update job status", e);
      alert("Gagal memperbarui status lowongan. Silakan coba lagi.");
    }
  };

  const handlePermanentDelete = async (jobId: string) => {
    try {
      // Delete from Firestore
      await FirebaseService.deleteJob(jobId);

      // Update Local Storage
      const stored = localStorage.getItem('recruiterJobs');
      const allJobs = stored ? JSON.parse(stored) : [];
      const remainingJobs = allJobs.filter((job: any) => job.id !== jobId);
      localStorage.setItem('recruiterJobs', JSON.stringify(remainingJobs));

      // Update Local State
      setJobs(remainingJobs);
      
      // Notify components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
      alert("Lowongan berhasil dihapus secara permanen.");
    } catch (e) {
      console.error("Permanent delete failed", e);
      alert("Gagal menghapus lowongan. Silakan coba lagi.");
    }
  };

  const filteredJobs = jobs.filter(j => {
    if (showTrash) return j.status === 'Trashed';
    return j.status !== 'Trashed' && (filter === 'all' || (j.status || 'pending') === filter);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 italic">{showTrash ? 'Sampah Lowongan' : 'Kelola Lowongan'}</h2>
          <p className="text-gray-500 text-sm">
            {showTrash 
              ? 'Daftar lowongan yang telah dihapus sementara. Anda dapat memulihkan atau menghapusnya secara permanen.' 
              : 'Validasi dan moderasi setiap lowongan pekerjaan yang masuk.'}
          </p>
        </div>
        
        {!showTrash && (
          <div className="flex overflow-x-auto no-scrollbar bg-white border border-gray-200 rounded-xl p-1 shrink-0">
            {(['all', 'pending', 'Approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all capitalize flex items-center gap-2 ${
                  filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f === 'pending' && <Clock className="w-3 h-3" />}
                {f === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                {f === 'rejected' && <XCircle className="w-3 h-3" />}
                {f === 'Approved' ? 'Approved' : f}
                {f === 'pending' && jobs.filter(j => j.status === 'pending' || !j.status).length > 0 && (
                  <span className="bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                    {jobs.filter(j => (j.status === 'pending' || !j.status)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-40 bg-white border border-gray-100 rounded-3xl animate-pulse" />
          ))
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 left-0 w-2 h-full ${
                (job.status === 'pending' || !job.status) ? 'bg-orange-400' :
                (job.status === 'success' || job.status === 'Approved') ? 'bg-green-500' :
                'bg-red-500'
              }`} />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2">
                <div className="flex gap-5">
                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                    {job.logo ? (
                      <img src={job.logo} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-1">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded opacity-80">{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" /> {job.location}</span>
                      <span className="flex items-center gap-1 text-green-600"><DollarSign className="w-3 h-3 text-green-500" /> {job.salary}</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded italic">{job.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 lg:border-l lg:border-gray-50 lg:pl-8">
                  {showTrash ? (
                    <button 
                      onClick={() => handleStatusChange(job.id, 'pending')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                      <Clock className="w-4 h-4" />
                      Pulihkan (Restore)
                    </button>
                  ) : (!job.status || job.status === 'pending') ? (
                    <>
                      <button 
                        onClick={() => handleStatusChange(job.id, 'Approved')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-black shadow-lg shadow-green-100 hover:shadow-green-200 hover:-translate-y-0.5 transition-all active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button 
                        onClick={() => handleStatusChange(job.id, 'rejected')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-black hover:bg-red-100 transition-all active:scale-95"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                      (job.status === 'success' || job.status === 'Approved') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {(job.status === 'success' || job.status === 'Approved') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {(job.status === 'success' || job.status === 'Approved') ? 'Terverifikasi' : 'Ditolak'}
                      <button 
                        onClick={() => handleStatusChange(job.id, 'pending')}
                        className="ml-2 p-1 hover:bg-white rounded-md text-[8px] border border-current opacity-40 hover:opacity-100"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                  
                  <div className="h-8 w-[1px] bg-gray-100 mx-2 hidden lg:block" />

                  {showTrash ? (
                    <button 
                      onClick={() => setConfirmDeleteId(job.id)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Hapus Permanen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(job.id, 'Trashed')}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Pindahkan ke Sampah"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 bg-white rounded-[2rem] border border-gray-100 flex flex-col items-center">
            <AlertCircle className="w-16 h-16 text-gray-100 mb-4" />
            <p className="text-gray-400 font-bold italic tracking-tight uppercase">Tidak ada lowongan untuk filter ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
