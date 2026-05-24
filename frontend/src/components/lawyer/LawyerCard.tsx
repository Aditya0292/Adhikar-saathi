import { useState } from 'react';
import { Star, MapPin, Phone, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { NyayaButton } from '../ui/NyayaButton';

interface LawyerResult {
  id: string;
  full_name: string;
  specialisations: string[];
  city: string;
  state: string;
  experience_years: number;
  fee_per_hour_inr: number;
  offers_free_consultation: boolean;
  rating?: number;
  review_count?: number;
  languages: string[];
}

interface LawyerCardProps {
  lawyer: LawyerResult;
  showPhone?: boolean;
}

export default function LawyerCard({ lawyer, showPhone = false }: LawyerCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getSpecColors = (spec: string) => {
    const s = spec.toLowerCase();
    if (s.includes('criminal')) return 'bg-red-50 text-red-700 border-red-100';
    if (s.includes('family')) return 'bg-pink-50 text-pink-700 border-pink-100';
    if (s.includes('labour')) return 'bg-blue-50 text-blue-700 border-blue-100';
    if (s.includes('property')) return 'bg-green-50 text-green-700 border-green-100';
    if (s.includes('consumer')) return 'bg-teal-50 text-teal-700 border-teal-100';
    if (s.includes('civil')) return 'bg-gray-50 text-gray-700 border-gray-100';
    if (s.includes('constitutional')) return 'bg-purple-50 text-purple-700 border-purple-100';
    if (s.includes('corporate') || s.includes('tax')) return 'bg-orange-50 text-orange-700 border-orange-100';
    return 'bg-slate-50 text-slate-700 border-slate-100';
  };

  return (
    <div className="bg-white rounded-2xl border border-black/8 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
      <div className="p-4 md:p-5 flex flex-col flex-1">
        
        {/* Header: Avatar, Name, Rating */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-nyaya-green/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-serif font-bold text-nyaya-green-mid">{lawyer.full_name[0]}</span>
            </div>
            <div>
              <h3 className="font-sans font-semibold text-nyaya-text-dark text-base md:text-lg leading-tight">{lawyer.full_name}</h3>
              <div className="flex items-center text-xs text-nyaya-muted mt-0.5">
                <MapPin size={12} className="mr-1" />
                {lawyer.city}, {lawyer.state}
              </div>
            </div>
          </div>
          {lawyer.rating && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-nyaya-gold font-semibold text-sm">
                <Star size={14} fill="currentColor" />
                {lawyer.rating.toFixed(1)}
              </div>
              {lawyer.review_count && (
                <span className="text-[10px] text-nyaya-muted">{lawyer.review_count} rev</span>
              )}
            </div>
          )}
        </div>

        {/* Specialisations */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {lawyer.specialisations.slice(0, 2).map(spec => (
            <span key={spec} className={`px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-wider rounded font-sans ${getSpecColors(spec)}`}>
              {spec}
            </span>
          ))}
          {lawyer.specialisations.length > 2 && (
            <span className="px-2 py-0.5 border border-slate-100 bg-slate-50 text-slate-500 text-[10px] font-semibold uppercase tracking-wider rounded font-sans">
              +{lawyer.specialisations.length - 2}
            </span>
          )}
        </div>

        {/* Details (Mobile condensed by default) */}
        <div className={`text-sm text-nyaya-muted space-y-1.5 mb-4 ${expanded ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-nyaya-muted/70" />
            <span>{lawyer.experience_years} Years Exp.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] leading-none opacity-70">🗣</span>
            <span className="capitalize">{lawyer.languages.join(', ')}</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-nyaya-text-dark mt-2">
            <span className="text-[14px] leading-none opacity-70">₹</span>
            {lawyer.fee_per_hour_inr === 0 ? (
              <span className="text-nyaya-green-bright">Pro Bono / Free</span>
            ) : (
              <span>₹{lawyer.fee_per_hour_inr} / hr</span>
            )}
          </div>
          {lawyer.offers_free_consultation && (
            <div className="text-xs text-nyaya-green-mid font-medium bg-nyaya-green/10 px-2 py-1 rounded inline-block mt-1">
              Free Initial Consultation
            </div>
          )}
        </div>

        {/* Mobile expand toggle */}
        <button 
          className="md:hidden text-xs text-nyaya-muted flex items-center justify-center w-full py-2 mb-2 font-medium"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp size={14} className="mr-1" /> Show Less</>
          ) : (
            <><ChevronDown size={14} className="mr-1" /> View Details</>
          )}
        </button>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          {showPhone ? (
            <NyayaButton variant="primary" size="sm" fullWidth className="gap-2 rounded-xl">
              <Phone size={14} /> Call Now
            </NyayaButton>
          ) : (
            <NyayaButton variant="primary" size="sm" fullWidth className="rounded-xl">
              Contact Lawyer
            </NyayaButton>
          )}
        </div>
        
      </div>
    </div>
  );
}
