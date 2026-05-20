import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SeekerDashboard from './SeekerDashboard';
import RecruiterDashboard from './RecruiterDashboard';
import AdminDashboard from './admin/AdminDashboard';

export default function DashboardRouter() {
  const { role } = useAuth();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return role === 'seeker' ? <SeekerDashboard /> : <RecruiterDashboard />;
}
