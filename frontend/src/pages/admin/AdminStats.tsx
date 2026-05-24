import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LayoutDashboard, Settings, Activity, Users, FileText, CheckCircle, TrendingUp, AlertCircle, Zap, Cpu } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminStats() {
  const { session } = useAuth();
  const token = session?.access_token;
  
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/v1/admin/platform-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [token]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-nyaya-dark flex flex-col shrink-0">
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
          <Link to="/admin/verify" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-nyaya-muted hover:text-nyaya-text hover:bg-white/5 font-medium text-sm transition-colors">
            <ShieldCheck size={18} /> Verify Lawyers
          </Link>
          <Link to="/admin/stats" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-nyaya-green-bright/10 text-nyaya-green-bright font-medium text-sm transition-colors">
            <LayoutDashboard size={18} /> Platform Stats
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-nyaya-muted font-medium text-sm opacity-50 cursor-not-allowed">
            <Settings size={18} /> Settings
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900 font-serif mb-1">Platform Analytics</h1>
          <p className="text-sm text-slate-500">Overview of verification operations and system health.</p>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-nyaya-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : stats ? (
            <>
              {/* Row 1: Platform Health */}
              <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" /> Platform Health
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatBox label="Total Verified Lawyers" value={stats.platform_health.total_verified_lawyers} icon={<ShieldCheck className="text-nyaya-green" />} />
                  <StatBox label="Total Users" value={stats.platform_health.total_registered_users} icon={<Users className="text-blue-500" />} />
                  <StatBox label="Total Queries" value={stats.platform_health.total_queries} icon={<AlertCircle className="text-amber-500" />} />
                  <StatBox label="Docs Scanned" value={stats.platform_health.total_documents_scanned} icon={<FileText className="text-purple-500" />} />
                </div>
              </section>

              {/* Row 2: Verification Funnel */}
              <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-nyaya-green" /> Verification Funnel (This Month)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <StatBox label="Applied" value={stats.verification_funnel.applied_this_month} />
                  <StatBox label="Verified" value={stats.verification_funnel.verified_this_month} />
                  <StatBox label="Rejected" value={stats.verification_funnel.rejected_this_month} />
                  <StatBox label="Pending" value={stats.verification_funnel.pending} />
                  <StatBox label="Conversion" value={`${stats.verification_funnel.funnel_conversion_pct}%`} />
                </div>
              </section>

              {/* Row 3: Query Stats */}
              <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Query Engine (Today)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatBox label="Fast Mode" value={stats.query_stats.fast_mode_today} />
                  <StatBox label="Verified Mode" value={stats.query_stats.verified_mode_today} />
                  <StatBox label="Avg Latency" value={`${stats.query_stats.avg_latency_ms}ms`} />
                  <StatBox label="Hallucination Rejections" value={stats.query_stats.hallucination_rejections_today} icon={<Cpu className="text-red-500" />} />
                </div>
              </section>

              {/* Row 4: Recent Verifications */}
              <section>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle size={16} className="text-nyaya-green" /> Recent Verifications
                </h2>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-4">Advocate Name</th>
                        <th className="px-6 py-4">Bar Number</th>
                        <th className="px-6 py-4">City</th>
                        <th className="px-6 py-4">Time to Verify</th>
                        <th className="px-6 py-4">Date Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recent_verifications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No recent verifications.</td>
                        </tr>
                      ) : (
                        stats.recent_verifications.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{r.full_name}</td>
                            <td className="px-6 py-4 text-slate-600">{r.bar_enrollment_number}</td>
                            <td className="px-6 py-4 text-slate-600">{r.city}</td>
                            <td className="px-6 py-4 text-slate-600">{r.time_to_verify_hours}h</td>
                            <td className="px-6 py-4 text-slate-600">{new Date(r.verified_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="text-center p-12 text-red-500">Failed to load statistics.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string, value: string | number, icon?: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
