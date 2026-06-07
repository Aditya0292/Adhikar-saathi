import { useState, ReactNode } from 'react';
import { Search, Bell, Home, HelpCircle, Users, FileText, Settings, User, LogOut, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Find a Lawyer', icon: Users, path: '/lawyers' },
    { label: 'Legal Doc Scanner', icon: FileText, path: '/documents' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  const desktopNavItems = [
    { label: 'Quick Answer', icon: HelpCircle, path: '/dashboard' },
    { label: 'Verified Response', icon: Search, path: '/verified' },
    { label: 'Find a Lawyer', icon: Users, path: '/lawyers' },
    { label: 'Legal Doc Scanner', icon: FileText, path: '/documents' },
    { label: 'Query History', icon: FileText, path: '/history' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  let role = user?.app_metadata?.user_role || user?.user_metadata?.role || 'User';
  
  if (role === 'admin') {
    desktopNavItems.push({ label: 'Admin Panel', icon: ShieldCheck, path: '/admin/verify' });
    navItems.push({ label: 'Admin', icon: ShieldCheck, path: '/admin/verify' });
  }

  let displayName = 'User';
  
  if (user?.user_metadata?.full_name) {
    displayName = user.user_metadata.full_name;
  } else if (user?.email) {
    displayName = user.email.split('@')[0];
  }
  
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="h-[100svh] bg-nyaya-warm font-sans flex overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-black/8 h-full flex-shrink-0 z-40 transition-all duration-300 relative ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
        
        {/* Floating Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-6 -right-3 w-6 h-6 bg-white border border-black/10 rounded-full flex items-center justify-center text-nyaya-muted hover:text-nyaya-text-dark shadow-sm hover:shadow-md transition-all z-50 cursor-pointer focus:outline-none"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header */}
        <div className={`p-4 border-b border-black/5 flex flex-col gap-6 ${isCollapsed ? 'items-center' : ''}`}>
          <Link to="/" className={`font-serif font-semibold text-nyaya-text-dark flex items-center gap-2 text-xl tracking-tight ${isCollapsed ? 'justify-center' : ''}`}>
            <img src="/logo.png" alt="Adhikar साथी Logo" className="h-7 w-auto object-contain" /> 
            {!isCollapsed && <span className="transition-opacity duration-300">Adhikar साथी</span>}
          </Link>
          
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-nyaya-green-bright text-nyaya-dark flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col w-full overflow-hidden transition-opacity duration-300">
                <span className="text-sm font-semibold text-nyaya-text-dark truncate">{displayName}</span>
                <span className="text-[10px] uppercase tracking-wider text-nyaya-muted font-bold bg-black/5 px-2 py-0.5 rounded inline-block w-max mt-1">
                  {role}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className={`flex-1 py-6 space-y-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {desktopNavItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-nyaya-green/10 text-nyaya-green border-r-2 border-nyaya-green-bright rounded-r-none' 
                    : 'text-nyaya-muted hover:bg-black/5 hover:text-nyaya-text-dark'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Card & Sign Out */}
        <div className="p-4 mt-auto">
          {!isCollapsed && (
            <div className="bg-nyaya-green rounded-xl p-4 text-nyaya-text shadow-xl shadow-nyaya-green/10 relative overflow-hidden mb-4 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Search size={40} /></div>
              <h4 className="font-semibold text-sm mb-1 text-white relative z-10">Upgrade to Premium</h4>
              <p className="text-[11px] text-nyaya-muted leading-tight mb-3 relative z-10">₹99/month for unlimited Verified Mode queries.</p>
              <button className="w-full py-2 bg-nyaya-green-bright text-nyaya-dark text-xs font-bold rounded-lg hover:bg-white transition-colors relative z-10">
                Upgrade Now
              </button>
            </div>
          )}
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 py-2.5 text-xs font-semibold text-nyaya-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors justify-center"
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={14} className="flex-shrink-0" /> 
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Bar */}
        <header className="h-16 bg-nyaya-warm md:bg-white/50 backdrop-blur-md md:border-b border-black/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center">
            <Link to="/dashboard" className="font-serif font-bold text-nyaya-text-dark text-lg flex items-center gap-1.5">
              <img src="/logo.png" alt="Adhikar साथी Logo" className="h-6 w-auto object-contain" />
              <span>Adhikar साथी</span>
            </Link>
          </div>

          {/* Search */}
          <div className={`hidden md:flex items-center bg-white border ${searchFocused ? 'border-nyaya-green ring-1 ring-nyaya-green/20' : 'border-black/10'} rounded-lg px-3 py-1.5 w-96 transition-all`}>
            <Search size={16} className={searchFocused ? 'text-nyaya-green' : 'text-nyaya-muted'} />
            <input 
              type="text" 
              placeholder="Ask a legal question..." 
              className="w-full pl-2 bg-transparent text-sm font-sans outline-none text-nyaya-text-dark placeholder-nyaya-muted"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="text-[10px] text-nyaya-muted border border-black/10 rounded px-1.5 py-0.5 ml-2 font-mono">⌘K</div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="text-nyaya-muted hover:text-nyaya-text-dark transition-colors relative p-2 min-h-[44px]">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <button className="hidden md:flex items-center gap-2 text-nyaya-text-dark font-medium text-sm p-1 pr-3 border border-transparent hover:border-black/10 rounded-full transition-colors min-h-[44px]">
              <div className="w-8 h-8 rounded-full bg-nyaya-green/10 flex items-center justify-center">
                <User size={16} className="text-nyaya-green" />
              </div>
              <ChevronDownIcon />
            </button>
          </div>
        </header>

        {/* Main Content scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (App Shell only) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-black/10 flex justify-between items-center px-6 py-2 pb-safe z-40">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] ${isActive ? 'text-nyaya-green' : 'text-nyaya-muted'}`}
            >
              <item.icon size={20} className="mb-1" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
