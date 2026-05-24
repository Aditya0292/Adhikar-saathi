import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { NyayaButton } from '../components/ui/NyayaButton';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Default to english, but in a real app you'd read this from user_metadata
  const currentLang = user?.user_metadata?.preferred_language || 'en';
  const [language, setLanguage] = useState(currentLang);

  const handleUpdateLanguage = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      data: { preferred_language: language }
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Language preferences updated successfully.');
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setLoading(true);
    setMessage('');
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email);
    
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Password reset instructions sent to your email.');
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark mb-2">Settings</h1>
        <p className="text-nyaya-muted font-sans text-sm md:text-base mb-8">
          Manage your platform preferences and account security.
        </p>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}
        {message && <div className="mb-6 p-4 bg-nyaya-green-bright/10 border border-nyaya-green-bright/20 text-nyaya-green-mid text-sm rounded-xl">{message}</div>}

        <div className="space-y-6">
          
          {/* Preferences Section */}
          <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-semibold text-nyaya-text-dark mb-4 border-b border-black/5 pb-2">Platform Preferences</h2>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-nyaya-text-dark mb-1.5">Preferred Language</label>
              <p className="text-xs text-nyaya-muted mb-3">All legal answers will be provided in this language by default.</p>
              
              <div className="flex items-center gap-3">
                <select 
                  value={language} 
                  onChange={e => setLanguage(e.target.value)} 
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all appearance-none cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.native} ({lang.name})</option>
                  ))}
                </select>
                <NyayaButton onClick={handleUpdateLanguage} disabled={loading || language === currentLang} size="sm">
                  Save
                </NyayaButton>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-semibold text-nyaya-text-dark mb-4 border-b border-black/5 pb-2">Account Security</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-nyaya-text-dark">Password</p>
                <p className="text-xs text-nyaya-muted mt-1">Receive an email with a secure link to reset your password.</p>
              </div>
              <NyayaButton variant="outline" onClick={handleResetPassword} disabled={loading} size="sm">
                Reset Password
              </NyayaButton>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
