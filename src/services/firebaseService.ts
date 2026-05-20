import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    onSnapshot, 
    getDocs,
    serverTimestamp,
    orderBy,
    getDoc,
    setDoc,
    getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Job, UserProfile } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection test as per instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error Handling helper
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType,
        path,
        authInfo: {
            userId: auth.currentUser?.uid || 'anonymous',
            email: auth.currentUser?.email || 'none',
            emailVerified: auth.currentUser?.emailVerified || false,
            isAnonymous: auth.currentUser?.isAnonymous || false,
        }
    };
    console.error(`Firestore Error [${operationType}] at ${path}:`, JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
};

export const FirebaseService = {
  // Jobs
  async createJob(jobData: any) {
    try {
        const docRef = await addDoc(collection(db, 'jobs'), {
            ...jobData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) { handleFirestoreError(e, 'create', 'jobs'); }
  },

  async updateJob(jobId: string, jobData: any) {
    try {
        const docRef = doc(db, 'jobs', jobId);
        await updateDoc(docRef, jobData);
    } catch (e) { handleFirestoreError(e, 'update', `jobs/${jobId}`); }
  },

  async deleteJob(jobId: string) {
    try {
        await deleteDoc(doc(db, 'jobs', jobId));
    } catch (e) { handleFirestoreError(e, 'delete', `jobs/${jobId}`); }
  },

  subscribeToJobs(callback: (jobs: any[]) => void) {
    // Fetch all jobs. We'll sort in-memory to ensure jobs missing 'createdAt' are still included.
    const q = query(collection(db, 'jobs'));
    return onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Ensure we have a sortable date
          _sortDate: data.createdAt?.seconds || data.updatedAt?.seconds || 0
        };
      });
      // Sort desc by _sortDate
      jobs.sort((a, b) => b._sortDate - a._sortDate);
      callback(jobs);
    }, (error) => {
      handleFirestoreError(error, 'list', 'jobs');
    });
  },

  // Applications
  async applyToJob(applicationData: any) {
    try {
        // Anti-Spam: Check if already applied
        const existingQuery = query(
            collection(db, 'applications'), 
            where('jobId', '==', applicationData.jobId),
            where('seekerEmail', '==', applicationData.seekerEmail)
        );
        const existingDocs = await getDocs(existingQuery);
        if (!existingDocs.empty) {
            throw new Error('Anda sudah pernah mengajukan lamaran untuk posisi ini di perusahaan ini.');
        }

        const docRef = await addDoc(collection(db, 'applications'), {
            ...applicationData,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        
        // Centralized Increment: Update the job's applicantCount field
        const jobRef = doc(db, 'jobs', applicationData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
            const currentCount = jobSnap.data().applicantCount || 0;
            await updateDoc(jobRef, { applicantCount: currentCount + 1 });
        }

        // Also create a notification for the recruiter
        await addDoc(collection(db, 'notifications'), {
            userId: applicationData.recruiterId,
            title: 'New Application',
            desc: `${applicationData.seekerName} applied for ${applicationData.jobTitle || 'your job'}`,
            type: 'update',
            createdAt: serverTimestamp()
        });

        return docRef.id;
    } catch (e) { handleFirestoreError(e, 'create', 'applications'); }
  },

  subscribeToUserApplications(seekerEmail: string, callback: (apps: any[]) => void) {
    const q = query(collection(db, 'applications'), where('seekerEmail', '==', seekerEmail));
    return onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(apps);
    });
  },

  subscribeToJobApplications(jobId: string, callback: (apps: any[]) => void) {
    const q = query(collection(db, 'applications'), where('jobId', '==', jobId));
    return onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(apps);
    });
  },

  async deleteApplication(appId: string) {
    try {
        if (appId.startsWith('local-')) return; // Local-only apps skip Firebase
        
        const appRef = doc(db, 'applications', appId);
        const appSnap = await getDoc(appRef);
        
        if (appSnap.exists()) {
            const appData = appSnap.data();
            const jobId = appData.jobId;
            
            // 1. Delete the application
            await deleteDoc(appRef);
            
            // 2. Decrement the job's applicantCount field
            if (jobId) {
                const jobRef = doc(db, 'jobs', jobId);
                const jobSnap = await getDoc(jobRef);
                if (jobSnap.exists()) {
                    const currentCount = jobSnap.data().applicantCount || 0;
                    const newCount = Math.max(0, currentCount - 1);
                    await updateDoc(jobRef, { applicantCount: newCount });
                }
            }
        }
    } catch (e) { handleFirestoreError(e, 'delete', `applications/${appId}`); }
  },

  async updateApplicationStatus(appId: string, status: 'Approved' | 'Rejected') {
    try {
        if (appId.startsWith('stored-')) return; // Local-only apps skip Firebase
        const docRef = doc(db, 'applications', appId);
        await updateDoc(docRef, { status, updatedAt: serverTimestamp() });
    } catch (e) { 
        // Skip error handling for local-memory apps that might fail doc() call
        console.warn("Application status update on Firebase skipped or failed:", e);
    }
  },

  // User Profile
  async syncUserProfile(profile: UserProfile) {
    try {
        const docRef = doc(db, 'users', profile.id);
        await setDoc(docRef, { ...profile }, { merge: true });
    } catch (e: any) { 
        // If it's a permission error, it might be because auth failed above
        if (e.code === 'permission-denied') {
            console.warn("Sync failed: Permission denied. Some data might not persist in the cloud.");
            return;
        }
        handleFirestoreError(e, 'write', `users/${profile.id}`); 
    }
  },

  subscribeToUserProfile(userId: string, callback: (user: UserProfile) => void) {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as UserProfile);
      }
    });
  },

  async getUserProfile(userId: string) {
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as UserProfile;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, 'get', `users/${userId}`);
      return null;
    }
  },

  async updateUserProfile(userId: string, data: Partial<UserProfile>) {
    try {
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, data);
    } catch (e: any) { 
        if (e.code === 'permission-denied') {
            console.warn("Update failed: Permission denied. State will be local only.");
            return;
        }
        handleFirestoreError(e, 'update', `users/${userId}`); 
    }
  },

  // Notifications
  async createJobNotification(job: Job) {
    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'New Job Posted',
        desc: `${job.company} is hiring for ${job.title}`,
        type: 'match',
        targetRole: 'seeker', // Using targetRole to differentiate from user-specific
        createdAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, 'create', 'notifications'); }
  },

  subscribeToNotifications(userId: string, role: string, callback: (notifs: any[]) => void) {
    const q = query(
      collection(db, 'notifications'), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      // Filter in-memory for simplicity and to avoid complex OR queries requiring indexes for demo
      const filtered = allNotifs.filter(n => 
        n.userId === userId || n.targetRole === role
      );
      callback(filtered);
    });
  }
};
