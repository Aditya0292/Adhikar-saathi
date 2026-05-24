import { useState } from 'react';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { NyayaButton } from '../../components/ui/NyayaButton';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, X, Check, AlertCircle } from 'lucide-react';

// STATE_BAR_COUNCILS list
const STATE_BAR_COUNCILS = [
  "Bar Council of Delhi", "Bar Council of Maharashtra & Goa", "Bar Council of Karnataka", 
  "Bar Council of Tamil Nadu", "Bar Council of Kerala", "Bar Council of Andhra Pradesh", 
  "Bar Council of Telangana", "Bar Council of Gujarat", "Bar Council of Rajasthan", 
  "Bar Council of Punjab & Haryana", "Bar Council of Uttar Pradesh", "Bar Council of West Bengal", 
  "Bar Council of Madhya Pradesh", "Bar Council of Bihar", "Bar Council of Odisha", 
  "Bar Council of Assam, Nagaland, Mizoram, & Arunachal Pradesh", "Bar Council of Himachal Pradesh", 
  "Bar Council of Uttarakhand", "Bar Council of Jharkhand", "Bar Council of Chhattisgarh", 
  "Bar Council of Jammu & Kashmir"
];

const SPECIALISATIONS = ['criminal','civil','family','labour','consumer','property','constitutional','corporate','taxation','ip','cyber','immigration'];
const LANGUAGES = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'];

const LANGUAGE_DISPLAY: Record<string, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  ta: "தமிழ் (Tamil)",
  te: "తెలుగు (Telugu)",
  bn: "বাংলা (Bengali)",
  mr: "मराठी (Marathi)",
  gu: "ગુજરાતી (Gujarati)",
  kn: "ಕನ್ನಡ (Kannada)",
  ml: "മലയാളம் (Malayalam)",
  pa: "ਪੰਜਾਬੀ (Punjabi)"
};

// Zod Schema for Step 1
const step1Schema = z.object({
  full_name: z.string().min(3, "Name must be at least 3 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  phone: z.string().regex(/^\+91[0-9]{10}$/, "Format: +91XXXXXXXXXX").optional().or(z.literal('')),
  
  bar_enrollment_number: z.string().regex(/^[A-Z]{1,4}\/\d{4}\/\d{3,6}$/, "Format: STATE/YEAR/NUMBER e.g. MH/2019/34521"),
  state_bar_council: z.enum(STATE_BAR_COUNCILS as any),
  enrollment_year: z.coerce.number().min(1961).max(new Date().getFullYear()),
  
  specialisations: z.array(z.string()).min(1, "Select at least one").max(5, "Max 5 allowed"),
  court_jurisdictions: z.array(z.string()),
  experience_years: z.coerce.number().min(0).max(60),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, "Must be 6 digits"),
  
  fee_per_hour_inr: z.coerce.number().min(0),
  offers_free_consultation: z.boolean().default(false),
  
  government_id_type: z.enum(["aadhaar", "voter_id", "passport"]),
  government_id_last4: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type Step1Data = z.infer<typeof step1Schema>;

export default function LawyerRegister() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [enrollmentCert, setEnrollmentCert] = useState<File | null>(null);
  const [copCert, setCopCert] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);
  
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<Partial<Step1Data>>({});

  const handleStep1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries()) as any;
    
    // Parse arrays correctly
    data.specialisations = form.getAll('specialisations');
    data.languages = form.getAll('languages');
    data.court_jurisdictions = data.court_jurisdictions ? data.court_jurisdictions.split(',').map((s:string) => s.trim()) : [];
    data.offers_free_consultation = data.offers_free_consultation === 'on';
    
    try {
      const validatedData = step1Schema.parse(data);
      setError('');
      
      const { confirmPassword, ...apiData } = validatedData;
      setEnrollmentYear(apiData.enrollment_year);
      setFormData(apiData);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors.map(e => e.message).join(", "));
      } else {
        setError(err.message);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentCert || !govId) {
      setError("Enrollment Certificate and Gov ID are mandatory.");
      return;
    }
    if (enrollmentYear >= 2010 && !copCert) {
      setError("Certificate of Practice (AIBE) is mandatory for enrollments after 2010.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formPayload = new FormData();
      formPayload.append('data', JSON.stringify(formData));
      formPayload.append('enrollment_certificate', enrollmentCert);
      if (copCert) formPayload.append('certificate_of_practice', copCert);
      formPayload.append('government_id', govId);

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/v1/lawyers/register/complete`, {
        method: 'POST',
        body: formPayload,
      });

      const resData = await response.json();
      
      if (!response.ok) {
        throw new Error(resData.detail || 'Failed to submit registration');
      }
      
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex bg-nyaya-warm font-sans">
      {/* Left side - Dark Brand Panel (Fixed/Sticky) */}
      <div className="hidden lg:flex flex-1 h-full bg-nyaya-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nyaya-gold/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <Link to="/" className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-2xl tracking-tight hover:opacity-80 transition-opacity w-max">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span>NyayaSatya</span> 
            <span className="text-sm font-sans uppercase tracking-widest text-nyaya-gold ml-2 border border-nyaya-gold/30 px-2 py-0.5 rounded">For Advocates</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mb-16">
          <h1 className="font-serif italic text-4xl text-nyaya-text mb-8 leading-snug">
            "Empowering the legal minds that defend the nation."
          </h1>
          <p className="text-nyaya-muted text-sm leading-relaxed mb-10">
            Access your advocate dashboard, review client queries, and manage your practice through our secure institutional platform.
          </p>

          {/* Stepper Progress Indicator */}
          <div className="space-y-6 border-l border-white/10 pl-6 ml-2">
            <div className="flex items-center gap-4 relative">
              <div className={`absolute -left-[33px] w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                step >= 1 ? "bg-nyaya-gold border-nyaya-dark shadow-sm ring-4 ring-nyaya-gold/25" : "bg-white/10 border-nyaya-dark"
              }`} />
              <div>
                <p className={`text-sm font-medium ${step >= 1 ? "text-nyaya-text" : "text-white/40"}`}>Account Setup</p>
                <p className="text-xs text-white/30">Credentials & professional profile</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative">
              <div className={`absolute -left-[33px] w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                step >= 2 ? "bg-nyaya-gold border-nyaya-dark shadow-sm ring-4 ring-nyaya-gold/25" : "bg-white/10 border-nyaya-dark"
              }`} />
              <div>
                <p className={`text-sm font-medium ${step >= 2 ? "text-nyaya-text" : "text-white/40"}`}>Verification Documents</p>
                <p className="text-xs text-white/30">Official State Bar certifications</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative">
              <div className={`absolute -left-[33px] w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                step >= 3 ? "bg-nyaya-green-bright border-nyaya-dark shadow-sm ring-4 ring-nyaya-green-bright/25" : "bg-white/10 border-nyaya-dark"
              }`} />
              <div>
                <p className={`text-sm font-medium ${step >= 3 ? "text-nyaya-text" : "text-white/40"}`}>Completed</p>
                <p className="text-xs text-white/30">Application submitted for review</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-nyaya-muted text-xs">
          © 2026 NyayaSatya. All rights reserved.
        </div>
      </div>

      {/* Right side - Form Panel (Scrollable) */}
      <div className="flex-1 h-full overflow-y-auto flex flex-col justify-start py-12 px-6 sm:px-12 lg:px-20 relative">
        {/* Mobile Header */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="font-serif font-semibold text-nyaya-text-dark flex items-center gap-2 text-xl tracking-tight">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-7 w-auto object-contain" />
            <span>NyayaSatya</span> <span className="text-xs font-sans text-nyaya-gold">Advocates</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-serif font-bold text-nyaya-text-dark mb-2">Advocate Registration</h2>
            <p className="text-nyaya-muted text-sm">Join India's premium platform for verified legal professionals.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              
              {/* Account Section */}
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark border-b border-black/5 pb-2">1. Your Account</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Full Name</label>
                    <input 
                      name="full_name" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Email Address</label>
                    <input 
                      name="email" 
                      type="email" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Password</label>
                    <input 
                      name="password" 
                      type="password" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Confirm Password</label>
                    <input 
                      name="confirmPassword" 
                      type="password" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Phone Number (+91)</label>
                    <input 
                      name="phone" 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                      placeholder="+919876543210" 
                    />
                  </div>
                </div>
              </div>

              {/* Bar Council Section */}
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark border-b border-black/5 pb-2">2. Bar Council Registration</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Bar Enrollment Number</label>
                    <input 
                      name="bar_enrollment_number" 
                      required 
                      placeholder="MH/2019/34521" 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                    <p className="text-[10px] text-nyaya-muted mt-1 uppercase tracking-wider">Format: STATE/YEAR/NUMBER</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">State Bar Council</label>
                    <select 
                      name="state_bar_council" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all cursor-pointer"
                    >
                      {STATE_BAR_COUNCILS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Year of Enrollment</label>
                    <input 
                      name="enrollment_year" 
                      type="number" 
                      required 
                      defaultValue={new Date().getFullYear()} 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Professional Details Section */}
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-5">
                <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark border-b border-black/5 pb-2">3. Professional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-2">Specialisations (Max 5)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {SPECIALISATIONS.map(s => (
                        <label key={s} className="flex items-center gap-3 p-3 rounded-xl border border-black/5 bg-nyaya-warm/30 hover:bg-nyaya-warm/60 transition-all cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="specialisations" 
                            value={s} 
                            className="w-4 h-4 rounded text-nyaya-green focus:ring-nyaya-green/20 border-black/10 accent-nyaya-green-mid"
                          />
                          <span className="text-xs font-semibold text-nyaya-text-dark capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-2">Languages Spoken</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {LANGUAGES.map(l => (
                        <label key={l} className="flex items-center gap-3 p-3 rounded-xl border border-black/5 bg-nyaya-warm/30 hover:bg-nyaya-warm/60 transition-all cursor-pointer">
                          <input 
                            type="checkbox" 
                            name="languages" 
                            value={l} 
                            className="w-4 h-4 rounded text-nyaya-green focus:ring-nyaya-green/20 border-black/10 accent-nyaya-green-mid"
                          />
                          <span className="text-xs font-semibold text-nyaya-text-dark">{LANGUAGE_DISPLAY[l] || l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Court Jurisdictions (comma separated)</label>
                    <input 
                      name="court_jurisdictions" 
                      placeholder="e.g. Delhi High Court, Supreme Court of India"
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Experience (Years)</label>
                    <input 
                      name="experience_years" 
                      type="number" 
                      required 
                      defaultValue={0} 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Location & Pricing */}
              <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                <h3 className="font-serif font-semibold text-lg text-nyaya-text-dark border-b border-black/5 pb-2">4. Location & Professional Fees</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">City</label>
                    <input 
                      name="city" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">State</label>
                    <input 
                      name="state" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Pincode</label>
                    <input 
                      name="pincode" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Consultation Fee (INR/hr)</label>
                    <input 
                      name="fee_per_hour_inr" 
                      type="number" 
                      required 
                      defaultValue={1000} 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                  <div className="flex items-center pb-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-black/5 bg-nyaya-warm/30 hover:bg-nyaya-warm/60 cursor-pointer select-none transition-all w-full mt-6">
                      <input 
                        type="checkbox" 
                        name="offers_free_consultation" 
                        className="w-4 h-4 rounded text-nyaya-green focus:ring-nyaya-green/20 border-black/10 accent-nyaya-green-mid"
                      />
                      <span className="text-xs font-semibold text-nyaya-text-dark">Offers free initial consultation</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Government ID Type</label>
                    <select 
                      name="government_id_type" 
                      required 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all cursor-pointer"
                    >
                      <option value="aadhaar">Aadhaar Card</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="passport">Passport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-nyaya-muted mb-1.5">Govt ID Last 4 Digits</label>
                    <input 
                      name="government_id_last4" 
                      required 
                      placeholder="1234" 
                      maxLength={4} 
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                    />
                  </div>
                </div>
              </div>

              <NyayaButton type="submit" disabled={loading} fullWidth className="mt-4">
                {loading ? "Processing Profile..." : "Continue to Document Upload →"}
              </NyayaButton>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="p-4 bg-nyaya-green/5 border border-nyaya-green-bright/10 rounded-2xl text-sm text-nyaya-text-dark space-y-1.5">
                <p className="font-semibold text-nyaya-green-mid flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-nyaya-green-bright" />
                  Credentials verification mandatory
                </p>
                <p className="text-xs text-nyaya-muted leading-relaxed">
                  To verify your practice as a registered advocate in India, please upload the following documents. Files are stored securely in an encrypted vault and analyzed solely by our administrative team.
                </p>
              </div>

              <div className="space-y-4">
                <FileUploadField 
                  id="enrollment_certificate"
                  label="1. Bar Council Enrollment Certificate"
                  description="The official license certificate issued to you by your State Bar Council."
                  required={true}
                  file={enrollmentCert}
                  setFile={setEnrollmentCert}
                />

                <FileUploadField 
                  id="certificate_of_practice"
                  label="2. Certificate of Practice (AIBE)"
                  description="Issued by the Bar Council of India (BCI). Mandatory for enrollments after 2010."
                  required={enrollmentYear >= 2010}
                  file={copCert}
                  setFile={setCopCert}
                  disabled={enrollmentYear < 2010}
                />

                <FileUploadField 
                  id="government_id"
                  label={`3. Government Photo ID (${formData.government_id_type?.toUpperCase()})`}
                  description={`Upload matching Gov ID file. Verification requires last 4 digits to match: ${formData.government_id_last4}`}
                  required={true}
                  file={govId}
                  setFile={setGovId}
                />
              </div>

              <NyayaButton type="submit" disabled={loading} fullWidth className="mt-6">
                {loading ? "Uploading Credentials..." : "Submit for Verification →"}
              </NyayaButton>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-12 px-6 bg-white rounded-2xl border border-black/5 shadow-sm space-y-6">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-nyaya-green/10 mb-2">
                <Check className="text-nyaya-green-bright w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-nyaya-text-dark">Documents Submitted!</h2>
                <p className="text-sm text-nyaya-muted leading-relaxed max-w-md mx-auto">
                  Our verification team is reviewing your profile and state bar registration records. This process typically takes between **24 to 48 hours**.
                </p>
              </div>
              
              <div className="p-4 bg-nyaya-warm rounded-xl text-xs text-nyaya-text-dark border border-black/5 max-w-sm mx-auto">
                We have sent a receipt confirmation to:<br/>
                <strong className="text-nyaya-green-mid">{formData.email}</strong>
              </div>

              <div className="pt-4 border-t border-black/5 max-w-xs mx-auto">
                <Link to="/auth/lawyer/signin" className="font-semibold text-nyaya-green hover:text-nyaya-green-mid transition-colors text-sm">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="mt-8 text-center text-sm text-nyaya-muted border-t border-black/5 pt-6">
              Already have an advocate account?{' '}
              <Link to="/auth/lawyer/signin" className="font-semibold text-nyaya-text-dark hover:text-nyaya-green transition-colors">
                Sign in here →
              </Link>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}

// File Upload helper component
interface FileUploadFieldProps {
  id: string;
  label: string;
  description: string;
  required: boolean;
  file: File | null;
  setFile: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
}

function FileUploadField({
  label,
  description,
  required,
  file,
  setFile,
  disabled = false,
  accept = ".pdf,image/jpeg,image/png"
}: FileUploadFieldProps) {
  if (disabled) {
    return (
      <div className="border border-black/10 rounded-2xl p-5 bg-black/[0.02] opacity-60 select-none">
        <h4 className="font-sans font-semibold text-nyaya-text-dark">{label}</h4>
        <p className="text-xs text-nyaya-muted mt-0.5">{description}</p>
        <div className="mt-3 p-3.5 bg-black/[0.04] border border-black/5 rounded-xl text-xs text-nyaya-muted">
          🔒 Section automatically locked. Not required for enrollments prior to year 2010.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-black/10 rounded-2xl p-5 bg-white space-y-3 transition-all hover:shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-sans font-semibold text-nyaya-text-dark flex items-center gap-1.5">
            {label} {required && <span className="text-red-500 font-bold">*</span>}
          </h4>
          <p className="text-xs text-nyaya-muted mt-0.5">{description}</p>
        </div>
      </div>
      
      {!file ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-xl py-6 px-4 hover:border-nyaya-green-bright/50 hover:bg-nyaya-green/5 transition-all cursor-pointer group">
          <UploadCloud className="w-8 h-8 text-nyaya-muted group-hover:text-nyaya-green transition-colors mb-2" />
          <span className="text-xs font-semibold text-nyaya-text-dark group-hover:text-nyaya-green transition-colors">Click to upload credentials</span>
          <span className="text-[10px] text-nyaya-muted mt-1">PDF, JPG, or PNG (Max 10MB)</span>
          <input 
            type="file" 
            required={required} 
            accept={accept} 
            onChange={e => setFile(e.target.files?.[0] || null)} 
            className="hidden" 
          />
        </label>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-nyaya-warm/50 border border-black/5 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-nyaya-green/10 flex items-center justify-center text-nyaya-green shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-nyaya-text-dark truncate">{file.name}</p>
              <p className="text-xs text-nyaya-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setFile(null)} 
            className="p-1.5 hover:bg-black/5 rounded-lg text-nyaya-muted hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
