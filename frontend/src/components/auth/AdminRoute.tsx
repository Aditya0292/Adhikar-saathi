import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-nyaya-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Read role from JWT claims
  const role = session.user?.app_metadata?.user_role ?? session.user?.user_metadata?.user_role;
  
  if (role !== 'admin') {
    // Never reveal that /admin exists to non-admins
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
