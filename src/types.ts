export type Role = 'seeker' | 'recruiter' | 'admin';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: Role;
  avatar?: string;
  isGuest?: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  language?: string;
  age?: number;
  twoFactorEnabled?: boolean;
  showOnlineStatus?: boolean;
  hasUploadedCV?: boolean;
  skills?: string[];
  fields?: string[];
  industry?: string;
  customLanguages?: string[];
  preferredCountry?: string;
  connectedDevices?: {
    id: string;
    name: string;
    lastActive: string;
    isCurrent: boolean;
  }[];
}

export interface SeekerProfile extends UserProfile {
  role: 'seeker';
  title: string;
  skills: string[];
  experience: string;
  education: string;
  resumeUrl?: string;
  preferences: {
    location: string;
    minSalary: number;
    remote: boolean;
  };
}

export interface RecruiterProfile extends UserProfile {
  role: 'recruiter';
  company: string;
  companyLogo?: string;
  industry: string;
  description: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  company: string;
  logo: string;
  title: string;
  location: string;
  salary: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  status: 'pending' | 'success' | 'rejected';
  description: string;
  requirements: string[];
  skills: string[];
  matchScore?: number;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  participants: [string, string];
  lastMessage?: string;
  updatedAt: string;
}
