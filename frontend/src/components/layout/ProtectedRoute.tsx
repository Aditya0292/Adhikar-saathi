import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nyaya-warm flex items-center justify-center">
        <div className="animate-pulse flex items-center justify-center h-16 w-16 bg-nyaya-green/10 rounded-full">
          <img src="/logo.png" alt="Loading" className="h-7 w-auto object-contain" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect them to the login page, but save the current location they were
    // trying to go to when they were redirected.
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
