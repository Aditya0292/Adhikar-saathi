import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import LawyerFinder from './pages/LawyerFinder';
import UserSignIn from './pages/auth/UserSignIn';
import UserSignUp from './pages/auth/UserSignUp';
import LawyerSignIn from './pages/auth/LawyerSignIn';
import LawyerRegister from './pages/auth/LawyerRegister';
import LawyerPendingPage from './pages/lawyer/LawyerPendingPage';
import LawyerDashboard from './pages/lawyer/LawyerDashboard';
import AdminVerify from './pages/admin/AdminVerify';
import AdminStats from './pages/admin/AdminStats';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import VerifiedAnswer from './pages/VerifiedAnswer';
import MyDocuments from './pages/MyDocuments';
import QueryHistory from './pages/QueryHistory';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/lawyers" element={<LawyerFinder />} />
          
          {/* User Auth Routes */}
          <Route path="/auth/signin" element={<UserSignIn />} />
          <Route path="/auth/signup" element={<UserSignUp />} />
          
          {/* Lawyer Auth Routes */}
          <Route path="/auth/lawyer/signin" element={<LawyerSignIn />} />
          <Route path="/auth/lawyer/register" element={<LawyerRegister />} />
          
          {/* Private User Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/verified" element={<ProtectedRoute><VerifiedAnswer /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><MyDocuments /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><QueryHistory /></ProtectedRoute>} />
          
          {/* Private Lawyer Routes (Should ideally have a LawyerProtectedRoute) */}
          <Route path="/lawyer/pending" element={<ProtectedRoute><LawyerPendingPage /></ProtectedRoute>} />
          <Route path="/lawyer/dashboard" element={<ProtectedRoute><LawyerDashboard /></ProtectedRoute>} />
          
          {/* Admin Route */}
          <Route path="/admin/verify" element={<AdminRoute><AdminVerify /></AdminRoute>} />
          <Route path="/admin/stats" element={<AdminRoute><AdminStats /></AdminRoute>} />
          
          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
