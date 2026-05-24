import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp, staggerChildren } from '../../lib/motion';

export default function Hero() {
  const headlineWords = "Every Indian Deserves".split(" ");

  return (
    <section className="relative flex items-center justify-center min-h-[100svh] overflow-hidden bg-nyaya-dark">
      {/* Background Options - Fallback Option 2 implemented as primary for now */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-nyaya-dark" />
        {/* Abstract topographic lines pattern using CSS radial gradient for now */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(82, 183, 136, 0.15) 0%, transparent 70%)' }}></div>
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center text-center mt-20">
        
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <span className="bg-nyaya-green/20 text-nyaya-green-bright border border-nyaya-green/30 text-xs font-medium px-4 py-1.5 rounded-full tracking-widest uppercase shadow-lg shadow-nyaya-green/10">
            India's Legal AI Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          className="font-serif text-display-md md:text-display-lg lg:text-display-2xl text-nyaya-text mb-6 flex flex-col items-center"
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-wrap justify-center gap-[0.3em]">
            {headlineWords.map((word, idx) => (
              <motion.span key={idx} variants={fadeUp} className="inline-block">
                {word}
              </motion.span>
            ))}
          </div>
          <motion.div variants={fadeUp} className="italic text-nyaya-text mt-2 flex flex-wrap justify-center gap-[0.3em]">
            <span className="inline-block text-nyaya-muted">to</span>
            <span className="inline-block text-nyaya-text">Know</span>
            <span className="inline-block text-nyaya-muted">Their Rights.</span>
          </motion.div>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-sans text-base md:text-lg text-nyaya-muted max-w-xl mx-auto"
        >
          Ask any legal question in your language. Get answers grounded in real Indian law — cited, verified, and explained in plain terms.
        </motion.p>

        {/* Language Row */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-nyaya-muted"
        >
          <span className="font-sans">Ask in:</span>
          <div className="flex flex-wrap items-center justify-center gap-2 font-sans font-medium">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">हिन्दी</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">தமிழ்</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">తెలుగు</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">বাংলা</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">મરાઠી</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">ગુજરાતી</span>
            <span className="text-xs opacity-70 ml-1">+ 5 more</span>
          </div>
        </motion.div>

        {/* CTA Row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto"
        >
          <button className="w-full sm:w-auto bg-nyaya-green-bright text-nyaya-dark font-sans font-semibold text-base px-8 py-4 rounded-xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-nyaya-green-bright/25">
            Ask Your First Question →
          </button>
          <button className="w-full sm:w-auto border border-white/20 text-nyaya-text font-sans font-medium px-8 py-4 rounded-xl hover:bg-white/5 transition-colors duration-300">
            Register as a Lawyer
          </button>
        </motion.div>

        {/* Trust Signal */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          className="mt-12 text-nyaya-muted text-xs font-sans tracking-wide"
        >
          Free for individuals · Verified Indian legal corpus · Built for Bharat
        </motion.p>

      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
      >
        <ChevronDown className="text-nyaya-muted/50" size={24} />
      </motion.div>

    </section>
  );
}
