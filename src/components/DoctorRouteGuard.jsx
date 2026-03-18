import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const DoctorRouteGuard = ({ children }) => {
  const { profile, loading, session } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // If user is authenticated and has 'medico' role, redirect to their dashboard
  // regardless of which public route they are trying to access.
  if (session && profile?.role === 'medico') {
      // Prevent redirect loop if already on dashboard (though this guard shouldn't wrap dashboard routes)
      if (!location.pathname.startsWith('/medico/dashboard')) {
          return <Navigate to="/medico/dashboard/consultas" replace />;
      }
  }

  // Allow access for guests, patients, and admins (admins usually have their own guard, but can view public site)
  return children;
};

export default DoctorRouteGuard;