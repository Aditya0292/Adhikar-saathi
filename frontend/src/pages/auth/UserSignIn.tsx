import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { NyayaButton } from '../../components/ui/NyayaButton';
import { motion } from 'framer-motion';

export default function UserSignIn() {
  const [email, setEmail] = useState('admin@nyayasatya.com');
  const [password, setPassword] = useState('AdminPassword123!');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
      const role = data.session.user.app_metadata?.user_role || data.session.user.user_metadata?.user_role;
      if (role === 'admin') {
        navigate('/admin/verify');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else setMessage('Password reset instructions sent to email');
  }

  return (
    <div className="min-h-screen flex bg-nyaya-warm font-sans">
      {/* Left side - Dark Brand Panel */}
      <div className="hidden lg:flex flex-1 bg-nyaya-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nyaya-green-bright/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <Link to="/" className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-2xl tracking-tight hover:opacity-80 transition-opacity w-max">
            <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span>NyayaSatya</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-serif italic text-4xl text-nyaya-text mb-6 leading-snug">
            "Justice should not be a privilege. It is a fundamental right."
          </h1>
          <p className="text-nyaya-muted text-sm leading-relaxed">
            Sign in to access verified legal guidance, manage your documents, and connect with top legal professionals across India.
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
            <span>NyayaSatya</span>
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-serif font-bold text-nyaya-text-dark mb-2">Welcome back</h2>
            <p className="text-nyaya-muted text-sm">Please enter your details to sign in.</p>
          </div>
          
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>}
          {message && <div className="mb-6 p-4 bg-nyaya-green-bright/10 border border-nyaya-green-bright/20 text-nyaya-green-mid text-sm rounded-xl">{message}</div>}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-nyaya-text-dark mb-1.5">Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-nyaya-text-dark outline-none focus:ring-2 focus:ring-nyaya-green/20 focus:border-nyaya-green transition-all" 
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-nyaya-text-dark">Password</label>
                <button type="button" onClick={handleForgotPassword} className="text-xs text-nyaya-muted hover:text-nyaya-text-dark transition-colors font-medium">Forgot password?</button>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </NyayaButton>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-nyaya-warm text-nyaya-muted">Or continue with</span>
              </div>
            </div>
            
            <button 
              onClick={handleGoogleSignIn} 
              className="mt-6 w-full flex justify-center items-center gap-3 py-3 px-4 border border-black/10 rounded-xl bg-white text-sm font-medium text-nyaya-text-dark hover:bg-black/5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>
          
          <div className="mt-10 space-y-3 text-center lg:text-left text-sm text-nyaya-muted">
            <p>
              Don't have an account?{' '}
              <Link to="/auth/signup" className="font-semibold text-nyaya-text-dark hover:text-nyaya-green transition-colors">
                Sign up
              </Link>
            </p>
            <p className="pt-4 border-t border-black/5">
              Are you a lawyer?{' '}
              <Link to="/auth/lawyer/signin" className="font-semibold text-nyaya-text-dark hover:text-nyaya-green transition-colors">
                Sign in here →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
