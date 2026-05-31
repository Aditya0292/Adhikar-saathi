import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Video, CheckCircle, XCircle, Clock, Users, Star, Loader2 } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';
import type { ConsultationItem, ConsultationStats } from '../../../types/lawyer-dashboard';
import { NyayaButton } from '../../ui/NyayaButton';
import { api } from '../../../api/client';

// ── Mock Data ──
const MOCK_STATS: ConsultationStats = {
  total_this_month: 14,
  completion_rate: 92,
  avg_duration_minutes: 45,
  revenue_this_month: 21000,
};

const MOCK_UPCOMING: ConsultationItem[] = [
  {
    id: 'c1',
    client_name: 'Vikram',
    category: 'Corporate',
    scheduled_at: new Date(Date.now() + 2 * 3600000).toISOString(),
    duration_minutes: 60,
    status: 'upcoming',
    notes: 'Drafting a partnership agreement for a new tech startup.'
  },
  {
    id: 'c2',
    client_name: 'Ananya',
    category: 'Family',
    scheduled_at: new Date(Date.now() + 26 * 3600000).toISOString(),
    duration_minutes: 30,
    status: 'upcoming',
  }
];

const MOCK_HISTORY: ConsultationItem[] = [
  {
    id: 'c3',
    client_name: 'Rahul',
    category: 'Property',
    scheduled_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    duration_minutes: 45,
    status: 'completed',
    review_rating: 5,
  },
  {
    id: 'c4',
    client_name: 'Sneha',
    category: 'Civil',
    scheduled_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    duration_minutes: 30,
    status: 'completed',
    review_rating: 4,
  },
  {
    id: 'c5',
    client_name: 'Amit',
    category: 'Taxation',
    scheduled_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    duration_minutes: 0,
    status: 'no_show',
  }
];

type SubTab = 'upcoming' | 'history';

export function Consultations() {
  const [activeTab, setActiveTab] = useState<SubTab>('upcoming');
  const [stats, setStats] = useState<ConsultationStats>(MOCK_STATS);
  const [upcoming, setUpcoming] = useState<ConsultationItem[]>(MOCK_UPCOMING);
  const [history, setHistory] = useState<ConsultationItem[]>(MOCK_HISTORY);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/v1/lawyers/me/consultations');
        if (data && Array.isArray(data)) {
          const up = data.filter((c: any) => c.status === 'upcoming');
          const hist = data.filter((c: any) => c.status === 'completed' || c.status === 'no_show');
          
          setUpcoming(up);
          setHistory(hist);
          
          const completed = data.filter((c: any) => c.status === 'completed');
          const total = data.length;
          const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 100;
          
          setStats({
            total_this_month: total,
            completion_rate: completionRate,
            avg_duration_minutes: 30,
            revenue_this_month: completed.length * 1500,
          });
        }
      } catch (err) {
        // use mocks
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // In real app, fetch from API
  
  const getSelectedDayConsultations = () => {
    if (!selectedDate) return [];
    return upcoming.filter(c => isSameDay(parseISO(c.scheduled_at), selectedDate));
  };

  const selectedConsultations = getSelectedDayConsultations();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-[#6B7A6E]">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading consultations...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header & Sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif font-bold text-2xl text-[#1A1F1B]">Consultations</h2>
          <p className="text-sm text-[#6B7A6E]">Manage your schedule and past sessions.</p>
        </div>
        
        <div className="flex bg-white border border-black/10 rounded-xl p-1 shadow-sm w-fit">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'upcoming' ? 'bg-[#1B4332] text-white' : 'text-[#6B7A6E] hover:text-[#1A1F1B]'
            }`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-[#1B4332] text-white' : 'text-[#6B7A6E] hover:text-[#1A1F1B]'
            }`}
          >
            History & Stats
          </button>
        </div>
      </div>

      {activeTab === 'upcoming' ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar View */}
          <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm h-fit">
            <style>{`
              .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #1B4332; margin: 0; }
              .rdp-day_selected { font-weight: bold; }
              .rdp-day_today { font-weight: bold; color: #1B4332; }
            `}</style>
            <DayPicker 
              mode="single" 
              selected={selectedDate} 
              onSelect={setSelectedDate}
              showOutsideDays
              modifiers={{
                hasConsultation: upcoming.map(c => parseISO(c.scheduled_at))
              }}
              modifiersStyles={{
                hasConsultation: { textDecoration: 'underline', textDecorationColor: '#1B4332', textUnderlineOffset: '4px' }
              }}
            />
          </div>

          {/* Day Agenda */}
          <div className="flex-1 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1A1F1B]">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h3>

            {selectedConsultations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/8 p-8 text-center shadow-sm">
                <CalendarIcon size={32} className="text-black/10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#1A1F1B]">No consultations scheduled</p>
                <p className="text-xs text-[#6B7A6E]">Enjoy your free time.</p>
              </div>
            ) : (
              selectedConsultations.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-l-4 border-l-[#1B4332]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[#1A1F1B]">{format(parseISO(c.scheduled_at), 'h:mm a')}</span>
                      <span className="text-xs text-[#6B7A6E]">• {c.duration_minutes} min</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#6B7A6E] bg-black/5 px-2 py-0.5 rounded font-semibold ml-2">
                        {c.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[10px] font-bold text-[#1B4332]">
                        {c.client_name[0]}
                      </div>
                      <span className="text-sm font-semibold text-[#1A1F1B]">{c.client_name}</span>
                    </div>
                    {c.notes && <p className="text-xs text-[#6B7A6E] mt-2 max-w-sm line-clamp-2">Note: {c.notes}</p>}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <NyayaButton variant="outline" size="sm" className="flex-1 sm:flex-none">
                      Prepare Notes
                    </NyayaButton>
                    <NyayaButton variant="primary" size="sm" className="flex-1 sm:flex-none gap-2">
                      <Video size={14} /> Join Call
                    </NyayaButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider mb-3 block">Total (Month)</span>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#1B4332]" />
                <span className="text-3xl font-bold text-[#1A1F1B]">{stats.total_this_month}</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider mb-3 block">Completion Rate</span>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                <span className="text-3xl font-bold text-[#1A1F1B]">{stats.completion_rate}%</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
              <span className="text-xs font-semibold text-[#6B7A6E] uppercase tracking-wider mb-3 block">Avg Duration</span>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                <span className="text-3xl font-bold text-[#1A1F1B]">{stats.avg_duration_minutes}m</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm bg-gradient-to-br from-[#1B4332] to-[#0A261A] text-white">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 block">Est. Revenue (Month)</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">₹{stats.revenue_this_month.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F7F5F0] text-xs uppercase text-[#6B7A6E] font-semibold border-b border-black/5">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {history.map(c => (
                    <tr key={c.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#1A1F1B]">
                        {format(parseISO(c.scheduled_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">{c.client_name}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] uppercase tracking-wider text-[#6B7A6E] bg-black/5 px-2 py-0.5 rounded font-semibold">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#6B7A6E]">{c.duration_minutes} min</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${
                          c.status === 'completed' ? 'text-emerald-600' : 
                          c.status === 'no_show' ? 'text-red-500' : 'text-[#6B7A6E]'
                        }`}>
                          {c.status === 'completed' && <CheckCircle size={12} />}
                          {c.status === 'no_show' && <XCircle size={12} />}
                          {c.status === 'completed' ? 'Completed' : c.status === 'no_show' ? 'No Show' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        {c.review_rating ? (
                          <div className="flex items-center gap-1 text-[#C9A84C] font-semibold text-xs bg-amber-50 px-2 py-1 rounded">
                            <Star size={12} fill="currentColor" /> {c.review_rating}
                          </div>
                        ) : (
                          <span className="text-xs text-black/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
