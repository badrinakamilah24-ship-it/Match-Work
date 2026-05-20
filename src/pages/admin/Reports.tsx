import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebaseService';
import { 
  FileText, 
  Download, 
  PieChart as PieChartIcon, 
  Users, 
  Building2, 
  Briefcase,
  AlertCircle,
  Loader2,
  Table
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    users: [] as any[],
    jobs: [] as any[],
    applications: [] as any[]
  });

  const fetchData = () => {
    setLoading(true);
    try {
      const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
      const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      const jobs = JSON.parse(localStorage.getItem('recruiterJobs') || '[]');
      const apps = JSON.parse(localStorage.getItem('matchwork_applications') || '[]');

      setData({
        users: [...seekers, ...recruiters],
        jobs: jobs,
        applications: apps
      });
    } catch (e) {
      console.error("Failed to load report data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const exportPDF = (type: 'demografi' | 'recruiter' | 'matchmaking') => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text('MATCH WORK', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Official System Report | Created: ${timestamp}`, 105, 28, { align: 'center' });
    doc.line(20, 32, 190, 32);

    if (type === 'demografi') {
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Laporan Demografi Seeker', 20, 45);
      
      const seekers = data.users.filter(u => u.role === 'seeker');
      const muda = seekers.filter(u => (u.age || 0) < 30).length;
      const orangTua = seekers.filter(u => (u.age || 0) >= 30 && (u.age || 0) < 50).length;
      const lansia = seekers.filter(u => (u.age || 0) >= 50).length;

      autoTable(doc, {
        startY: 55,
        head: [['Kategori Umur', 'Kriteria', 'Jumlah']],
        body: [
          ['Muda', '< 30 Tahun', muda],
          ['Orang Tua', '30 - 49 Tahun', orangTua],
          ['Lansia', '>= 50 Tahun', lansia],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] } as any
      });

      doc.text(`Total Seeker Tervalidasi: ${seekers.length}`, 20, (doc as any).lastAutoTable.finalY + 10);
    }

    if (type === 'recruiter') {
      doc.setFontSize(16);
      doc.text('Laporan Aktivitas Recruiter', 20, 45);

      const recruiterStats = data.users.filter(u => u.role === 'recruiter').map(r => {
        const recruiterJobs = data.jobs.filter(j => j.postedBy === r.email);
        return [r.firstName + ' ' + (r.lastName || ''), r.company || '-', recruiterJobs.length];
      }).sort((a, b) => (b[2] as number) - (a[2] as number));

      autoTable(doc, {
        startY: 55,
        head: [['Nama Recruiter', 'Perusahaan', 'Total Lowongan']],
        body: recruiterStats as any,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] } as any
      });
    }

    if (type === 'matchmaking') {
      doc.setFontSize(16);
      doc.text('Laporan Hasil Lamaran (Matchmaking)', 20, 45);

      const appStats = data.applications.map(app => {
        const job = data.jobs.find(j => j.id === app.jobId);
        const seeker = data.users.find(u => u.email === app.seekerEmail);
        return [
          seeker?.firstName || 'Unknown',
          job?.title || 'Unknown',
          app.status || 'Pending',
          app.aiScore ? `${Math.round(app.aiScore)}%` : '-'
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [['Seeker', 'Lowongan', 'Status', 'Match Score']],
        body: appStats as any,
        theme: 'plain',
        headStyles: { fillColor: [0, 0, 0] } as any
      });
    }

    doc.save(`Match_Work_Report_${type}_${new Date().getTime()}.pdf`);
  };

  const handleExportExcel = () => {
    try {
      const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
      const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      const jobs = JSON.parse(localStorage.getItem('recruiterJobs') || '[]');

      // Sheet 1: Data Pengguna
      const usersData = [...seekers, ...recruiters].map(u => ({
        'Nama Lengkap': `${u.firstName} ${u.lastName || ''}`,
        'Email': u.email,
        'Peran': u.role === 'seeker' ? 'Pencari Kerja' : 'Perekrut',
        'Lokasi': u.location || '-',
        'Perusahaan': u.company || '-'
      }));

      // Sheet 2: Data Lowongan
      const jobsData = jobs.map(j => ({
        'Judul Lowongan': j.title,
        'Nama Perusahaan': j.company,
        'Lokasi Penempatan': j.location,
        'Estimasi Gaji': j.salary || '-',
        'Status Moderasi': j.status || 'Pending',
        'Tanggal Posting': j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '-'
      }));

      const wb = XLSX.utils.book_new();
      
      const wsUsers = XLSX.utils.json_to_sheet(usersData);
      const wsJobs = XLSX.utils.json_to_sheet(jobsData);

      // Simple styling for headers (SheetJS basic doesn't support bold without pro, but we can structure nicely)
      XLSX.utils.book_append_sheet(wb, wsUsers, "Data Pengguna");
      XLSX.utils.book_append_sheet(wb, wsJobs, "Data Lowongan");

      XLSX.writeFile(wb, "Laporan_Utama_MatchWork.xlsx");
    } catch (e) {
      console.error("Export Excel failed", e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 italic">Pusat Laporan</h2>
          <p className="text-gray-500 text-sm">Ekspor data analitik platform untuk kebutuhan administrasi.</p>
        </div>
        
        {loading && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Demografi Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex flex-col group">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Demografi Seeker</h3>
          <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">
            Klasifikasi pencari kerja berdasarkan rentang umur (Muda, Orang Tua, Lansia).
          </p>
          <button 
            disabled={loading}
            onClick={() => exportPDF('demografi')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Demografi PDF
          </button>
        </div>

        {/* Recruiter Activity Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-50/50 transition-all flex flex-col group">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aktivitas Recruiter</h3>
          <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">
            Penyedia kerja yang paling aktif memposting lowongan dalam sistem.
          </p>
          <button 
            disabled={loading}
            onClick={() => exportPDF('recruiter')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Recruiter PDF
          </button>
        </div>

        {/* Matchmaking Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all flex flex-col group">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform">
            <PieChartIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Hasil Matchmaking</h3>
          <p className="text-gray-500 text-sm mb-8 flex-1 leading-relaxed">
            Statistik lamaran yang masuk dan skor kecocokan (AI Score) antar pengguna.
          </p>
          <button 
            disabled={loading}
            onClick={() => exportPDF('matchmaking')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Matchmaking PDF
          </button>
        </div>
      </div>

      <div className="bg-indigo-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative">
        <div className="relative z-10 space-y-4">
          <div>
            <h3 className="text-3xl font-black mb-2 italic tracking-tight">Laporan Komprehensif (Format Excel)</h3>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Unduh seluruh data analitik platform termasuk data pengguna, aktivitas lowongan, dan statistik matchmaking dalam satu file spreadsheet modern yang terstruktur.
            </p>
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-950/20 active:scale-95 group"
          >
            <Table className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Unduh Laporan Excel
          </button>
        </div>

        <div className="absolute top-0 right-0 opacity-5 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-1000">
          <FileText className="w-96 h-96" />
        </div>
        
        <div className="flex flex-col items-end gap-2 relative z-10 shrink-0">
           <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">v1.3.0 Enterprise Engine</span>
           </div>
           <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10">
            <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-[0.2em]">Live Data Sync Active</span>
           </div>
        </div>
      </div>
    </div>
  );
}
