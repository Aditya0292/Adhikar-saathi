import { useState, useEffect } from 'react';
import { Save, Camera, X, Check, Loader2, Eye } from 'lucide-react';
import { api } from '../../../api/client';
import type { LawyerProfile } from '../../../types/lawyer-dashboard';
import LawyerCard from '../LawyerCard';
import { NyayaButton } from '../../ui/NyayaButton';

interface ProfileEditorProps {
  profile: LawyerProfile;
  onProfileUpdate?: (updated: LawyerProfile) => void;
}

const COMMON_SPECIALISATIONS = [
  'Criminal Law', 'Family Law', 'Property Law', 'Labour Law',
  'Civil Law', 'Corporate Law', 'Consumer Law', 'Taxation',
  'Constitutional Law', 'Cyber Law'
];

export function ProfileEditor({ profile: initialProfile, onProfileUpdate }: ProfileEditorProps) {
  const [profile, setProfile] = useState<LawyerProfile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleChange = (field: keyof LawyerProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const updatePayload = {
        bio: profile.bio,
        phone: profile.phone,
        specialisations: profile.specialisations,
        court_jurisdictions: profile.court_jurisdictions,
        experience_years: profile.experience_years,
        languages: profile.languages,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        fee_per_hour_inr: profile.fee_per_hour_inr,
        offers_free_consultation: profile.offers_free_consultation,
      };
      const updated = await api.patch('/api/v1/lawyers/me/profile', updatePayload);
      setSaveStatus('success');
      if (onProfileUpdate) onProfileUpdate({ ...profile, ...updated });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const mapToLawyerResult = (p: LawyerProfile) => ({
    id: p.id,
    full_name: p.full_name,
    specialisations: p.specialisations,
    city: p.city,
    state: p.state,
    experience_years: p.experience_years,
    fee_per_hour_inr: p.fee_per_hour_inr,
    offers_free_consultation: p.offers_free_consultation,
    rating: 4.8, // Mock for preview
    review_count: 24, // Mock for preview
    languages: p.languages,
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* ── Edit Form (Left) ── */}
      <div className="flex-1 space-y-8 pb-20 lg:pb-0">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif font-bold text-2xl text-[#1A1F1B]">Edit Profile</h2>
            <p className="text-sm text-[#6B7A6E]">Update how clients see you on the platform.</p>
          </div>
          <NyayaButton 
            onClick={handleSave} 
            disabled={isSaving}
            variant="primary"
            className="hidden lg:flex items-center gap-2 rounded-xl"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </NyayaButton>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm space-y-5">
          <h3 className="font-serif font-bold text-lg text-[#1A1F1B] border-b border-black/5 pb-3">Basic Information</h3>
          
          {/* Photo */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] font-serif text-2xl font-bold overflow-hidden border-2 border-[#1B4332]/20">
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.full_name[0]
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Camera size={20} className="text-white" />
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1F1B]">Profile Photo</p>
              <p className="text-[11px] text-[#6B7A6E] mt-0.5 mb-2 max-w-[200px]">A professional photo increases client trust and profile views.</p>
              <button className="text-xs font-bold text-[#1B4332] hover:text-[#2D6A4F] bg-[#1B4332]/10 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                Upload Photo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Full Name (Read-only)</label>
              <input 
                type="text" 
                value={profile.full_name} 
                disabled 
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm bg-black/5 text-[#6B7A6E] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Phone Number</label>
              <input 
                type="text" 
                value={profile.phone || ''} 
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-xs font-semibold text-[#1A1F1B]">Professional Bio</label>
              <span className="text-[10px] text-[#6B7A6E]">{profile.bio?.length || 0}/500</span>
            </div>
            <textarea 
              value={profile.bio || ''} 
              onChange={e => handleChange('bio', e.target.value.slice(0, 500))}
              rows={4}
              placeholder="Tell clients about your experience, approach, and why they should choose you..."
              className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332] resize-none"
            />
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm space-y-5">
          <h3 className="font-serif font-bold text-lg text-[#1A1F1B] border-b border-black/5 pb-3">Professional Details</h3>
          
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className="block text-xs font-semibold text-[#1A1F1B]">Specialisations</label>
              <span className="text-[10px] text-[#6B7A6E]">{profile.specialisations.length}/5 max</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.specialisations.map(spec => (
                <span key={spec} className="inline-flex items-center gap-1 bg-[#1B4332]/10 text-[#1B4332] px-2 py-1 rounded border border-[#1B4332]/20 text-xs font-semibold">
                  {spec}
                  <button 
                    onClick={() => handleChange('specialisations', profile.specialisations.filter(s => s !== spec))}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            {profile.specialisations.length < 5 && (
              <select 
                onChange={e => {
                  if (e.target.value && !profile.specialisations.includes(e.target.value)) {
                    handleChange('specialisations', [...profile.specialisations, e.target.value]);
                  }
                  e.target.value = '';
                }}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332] bg-white cursor-pointer"
              >
                <option value="">+ Add a specialisation...</option>
                {COMMON_SPECIALISATIONS.filter(s => !profile.specialisations.includes(s.toLowerCase())).map(s => (
                  <option key={s} value={s.toLowerCase()}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Experience (Years)</label>
              <input 
                type="number" 
                min="0"
                value={profile.experience_years} 
                onChange={e => handleChange('experience_years', parseInt(e.target.value) || 0)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Languages Spoken</label>
              <input 
                type="text" 
                value={profile.languages.join(', ')} 
                onChange={e => handleChange('languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="e.g. English, Hindi"
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>
        </div>

        {/* Location & Fees */}
        <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm space-y-5">
          <h3 className="font-serif font-bold text-lg text-[#1A1F1B] border-b border-black/5 pb-3">Location & Fees</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">City</label>
              <input 
                type="text" 
                value={profile.city} 
                onChange={e => handleChange('city', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div className="hidden md:block">
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">State</label>
              <input 
                type="text" 
                value={profile.state} 
                onChange={e => handleChange('state', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Pincode</label>
              <input 
                type="text" 
                value={profile.pincode} 
                onChange={e => handleChange('pincode', e.target.value)}
                className="w-full border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#1A1F1B] mb-1.5">Consultation Fee (₹ per hour)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A6E]">₹</span>
                <input 
                  type="number" 
                  min="0"
                  value={profile.fee_per_hour_inr} 
                  onChange={e => handleChange('fee_per_hour_inr', parseInt(e.target.value) || 0)}
                  disabled={profile.offers_free_consultation}
                  className="w-full border border-black/10 rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1B4332] disabled:opacity-50"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-0 sm:mt-6">
              <input 
                type="checkbox" 
                checked={profile.offers_free_consultation}
                onChange={e => handleChange('offers_free_consultation', e.target.checked)}
                className="w-4 h-4 rounded border-black/20 text-[#1B4332] focus:ring-[#1B4332]"
              />
              <span className="text-sm font-semibold text-[#1A1F1B]">Offers Free Initial Consultation</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Live Preview (Right / Modal) ── */}
      <div className={`
        fixed inset-0 z-50 bg-[#F7F5F0] p-4 flex flex-col md:p-8
        lg:static lg:block lg:w-[380px] lg:bg-transparent lg:p-0 lg:z-auto
        ${showMobilePreview ? 'block' : 'hidden'}
      `}>
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center justify-between lg:mb-4">
            <h3 className="font-serif font-bold text-lg text-[#1A1F1B] flex items-center gap-2">
              <Eye size={18} className="text-[#6B7A6E]" /> Live Preview
            </h3>
            <button 
              onClick={() => setShowMobilePreview(false)}
              className="lg:hidden p-2 bg-white rounded-full border border-black/10 shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="pointer-events-none">
            <LawyerCard lawyer={mapToLawyerResult(profile)} />
          </div>
          
          <p className="text-[11px] text-[#6B7A6E] text-center bg-black/5 p-3 rounded-xl">
            This is how your card appears to clients in search results. Make sure it highlights your key strengths.
          </p>

          {/* Mobile Save Button inside preview modal */}
          <div className="lg:hidden mt-auto pt-4 border-t border-black/10">
            <NyayaButton 
              onClick={() => {
                handleSave();
                setShowMobilePreview(false);
              }}
              disabled={isSaving}
              variant="primary"
              fullWidth
              className="rounded-xl py-3"
            >
              {isSaving ? 'Saving...' : 'Save & Close'}
            </NyayaButton>
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Actions ── */}
      <div className="lg:hidden fixed bottom-[60px] inset-x-0 p-4 bg-white border-t border-black/10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 flex gap-3">
        <NyayaButton 
          onClick={() => setShowMobilePreview(true)}
          variant="outline"
          className="flex-1 rounded-xl"
        >
          <Eye size={16} className="mr-2" /> Preview
        </NyayaButton>
        <NyayaButton 
          onClick={handleSave}
          disabled={isSaving}
          variant="primary"
          className="flex-1 rounded-xl"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Save
        </NyayaButton>
      </div>

      {/* Save Toast */}
      {saveStatus === 'success' && (
        <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 bg-[#1B4332] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <Check size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">Profile updated successfully!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
          <X size={18} />
          <span className="text-sm font-semibold">Failed to update profile. Please try again.</span>
        </div>
      )}
    </div>
  );
}
