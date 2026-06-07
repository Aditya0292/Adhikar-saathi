// Touch file to clear TS cache
import { useState, useEffect, useRef } from 'react';
import {
  Filter, Clock, MapPin, Globe, CheckCircle,
  Send, X, Loader2, ChevronDown, Scale, Shield, Users, Briefcase, Home, ShoppingCart, Scroll, Building2, DollarSign, Laptop, Pin, Mail, AlertCircle, Phone
} from 'lucide-react';
import { api } from '../../../api/client';
import type { LawyerProfile, ClientRequest } from '../../../types/lawyer-dashboard';

// ── Category config ──
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  criminal:       { icon: Shield,         color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-100' },
  family:         { icon: Users,          color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-100' },
  labour:         { icon: Briefcase,      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100' },
  property:       { icon: Home,           color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100' },
  consumer:       { icon: ShoppingCart,   color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-100' },
  civil:          { icon: Scale,          color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-100' },
  constitutional: { icon: Scroll,         color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
  corporate:      { icon: Building2,      color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100' },
  taxation:       { icon: DollarSign,     color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  cyber:          { icon: Laptop,         color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
};

const getCat = (c: string) => CATEGORY_CONFIG[c.toLowerCase()] || { icon: Pin, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-100' };

// ── Mock Data ──
const MOCK_REQUESTS: ClientRequest[] = [
  {
    id: 'r1',
    category: 'criminal',
    situation_summary: 'User is asking about wrongful arrest. Detained for 6 hours without FIR being filed. Looking for guidance on legal options under criminal procedure code.',
    user_city: 'Mumbai',
    user_language: 'Hindi',
    urgency: 'urgent',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 46 * 3600000).toISOString(),
  },
  {
    id: 'r2',
    category: 'property',
    situation_summary: 'Dispute over ancestral property partition between siblings. Father passed away without a will. Three siblings claim equal share.',
    user_city: 'Pune',
    user_language: 'English',
    urgency: 'normal',
    status: 'pending',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 40 * 3600000).toISOString(),
  },
  {
    id: 'r3',
    category: 'labour',
    situation_summary: 'User was terminated from employment without notice or severance after 3 years of service. Seeking advice on filing a complaint under the Industrial Disputes Act.',
    user_city: 'Mumbai',
    user_language: 'Hindi',
    urgency: 'normal',
    status: 'pending',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
  },
  {
    id: 'r4',
    category: 'family',
    situation_summary: 'Inquiry about divorce proceedings and child custody rights. Married for 5 years, seeking mutual consent divorce.',
    user_city: 'Thane',
    user_language: 'Marathi',
    urgency: 'normal',
    status: 'responded',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    expires_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    responded_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    response_message: 'I have reviewed your situation...',
    user_email: 'client@example.com',
    user_phone: '+919898989898',
  },
];

type FilterStatus = 'all' | 'pending' | 'responded' | 'declined' | 'expired';

interface ClientRequestsProps {
  profile: LawyerProfile;
}

function useCountdown(expiresAt: string): string {
  const [display, setDisplay] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setDisplay('Expired');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [expiresAt]);

  return display;
}

export function ClientRequests({ profile }: ClientRequestsProps) {
  const [requests, setRequests] = useState<ClientRequest[]>(MOCK_REQUESTS);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [respondingTo, setRespondingTo] = useState<ClientRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('status', filter);
        if (categoryFilter) params.set('category', categoryFilter);
        const data = await api.get(`/api/v1/lawyers/me/requests?${params.toString()}`);
        if (active && data && Array.isArray(data)) {
          setRequests(data);
        }
      } catch {
        // Use mock data
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, categoryFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#6B7A6E]">
        <Loader2 className="animate-spin text-[#1B4332] mb-3" size={28} />
        <span className="text-sm font-medium">Loading client requests...</span>
      </div>
    );
  }

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (categoryFilter && r.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    return true;
  });

  const statusCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    responded: requests.filter(r => r.status === 'responded').length,
    expired: requests.filter(r => r.status === 'expired').length,
    declined: requests.filter(r => r.status === 'declined').length,
  };

  const handleDecline = async (id: string) => {
    try {
      await api.patch(`/api/v1/lawyers/me/requests/${id}/decline`, {});
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'declined' as const } : r));
    } catch {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'declined' as const } : r));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-black/8 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-[#6B7A6E] flex-shrink-0" />
          {(['all', 'pending', 'responded', 'expired', 'declined'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer capitalize ${
                filter === s
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-black/5 text-[#6B7A6E] hover:bg-black/10'
              }`}
            >
              {s === 'all' ? 'All' : s} ({statusCounts[s]})
            </button>
          ))}

          {/* Category Dropdown */}
          <div className="relative ml-auto">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none bg-black/5 text-[#6B7A6E] text-xs font-semibold pl-3 pr-7 py-1.5 rounded-full cursor-pointer border-0 focus:ring-1 focus:ring-[#1B4332]"
            >
              <option value="">All Categories</option>
              {Object.keys(CATEGORY_CONFIG).map(c => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7A6E] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Request Cards ── */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-black/8 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#1B4332]/5 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-[#1B4332]/30" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1F1B] mb-2">No requests found</h3>
            <p className="text-sm text-[#6B7A6E] max-w-sm mx-auto">
              Keep your availability on and your response rate high to receive more client requests.
            </p>
          </div>
        )}

        {filtered.map(req => (
          <RequestCard
            key={req.id}
            request={req}
            onRespond={() => setRespondingTo(req)}
            onDecline={() => handleDecline(req.id)}
          />
        ))}
      </div>

      {/* ── Respond Modal ── */}
      {respondingTo && (
        <RespondModal
          request={respondingTo}
          profile={profile}
          onClose={() => setRespondingTo(null)}
          onSubmitted={(updated) => {
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            setRespondingTo(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RequestCard
// ═══════════════════════════════════════════════════════════════
function RequestCard({
  request, onRespond, onDecline
}: {
  request: ClientRequest;
  onRespond: () => void;
  onDecline: () => void;
}) {
  const cat = getCat(request.category);
  const countdown = useCountdown(request.expires_at);
  const isExpired = countdown === 'Expired' || request.status === 'expired';
  const isPending = request.status === 'pending' && !isExpired;

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      request.urgency === 'urgent' && isPending ? 'border-red-200 ring-1 ring-red-100' : 'border-black/8'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${cat.color} ${cat.bg} ${cat.border}`}>
              <cat.icon size={10} /> {request.category}
            </span>
            {request.urgency === 'urgent' && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 animate-pulse flex items-center gap-1">
                <AlertCircle size={10} /> Urgent
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#6B7A6E]">{timeAgo(request.created_at)}</span>
            <StatusBadge status={isExpired ? 'expired' : request.status} />
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-[#1A1F1B] leading-relaxed mb-4">{request.situation_summary}</p>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-xs text-[#6B7A6E] mb-4">
          <span className="flex items-center gap-1"><MapPin size={12} /> {request.user_city}</span>
          <span className="flex items-center gap-1"><Globe size={12} /> {request.user_language}</span>
        </div>

        {/* Responded: Show contact details */}
        {request.status === 'responded' && (request.user_email || request.user_phone) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 space-y-1">
            <p className="text-xs font-semibold text-emerald-800 mb-1">Client Contact Details</p>
            {request.user_email && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <Mail size={12} /> {request.user_email}
              </p>
            )}
            {request.user_phone && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <Phone size={12} /> {request.user_phone}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center justify-between pt-3 border-t border-black/5">
            <div className="flex gap-2">
              <button
                onClick={onRespond}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold hover:bg-[#2D6A4F] transition-colors cursor-pointer"
              >
                <Send size={12} /> Accept & Respond
              </button>
              <button
                onClick={onDecline}
                className="px-4 py-2 rounded-xl text-[#6B7A6E] text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer border border-black/8"
              >
                Decline
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A6E] font-medium">
              <Clock size={11} />
              <span>Expires in: <span className="font-bold text-[#1A1F1B]">{countdown}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'NEW',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    responded: { label: 'RESPONDED', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    declined:  { label: 'DECLINED',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
    expired:   { label: 'EXPIRED',   cls: 'bg-red-50 text-red-500 border-red-200' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Respond Modal
// ═══════════════════════════════════════════════════════════════
function RespondModal({
  request, profile, onClose, onSubmitted
}: {
  request: ClientRequest;
  profile: LawyerProfile;
  onClose: () => void;
  onSubmitted: (updated: ClientRequest) => void;
}) {
  const cat = getCat(request.category);
  const [message, setMessage] = useState(
    `Namaste, I have reviewed your situation. Based on what you've described, you may have a valid claim under relevant provisions of ${request.category} law. I'd be happy to discuss this further at your convenience. Please feel free to contact me.`
  );
  const [fee, setFee] = useState(profile.fee_per_hour_inr);
  const [freeConsult, setFreeConsult] = useState(profile.offers_free_consultation);
  const [slots, setSlots] = useState<string[]>(['Tomorrow 10:00 AM', 'Tomorrow 3:00 PM']);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (message.length < 10) return;
    setSending(true);
    try {
      const res = await api.patch(`/api/v1/lawyers/me/requests/${request.id}/respond`, {
        message,
        availability_slots: slots.filter(Boolean),
        fee: freeConsult ? 0 : fee,
        free_consultation: freeConsult,
      });
      onSubmitted({
        ...request,
        status: 'responded',
        response_message: message,
        responded_at: new Date().toISOString(),
        user_email: res?.user_email || 'client@example.com',
        user_phone: res?.user_phone,
      });
    } catch {
      onSubmitted({
        ...request,
        status: 'responded',
        response_message: message,
        responded_at: new Date().toISOString(),
      });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="font-serif font-bold text-lg text-[#1A1F1B]">Respond to Client</h2>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border mt-1 inline-flex items-center gap-1 ${cat.color} ${cat.bg} ${cat.border}`}>
              <cat.icon size={10} /> {request.category}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer">
            <X size={18} className="text-[#6B7A6E]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Situation Summary */}
          <div className="bg-[#F7F5F0] rounded-xl p-3">
            <p className="text-xs text-[#6B7A6E] font-semibold mb-1">Client's Situation</p>
            <p className="text-sm text-[#1A1F1B] leading-relaxed">{request.situation_summary}</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-[#1A1F1B] mb-2 block">Your Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm text-[#1A1F1B] focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] outline-none resize-none"
            />
            <span className="text-[10px] text-[#6B7A6E]">{message.length} / 2000</span>
          </div>

          {/* Availability Slots */}
          <div>
            <label className="text-xs font-semibold text-[#1A1F1B] mb-2 block">Available Times</label>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={s}
                    onChange={e => {
                      const updated = [...slots];
                      updated[i] = e.target.value;
                      setSlots(updated);
                    }}
                    placeholder="e.g. Tomorrow 10:00 AM"
                    className="flex-1 border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
                  />
                  {slots.length > 1 && (
                    <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {slots.length < 3 && (
                <button
                  onClick={() => setSlots([...slots, ''])}
                  className="text-xs font-semibold text-[#2D6A4F] hover:underline cursor-pointer"
                >
                  + Add another slot
                </button>
              )}
            </div>
          </div>

          {/* Fee */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#1A1F1B] mb-2 block">Consultation Fee (₹)</label>
              <input
                type="number"
                value={freeConsult ? 0 : fee}
                onChange={e => setFee(Number(e.target.value))}
                disabled={freeConsult}
                className="w-full border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332] disabled:opacity-50"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input
                type="checkbox"
                checked={freeConsult}
                onChange={e => setFreeConsult(e.target.checked)}
                className="w-4 h-4 rounded border-black/20 text-[#1B4332] focus:ring-[#1B4332]"
              />
              <span className="text-xs font-semibold text-[#1A1F1B]">Free initial consultation</span>
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={sending || message.length < 10}
            className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending Response...' : 'Submit Response'}
          </button>
          <p className="text-[10px] text-[#6B7A6E] text-center">
            Submitting will reveal the client's contact details to you and notify them of your response.
          </p>
        </div>
      </div>
    </div>
  );
}
