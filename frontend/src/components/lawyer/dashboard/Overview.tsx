import { useState, useEffect } from 'react';
import {
  Eye, Inbox, TrendingUp, TrendingDown, Star, AlertTriangle,
  ChevronRight, Shield, ArrowUpRight, Info, Loader2
} from 'lucide-react';
import { api } from '../../../api/client';
import type {
  LawyerProfile, DashboardStats, DashboardTab,
  ActivityItem, RankingInsight
} from '../../../types/lawyer-dashboard';

// ── Mock Data ──
const MOCK_STATS: DashboardStats = {
  profile_views: 47,
  profile_views_delta: 12,
  pending_requests: 3,
  response_rate: 87,
  avg_rating: 4.6,
  total_reviews: 23,
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: '1', icon: '👁', text: 'A user in Mumbai viewed your profile', timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: '2', icon: '📥', text: 'New client request from a consumer law query', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', icon: '⭐', text: 'Rajan M. left a 5★ review', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', icon: '🔍', text: 'Your profile appeared in 8 searches today', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '5', icon: '📥', text: 'New client request for property dispute', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '6', icon: '👁', text: 'A user in Pune viewed your profile', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
];

const MOCK_RANKING: RankingInsight = {
  rank: 3,
  total: 24,
  city: 'Mumbai',
  specialisation: 'Criminal Law',
  factors: [
    { label: 'Verified profile', status: 'good', detail: '✓ Verified', weight: 'high', tip: 'Your profile is verified — highest trust signal.' },
    { label: 'Response rate', status: 'good', detail: '87%', weight: 'high', tip: 'Maintain above 80% for top ranking.' },
    { label: 'Availability', status: 'warning', detail: 'Often off', weight: 'medium', tip: 'Toggle availability on more often to get matched.' },
    { label: 'Rating', status: 'good', detail: '4.6 ★', weight: 'medium', tip: 'Keep delivering quality to maintain high ratings.' },
    { label: 'Profile photo', status: 'bad', detail: 'No photo', weight: 'low', tip: 'Profiles with photos get 3x more views.' },
  ],
};

interface OverviewProps {
  profile: LawyerProfile;
  onNavigate: (tab: DashboardTab) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function Overview({ profile, onNavigate }: OverviewProps) {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>(MOCK_ACTIVITY);
  const [ranking, setRanking] = useState<RankingInsight>(MOCK_RANKING);
  const [hoveredTip, setHoveredTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, a, r] = await Promise.all([
          api.get('/api/v1/lawyers/me/stats'),
          api.get('/api/v1/lawyers/me/activity'),
          api.get('/api/v1/lawyers/me/ranking'),
        ]);
        if (s) setStats(s);
        if (a && Array.isArray(a)) setActivity(a);
        if (r && r.rank) setRanking(r);
      } catch {
        // Fall back to mock stats on error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#6B7A6E]">
        <Loader2 className="animate-spin text-[#1B4332] mb-3" size={28} />
        <span className="text-sm font-medium">Loading dashboard overview...</span>
      </div>
    );
  }

  const rateColor = stats.response_rate >= 80 ? 'text-emerald-600' : stats.response_rate >= 60 ? 'text-amber-600' : 'text-red-500';
  const rateBarColor = stats.response_rate >= 80 ? 'bg-emerald-500' : stats.response_rate >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6">

      {/* ── Verification Banner (shown if not verified) ── */}
      {!profile.is_verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Your profile is under review</h3>
            <p className="text-xs text-amber-700 mt-1">
              You'll be notified within 24-48 hours. Until verified, your profile won't appear in search results.
            </p>
            <div className="flex gap-3 mt-3 text-xs">
              <span className={profile.enrollment_certificate_path ? 'text-emerald-600' : 'text-red-500'}>
                {profile.enrollment_certificate_path ? '✓' : '✗'} Enrollment Certificate
              </span>
              <span className={profile.government_id_path ? 'text-emerald-600' : 'text-red-500'}>
                {profile.government_id_path ? '✓' : '✗'} Government ID
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Views */}
        <StatCard
          label="Profile Views"
          value={stats.profile_views.toString()}
          sub="Users who viewed your profile"
          delta={stats.profile_views_delta}
          icon={<Eye size={18} className="text-[#2D6A4F]" />}
        />
        {/* Pending Requests */}
        <button onClick={() => onNavigate('requests')} className="text-left cursor-pointer">
          <StatCard
            label="Client Requests"
            value={stats.pending_requests.toString()}
            sub="Awaiting your response"
            icon={<Inbox size={18} className={stats.pending_requests > 0 ? 'text-amber-500' : 'text-[#6B7A6E]'} />}
            highlight={stats.pending_requests > 0}
            clickable
          />
        </button>
        {/* Response Rate */}
        <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider">Response Rate</span>
            <TrendingUp size={18} className={rateColor} />
          </div>
          <div className={`text-3xl font-bold ${rateColor} mb-1`}>{stats.response_rate}%</div>
          <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all duration-700 ${rateBarColor}`} style={{ width: `${stats.response_rate}%` }} />
          </div>
          <span className="text-[10px] text-[#6B7A6E]">Respond faster to rank higher</span>
        </div>
        {/* Average Rating */}
        <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider">Avg Rating</span>
            <Star size={18} className="text-[#C9A84C]" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-[#1A1F1B]">{stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={12}
                  className={s <= Math.round(stats.avg_rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-black/10'}
                />
              ))}
            </div>
          </div>
          <span className="text-[10px] text-[#6B7A6E]">
            {stats.total_reviews > 0 ? `Based on ${stats.total_reviews} reviews` : 'No reviews yet'}
          </span>
        </div>
      </div>

      {/* ── Bottom Grid: Activity + Ranking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Activity (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-serif font-bold text-base text-[#1A1F1B]">Recent Activity</h3>
            <button className="text-[11px] font-semibold text-[#2D6A4F] hover:underline cursor-pointer flex items-center gap-0.5">
              See all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-0">
            {activity.map((item, i) => (
              <div key={item.id} className={`flex items-start gap-3 py-3 ${i < activity.length - 1 ? 'border-b border-black/5' : ''}`}>
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1F1B] leading-snug">{item.text}</p>
                  <span className="text-[10px] text-[#6B7A6E]">{timeAgo(item.timestamp)}</span>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-sm text-[#6B7A6E] text-center py-6">No recent activity yet.</p>
            )}
          </div>
        </div>

        {/* Ranking Insight (2/5) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-[#1B4332]" />
            <h3 className="font-serif font-bold text-base text-[#1A1F1B]">Your Platform Ranking</h3>
          </div>

          {/* Rank Badge */}
          <div className="bg-[#1B4332]/5 rounded-xl p-4 mb-5 text-center">
            <span className="text-4xl font-bold text-[#1B4332]">#{ranking.rank}</span>
            <p className="text-xs text-[#6B7A6E] mt-1">
              of {ranking.total} advocates in {ranking.city} for <span className="font-semibold capitalize">{ranking.specialisation}</span>
            </p>
          </div>

          {/* Factors */}
          <div className="space-y-2.5">
            {ranking.factors.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-black/[0.02] transition-colors relative"
                onMouseEnter={() => setHoveredTip(f.label)}
                onMouseLeave={() => setHoveredTip(null)}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    f.status === 'good' ? 'bg-emerald-500' :
                    f.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-[#1A1F1B]">{f.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    f.status === 'good' ? 'text-emerald-600' :
                    f.status === 'warning' ? 'text-amber-600' : 'text-red-500'
                  }`}>{f.detail}</span>
                  <span className="text-[9px] uppercase tracking-wide text-[#6B7A6E] bg-black/5 px-1.5 py-0.5 rounded">{f.weight}</span>
                </div>

                {/* Tooltip */}
                {hoveredTip === f.label && (
                  <div className="absolute right-0 -top-10 bg-[#1A1F1B] text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg z-10 whitespace-nowrap">
                    <Info size={10} className="inline mr-1" />{f.tip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Stat Card ──
function StatCard({
  label, value, sub, delta, icon, highlight, clickable
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number;
  icon: React.ReactNode;
  highlight?: boolean;
  clickable?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
      highlight ? 'border-amber-200 bg-amber-50/30' : 'border-black/8'
    } ${clickable ? 'hover:shadow-md hover:border-[#52B788]/30 cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-[#1A1F1B]">{value}</span>
        {delta !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {delta >= 0 ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <span className="text-[10px] text-[#6B7A6E]">{sub}</span>
    </div>
  );
}
