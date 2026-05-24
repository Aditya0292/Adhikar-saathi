import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { fadeUp, staggerChildren } from '../../lib/motion';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { session } = useAuth();
  const role = session?.user?.app_metadata?.user_role ?? session?.user?.user_metadata?.user_role;
  
  const { scrollY } = useScroll();
  
  // Transform logo scale based on scroll
  const logoScale = useTransform(scrollY, [0, 60], [1, 0.9]);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Platform', path: '/' },
    { name: 'For Lawyers', path: '/auth/lawyer/register' },
    { name: 'How It Works', path: '#how-it-works' },
    { name: 'About', path: '#about' },
  ];

  return (
    <>
      <motion.nav 
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'backdrop-blur-xl bg-nyaya-dark/90 border-b border-white/10 py-3' 
            : 'backdrop-blur-md bg-nyaya-dark/70 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 flex items-center justify-between">
          
          {/* Left: Logo */}
          <motion.div 
            style={{ scale: logoScale }}
            className="flex-shrink-0 flex flex-col items-start origin-left"
          >
            <Link to="/" className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-xl md:text-2xl tracking-tight">
              <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain brightness-0 invert" />
              <span>NyayaSatya</span>
            </Link>
            <span className="font-sans text-[10px] text-nyaya-muted ml-10 tracking-widest uppercase">
              न्यायसत्य
            </span>
          </motion.div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="relative group font-sans font-medium text-sm text-nyaya-muted transition-colors hover:text-nyaya-text"
              >
                {link.name}
                <span className="absolute -bottom-1.5 left-0 w-0 h-[2px] bg-nyaya-green-bright transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* Right: Actions */}
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center space-x-4">
                {role === 'admin' && (
                  <Link 
                    to="/admin/verify" 
                    className="font-sans font-medium text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 transition-colors bg-white/10"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link 
                to="/auth/signin" 
                className="font-sans font-medium text-sm text-nyaya-text border border-white/20 px-5 py-2.5 rounded-full hover:bg-white/5 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/" 
                className="font-sans font-semibold text-sm bg-nyaya-green-bright text-nyaya-dark px-5 py-2.5 rounded-full hover:scale-105 hover:shadow-lg hover:shadow-nyaya-green-bright/20 transition-all"
              >
                Get Free Help →
              </Link>
            </div>
            <Link to="/auth/lawyer/register" className="text-[10px] text-nyaya-muted mt-2 hover:text-nyaya-text transition-colors">
              Are you a Lawyer?
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsDrawerOpen(true)} 
              className="text-nyaya-text hover:text-nyaya-green-bright transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Full-Screen Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-nyaya-dark flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div className="flex flex-col items-start">
                <span className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-xl tracking-tight">
                  <img src="/logo.png" alt="NyayaSatya Logo" className="h-7 w-auto object-contain brightness-0 invert" />
                  <span>NyayaSatya</span>
                </span>
                <span className="font-sans text-[10px] text-nyaya-muted ml-10 tracking-widest uppercase">
                  न्यायसत्य
                </span>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)} 
                className="text-nyaya-text hover:text-nyaya-green-bright"
              >
                <X size={28} />
              </button>
            </div>
            
            <motion.div 
              variants={staggerChildren}
              initial="hidden"
              animate="visible"
              className="flex flex-col justify-center items-center flex-1 space-y-8"
            >
              {navLinks.map((link) => (
                <motion.div key={link.name} variants={fadeUp}>
                  <Link
                    to={link.path}
                    onClick={() => setIsDrawerOpen(false)}
                    className="font-serif text-4xl text-nyaya-text hover:text-nyaya-green-bright transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              
              <motion.div variants={fadeUp} className="w-full px-8 pt-8 flex flex-col gap-4 mt-8">
                {role === 'admin' && (
                  <Link 
                    to="/admin/verify"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-full text-center font-sans font-medium text-lg text-red-500 border border-red-500/50 py-4 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link 
                  to="/auth/signin"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full text-center font-sans font-medium text-lg text-nyaya-text border border-white/20 py-4 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full text-center font-sans font-semibold text-lg bg-nyaya-green-bright text-nyaya-dark py-4 rounded-xl"
                >
                  Get Free Help
                </Link>
                <Link 
                  to="/auth/lawyer/register" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-center text-sm text-nyaya-muted mt-4 hover:text-nyaya-text transition-colors"
                >
                  Are you a Lawyer?
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
