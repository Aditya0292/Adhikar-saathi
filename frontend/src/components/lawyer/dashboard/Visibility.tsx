import { useState } from 'react';
import { Sparkles, TrendingUp, Search, Eye, Check } from 'lucide-react';
import { NyayaButton } from '../../ui/NyayaButton';

const PLANS = [
  {
    id: 'listed',
    name: 'Basic Listed',
    price: 0,
    features: ['Standard search appearance', 'Basic profile details', 'Accept client requests'],
    current: true,
  },
  {
    id: 'featured',
    name: 'Featured Advocate',
    price: 1499,
    features: ['Priority in search results', 'Highlighted profile badge', 'Profile views analytics', 'Top 3 placement in local searches'],
    current: false,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Law Firm Partner',
    price: 4999,
    features: ['Everything in Featured', 'Multiple advocate accounts', 'API access for leads', 'Dedicated account manager'],
    current: false,
  }
];

export function Visibility() {
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  const handleUpgrade = (planId: string) => {
    setUpgradingTo(planId);
    // Placeholder for Razorpay integration
    setTimeout(() => {
      alert(`Razorpay checkout for ${planId} plan would open here.`);
      setUpgradingTo(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-serif font-bold text-2xl text-[#1A1F1B] flex items-center gap-2">
          Visibility & Growth <Sparkles size={24} className="text-[#C9A84C]" />
        </h2>
        <p className="text-sm text-[#6B7A6E]">Boost your ranking and get more high-quality client leads.</p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={`bg-white rounded-2xl p-6 relative flex flex-col ${
              plan.popular 
                ? 'border-2 border-[#C9A84C] shadow-md scale-100 md:scale-105 z-10' 
                : 'border border-black/10 shadow-sm'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C9A84C] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}
            
            <h3 className="font-serif font-bold text-lg text-[#1A1F1B] mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-[#1A1F1B]">₹{plan.price}</span>
              <span className="text-xs text-[#6B7A6E]">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#1A1F1B]">
                  <Check size={16} className="text-[#2D6A4F] flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.current ? (
              <button disabled className="w-full py-2.5 rounded-xl bg-black/5 text-[#6B7A6E] text-sm font-bold cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <NyayaButton 
                variant={plan.popular ? 'primary' : 'outline'}
                fullWidth
                className="rounded-xl py-2.5"
                onClick={() => handleUpgrade(plan.id)}
                disabled={!!upgradingTo}
              >
                {upgradingTo === plan.id ? 'Processing...' : 'Upgrade Plan'}
              </NyayaButton>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Teaser */}
      <div className="bg-[#1B4332] text-white rounded-2xl p-8 relative overflow-hidden mt-12 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10 max-w-xl">
          <h3 className="font-serif font-bold text-xl mb-3">Unlock Deep Analytics</h3>
          <p className="text-sm text-white/80 mb-6 leading-relaxed">
            Upgrade to a Featured Advocate plan to see exactly how clients are finding you. 
            View your profile views over time, top search keywords, and conversion rates to optimize your practice.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
              <Eye size={18} className="text-white/60 mb-2" />
              <div className="text-xl font-bold">142</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Profile Views</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
              <Search size={18} className="text-white/60 mb-2" />
              <div className="text-xl font-bold">"Divorce lawyer"</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Top Keyword</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20 hidden sm:block">
              <TrendingUp size={18} className="text-white/60 mb-2" />
              <div className="text-xl font-bold">18%</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Conversion Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
