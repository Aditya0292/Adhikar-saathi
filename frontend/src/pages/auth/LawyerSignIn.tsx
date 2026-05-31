import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { NyayaButton } from '../../components/ui/NyayaButton';
import { motion } from 'framer-motion';

export default function LawyerSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      // Check verified status via store or JWT
      const role = data.session.user.app_metadata?.user_role || data.session.user.user_metadata?.role;
      if (role !== 'lawyer') {
          setError('This account is not registered as a lawyer.');
          await supabase.auth.signOut();
          return;
      }
      
      // Check verified status directly from the database instead of cached JWT metadata
      const { data: lawyerData } = await supabase
        .from('lawyers')
        .select('is_verified, verification_status')
        .eq('auth_id', data.session.user.id)
        .single();
        
      if (lawyerData?.is_verified === true || lawyerData?.verification_status === 'verified' || data.session.user.app_metadata?.lawyer_verified) {
          navigate('/lawyer/dashboard');
      } else {
          navigate('/lawyer/pending');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-nyaya-warm font-sans">
      {/* Left side - Dark Brand Panel */}
      <div className="hidden lg:flex flex-1 bg-nyaya-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nyaya-gold/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <Link to="/" className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-2xl tracking-tight hover:opacity-80 transition-opacity w-max">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span>NyayaSatya</span> <span className="text-sm font-sans uppercase tracking-widest text-nyaya-gold ml-2 border border-nyaya-gold/30 px-2 py-0.5 rounded">For Advocates</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-serif italic text-4xl text-nyaya-text mb-6 leading-snug">
            "Empowering the legal minds that defend the nation."
          </h1>
          <p className="text-nyaya-muted text-sm leading-relaxed">
            Access your advocate dashboard, review client queries, and manage your practice through our secure institutional platform.
          </p>
        </div>
        
        <div className="relative z-10 text-nyaya-muted text-xs">
          © 2026 NyayaSatya. All rights reserved.
        </div>
      </div>

      {/* Right side - Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link to="/" className="font-serif font-semibold text-nyaya-text-dark flex items-center gap-2 text-xl tracking-tight">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-7 w-auto object-contain" />
            <span>NyayaSatya</span> <span className="text-xs font-sans text-nyaya-gold">Advocates</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-serif font-bold text-nyaya-text-dark mb-2">Advocate Portal</h2>
            <p className="text-nyaya-muted text-sm">Secure sign in for verified legal professionals.</p>
          </div>
          
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-nyaya-text-dark mb-1.5">Official Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                placeholder="Enter your registered email"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-nyaya-text-dark">Password</label>
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                placeholder="••••••••"
              />
            </div>

            <NyayaButton type="submit" disabled={loading} fullWidth className="mt-2">
              {loading ? 'Authenticating...' : 'Sign In as Advocate'}
            </NyayaButton>
          </form>

          <div className="mt-10 space-y-3 text-center lg:text-left text-sm text-nyaya-muted border-t border-black/5 pt-6">
            <p>
              New to NyayaSatya?{' '}
              <Link to="/auth/lawyer/register" className="font-semibold text-nyaya-text-dark hover:text-nyaya-green transition-colors">
                Register as a Lawyer →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
