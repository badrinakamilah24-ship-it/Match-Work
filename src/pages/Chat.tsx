import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Search, Shield, Paperclip, MoreVertical, Phone, Video, MessageCircle, LogIn, ChevronLeft, ChevronRight, MessageSquare, AlertCircle, Briefcase, Trash2, CheckCheck, Reply, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// We empty these mock chats for the "initially empty" state demonstration
const MOCK_CHATS: any[] = [];

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = user?.isGuest || user?.id === 'guest';
  
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [activeModal, setActiveModal] = useState<'interview' | 'clear' | 'report' | 'deleteMessage' | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isTypingMap, setIsTypingMap] = useState<Record<string, boolean>>({});
  const [interviewForm, setInterviewForm] = useState({ date: '', time: '', location: '' });
  const [reportReason, setReportReason] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [unreadCountForRoom, setUnreadCountForRoom] = useState<number>(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Click outside to close options
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeChat && user?.email) {
      const localMsgsStr = localStorage.getItem('chatMessages');
      if (localMsgsStr) {
        try {
          const allMsgs = JSON.parse(localMsgsStr);
          const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
          const roomId = [user.email, otherEmail].sort().join(':');
          
          let changed = false;
          let firstUnread = null;
          let count = 0;

          const updatedMsgs = allMsgs.map((m: any) => {
            if (m.roomId === roomId && m.receiverEmail === user.email && m.isRead === false && !(m.deletedFor?.includes(user.email))) {
              if (!firstUnread) firstUnread = m.id;
              count++;
              changed = true;
              return { ...m, isRead: true };
            }
            return m;
          });
          
          setFirstUnreadMessageId(firstUnread);
          setUnreadCountForRoom(count);

          if (changed) {
            localStorage.setItem('chatMessages', JSON.stringify(updatedMsgs));
            window.dispatchEvent(new Event('storage'));
            setMessages(prev => prev.map(m => 
              m.roomId === roomId && m.receiverEmail === user.email ? { ...m, isRead: true } : m
            ));
          }
        } catch (e) {}
      }
    } else {
      setFirstUnreadMessageId(null);
      setUnreadCountForRoom(0);
    }
  }, [activeChat?.id, user?.email]);

  // Load and sync chat data
  const loadChatData = () => {
    if (!user?.email) return;

    // 1. Load Rooms
    const localRoomsStr = localStorage.getItem('chatRooms');
    let rooms: any[] = [];
    if (localRoomsStr) {
      try {
        const allRooms = JSON.parse(localRoomsStr);
        // Filter rooms where current user is a participant
        rooms = allRooms.filter((r: any) => r.participants?.includes(user.email));
      } catch (e) { console.error(e); }
    }

    // 2. Load Messages for active chat
    const localMsgsStr = localStorage.getItem('chatMessages');
    if (localMsgsStr) {
      try {
        const allMsgs = JSON.parse(localMsgsStr);
        
        // Enhance rooms with dynamic last user messages & counts
        rooms = rooms.map(room => {
            const roomMsgs = allMsgs.filter((m: any) => m.roomId === room.id);
            const userRoomMsgs = roomMsgs.filter((m: any) => !(m.deletedFor?.includes(user.email)));
            
            let displayLastMsg = room.lastMsg;
            let isLastMsgDeleted = false;
            let isCleared = false;
            
            if (userRoomMsgs.length === 0 && roomMsgs.length > 0) {
                isCleared = true;
                displayLastMsg = 'Message was cleared';
            } else if (userRoomMsgs.length > 0) {
                const lastObj = userRoomMsgs[userRoomMsgs.length - 1];
                if (lastObj.isDeleted) {
                    isLastMsgDeleted = true;
                    displayLastMsg = '🚫 Pesan ini telah dihapus';
                } else {
                    displayLastMsg = lastObj.text;
                }
            }
            
            return {
                ...room,
                displayLastMsg,
                isLastMsgDeleted,
                isCleared
            };
        });

        // Calculate Unread Counts for all rooms
        const counts: Record<string, number> = {};
        allMsgs.forEach((m: any) => {
          if (m.receiverEmail === user.email && m.isRead === false && !(m.deletedFor?.includes(user.email))) {
            counts[m.roomId] = (counts[m.roomId] || 0) + 1;
          }
        });
        setUnreadCounts(counts);

        if (activeChat) {
          const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
          const roomId = [user.email, otherEmail].sort().join(':');
          const roomMsgs = allMsgs.filter((m: any) => m.roomId === roomId && !(m.deletedFor?.includes(user.email)));
          setMessages(roomMsgs);
        }
      } catch (e) { console.error(e); }
    } else {
      // No messages in localStorage, initialize default rooms
      rooms = rooms.map(room => ({
          ...room,
          displayLastMsg: room.lastMsg,
          isLastMsgDeleted: false,
          isCleared: false
      }));
    }
    
    setChats(rooms);
  };

  // Sync presence data
  useEffect(() => {
    const updatePresence = () => {
      try {
        const presence = JSON.parse(localStorage.getItem('matchwork_presence') || '{}');
        setOnlineUsers(presence);
      } catch (e) {}
    };

    const updateTyping = () => {
      try {
        const typingData = JSON.parse(localStorage.getItem('matchwork_typing') || '{}');
        const newTypingMap: Record<string, boolean> = {};
        const now = Date.now();
        for (const [key, timestamp] of Object.entries(typingData)) {
           if (now - (timestamp as number) < 3000) {
              newTypingMap[key] = true;
           }
        }
        setIsTypingMap(newTypingMap);
      } catch (e) {}
    };

    updatePresence();
    updateTyping();
    const interval = setInterval(() => {
        updatePresence();
        updateTyping();
    }, 1000);
    window.addEventListener('storage', updatePresence);
    window.addEventListener('storage', updateTyping);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updatePresence);
      window.removeEventListener('storage', updateTyping);
    };
  }, []);

  const isUserOnline = (email?: string) => {
    if (!email) return false;
    const lastSeen = onlineUsers[email.toLowerCase()];
    if (!lastSeen) return false;
    return Date.now() - lastSeen < 30000; // 30 seconds threshold
  };

  useEffect(() => {
    loadChatData();
    const handleStorage = () => loadChatData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.email, activeChat?.id]);

  useEffect(() => {
    // Check if we were passed a contact user from navigation state
    if (location.state?.contactUser && user?.email) {
        const contact = location.state.contactUser;
        const contactEmail = contact.email;
        
        if (contactEmail && contactEmail !== user.email) {
            const roomId = [user.email, contactEmail].sort().join(':');
            
            // Check existing rooms in localStorage
            const localRoomsStr = localStorage.getItem('chatRooms');
            let allRooms: any[] = [];
            if (localRoomsStr) {
              try { allRooms = JSON.parse(localRoomsStr); } catch (e) {}
            }

            let room = allRooms.find((r: any) => r.id === roomId);
            
            if (!room) {
              room = {
                id: roomId,
                participants: [user.email, contactEmail],
                participantDetails: {
                  [user.email]: { name: `${user.firstName} ${user.lastName || ''}`, role: user.role },
                  [contactEmail]: { name: contact.name, role: contact.role }
                },
                lastMsg: 'New conversation started...',
                updatedAt: Date.now()
              };
              allRooms = [room, ...allRooms];
              localStorage.setItem('chatRooms', JSON.stringify(allRooms));
            }
            
            setActiveChat(room);
            loadChatData();
        }
        
        // Clear state to avoid re-triggering on refresh
        window.history.replaceState({}, document.title);
    }
  }, [location.state, user?.email]);
  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Hari ini, ${hours}:${minutes}`;
    }
    
    if (isYesterday) {
      return "Kemarin";
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateSeparator = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return `Hari ini`;
    }
    
    if (isYesterday) {
      return "Kemarin";
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const userFirstName = user?.firstName || 'Me';
  const role = user?.role || 'seeker';
  const isAdmin = role === 'admin';

  // Privacy: Admin cannot see chats
  if (isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
           <Shield className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-4 italic uppercase tracking-tight">Access Restricted</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
          Sistem Privasi Admin: Akun Administrator dilarang keras untuk mengakses, membaca, atau mengintip isi percakapan pribadi antara Recruiter dan Seeker demi keamanan data pengguna.
        </p>
        <button onClick={() => navigate('/admin')} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-indigo-600 transition-all active:scale-95">
            Return to Dashboard
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (!user) {
        navigate('/');
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user) return null;

  if (isGuest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
           <MessageCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages Locked</h1>
        <p className="text-gray-500 mb-8">As a guest, you haven't started any conversations with recruiters yet. Start applying to jobs to initiate chats!</p>
        <div className="flex justify-center space-x-4">
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600">Browse Jobs</button>
            <button onClick={() => navigate('/login')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center">
                <LogIn className="w-4 h-4 mr-2" />
                Login to Chat
            </button>
        </div>
      </div>
    );
  }

  const handleSend = (customText?: string | any) => {
    const messageText = typeof customText === 'string' ? customText : input;
    if (!messageText.trim() || !user?.email || !activeChat) return;
    
    const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
    const roomId = [user.email, otherEmail].sort().join(':');
    
    const newMsg = {
        id: Date.now().toString(),
        roomId: roomId,
        senderEmail: user.email,
        receiverEmail: otherEmail,
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isRead: false,
        replyTo: replyingTo ? {
            id: replyingTo.id,
            senderEmail: replyingTo.senderEmail,
            text: replyingTo.text
        } : undefined
    };

    // 1. Save Message
    const localMsgsStr = localStorage.getItem('chatMessages');
    let allMsgs: any[] = [];
    if (localMsgsStr) {
      try { allMsgs = JSON.parse(localMsgsStr); } catch (e) {}
    }
    const updatedMsgs = [...allMsgs, newMsg];
    localStorage.setItem('chatMessages', JSON.stringify(updatedMsgs));

    // Clear typing and reply states
    setReplyingTo(null);
    try {
        const typingData = JSON.parse(localStorage.getItem('matchwork_typing') || '{}');
        delete typingData[`${activeChat.id}_${user.email}`];
        localStorage.setItem('matchwork_typing', JSON.stringify(typingData));
    } catch(e) {}


    // 2. Update Room last message
    const localRoomsStr = localStorage.getItem('chatRooms');
    if (localRoomsStr) {
      try {
        const allRooms = JSON.parse(localRoomsStr);
        const updatedRooms = allRooms.map((r: any) => 
          r.id === roomId ? { ...r, lastMsg: messageText, updatedAt: Date.now() } : r
        );
        localStorage.setItem('chatRooms', JSON.stringify(updatedRooms));
      } catch (e) {}
    }

    // 3. Add Notification
    try {
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifications.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        targetEmail: otherEmail,
        messageId: newMsg.id,
        message: `Pesan baru dari ${user.firstName}: "${messageText.substring(0, 20)}${messageText.length > 20 ? '...' : ''}"`,
        timestamp: Date.now(),
        isRead: false
      });
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch(e) {}

    setMessages(prev => [...prev, newMsg]);
    if (!customText) setInput('');
    
    // Dispatch storage event manually for same-tab updates if needed
    window.dispatchEvent(new Event('storage'));
  };

  const handleSendInterview = () => {
    if (!interviewForm.date || !interviewForm.time) {
      setToast({ message: 'Mohon isi tanggal dan waktu', type: 'info' });
      return;
    }

    const invitation = `💼 UNDANGAN INTERVIEW: Tanggal ${interviewForm.date}, Pukul ${interviewForm.time}. Lokasi/Catatan: ${interviewForm.location || 'Sudah ditentukan di deskripsi pekerjaan.'}`;
    handleSend(invitation);
    setActiveModal(null);
    setInterviewForm({ date: '', time: '', location: '' });
    setToast({ message: 'Undangan interview terkirim!', type: 'success' });
  };

  const handleClearChat = () => {
    if (!activeChat || !user?.email) return;
    
    const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
    const roomId = [user.email, otherEmail].sort().join(':');
    
    // 1. Update localStorage
    const localMsgsStr = localStorage.getItem('chatMessages');
    if (localMsgsStr) {
      try {
        const allMsgs = JSON.parse(localMsgsStr);
        const updatedMsgs = allMsgs.map((m: any) => {
          if (m.roomId === roomId) {
            return {
              ...m,
              deletedFor: [...(m.deletedFor || []), user.email]
            };
          }
          return m;
        });
        localStorage.setItem('chatMessages', JSON.stringify(updatedMsgs));
      } catch (e) {}
    }

    setMessages([]);
    setActiveModal(null);
    setToast({ message: 'Conversation cleared successfully', type: 'success' });
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteMessage = () => {
    if (!messageToDelete) return;
    
    const localMsgsStr = localStorage.getItem('chatMessages');
    if (localMsgsStr) {
      try {
        const allMsgs = JSON.parse(localMsgsStr);
        const updatedMsgs = allMsgs.map((m: any) => {
          if (m.id === messageToDelete) {
            return {
              ...m,
              isDeleted: true
            };
          }
          return m;
        });
        localStorage.setItem('chatMessages', JSON.stringify(updatedMsgs));
        setMessages(prev => prev.map(m => m.id === messageToDelete ? { ...m, isDeleted: true } : m));
        
        // Update notification based on messageId
        const localNotifsStr = localStorage.getItem('notifications');
        if (localNotifsStr) {
          const allNotifs = JSON.parse(localNotifsStr);
          const updatedNotifs = allNotifs.map((n: any) => {
            if (n.messageId === messageToDelete) {
              return { ...n, message: '🚫 Pesan ini telah dihapus', isDeleted: true };
            }
            return n;
          });
          localStorage.setItem('notifications', JSON.stringify(updatedNotifs));
        }

        window.dispatchEvent(new Event('storage'));
        
        setActiveModal(null);
        setMessageToDelete(null);
      } catch (e) {}
    }
  };

  const handleViewResume = () => {
    if (!activeChat || !user?.email) return;
    const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
    const otherUser = activeChat.participantDetails?.[otherEmail];
    
    if (otherUser?.role === 'seeker') {
      // Find the application for this seeker
      const appsStr = localStorage.getItem('applications');
      if (appsStr) {
        try {
          const apps = JSON.parse(appsStr);
          const seekerApp = apps.find((a: any) => a.seekerEmail?.toLowerCase() === otherEmail.toLowerCase());
          if (seekerApp?.resumeUrl) {
            window.open(seekerApp.resumeUrl, '_blank');
          } else {
            setToast({ message: 'No resume file found for this candidate', type: 'info' });
          }
        } catch (e) {}
      }
    }
    setShowOptions(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 h-[calc(100vh-100px)] pt-4 pb-8 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest"
          >
            {toast.type === 'success' ? <Shield className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-indigo-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals Layer */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModal(null)}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
            >
                {activeModal === 'interview' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 italic tracking-tight">Atur Jadwal Interview</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kirim undangan ke kandidat</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Pilih Tanggal</label>
                                <input 
                                    type="date"
                                    value={interviewForm.date}
                                    onChange={(e) => setInterviewForm({...interviewForm, date: e.target.value})}
                                    className="w-full h-14 bg-gray-50 rounded-2xl px-5 text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Pilih Waktu</label>
                                <input 
                                    type="time" 
                                    value={interviewForm.time}
                                    onChange={(e) => setInterviewForm({...interviewForm, time: e.target.value})}
                                    className="w-full h-14 bg-gray-50 rounded-2xl px-5 text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Lokasi / Catatan</label>
                                <textarea 
                                    placeholder="Link G-Meet atau Alamat Kantor..."
                                    value={interviewForm.location}
                                    onChange={(e) => setInterviewForm({...interviewForm, location: e.target.value})}
                                    className="w-full h-32 bg-gray-50 rounded-2xl p-5 text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-indigo-600 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="flex-1 px-4 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleSendInterview}
                                className="flex-2 px-4 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                                Kirim Undangan
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'clear' && (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto">
                            <MessageSquare className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900 leading-tight">Hapus Riwayat Chat?</h3>
                            <p className="text-sm font-medium text-gray-400 px-4">Apakah Anda yakin ingin menghapus semua riwayat obrolan ini secara permanen?</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleClearChat}
                                className="w-full px-4 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-50 transition-all active:scale-95"
                            >
                                Yakin, Hapus Semua
                            </button>
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="w-full px-4 py-4 bg-transparent text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'deleteMessage' && (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900 leading-tight">Hapus Pesan?</h3>
                            <p className="text-sm font-medium text-gray-400 px-4">Apakah Anda yakin ingin menarik pesan ini untuk semua orang?</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleDeleteMessage}
                                className="w-full px-4 py-4 bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-50 transition-all active:scale-95"
                            >
                                Ya, Hapus Pesan
                            </button>
                            <button 
                                onClick={() => {
                                    setActiveModal(null);
                                    setMessageToDelete(null);
                                }}
                                className="w-full px-4 py-4 bg-transparent text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {activeModal === 'report' && (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="space-y-2 text-left">
                            <h3 className="text-xl font-black text-gray-900 leading-tight text-center">Laporkan Pengguna?</h3>
                            <p className="text-sm font-medium text-gray-400 px-4 text-center mb-4">Apakah Anda yakin ingin melaporkan pengguna ini?</p>
                            
                            <div className="px-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Alasan Pelaporan</label>
                                <textarea 
                                    placeholder="Tuliskan alasan Anda melaporkan pengguna ini... (misal: spam, kata-kata tidak sopan, penipuan)"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full h-32 bg-gray-50 rounded-2xl p-5 text-sm font-bold text-gray-700 border-none focus:ring-2 focus:ring-red-500 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 px-4">
                            <button 
                                disabled={!reportReason.trim()}
                                onClick={() => {
                                    if (activeChat && user?.email) {
                                      const otherEmail = activeChat.participants.find((e: string) => e !== user.email);
                                      const otherUser = activeChat.participantDetails?.[otherEmail] || { name: 'Unknown', role: 'unknown' };
                                      
                                      const reports = JSON.parse(localStorage.getItem('reports') || '[]');
                                      reports.push({
                                          id: Date.now().toString(),
                                          reportedEmail: otherEmail,
                                          reportedName: otherUser.name,
                                          reporterEmail: user.email,
                                          reason: reportReason.trim(),
                                          timestamp: Date.now()
                                      });
                                      localStorage.setItem('reports', JSON.stringify(reports));

                                      setToast({ message: 'Pengguna telah berhasil dilaporkan.', type: 'info' });
                                      setActiveModal(null);
                                      setReportReason('');
                                    }
                                }}
                                className={`w-full px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                                    reportReason.trim() 
                                    ? 'bg-red-500 text-white shadow-red-50 hover:bg-red-600' 
                                    : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
                                }`}
                            >
                                Kirim Laporan
                            </button>
                            <button 
                                onClick={() => {
                                    setActiveModal(null);
                                    setReportReason('');
                                }}
                                className="w-full px-4 py-4 bg-transparent text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-indigo-100/50 overflow-hidden h-full flex transition-all">
        {/* Sidebar */}
        <div className={`w-80 border-r border-gray-100 flex flex-col bg-white ${activeChat ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
          <div className="px-8 pt-8 pb-5 border-b border-gray-50">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-black text-gray-900 italic tracking-tight">Messages</h2>
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                   <MessageSquare className="w-4 h-4 text-indigo-600" />
                </div>
            </div>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search conversations..." 
                    className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
                        <MessageCircle className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Belum ada percakapan</p>
                </div>
            ) : chats.map((chat) => {
              const otherEmail = chat.participants.find((e: string) => e !== user.email);
              const otherUser = chat.participantDetails?.[otherEmail] || { name: 'User', role: 'unknown' };
              const isOnline = isUserOnline(otherEmail);
              const isOtherUserTyping = isTypingMap[`${chat.id}_${otherEmail}`];
              
              return (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full p-4 rounded-[1.5rem] text-left flex items-center transition-all group ${
                      activeChat?.id === chat.id 
                          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                          : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                <div className="relative mr-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                        activeChat?.id === chat.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                        {otherUser.name.charAt(0)}
                    </div>
                    {isOnline && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] transition-colors ${
                            activeChat?.id === chat.id ? 'bg-green-400 border-indigo-600' : 'bg-green-500 border-white'
                        }`}></div>
                    )}
                </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-0.5">
                        <h3 className={`font-black text-sm truncate tracking-tight mr-2 ${activeChat?.id === chat.id ? 'text-white' : 'text-gray-900'}`}>{otherUser.name}</h3>
                        <span className={`text-[10px] font-bold whitespace-nowrap shrink-0 ${activeChat?.id === chat.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                          {formatMessageTime(chat.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${activeChat?.id === chat.id ? 'text-indigo-100' : 'text-indigo-600'}`}>
                            {otherUser.role === 'seeker' ? 'Candidate' : 'Recruiter'}
                          </p>
                          <p className={`text-xs truncate ${activeChat?.id === chat.id ? 'text-indigo-100/80' : 'text-gray-400'}`}>
                            {isOtherUserTyping ? (
                                <i className="text-emerald-500 font-bold">sedang mengetik...</i>
                            ) : chat.isLastMsgDeleted || chat.isCleared ? (
                                <i>{chat.displayLastMsg}</i>
                            ) : (
                                chat.displayLastMsg
                            )}
                          </p>
                        </div>
                        {unreadCounts[chat.id] > 0 && (
                          <span className="shrink-0 bg-green-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                            {unreadCounts[chat.id]}
                          </span>
                        )}
                      </div>
                    </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50/20 backdrop-blur-3xl ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-white rounded-[2rem] border border-gray-100 shadow-xl flex items-center justify-center mb-8 transform -rotate-3 text-indigo-600">
                    <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 italic tracking-tight">
                    {role === 'seeker' ? 'Your inbox is empty' : 'Let\'s start reaching out'}
                </h3>
                <p className="text-gray-500 max-w-sm mb-10 leading-relaxed font-medium">
                    {role === 'seeker' 
                        ? 'No messages yet. Recruiters will contact you here if you are a match. Keep your profile updated to get noticed!' 
                        : 'Your inbox is empty. Start a conversation by visiting a candidate\'s profile and sending them a message.'}
                </p>
                
                {role === 'recruiter' && (
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-gray-200 hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
                    >
                        Cari Kandidat
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
                
                {role === 'seeker' && (
                    <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-indigo-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Waiting for initiation</span>
                    </div>
                )}
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header */}
              <div className="p-6 md:p-8 bg-white border-b border-gray-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                    <button 
                        onClick={() => setActiveChat(null)}
                        className="md:hidden p-2 -ml-2 mr-4 hover:bg-gray-100 rounded-2xl transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white mr-4 shadow-lg shadow-indigo-100">
                        {(activeChat.participantDetails?.[activeChat.participants.find((e: string) => e !== user.email)]?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-gray-900 tracking-tight">
                         {activeChat.participantDetails?.[activeChat.participants.find((e: string) => e !== user.email)]?.name || 'User'}
                       </h3>
                       <div className="flex items-center mt-1">
                            <span className={`w-2 h-2 rounded-full mr-2.5 ${isUserOnline(activeChat.participants.find((e: string) => e !== user.email)) ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">{isUserOnline(activeChat.participants.find((e: string) => e !== user.email)) ? 'Active Now' : 'Offline'}</span>
                       </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
                    <div className="relative" ref={optionsRef}>
                        <button 
                            onClick={() => setShowOptions(!showOptions)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                                showOptions ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 overflow-hidden"
                                >
                                    {role === 'recruiter' && (
                                        <button 
                                            onClick={handleViewResume}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors flex items-center gap-3"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            View Resume
                                        </button>
                                    )}
                                    {role !== 'seeker' && (
                                      <button 
                                          onClick={() => {
                                              setShowOptions(false);
                                              setActiveModal('interview');
                                          }}
                                          className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors flex items-center gap-3"
                                      >
                                          <LogIn className="w-4 h-4" />
                                          Schedule Interview
                                      </button>
                                    )}
                                    <div className="h-px bg-gray-50 my-1" />
                                    <button 
                                        onClick={() => {
                                            setShowOptions(false);
                                            setActiveModal('clear');
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Clear Chat
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowOptions(false);
                                            setActiveModal('report');
                                        }}
                                        className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-4 h-4" />
                                        Block/Report
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                         <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8" />
                         </div>
                         <p className="text-xs font-black uppercase tracking-widest italic">Conversation Encryption Active</p>
                    </div>
                ) : messages.map((msg, index) => {
                  const showDateSeparator = index === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[index - 1].timestamp).toDateString();
                  
                  return (
                  <div key={msg.id} className="space-y-8">
                    {showDateSeparator && (
                        <div className="flex justify-center my-4">
                            <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-center shadow-sm">
                                {formatDateSeparator(msg.timestamp)}
                            </span>
                        </div>
                    )}
                    {msg.id === firstUnreadMessageId && unreadCountForRoom > 0 && (
                        <div className="flex justify-center my-4">
                            <span className="bg-gray-800/60 backdrop-blur-sm text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest text-center shadow-sm">
                                {unreadCountForRoom} pesan belum dibaca
                            </span>
                        </div>
                    )}
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${msg.senderEmail === user?.email ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] md:max-w-[60%] ${msg.senderEmail === user?.email ? 'items-end' : 'items-start'} flex flex-col group relative`}>
                          {msg.isDeleted ? (
                                <div className={`p-4 md:p-5 rounded-3xl text-sm font-medium leading-relaxed italic ${
                                    msg.senderEmail === user?.email 
                                    ? 'bg-gray-100 text-gray-500 rounded-tr-none' 
                                    : 'bg-gray-50 text-gray-400 rounded-tl-none border border-gray-100'
                                }`}>
                                    🚫 Pesan ini telah dihapus
                                </div>
                          ) : (
                              <div className={`flex items-center gap-2 ${msg.senderEmail === user?.email ? 'flex-row-reverse' : ''}`}>
                                  <div className={`flex flex-col p-4 md:p-5 rounded-3xl text-sm font-medium leading-relaxed ${
                                      msg.senderEmail === user?.email 
                                      ? 'bg-gray-900 text-white rounded-tr-none shadow-xl shadow-gray-200' 
                                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-lg shadow-gray-50'
                                  }`}>
                                      {msg.replyTo && (() => {
                                          const localMsgs = JSON.parse(localStorage.getItem('chatMessages') || '[]');
                                          const originalMsg = localMsgs.find((m: any) => m.id === msg.replyTo.id);
                                          const isDeletedGlobally = originalMsg ? originalMsg.isDeleted : false;
                                          const replySenderName = msg.replyTo.senderEmail === user?.email ? 'You' : activeChat.participantDetails?.[msg.replyTo.senderEmail]?.name || 'User';
                                          
                                          return (
                                              <div className={`mb-3 px-3 py-2 border-l-4 rounded-xl text-xs flex flex-col ${
                                                  msg.senderEmail === user?.email 
                                                  ? 'bg-white/10 border-indigo-300' 
                                                  : 'bg-gray-50 border-indigo-500'
                                              }`}>
                                                  <span className={`font-black uppercase tracking-widest ${msg.senderEmail === user?.email ? 'text-indigo-200' : 'text-indigo-600'}`}>{replySenderName}</span>
                                                  <span className={`truncate mt-0.5 ${msg.senderEmail === user?.email ? 'text-white' : 'text-gray-500'} ${isDeletedGlobally ? 'italic' : ''}`}>
                                                      {isDeletedGlobally ? '🚫 Pesan ini telah dihapus' : msg.replyTo.text}
                                                  </span>
                                              </div>
                                          )
                                      })()}
                                      <span>{msg.text}</span>
                                  </div>
                                  <div className={`flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all ${msg.senderEmail === user?.email ? '' : ''}`}>
                                     <button 
                                         onClick={() => setReplyingTo(msg)}
                                         className="p-2 text-gray-400 hover:text-indigo-500 bg-white rounded-full shadow-sm hover:scale-110 shrink-0 border border-gray-100"
                                         title="Balas pesan"
                                     >
                                         <Reply className="w-4 h-4" />
                                     </button>
                                     {msg.senderEmail === user?.email && (
                                       <button 
                                           onClick={() => {
                                               setMessageToDelete(msg.id);
                                               setActiveModal('deleteMessage');
                                           }}
                                           className="p-2 text-gray-400 hover:text-red-500 bg-white rounded-full shadow-sm hover:scale-110 shrink-0 border border-gray-100"
                                           title="Hapus pesan"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                     )}
                                  </div>
                              </div>
                          )}
                          <div className={`flex items-center gap-2 mt-2 px-1 ${msg.senderEmail === user?.email ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  {msg.senderEmail === user?.email ? 'You' : (activeChat.participantDetails?.[msg.senderEmail]?.name || 'User')}
                              </span>
                              <span className="w-1 h-1 bg-gray-200 rounded-full" />
                              <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1">
                                  {formatMessageTime(msg.timestamp)}
                                  {msg.senderEmail === user?.email && !msg.isDeleted && (
                                      <CheckCheck className={`w-3.5 h-3.5 ${msg.isRead ? 'text-blue-500' : 'text-gray-400'}`} />
                                  )}
                              </span>
                          </div>
                      </div>
                    </motion.div>
                  </div>
                )})}
                {activeChat && (
                  (() => {
                     const otherE = activeChat.participants.find((e: string) => e !== user?.email);
                     return isTypingMap[`${activeChat.id}_${otherE}`] ? (
                       <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="flex items-center gap-2 mt-4 ml-3"
                         >
                            <span className="text-[11px] text-gray-400 font-medium italic bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                {activeChat.participantDetails?.[otherE]?.name} sedang mengetik...
                            </span>
                       </motion.div>
                     ) : null;
                  })()
                )}
              </div>

              {/* Input */}
              <div className="p-6 md:p-8 bg-white border-t border-gray-50 flex flex-col gap-3">
                  {replyingTo && (
                      <div className="mb-1 px-4 py-3 bg-indigo-50/50 border-l-4 border-indigo-500 rounded-xl flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black tracking-widest uppercase text-indigo-600 mb-1">
                                 Replying to {replyingTo.senderEmail === user?.email ? 'You' : activeChat?.participantDetails?.[replyingTo.senderEmail]?.name || 'User'}
                              </p>
                              <p className="text-xs text-indigo-900/70 truncate font-medium">
                                 {replyingTo.isDeleted ? '🚫 Pesan ini telah dihapus' : replyingTo.text}
                              </p>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="p-2 ml-4 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors shrink-0">
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  {role === 'recruiter' && (
                      <div className="-mx-6 md:-mx-8 px-6 md:px-8 overflow-x-auto overflow-y-visible scrollbar-hide py-1">
                          <div className="flex items-center gap-2">
                              {['Halo, CV Anda sedang kami review.', 'Mohon tunggu informasi selanjutnya.', 'Apakah Anda bersedia untuk interview online?'].map((template, i) => (
                                  <button
                                      key={i}
                                      onClick={() => {
                                          setInput(template);
                                      }}
                                      className="shrink-0 px-4 py-2 border border-gray-200 bg-white text-gray-500 text-[11px] font-bold rounded-full hover:border-indigo-200 hover:text-indigo-600 transition-all whitespace-nowrap shadow-sm hover:shadow"
                                  >
                                      {template}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                <div className="flex items-center space-x-4 bg-gray-50 rounded-[2rem] p-3 pl-6 border border-gray-100 focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        placeholder="Write a message..."
                        className="flex-1 bg-transparent py-4 outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400"
                        value={input}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (activeChat && user?.email) {
                                try {
                                    const typingData = JSON.parse(localStorage.getItem('matchwork_typing') || '{}');
                                    typingData[`${activeChat.id}_${user.email}`] = Date.now();
                                    localStorage.setItem('matchwork_typing', JSON.stringify(typingData));
                                } catch (e) {}
                            }
                        }}
                    />
                    <button 
                       onClick={() => handleSend()}
                       className="bg-indigo-600 p-4 rounded-2xl text-white hover:bg-orange-600 transition-all shadow-xl shadow-indigo-100 hover:shadow-orange-100 hover:-translate-y-1 active:scale-95 group"
                    >
                        <Send className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                    <Shield className="w-3 h-3" />
                    End-to-end Encrypted Private Channel
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
