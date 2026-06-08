import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CITIZEN_PLANS = [
  {
    id: 'basic',
    name: 'Adhikar साथी Basic',
    price: 0,
    period: 'forever',
    features: [
      'Fast Mode: 20 queries/day',
      'Verified Mode: 5 queries/day',
      'SOS calls: 2/day',
      'Languages: English + Hindi'
    ],
    cta: 'Get Started Free',
    popular: false,
    color: 'border-white/10 bg-white/[0.02]',
    link: '/auth/signup'
  },
  {
    id: 'pro',
    name: 'Adhikar साथी Pro',
    price: 199,
    period: 'mo',
    features: [
      'Fast Mode: Unlimited',
      'Verified Mode: 50 queries/day',
      'SOS calls: Unlimited',
      'Document scanner: 10 scans/mo',
      'All 10 Indian languages',
      'PDF export of citations',
      '90 day history'
    ],
    cta: 'Start Pro',
    popular: true,
    color: 'border-nyaya-green-bright bg-gradient-to-b from-[#111A13] to-[#1B4332]/30 shadow-[0_10px_40px_rgba(82,183,136,0.08)]',
    link: '/dashboard'
  },
  {
    id: 'professional',
    name: 'Adhikar साथी Professional',
    price: 499,
    period: 'mo',
    features: [
      'Everything in Pro',
      'Verified Mode: Unlimited',
      'Lawyer GPS matchmaking',
      'Direct WhatsApp lawyer connect',
      'Forever history',
      'API access: 1000 calls/mo'
    ],
    cta: 'Go Professional',
    popular: false,
    color: 'border-white/10 bg-white/[0.02]',
    link: '/dashboard'
  }
];

const ADVOCATE_PLANS = [
  {
    id: 'basic-listed',
    name: 'Basic Listed',
    price: 0,
    period: 'forever',
    features: [
      'Standard search appearance',
      'Basic profile details',
      'Accept client requests'
    ],
    cta: 'Get Listed Free',
    popular: false,
    color: 'border-white/10 bg-white/[0.02]',
    link: '/auth/lawyer/register'
  },
  {
    id: 'advocate-pro',
    name: 'Adhikar साथी Advocate',
    price: 999,
    period: 'mo',
    features: [
      'Verified lawyer profile listing',
      '50 leads/month',
      'Profile analytics',
      'Priority placement',
      'Client WhatsApp connect'
    ],
    cta: 'Register as Lawyer',
    popular: true,
    color: 'border-nyaya-gold bg-gradient-to-b from-[#1A1813] to-[#8B6914]/10 shadow-[0_10px_40px_rgba(201,168,76,0.08)]',
    link: '/auth/lawyer/register'
  },
  {
    id: 'law-firm',
    name: 'Law Firm Partner',
    price: 4999,
    period: 'mo',
    features: [
      'Everything in Advocate',
      'Multiple advocate accounts',
      'API access for leads',
      'Dedicated account manager'
    ],
    cta: 'Contact Partner Support',
    popular: false,
    color: 'border-white/10 bg-white/[0.02]',
    link: '/auth/lawyer/register'
  }
];

export default function PricingSection() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'advocate'>('citizen');

  const plans = activeTab === 'citizen' ? CITIZEN_PLANS : ADVOCATE_PLANS;

  return (
    <section id="pricing" className="py-24 relative overflow-hidden bg-nyaya-dark border-t border-white/5">
      {/* Background blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-nyaya-green/10 blur-[130px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-nyaya-gold/5 blur-[130px] mix-blend-screen opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl md:text-5xl text-nyaya-text font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="font-sans text-sm md:text-base text-nyaya-muted leading-relaxed">
            Start free. Upgrade when you need more. Select who you are to view tailored plans.
          </p>
        </div>

        {/* Toggle Tab */}
        <div className="flex justify-center mb-16">
          <div className="relative flex bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`relative z-10 px-6 py-2.5 rounded-full font-sans text-xs md:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'citizen' ? 'text-nyaya-dark' : 'text-nyaya-muted hover:text-nyaya-text'
              }`}
            >
              For Citizens / Seekers
            </button>
            <button
              onClick={() => setActiveTab('advocate')}
              className={`relative z-10 px-6 py-2.5 rounded-full font-sans text-xs md:text-sm font-semibold transition-all duration-300 ${
                activeTab === 'advocate' ? 'text-nyaya-dark' : 'text-nyaya-muted hover:text-nyaya-text'
              }`}
            >
              For Advocates / Lawyers
            </button>
            <motion.div
              layout
              className={`absolute top-1 bottom-1 rounded-full ${
                activeTab === 'citizen' ? 'bg-nyaya-green-bright' : 'bg-nyaya-gold'
              }`}
              style={{
                left: activeTab === 'citizen' ? '4px' : 'calc(50% + 2px)',
                right: activeTab === 'citizen' ? 'calc(50% + 2px)' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto"
            >
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-8 flex flex-col justify-between relative transition-all duration-300 ${plan.color}`}
                >
                  {plan.popular && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full flex items-center gap-1 ${
                      activeTab === 'citizen' ? 'bg-nyaya-green-bright text-nyaya-dark' : 'bg-nyaya-gold text-white'
                    }`}>
                      <Sparkles size={10} /> Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="font-serif font-bold text-lg text-nyaya-text mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-3xl font-bold text-nyaya-text">
                        {plan.price === 0 ? '₹0' : `₹${plan.price}`}
                      </span>
                      <span className="text-xs text-nyaya-muted">
                        /{plan.period === 'forever' ? 'forever' : 'mo'}
                      </span>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-nyaya-muted">
                          <Check size={16} className={`flex-shrink-0 mt-0.5 ${
                            activeTab === 'citizen' ? 'text-nyaya-green-bright' : 'text-nyaya-gold'
                          }`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={plan.link}
                    className={`w-full text-center py-3.5 rounded-xl font-sans font-bold text-sm transition-all duration-300 ${
                      plan.popular
                        ? activeTab === 'citizen'
                          ? 'bg-nyaya-green-bright text-nyaya-dark hover:shadow-[0_4px_20px_rgba(82,183,136,0.3)]'
                          : 'bg-nyaya-gold text-white hover:shadow-[0_4px_20px_rgba(201,168,76,0.3)]'
                        : 'bg-white/5 text-nyaya-text border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
