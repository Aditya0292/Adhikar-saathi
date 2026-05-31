import { useState, useEffect } from 'react';
import { Star, MessageSquare, Reply, Send, Loader2 } from 'lucide-react';
import { api } from '../../../api/client';
import type { ReviewItem, ReviewSummary } from '../../../types/lawyer-dashboard';

// ── Mock Data ──
const MOCK_SUMMARY: ReviewSummary = {
  avg_rating: 4.8,
  total_reviews: 24,
  distribution: [
    { stars: 5, count: 18 },
    { stars: 4, count: 4 },
    { stars: 3, count: 1 },
    { stars: 2, count: 1 },
    { stars: 1, count: 0 },
  ]
};

const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'rev1',
    rating: 5,
    text: 'Advocate Priya was incredibly helpful during my property dispute. She explained all the legal jargon in simple terms and helped me secure my rights. Highly recommended.',
    category: 'property',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    client_name: 'Rahul',
    reply: 'Thank you for your kind words, Rahul. I am glad we could resolve the matter smoothly.',
    replied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'rev2',
    rating: 4,
    text: 'Very professional and knowledgeable. The consultation started a bit late, but the advice given was solid and actionable.',
    category: 'civil',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    client_name: 'Sneha',
  },
  {
    id: 'rev3',
    rating: 5,
    text: 'Best lawyer I have spoken to on this platform. Completely clear, empathetic, and strategic.',
    category: 'family',
    created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
    client_name: 'Anjali',
  }
];

export function Reviews() {
  const [summary, setSummary] = useState<ReviewSummary>(MOCK_SUMMARY);
  const [reviews, setReviews] = useState<ReviewItem[]>(MOCK_REVIEWS);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/api/v1/lawyers/me/reviews');
        if (data && data.summary) setSummary(data.summary);
        if (data && data.reviews && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      } catch {
        // Use mock
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#6B7A6E]">
        <Loader2 className="animate-spin text-[#1B4332] mb-3" size={28} />
        <span className="text-sm font-medium">Loading reviews...</span>
      </div>
    );
  }

  const handleReplySubmit = async (reviewId: string) => {
    if (replyText.length < 5) return;
    setIsSubmitting(true);
    try {
      await api.post(`/api/v1/lawyers/me/reviews/${reviewId}/reply`, { reply: replyText });
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, reply: replyText, replied_at: new Date().toISOString() } : r
      ));
      setReplyingTo(null);
      setReplyText('');
    } catch {
      // Opt. error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif font-bold text-2xl text-[#1A1F1B]">Client Reviews</h2>
          <p className="text-sm text-[#6B7A6E]">Build trust by responding to client feedback.</p>
        </div>
        <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-black/10 rounded-xl text-sm font-semibold text-[#1A1F1B] hover:bg-black/5 transition-colors cursor-pointer shadow-sm">
          <MessageSquare size={16} /> Request Reviews
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm flex flex-col md:flex-row gap-8 items-center">
        {/* Left: Big Number */}
        <div className="flex flex-col items-center justify-center md:border-r border-black/5 md:pr-8 min-w-[150px]">
          <span className="text-5xl font-bold text-[#1A1F1B] mb-2">{summary.avg_rating.toFixed(1)}</span>
          <div className="flex gap-1 mb-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star 
                key={s} 
                size={16} 
                className={s <= Math.round(summary.avg_rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-black/10'} 
              />
            ))}
          </div>
          <span className="text-xs text-[#6B7A6E] font-medium">{summary.total_reviews} total reviews</span>
        </div>

        {/* Right: Distribution Bars */}
        <div className="flex-1 w-full space-y-2">
          {summary.distribution.map(d => {
            const pct = summary.total_reviews > 0 ? (d.count / summary.total_reviews) * 100 : 0;
            return (
              <div key={d.stars} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-right font-medium text-[#1A1F1B]">{d.stars} ★</span>
                <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#C9A84C] rounded-full" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
                <span className="w-8 text-xs text-[#6B7A6E]">{d.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-black/10 rounded-xl text-sm font-semibold text-[#1A1F1B] shadow-sm">
        <MessageSquare size={16} /> Request Reviews from Past Clients
      </button>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-2xl border border-black/8 p-5 shadow-sm">
            {/* Review Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star 
                    key={s} 
                    size={14} 
                    className={s <= review.rating ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-black/10'} 
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#6B7A6E]">
                {new Date(review.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Review Body */}
            <p className="text-sm text-[#1A1F1B] leading-relaxed mb-3">"{review.text}"</p>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-[#1A1F1B]">{review.client_name || 'Anonymous Client'}</span>
              {review.category && (
                <span className="text-[10px] uppercase tracking-wider text-[#6B7A6E] bg-black/5 px-2 py-0.5 rounded font-semibold">
                  {review.category}
                </span>
              )}
            </div>

            {/* Reply Section */}
            {review.reply ? (
              <div className="bg-[#F7F5F0] rounded-xl p-4 ml-4 md:ml-8 border-l-2 border-[#1B4332]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Reply size={14} className="text-[#1B4332]" />
                  <span className="text-xs font-bold text-[#1B4332]">Your Reply</span>
                  <span className="text-[10px] text-[#6B7A6E] ml-auto">
                    {review.replied_at && new Date(review.replied_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="text-sm text-[#1A1F1B] leading-relaxed">{review.reply}</p>
              </div>
            ) : replyingTo === review.id ? (
              <div className="bg-[#F7F5F0] rounded-xl p-4 ml-4 md:ml-8 border border-black/10">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a professional, public reply..."
                  rows={3}
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332] resize-none mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="px-3 py-1.5 text-xs font-semibold text-[#6B7A6E] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleReplySubmit(review.id)}
                    disabled={isSubmitting || replyText.length < 5}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4332] text-white text-xs font-bold rounded-lg hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Posting...' : <><Send size={12} /> Post Reply</>}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#2D6A4F] hover:underline cursor-pointer py-1"
              >
                <Reply size={14} /> Reply Publicly
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
