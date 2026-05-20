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
import { db } from '../../services/firebaseService';
import { 
  User, 
  Mail, 
  Shield, 
  Trash2, 
  MoreVertical,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MapPin
} from 'lucide-react';
import { UserProfile } from '../../types';

export default function ManageUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'seeker' | 'recruiter' | 'admin'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    try {
      const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
      const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
      
      const allUsers = [...seekers, ...recruiters].sort((a, b) => 
        (a.createdAt || '').localeCompare(b.createdAt || '') || a.firstName.localeCompare(b.firstName)
      );
      
      setUsers(allUsers as UserProfile[]);
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // Real-time update
    const interval = setInterval(fetchUsers, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRevokeSession = (email: string, name: string) => {
    if (confirm(`Cabut sesi ${name}? Pengguna akan otomatis ter-logout dari perangkatnya.`)) {
      try {
        const invalidated = JSON.parse(localStorage.getItem('matchwork_invalidated_sessions') || '[]');
        if (!invalidated.includes(email.toLowerCase())) {
          invalidated.push(email.toLowerCase());
          localStorage.setItem('matchwork_invalidated_sessions', JSON.stringify(invalidated));
        }
        alert(`Sesi ${name} telah dicabut. Pengguna harus login ulang untuk masuk.`);
      } catch (e) {
        console.error("Failed to revoke session", e);
      }
    }
  };

  const promoteToAdmin = (email: string) => {
    if (confirm('Jadikan pengguna ini sebagai Admin?')) {
      const emailKey = `matchwork_profile_${email.toLowerCase()}`;
      const profile = JSON.parse(localStorage.getItem(emailKey) || '{}');
      profile.role = 'admin';
      localStorage.setItem(emailKey, JSON.stringify(profile));
      
      // Also remove from seeker/recruiter lists
      ['seekerUsers', 'recruiterUsers'].forEach(key => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(list.filter((u: any) => u.email !== email)));
      });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || u.role === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 italic">Kelola Pengguna</h2>
          <p className="text-gray-500 text-sm">Lihat, edit, atau hapus basis data pengguna Match Work.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari email atau nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
          
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {(['all', 'seeker', 'recruiter'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pengguna</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Peran</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Lokasi</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-6 h-16 bg-gray-50/20"></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        u.role === 'admin' ? 'bg-red-50 text-red-600' :
                        u.role === 'recruiter' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-300" />
                        {u.location || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleRevokeSession(u.email, u.firstName)}
                          className="p-2 text-red-500 hover:bg-white rounded-lg shadow-sm transition-all"
                          title="Cabut Akses Sesi"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold italic">Tidak ada pengguna yang ditemukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
