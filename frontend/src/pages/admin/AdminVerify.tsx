import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NyayaButton } from '../../components/ui/NyayaButton';
import { 
  ShieldCheck, Clock, FileText, CheckCircle, 
  LayoutDashboard, Settings, AlertCircle, Eye, Info, LogOut
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type LawyerItem = {
  id: string;
  full_name: string;
  email: string;
  bar_enrollment_number: string;
  state_bar_council: string;
  enrollment_year: number;
  experience_years: number;
  specialisations: string[];
  city: string;
  state: string;
  government_id_type: string;
  government_id_last4: string;
  verification_status: string;
  days_waiting: number;
  enrollment_certificate_url: string | null;
  certificate_of_practice_url: string | null;
  government_id_url: string | null;
};

type Stats = {
  pending_count: number;
  under_review_count: number;
  verified_this_week: number;
  avg_review_time_hours: number;
};

export default function AdminVerify() {
  const { session, signOut } = useAuth();
  const token = session?.access_token;
  
  const [activeTab, setActiveTab] = useState('pending');
  const [lawyers, setLawyers] = useState<LawyerItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [verifyModalLawyer, setVerifyModalLawyer] = useState<LawyerItem | null>(null);
  const [rejectModalLawyer, setRejectModalLawyer] = useState<LawyerItem | null>(null);
  const [infoModalLawyer, setInfoModalLawyer] = useState<LawyerItem | null>(null);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/admin/lawyers/pending?status=${activeTab}&page=1&page_size=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLawyers(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/platform-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats({
        pending_count: data.verification_funnel.pending,
        under_review_count: data.verification_funnel.under_review,
        verified_this_week: data.verification_funnel.verified_this_month, // using month for now
        avg_review_time_hours: 6.5, // Mocked for UI
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLawyers();
      fetchStats();
    }
  }, [activeTab, token]);

  const handleApprove = async (id: string) => {
    // Optimistic UI update
    setVerifyModalLawyer(null);
    setLawyers(prev => prev.filter(l => l.id !== id));
    
    try {
      await fetch(`${API_BASE}/api/v1/admin/lawyers/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStats();
    } catch (err) {
      console.error(err);
      fetchLawyers(); // revert on failure
    }
  };

  const handleReject = async (id: string, reason: string) => {
    // Optimistic UI update
    setRejectModalLawyer(null);
    setLawyers(prev => prev.filter(l => l.id !== id));

    try {
      await fetch(`${API_BASE}/api/v1/admin/lawyers/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      fetchStats();
    } catch (err) {
      console.error(err);
      fetchLawyers(); // revert on failure
    }
  };

  const handleRequestInfo = async (id: string, message: string) => {
    // Optimistic UI update
    setInfoModalLawyer(null);
    if (activeTab === "pending") {
      setLawyers(prev => prev.filter(l => l.id !== id));
    }

    try {
      await fetch(`${API_BASE}/api/v1/admin/lawyers/${id}/request-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message })
      });
      fetchStats();
    } catch (err) {
      console.error(err);
      fetchLawyers(); // revert on failure
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-nyaya-dark flex flex-col">
        <div className="p-6">
          <Link to="/" className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-xl">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-6 w-auto object-contain brightness-0 invert" />
            <span>NyayaSatya</span>
          </Link>
          <div className="mt-2 text-xs font-medium text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded w-max">
            ⚙ Admin Panel
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-6">
          <Link to="/admin/verify" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-nyaya-green-bright/10 text-nyaya-green-bright font-medium text-sm transition-colors">
            <ShieldCheck size={18} /> Verify Lawyers
          </Link>
          <Link to="/admin/stats" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-nyaya-muted hover:text-nyaya-text hover:bg-white/5 font-medium text-sm transition-colors">
            <LayoutDashboard size={18} /> Platform Stats
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-nyaya-muted font-medium text-sm opacity-50 cursor-not-allowed">
            <Settings size={18} /> Settings
          </div>
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 py-2.5 px-3 text-sm font-medium text-nyaya-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900 font-serif mb-4">Lawyer Verification Queue</h1>
          
          <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            <StatCard icon={<Clock className="text-amber-500" size={16} />} label="Pending" value={stats?.pending_count ?? '-'} />
            <StatCard icon={<Eye className="text-blue-500" size={16} />} label="Under Review" value={stats?.under_review_count ?? '-'} />
            <StatCard icon={<CheckCircle className="text-green-500" size={16} />} label="Verified this week" value={stats?.verified_this_week ?? '-'} />
            <StatCard icon={<Info className="text-purple-500" size={16} />} label="Avg review time" value={`${stats?.avg_review_time_hours ?? '-'}h`} />
          </div>
        </header>

        {/* Tab Filter Bar */}
        <div className="px-8 pt-6 border-b border-slate-200 flex gap-6">
          {['pending', 'under_review', 'verified', 'rejected', 'all'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-medium text-sm capitalize transition-colors relative ${activeTab === tab ? 'text-nyaya-green' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.replace('_', ' ')}
              {activeTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-nyaya-green" />
              )}
            </button>
          ))}
        </div>

        {/* Lawyer List */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-nyaya-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : lawyers.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-500">No pending applications in the queue.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lawyers.map(lawyer => (
                <LawyerCard 
                  key={lawyer.id} 
                  lawyer={lawyer} 
                  onVerify={() => setVerifyModalLawyer(lawyer)}
                  onReject={() => setRejectModalLawyer(lawyer)}
                  onRequestInfo={() => setInfoModalLawyer(lawyer)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {verifyModalLawyer && (
          <VerifyModal 
            lawyer={verifyModalLawyer} 
            onClose={() => setVerifyModalLawyer(null)}
            onConfirm={() => handleApprove(verifyModalLawyer.id)}
          />
        )}
        {rejectModalLawyer && (
          <RejectModal 
            lawyer={rejectModalLawyer} 
            onClose={() => setRejectModalLawyer(null)}
            onConfirm={(reason: string) => handleReject(rejectModalLawyer.id, reason)}
          />
        )}
        {infoModalLawyer && (
          <InfoModal 
            lawyer={infoModalLawyer} 
            onClose={() => setInfoModalLawyer(null)}
            onConfirm={(msg: string) => handleRequestInfo(infoModalLawyer.id, msg)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl whitespace-nowrap">
      {icon}
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="font-bold text-slate-900 ml-1">{value}</span>
    </div>
  );
}

function LawyerCard({ lawyer, onVerify, onReject, onRequestInfo }: { 
  lawyer: LawyerItem, onVerify: () => void, onReject: () => void, onRequestInfo: () => void 
}) {
  const [docsOpened, setDocsOpened] = useState<Record<string, boolean>>({});
  
  const hasMissingDoc = !lawyer.enrollment_certificate_url || !lawyer.government_id_url;

  const handleDocClick = (type: string, url: string | null) => {
    if (!url) return;
    window.open(url, '_blank');
    setDocsOpened(prev => ({ ...prev, [type]: true }));
  };

  return (
    <div className={`bg-white rounded-2xl border ${hasMissingDoc ? 'border-l-4 border-l-amber-500 border-amber-200' : 'border-slate-200'} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-nyaya-warm flex items-center justify-center font-bold text-nyaya-text-dark">
            {lawyer.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{lawyer.full_name}</h3>
            <p className="text-xs text-slate-500">{lawyer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            {lawyer.verification_status.replace('_', ' ')}
          </div>
          <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            lawyer.days_waiting < 2 ? 'bg-green-100 text-green-700' : 
            lawyer.days_waiting < 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
          }`}>
            {lawyer.days_waiting} days waiting
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><span className="text-xs text-slate-400 block mb-1">Bar Enrollment</span><span className="font-medium text-slate-800">{lawyer.bar_enrollment_number}</span></div>
        <div><span className="text-xs text-slate-400 block mb-1">State Council</span><span className="font-medium text-slate-800">{lawyer.state_bar_council}</span></div>
        <div><span className="text-xs text-slate-400 block mb-1">Experience</span><span className="font-medium text-slate-800">{lawyer.experience_years} Years ({lawyer.enrollment_year})</span></div>
        <div><span className="text-xs text-slate-400 block mb-1">Location</span><span className="font-medium text-slate-800">{lawyer.city}, {lawyer.state}</span></div>
        <div className="md:col-span-2"><span className="text-xs text-slate-400 block mb-1">Specialisations</span><span className="font-medium text-slate-800">{lawyer.specialisations?.join(', ')}</span></div>
        <div className="md:col-span-2"><span className="text-xs text-slate-400 block mb-1">Gov ID</span><span className="font-medium text-slate-800 capitalize">{lawyer.government_id_type?.replace('_', ' ')} (•••• {lawyer.government_id_last4})</span></div>
      </div>

      {/* Documents */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 overflow-x-auto">
        <DocButton 
          label="Enrollment Certificate" 
          url={lawyer.enrollment_certificate_url} 
          opened={docsOpened['enrollment']}
          onClick={() => handleDocClick('enrollment', lawyer.enrollment_certificate_url)}
        />
        <DocButton 
          label="Cert of Practice (AIBE)" 
          url={lawyer.certificate_of_practice_url} 
          opened={docsOpened['cop']}
          onClick={() => handleDocClick('cop', lawyer.certificate_of_practice_url)}
          isOptional={lawyer.enrollment_year < 2010}
        />
        <DocButton 
          label="Government ID" 
          url={lawyer.government_id_url} 
          opened={docsOpened['govid']}
          onClick={() => handleDocClick('govid', lawyer.government_id_url)}
        />
      </div>

      {/* Actions */}
      {lawyer.verification_status === 'pending' || lawyer.verification_status === 'under_review' ? (
        <div className="px-6 py-4 flex justify-between items-center border-t border-slate-100">
          <button onClick={onRequestInfo} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
            Request More Info
          </button>
          <div className="flex gap-3">
            <button onClick={onReject} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              Reject
            </button>
            <NyayaButton onClick={onVerify} className="py-2 px-6">
              Verify ✓
            </NyayaButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocButton({ label, url, opened, onClick, isOptional }: { label: string, url: string | null, opened: boolean, onClick: () => void, isOptional?: boolean }) {
  if (!url) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-100/50 text-slate-400 text-xs cursor-not-allowed" title="Not uploaded">
        <AlertCircle size={14} /> {label} {isOptional && '(N/A)'}
      </button>
    );
  }
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-medium transition-all ${
        opened ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-300 text-slate-700 hover:border-nyaya-green hover:text-nyaya-green'
      }`}
    >
      <FileText size={14} /> {label} {opened && '✓'}
    </button>
  );
}

// ── MODALS ─────────────────────────────────────────────────────────────

function VerifyModal({ lawyer, onClose, onConfirm }: any) {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  
  const requiresAibe = lawyer.enrollment_year >= 2010;
  const canSubmit = c1 && (c2 || !requiresAibe) && c3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-serif font-bold text-slate-900">Verify {lawyer.full_name}?</h2>
          <p className="text-sm text-slate-500 mt-2">You are confirming that you have reviewed the documents and they are valid. This will make their profile live.</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={c1} onChange={e=>setC1(e.target.checked)} className="mt-1 rounded text-nyaya-green focus:ring-nyaya-green" />
            <span className="text-sm text-slate-700">Bar Council Enrollment Certificate matches the enrollment number provided</span>
          </label>
          <label className={`flex items-start gap-3 ${!requiresAibe ? 'opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={c2 || !requiresAibe} disabled={!requiresAibe} onChange={e=>setC2(e.target.checked)} className="mt-1 rounded text-nyaya-green focus:ring-nyaya-green" />
            <span className="text-sm text-slate-700">Certificate of Practice is valid (or N/A for pre-2010 enrollment)</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={c3} onChange={e=>setC3(e.target.checked)} className="mt-1 rounded text-nyaya-green focus:ring-nyaya-green" />
            <span className="text-sm text-slate-700">Government ID matches name on enrollment certificate</span>
          </label>
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl">Cancel</button>
          <NyayaButton disabled={!canSubmit} onClick={onConfirm} className="px-6 py-2">Confirm Verification</NyayaButton>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({ lawyer, onClose, onConfirm }: any) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-serif font-bold text-slate-900">Reject {lawyer.full_name}'s application</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason for rejection (Required)</label>
            <textarea 
              value={reason} onChange={e=>setReason(e.target.value)} 
              placeholder="Explain what the lawyer needs to fix to reapply..." 
              className="w-full h-32 rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            />
            <div className="text-xs text-slate-500 mt-1 flex justify-between">
              <span>The lawyer will receive this reason.</span>
              <span className={reason.length < 20 ? 'text-red-500' : 'text-green-500'}>{reason.length}/500</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl">Cancel</button>
          <button disabled={reason.length < 20} onClick={() => onConfirm(reason)} className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Send Rejection →</button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoModal({ onClose, onConfirm }: any) {
  const [msg, setMsg] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-serif font-bold text-slate-900">Request more info</h2>
        </div>
        <div className="p-6">
          <textarea 
            value={msg} onChange={e=>setMsg(e.target.value)} 
            placeholder="What else do you need?" 
            className="w-full h-24 rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green outline-none"
          />
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl">Cancel</button>
          <NyayaButton disabled={msg.length < 20} onClick={() => onConfirm(msg)} className="px-6 py-2">Send Message</NyayaButton>
        </div>
      </motion.div>
    </div>
  );
}
