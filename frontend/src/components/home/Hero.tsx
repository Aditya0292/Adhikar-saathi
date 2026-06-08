import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { fadeUp, staggerChildren, EASING } from '../../lib/motion';
import HeroLaptopShowcase from './HeroLaptopShowcase';

export default function Hero() {

  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-nyaya-dark select-none pt-28 md:pt-32 pb-24">
      
      {/* Background Layer & Lighting Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-nyaya-dark" />
        
        {/* Glow Blobs */}
        <div className="absolute -top-[25%] -left-[15%] w-[70%] h-[70%] rounded-full bg-nyaya-green/20 blur-[130px] mix-blend-screen opacity-70" />
        <div className="absolute -bottom-[25%] -right-[15%] w-[60%] h-[60%] rounded-full bg-nyaya-gold/10 blur-[140px] mix-blend-screen opacity-50" />
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full bg-nyaya-green-bright/5 blur-[120px] mix-blend-screen" />

        {/* Abstract topographic lines pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(82, 183, 136, 0.12) 0%, transparent 65%)' }}></div>
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      {/* Rotating Circular Seal / Stamp (Awwwards Tropes) */}
      <div className="absolute right-[6%] top-[14%] z-20 hidden xl:block">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="relative w-32 h-32 flex items-center justify-center select-none"
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <defs>
              <path
                id="circlePath"
                d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0"
              />
            </defs>
            <text className="font-sans text-[6px] fill-nyaya-muted uppercase tracking-[0.22em] font-semibold">
              <textPath xlinkHref="#circlePath">
                • VERIFIED INDIAN LAW • TRUSTED ADVICE • BHARAT
              </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-nyaya-gold/60 text-xl font-serif">
            🏛️
          </div>
        </motion.div>
      </div>

      {/* Floating 3D Judicial Assets with Mouse Parallax */}
      <div className="absolute inset-0 z-10 pointer-events-none hidden xl:block overflow-hidden">
        
        {/* Scales of Justice - Left Floating Element */}
        <div 
          className="absolute left-[3%] top-[20%] w-[220px] h-[220px] filter drop-shadow-[0_20px_50px_rgba(27,67,50,0.25)] select-none opacity-80"
        >
          <img 
            src="/scales_of_justice.png" 
            alt="Scales of Justice" 
            className="w-full h-full object-contain"
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-sans font-medium text-nyaya-text/50 tracking-wider uppercase whitespace-nowrap">
            Balance of Justice
          </div>
        </div>

        {/* Courthouse Pillars - Right Floating Element */}
        <div 
          className="absolute right-[3%] top-[20%] w-[230px] h-[230px] filter drop-shadow-[0_20px_50px_rgba(201,168,76,0.12)] select-none opacity-80"
        >
          <img 
            src="/courthouse_pillars.png" 
            alt="Courthouse Columns" 
            className="w-full h-full object-contain"
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-sans font-medium text-nyaya-text/50 tracking-wider uppercase whitespace-nowrap">
            Pillars of Law
          </div>
        </div>

      </div>

      {/* Main Hero Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 flex flex-col items-center text-center">

        {/* Big Awwwards-style Headline with structured rows */}
        <motion.h1 
          className="font-serif text-display-lg md:text-display-xl lg:text-display-2xl text-nyaya-text mb-8 flex flex-col items-center tracking-tight leading-[1.05]"
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          <span className="block overflow-hidden py-1">
            <motion.span variants={fadeUp} className="inline-block">
              Every Indian
            </motion.span>
          </span>
          <span className="block overflow-hidden py-1">
            <motion.span variants={fadeUp} className="inline-block text-nyaya-muted italic font-light">
              Deserves
            </motion.span>
          </span>
          <span className="block overflow-hidden py-1">
            <motion.span 
              variants={fadeUp} 
              className="inline-block text-nyaya-green-bright font-medium italic drop-shadow-[0_2px_15px_rgba(82,183,136,0.15)]"
            >
              to Know Their Rights.
            </motion.span>
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.8, ease: EASING }}
          className="font-sans text-base md:text-lg text-nyaya-muted max-w-xl mx-auto leading-relaxed px-4"
        >
          Ask any legal question in your language. Get answers grounded in real Indian law — cited, verified, and explained in plain terms.
        </motion.p>

        {/* Interactive Language Selector Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <span className="font-sans text-[11px] uppercase tracking-widest text-nyaya-muted/70 font-semibold">Available in 10 languages</span>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl px-2">
            {[
              { label: "हिन्दी", border: "hover:border-orange-500/30" },
              { label: "தமிழ்", border: "hover:border-blue-500/30" },
              { label: "తెలుగు", border: "hover:border-yellow-500/30" },
              { label: "বাংলা", border: "hover:border-red-500/30" },
              { label: "मराठी", border: "hover:border-emerald-500/30" },
              { label: "ગુજરાતી", border: "hover:border-pink-500/30" }
            ].map((lang, idx) => (
              <span 
                key={idx} 
                className={`px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-nyaya-text hover:bg-white/10 hover:scale-105 transition-all duration-300 cursor-pointer ${lang.border}`}
              >
                {lang.label}
              </span>
            ))}
            <span className="text-xs text-nyaya-green-bright font-semibold hover:underline cursor-pointer ml-1">+ 4 more</span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.3, ease: EASING }}
          className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto px-4"
        >
          <Link to="/dashboard" className="group relative overflow-hidden w-full sm:w-auto bg-nyaya-green-bright text-nyaya-dark font-sans font-bold text-base px-9 py-4.5 rounded-xl hover:shadow-[0_8px_30px_rgba(82,183,136,0.4)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95">
            <span className="relative z-10">Ask Your First Question</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1.5 transition-transform duration-300" />
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
          </Link>
          
          <Link to="/auth/lawyer/register" className="group w-full sm:w-auto border border-white/10 bg-white/[0.02] text-nyaya-text font-sans font-semibold px-9 py-4.5 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95">
            Register as a Lawyer
          </Link>
        </motion.div>
      </div>

      {/* Hero Laptop Showcase Component */}
      <HeroLaptopShowcase />

      {/* Trust Signals Below Laptop */}
      <div className="relative z-20 w-full flex flex-col items-center text-center pb-20">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="text-nyaya-muted/70 text-xs font-sans tracking-widest uppercase flex items-center gap-2.5"
        >
          <span>Free for individuals</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span>Verified legal corpus</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span>Built for Bharat</span>
        </motion.p>
      </div>

      {/* Down Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-30"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      >
        <span className="text-[10px] font-sans font-medium uppercase tracking-widest text-nyaya-muted">Discover Platform</span>
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="text-nyaya-green-bright" size={20} />
        </motion.div>
      </motion.div>

    </section>
  );
}
