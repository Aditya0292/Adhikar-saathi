import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3, User, Inbox, Calendar, Star, Megaphone, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell, ExternalLink, Menu
} from 'lucide-react';
import { Overview } from '../../components/lawyer/dashboard/Overview';
import { ClientRequests } from '../../components/lawyer/dashboard/ClientRequests';
import { ProfileEditor } from '../../components/lawyer/dashboard/ProfileEditor';
import { Consultations } from '../../components/lawyer/dashboard/Consultations';
import { Reviews } from '../../components/lawyer/dashboard/Reviews';
import { Visibility } from '../../components/lawyer/dashboard/Visibility';
import type { DashboardTab, LawyerProfile } from '../../types/lawyer-dashboard';
import { api } from '../../api/client';
import { useNotifications } from '../../hooks/useNotifications';

// ── Mock profile for development ──
const MOCK_PROFILE: LawyerProfile = {
  id: 'mock-1',
  auth_id: 'mock-auth-1',
  full_name: 'Advocate Priya Sharma',
  email: 'priya@example.com',
  phone: '+919876543210',
  bio: 'Senior advocate specializing in criminal and family law with 12 years of experience across Bombay High Court.',
  specialisations: ['criminal', 'family'],
  court_jurisdictions: ['Bombay High Court', 'Mumbai City Civil Court'],
  experience_years: 12,
  languages: ['English', 'Hindi', 'Marathi'],
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  fee_per_hour_inr: 1500,
  offers_free_consultation: true,
  bar_enrollment_number: 'MH/2012/04521',
  state_bar_council: 'Bar Council of Maharashtra & Goa',
  enrollment_year: 2012,
  is_verified: true,
  verification_status: 'verified',
  is_available: true,
  profile_photo_url: undefined,
  enrollment_certificate_path: '/docs/enrollment.pdf',
  government_id_path: '/docs/aadhaar.pdf',
  government_id_type: 'aadhaar',
  government_id_last4: '4321',
};

const NAV_ITEMS: { tab: DashboardTab; label: string; icon: typeof BarChart3 }[] = [
  { tab: 'overview',      label: 'Overview',         icon: BarChart3 },
  { tab: 'requests',      label: 'Client Requests',  icon: Inbox },
  { tab: 'profile',       label: 'My Profile',       icon: User },
  { tab: 'consultations', label: 'Consultations',     icon: Calendar },
  { tab: 'reviews',       label: 'Reviews',           icon: Star },
  { tab: 'visibility',    label: 'Visibility',        icon: Megaphone },
  { tab: 'settings',      label: 'Settings',          icon: Settings },
];

const MOBILE_NAV: { tab: DashboardTab; label: string; icon: typeof BarChart3 }[] = [
  { tab: 'overview', label: 'Overview', icon: BarChart3 },
  { tab: 'requests', label: 'Requests', icon: Inbox },
  { tab: 'profile',  label: 'Profile',  icon: User },
  { tab: 'reviews',  label: 'Reviews',  icon: Star },
  { tab: 'settings', label: 'More',     icon: Menu },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function PlaceholderTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-xl font-semibold text-[#1A1F1B] mb-2">{title}</h2>
      <p className="text-[#6B7A6E]">{desc}</p>
    </div>
  );
}

export default function LawyerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'overview';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState<LawyerProfile>(MOCK_PROFILE);
  const [isAvailable, setIsAvailable] = useState(MOCK_PROFILE.is_available);
  const [showNotifications, setShowNotifications] = useState(false);
  const { signOut } = useAuth();
  
  // Realtime notifications
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const setActiveTab = (tab: DashboardTab) => {
    setSearchParams({ tab });
  };

  // Fetch real profile on mount (silent fallback to mock)
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/v1/lawyers/me/profile');
        if (data && data.id) {
          setProfile(data);
          setIsAvailable(data.is_available ?? true);
        }
      } catch {
        // Use mock profile
      }
    })();
  }, []);

  const toggleAvailability = async () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    try {
      await api.patch('/api/v1/lawyers/me/availability', { is_available: newVal });
    } catch {
      setIsAvailable(!newVal); // revert on failure
    }
  };

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const firstName = profile.full_name.split(' ').find(w => !['Advocate', 'Adv.', 'Dr.'].includes(w)) || profile.full_name.split(' ')[0];

  // ── Render Tab Content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview profile={profile} onNavigate={setActiveTab} />;
      case 'requests':
        return <ClientRequests profile={profile} />;
      case 'profile':
        return <ProfileEditor profile={profile} onProfileUpdate={setProfile} />;
      case 'consultations':
        return <Consultations />;
      case 'reviews':
        return <Reviews />;
      case 'visibility':
        return <Visibility />;
      case 'settings':
        return <PlaceholderTab title="Settings" desc="Account settings coming in Phase 3" />;
      default:
        return <Overview profile={profile} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-[100svh] bg-[#F7F5F0] font-sans flex overflow-hidden">

      {/* ═══ Desktop Sidebar ═══ */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-black/8 h-full flex-shrink-0 z-40 transition-all duration-300 relative ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 -right-3 w-6 h-6 bg-white border border-black/10 rounded-full flex items-center justify-center text-[#6B7A6E] hover:text-[#1A1F1B] shadow-sm hover:shadow-md transition-all z-50 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header: Avatar + Name */}
        <div className={`p-4 border-b border-black/5 flex flex-col gap-4 ${isCollapsed ? 'items-center' : ''}`}>
          <Link to="/" className={`font-serif font-semibold text-[#1A1F1B] flex items-center gap-2 text-xl tracking-tight ${isCollapsed ? 'justify-center' : ''}`}>
            <img src="/logo.png" alt="NyayaSatya" className="h-7 w-auto object-contain" />
            {!isCollapsed && <span>NyayaSatya</span>}
          </Link>

          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-11 h-11 rounded-full bg-[#52B788]/15 text-[#1B4332] flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 border-[#52B788]/30">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-[#1A1F1B] truncate">{profile.full_name}</span>
                {profile.is_verified && (
                  <span className="text-[10px] font-bold text-[#52B788] flex items-center gap-1 mt-0.5">
                    ✓ Verified Advocate
                  </span>
                )}
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {profile.specialisations.slice(0, 2).map(s => (
                    <span key={s} className="text-[9px] font-semibold uppercase tracking-wider bg-black/5 text-[#6B7A6E] px-1.5 py-0.5 rounded capitalize">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1B4332]/10 text-[#1B4332]'
                    : 'text-[#6B7A6E] hover:bg-black/5 hover:text-[#1A1F1B]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.tab === 'requests' && unreadCount > 0 && (
                  <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Availability + Public Profile Link */}
        <div className="p-4 mt-auto border-t border-black/5 space-y-3">
          {/* Availability Toggle */}
          <button
            onClick={toggleAvailability}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? (isAvailable ? 'Available' : 'Unavailable') : undefined}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
            {!isCollapsed && <span>{isAvailable ? 'Available Now' : 'Unavailable'}</span>}
          </button>

          {/* View Public Profile */}
          {!isCollapsed && (
            <Link
              to="/lawyers"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7A6E] hover:text-[#1B4332] transition-colors px-1"
            >
              <ExternalLink size={11} /> View my public profile →
            </Link>
          )}

          {/* Sign Out */}
          <button
            onClick={() => signOut()}
            className={`w-full flex items-center gap-2 py-2.5 text-xs font-semibold text-[#6B7A6E] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center">
            <Link to="/" className="font-serif font-bold text-[#1A1F1B] text-lg flex items-center gap-1.5">
              <img src="/logo.png" alt="NyayaSatya" className="h-6 w-auto" />
              <span>NyayaSatya</span>
            </Link>
          </div>

          {/* Desktop Greeting */}
          <div className="hidden md:block">
            <h1 className="font-serif text-lg font-bold text-[#1A1F1B]">
              {getGreeting()}, Advocate {firstName}
            </h1>
          </div>

          {/* Right: Availability (mobile) + Bell + Avatar */}
          <div className="flex items-center gap-3">
            {/* Mobile Availability Toggle */}
            <button
              onClick={toggleAvailability}
              className={`md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              {isAvailable ? 'ON' : 'OFF'}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#6B7A6E] hover:text-[#1A1F1B] transition-colors min-h-[44px] cursor-pointer"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40 md:bg-transparent" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl border border-black/10 shadow-xl overflow-hidden z-50">
                    <div className="flex items-center justify-between p-4 border-b border-black/5 bg-[#F7F5F0]">
                      <h3 className="font-serif font-bold text-sm text-[#1A1F1B]">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-[#1B4332] hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-[#6B7A6E]">
                          You're all caught up!
                        </div>
                      ) : (
                        <div className="divide-y divide-black/5">
                          {notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                if (!n.is_read) markAsRead(n.id);
                                setShowNotifications(false);
                                if (n.type === 'new_request') setActiveTab('requests');
                                if (n.type === 'review') setActiveTab('reviews');
                              }}
                              className={`p-4 hover:bg-black/[0.02] cursor-pointer transition-colors ${!n.is_read ? 'bg-[#1B4332]/5' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={`text-sm ${!n.is_read ? 'font-bold text-[#1A1F1B]' : 'font-medium text-[#1A1F1B]'}`}>
                                  {n.title}
                                </h4>
                                {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#1B4332] flex-shrink-0 mt-1" />}
                              </div>
                              <p className="text-xs text-[#6B7A6E] leading-relaxed mb-2">{n.body}</p>
                              <span className="text-[10px] text-[#6B7A6E] font-medium">
                                {new Date(n.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar */}
            <button className="hidden md:flex items-center gap-2 p-1 pr-3 border border-transparent hover:border-black/10 rounded-full transition-colors min-h-[44px]">
              <div className="w-8 h-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center">
                <User size={16} className="text-[#1B4332]" />
              </div>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* ═══ Mobile Bottom Navigation ═══ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-black/10 flex justify-between items-center px-4 py-2 pb-safe z-40">
        {MOBILE_NAV.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] relative cursor-pointer ${
                isActive ? 'text-[#1B4332]' : 'text-[#6B7A6E]'
              }`}
            >
              <item.icon size={20} className="mb-0.5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.tab === 'requests' && unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

