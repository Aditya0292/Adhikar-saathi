import { useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { lawyerApi } from '../../api/lawyer';
import { NyayaButton } from '../ui/NyayaButton';
import { X, Shield, Clock, MapPin, Languages, Phone, AlertCircle, CheckCircle, Loader2, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  lawyer: {
    id: string;
    full_name: string;
    specialisations: string[];
    city: string;
  };
}

const COMMON_LANGUAGES = [
  'English',
  'Hindi',
  'Marathi',
  'Gujarati',
  'Bengali',
  'Telugu',
  'Tamil',
  'Urdu',
  'Kannada',
  'Odia',
  'Malayalam',
  'Punjabi',
  'Assamese'
];

export default function ContactModal({ isOpen, onClose, lawyer }: ContactModalProps) {
  const { user } = useAuth();
  
  const specs = lawyer?.specialisations || [];
  const city = lawyer?.city || '';
  const fullName = lawyer?.full_name || 'Advocate';
  const lawyerId = lawyer?.id || '';

  // Form states
  const [category, setCategory] = useState(
    specs.length > 0 ? specs[0] : 'civil'
  );
  const [situationSummary, setSituationSummary] = useState('');
  const [userCity, setUserCity] = useState(city);
  const [userLanguage, setUserLanguage] = useState('Hindi');
  const [urgency, setUrgency] = useState('normal');
  const [userPhone, setUserPhone] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;
  if (typeof window === 'undefined' || !document.body) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (situationSummary.trim().length < 15) {
      setError('Please provide a slightly more detailed explanation of your situation (minimum 15 characters).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await lawyerApi.contactLawyer(lawyerId, {
        category,
        situation_summary: situationSummary,
        user_city: userCity,
        user_language: userLanguage,
        urgency,
        user_phone: userPhone.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Contact lawyer error:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'An error occurred while sending your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-nyaya-dark/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl border border-black/8 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all duration-300 max-h-[90vh] flex flex-col font-sans animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-nyaya-warm/30">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-nyaya-green-mid" />
            <h3 className="font-serif font-bold text-lg text-nyaya-text-dark">
              Connect with Advocate
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-nyaya-muted hover:text-nyaya-text-dark p-1 rounded-full hover:bg-black/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-6 flex-1">
          {!user ? (
            /* Unauthenticated state */
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-nyaya-warm flex items-center justify-center mx-auto mb-4 border border-black/5">
                <Shield size={24} className="text-nyaya-muted" />
              </div>
              <h4 className="font-serif font-semibold text-lg text-nyaya-text-dark mb-2">
                Authentication Required
              </h4>
              <p className="text-nyaya-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                To maintain client-attorney privilege and route case details securely, please sign in to your Adhikar Saathi account.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link to="/auth/signin">
                  <NyayaButton variant="primary" fullWidth size="md" className="py-2.5 rounded-xl text-sm font-semibold">
                    Sign In to Proceed
                  </NyayaButton>
                </Link>
                <button 
                  onClick={onClose}
                  className="w-full text-center py-2.5 text-xs text-nyaya-muted hover:text-nyaya-text-dark font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
              <h4 className="font-serif font-bold text-xl text-emerald-800 mb-2">
                Request Sent Successfully!
              </h4>
              <p className="text-nyaya-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
                Your legal query details have been routed directly to <span className="font-semibold text-nyaya-text-dark">{fullName}</span>. 
                You will receive an update once they review and accept your consultation request.
              </p>
              <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-xl text-left text-xs text-emerald-800 space-y-2 mb-6">
                <p className="font-semibold">What happens next?</p>
                <ul className="list-disc pl-4 space-y-1 text-emerald-700/90 font-medium">
                  <li>Advocate will review your case description.</li>
                  <li>When accepted, their contact information is unlocked for you.</li>
                  <li>Your phone/email will be shared only upon their response acceptance.</li>
                </ul>
              </div>
              <NyayaButton variant="ghost" fullWidth size="md" onClick={onClose} className="py-2.5 rounded-xl text-sm font-semibold">
                Close Panel
              </NyayaButton>
            </div>
          ) : (
            /* Contact Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-nyaya-warm/30 border border-black/5 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-nyaya-green/10 flex items-center justify-center font-bold text-nyaya-green-mid">
                  {fullName[0]}
                </div>
                <div>
                  <p className="text-xs text-nyaya-muted leading-none">Consulting With</p>
                  <p className="text-sm font-bold text-nyaya-text-dark">{fullName}</p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-medium animate-fade-in">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-nyaya-text-dark mb-1.5 uppercase tracking-wider">
                  Case Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition capitalize"
                >
                  {specs.length > 0 ? (
                    specs.map((spec) => (
                      <option key={spec} value={spec} className="capitalize">
                        {spec} Law
                      </option>
                    ))
                  ) : (
                    <option value="civil">Civil Law</option>
                  )}
                  {/* General fallbacks in case */}
                  {!specs.includes('criminal') && <option value="criminal">Criminal Law</option>}
                  {!specs.includes('property') && <option value="property">Property Law</option>}
                  {!specs.includes('family') && <option value="family">Family Law</option>}
                </select>
              </div>

              {/* Situation Summary */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-nyaya-text-dark uppercase tracking-wider">
                    Explain your situation
                  </label>
                  <span className="text-[10px] text-nyaya-muted">
                    {situationSummary.length}/500 chars
                  </span>
                </div>
                <textarea
                  value={situationSummary}
                  onChange={(e) => setSituationSummary(e.target.value.slice(0, 500))}
                  placeholder="Please describe what happened, the key issues, and what legal help you need. Minimise personal identification details at this stage."
                  rows={4}
                  required
                  className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition placeholder-nyaya-muted/50 resize-none leading-relaxed"
                />
              </div>

              {/* City and Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-nyaya-text-dark mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={12} className="text-nyaya-muted" /> City
                  </label>
                  <input
                    type="text"
                    value={userCity}
                    onChange={(e) => setUserCity(e.target.value)}
                    placeholder="E.g., Mumbai"
                    required
                    className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition placeholder-nyaya-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-nyaya-text-dark mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Languages size={12} className="text-nyaya-muted" /> Preferred Language
                  </label>
                  <select
                    value={userLanguage}
                    onChange={(e) => setUserLanguage(e.target.value)}
                    className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition"
                  >
                    {COMMON_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Urgency and Phone Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-nyaya-text-dark mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={12} className="text-nyaya-muted" /> Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition"
                  >
                    <option value="low">Low (General Query)</option>
                    <option value="normal">Normal (Few days)</option>
                    <option value="high">High (Action needed soon)</option>
                    <option value="urgent">Urgent (Immediate response)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-nyaya-text-dark mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={12} className="text-nyaya-muted" /> Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="E.g., +919876543210"
                    className="w-full bg-nyaya-warm/30 border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-nyaya-text-dark focus:outline-none focus:border-nyaya-green transition placeholder-nyaya-muted/50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <NyayaButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={loading}
                  className="py-3 rounded-xl text-sm font-semibold flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    'Submit Connection Request'
                  )}
                </NyayaButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
