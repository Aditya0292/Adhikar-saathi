import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { NyayaButton } from '../components/ui/NyayaButton';
import { Mail, Calendar, Shield, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  
  let displayName = 'User';
  if (user) {
    if (user.user_metadata?.full_name) {
      displayName = user.user_metadata.full_name;
    } else if (user.email) {
      displayName = user.email.split('@')[0];
    }
  }
  
  const initials = displayName.substring(0, 2).toUpperCase();
  const role = user?.user_metadata?.role || 'user';
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark mb-8">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Identity Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-nyaya-green/10 text-nyaya-green flex items-center justify-center font-bold text-3xl mb-4 border-4 border-white shadow-sm">
                {initials}
              </div>
              <h2 className="font-serif font-bold text-xl text-nyaya-text-dark">{displayName}</h2>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-black/5 rounded-full text-xs font-semibold text-nyaya-muted uppercase tracking-wider">
                <Shield size={12} /> {role}
              </div>
              
              <div className="w-full mt-6 space-y-4 pt-6 border-t border-black/5 text-left">
                <div className="flex items-center gap-3 text-sm text-nyaya-text-dark">
                  <Mail size={16} className="text-nyaya-muted" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-nyaya-text-dark">
                  <Calendar size={16} className="text-nyaya-muted" />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Plan */}
          <div className="md:col-span-2 space-y-6">
            
            <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-nyaya-text-dark mb-4 border-b border-black/5 pb-2">Current Plan</h3>
              <div className="flex items-center justify-between p-4 bg-nyaya-warm rounded-xl border border-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-nyaya-muted">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-nyaya-text-dark text-sm">Free Tier</h4>
                    <p className="text-xs text-nyaya-muted mt-0.5">Basic legal awareness queries</p>
                  </div>
                </div>
                <NyayaButton size="sm">Upgrade to Premium</NyayaButton>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-nyaya-text-dark mb-4 border-b border-black/5 pb-2">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/settings" className="p-4 border border-black/5 rounded-xl hover:bg-black/5 transition-colors group">
                  <h4 className="font-semibold text-nyaya-text-dark text-sm mb-1 group-hover:text-nyaya-green">Account Settings</h4>
                  <p className="text-xs text-nyaya-muted">Manage your language, password, and security.</p>
                </Link>
                <Link to="/history" className="p-4 border border-black/5 rounded-xl hover:bg-black/5 transition-colors group">
                  <h4 className="font-semibold text-nyaya-text-dark text-sm mb-1 group-hover:text-nyaya-green">Query History</h4>
                  <p className="text-xs text-nyaya-muted">Review your past legal questions and verified answers.</p>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
