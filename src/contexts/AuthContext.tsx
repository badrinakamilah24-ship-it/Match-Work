import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Role, UserProfile } from '../types';
import { FirebaseService, auth } from '../services/firebaseService';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  role: Role | null;
  setRole: (role: Role | null) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
  isGuest: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem('matchwork_role') as Role);
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('matchwork_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Presence Heartbeat
  useEffect(() => {
    if (!user?.email) return;

    const updatePresence = () => {
      try {
        const presence = JSON.parse(localStorage.getItem('matchwork_presence') || '{}');
        presence[user.email.toLowerCase()] = Date.now();
        localStorage.setItem('matchwork_presence', JSON.stringify(presence));
      } catch (e) {
        console.error("Presence update failed", e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 10000); // Every 10 seconds
    
    return () => {
      clearInterval(interval);
      // Optional: mark as offline on unmount/logout
      try {
        const presence = JSON.parse(localStorage.getItem('matchwork_presence') || '{}');
        delete presence[user.email.toLowerCase()];
        localStorage.setItem('matchwork_presence', JSON.stringify(presence));
      } catch (e) {}
    };
  }, [user?.email]);

  useEffect(() => {
    if (role) localStorage.setItem('matchwork_role', role);
    else localStorage.removeItem('matchwork_role');
  }, [role]);

  useEffect(() => {
    let unsubProfile = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we have a local session but no firebase user, try to sign in anonymously 
      // to maintain a session for firestore rules.
      let currentFirebaseUser = firebaseUser;
      
      if (!currentFirebaseUser && user && !user.isGuest) {
        try {
          const cred = await signInAnonymously(auth);
          currentFirebaseUser = cred.user;
        } catch (e) {
          console.warn("Auto-restore session failed", e);
        }
      }

      if (currentFirebaseUser) {
        // If we have a local user matching this UID, subscribe to their profile
        if (user && user.id === currentFirebaseUser.uid && !user.isGuest) {
          unsubProfile = FirebaseService.subscribeToUserProfile(user.id, (updatedUser) => {
            if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
              setUser(updatedUser);
            }
          });
        }
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubAuth();
      unsubProfile();
    };
  }, [user?.id]);

  useEffect(() => {
    const handleFirebaseSync = async () => {
      if (user) {
        localStorage.setItem('matchwork_user', JSON.stringify(user));
        
        // Only sync to Firestore if they are a real user (not guest)
        // AND if auth.currentUser matches (to prevent permission denied on first load)
        if (!user.isGuest && user.id && user.id !== 'guest' && auth.currentUser?.uid === user.id) {
          FirebaseService.syncUserProfile(user);
        }
      } else {
        localStorage.removeItem('matchwork_user');
      }
    };
    
    handleFirebaseSync();
  }, [user?.id, user?.firstName, user?.lastName, user?.location, user?.avatar, user?.skills, user?.fields]); // Sync on relevant changes

  useEffect(() => {
    const checkInvalidated = () => {
      if (user && user.email && role !== 'admin') {
        const invalidated = JSON.parse(localStorage.getItem('matchwork_invalidated_sessions') || '[]');
        if (invalidated.includes(user.email.toLowerCase())) {
          const updated = invalidated.filter((e: string) => e !== user.email.toLowerCase());
          localStorage.setItem('matchwork_invalidated_sessions', JSON.stringify(updated));
          logout();
        }
      }
    };

    checkInvalidated();
    const interval = setInterval(checkInvalidated, 2000);
    return () => clearInterval(interval);
  }, [user?.email, role]);

  const logout = () => {
    setRole(null);
    setUser(null);
    setIsLoading(false);
    localStorage.removeItem('matchwork_role');
    localStorage.removeItem('matchwork_user');
    localStorage.removeItem('matchwork_admin_session');
    // NOTE: recruiterJobs is NOT removed to persist job data across logins
    auth.signOut();
  };

  const isGuest = user?.isGuest || user?.id === 'guest';

  return (
    <AuthContext.Provider value={{ role, user, setRole, setUser, logout, isGuest, isLoading, setIsLoading, isAuthReady }}>
      {isAuthReady ? children : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest text-xs text-gray-400">
           Initializing Secure Session...
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
