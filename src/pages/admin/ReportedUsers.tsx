import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  UserX, 
  UserCheck,
  Search,
  Clock
} from 'lucide-react';

export default function ReportedUsers() {
    const [reports, setReports] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        try {
            const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
            const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
            const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
            setReports([...savedReports].reverse());
            setUsers([...seekers, ...recruiters]);
        } catch (e) {
            console.error("Failed to load reported users", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const toggleBlock = (email: string, isCurrentlyBlocked: boolean) => {
        // Update individual profile
        const profileKey = `matchwork_profile_${email.toLowerCase()}`;
        const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
        profile.isBlocked = !isCurrentlyBlocked;
        localStorage.setItem(profileKey, JSON.stringify(profile));

        // Update user lists (Seekers and Recruiters)
        const seekers = JSON.parse(localStorage.getItem('seekerUsers') || '[]');
        const recruiters = JSON.parse(localStorage.getItem('recruiterUsers') || '[]');
        
        const updatedSeekers = seekers.map((u: any) => 
            u.email.toLowerCase() === email.toLowerCase() ? { ...u, isBlocked: !isCurrentlyBlocked } : u
        );
        const updatedRecruiters = recruiters.map((u: any) => 
            u.email.toLowerCase() === email.toLowerCase() ? { ...u, isBlocked: !isCurrentlyBlocked } : u
        );
        
        localStorage.setItem('seekerUsers', JSON.stringify(updatedSeekers));
        localStorage.setItem('recruiterUsers', JSON.stringify(updatedRecruiters));

        // Sync with any combined "users" list just in case
        const genericUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (genericUsers.length > 0) {
            const updatedGeneric = genericUsers.map((u: any) => 
                u.email.toLowerCase() === email.toLowerCase() ? { ...u, isBlocked: !isCurrentlyBlocked } : u
            );
            localStorage.setItem('users', JSON.stringify(updatedGeneric));
        }

        // Revoke session if blocking to force logout
        if (!isCurrentlyBlocked) {
            const invalidatedKey = 'matchwork_invalidated_sessions';
            const invalidated = JSON.parse(localStorage.getItem(invalidatedKey) || '[]');
            if (!invalidated.includes(email.toLowerCase())) {
                invalidated.push(email.toLowerCase());
                localStorage.setItem(invalidatedKey, JSON.stringify(invalidated));
            }
        }

        // Update State immediately for UI responsiveness
        setUsers([...updatedSeekers, ...updatedRecruiters]);
    };

    const deleteReport = (reportId: string) => {
        // 1. Get from localStorage
        const savedReports = JSON.parse(localStorage.getItem('reports') || '[]');
        // 2. Filter out the specific report
        const filtered = savedReports.filter((r: any) => r.id !== reportId);
        // 3. Save back to localStorage
        localStorage.setItem('reports', JSON.stringify(filtered));
        // 4. Update state immediately to remove from UI
        setReports([...filtered].reverse());
    };

    const filteredReports = reports.filter(r => 
        r.reportedEmail.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.reportedName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isBlocked = (email: string) => {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user?.isBlocked || false;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 italic">Reported Users Management</h2>
                    <p className="text-gray-500 text-sm">Moderate reported users and control access to the platform.</p>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search reported user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-w-[300px]"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Target User</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Reporter</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Reason / Time</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : filteredReports.length > 0 ? (
                                filteredReports.map((r) => {
                                    const blocked = isBlocked(r.reportedEmail);
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic ${blocked ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        {r.reportedName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{r.reportedName}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase">{r.reportedEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-600">{r.reporterEmail}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {blocked ? (
                                                    <span className="flex items-center gap-1 text-red-600 font-black text-[9px] uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg">
                                                        <UserX className="w-3 h-3" /> Blocked
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-emerald-600 font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <UserCheck className="w-3 h-3" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="text-xs text-gray-500 italic max-w-[200px] truncate" title={r.reason}>"{r.reason || 'Reported from Chat'}"</div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(r.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => toggleBlock(r.reportedEmail, blocked)}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            blocked 
                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        }`}
                                                    >
                                                        {blocked ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                                                        {blocked ? 'Unblock' : 'Block User'}
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteReport(r.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete Report Record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                        <ShieldAlert className="w-16 h-16 mx-auto mb-4 opacity-5" />
                                        <p className="font-bold italic">No outstanding user reports found.</p>
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
