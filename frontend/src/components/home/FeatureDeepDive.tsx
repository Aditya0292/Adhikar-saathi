import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Mic, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function FeatureDeepDive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const features = [
    { num: "01", title: "Legal Q&A" },
    { num: "02", title: "Verified Responses" },
    { num: "03", title: "Multilingual Voice Feature" },
    { num: "04", title: "Lawyer Matching" },
    { num: "05", title: "Legal Doc Scan" },
    { num: "06", title: "SOS Emergency" },
  ];

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // We have 6 features. Segment the 0-1 progress.
    const segments = features.length;
    let index = Math.floor(latest * segments);
    // Clamp between 0 and segments - 1
    if (index >= segments) index = segments - 1;
    if (index < 0) index = 0;
    setActiveIndex(index);
  });

  return (
    <section ref={containerRef} className="bg-nyaya-dark relative" style={{ height: '300vh' }}>
      
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile: Horizontal Pill Selector */}
        <div className="md:hidden w-full pt-20 px-6 pb-4 border-b border-white/10 z-20 bg-nyaya-dark/95 backdrop-blur-md">
          <span className="text-xs font-sans font-bold text-nyaya-green-bright uppercase tracking-widest block mb-4">
            What Adhikar साथी does
          </span>
          <div className="flex overflow-x-auto gap-3 hide-scrollbars pb-2 snap-x">
            {features.map((feat, idx) => (
              <button 
                key={feat.num}
                onClick={() => {
                  if (containerRef.current) {
                    const scrollHeight = containerRef.current.scrollHeight;
                    const vh = window.innerHeight;
                    const targetScroll = containerRef.current.offsetTop + (idx * (scrollHeight - vh) / features.length) + (vh / 2);
                    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                  }
                }}
                className={`snap-start whitespace-nowrap px-4 py-2 rounded-full font-sans text-sm transition-colors border ${
                  activeIndex === idx 
                    ? 'bg-nyaya-green-bright/20 border-nyaya-green-bright text-nyaya-green-bright' 
                    : 'bg-white/5 border-white/10 text-nyaya-muted'
                }`}
              >
                {feat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Left Column (Sticky List) */}
        <div className="hidden md:flex flex-col justify-center w-[40%] h-full pl-12 lg:pl-24 pr-12 z-10 border-r border-white/5">
          <span className="text-sm font-sans font-bold text-nyaya-green-bright uppercase tracking-widest block mb-12">
            What Adhikar साथी does
          </span>
          <div className="flex flex-col space-y-6">
            {features.map((feat, idx) => (
              <div 
                key={feat.num} 
                className={`flex items-baseline gap-6 transition-all duration-500 ${
                  activeIndex === idx ? 'opacity-100 pl-4 border-l-2 border-nyaya-green-bright' : 'opacity-20 pl-0 border-l-2 border-transparent'
                }`}
              >
                <span className="font-mono text-sm text-nyaya-green-bright">{feat.num}</span>
                <h3 className="font-serif text-4xl lg:text-5xl text-nyaya-text whitespace-nowrap">
                  {feat.title}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Content Panel (Centered vertically) */}
        <div className="flex-1 h-full flex flex-col justify-center px-6 md:px-16 lg:px-24 relative">
          <AnimatePresence mode="wait">
            
            {/* Panel 01 - Legal Q&A */}
            {activeIndex === 0 && (
              <motion.div 
                key="panel-0"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h3 className="font-serif italic text-3xl md:text-5xl text-nyaya-text mb-6 leading-tight">
                  Ask in any language. Understand in yours.
                </h3>
                <p className="font-sans text-lg text-nyaya-muted mb-8 leading-relaxed">
                  Fast Mode is designed for instant legal awareness. Type your question naturally, and receive a plain-language explanation of your rights within seconds.
                </p>
                <div className="bg-nyaya-dark2 border border-white/10 rounded-xl p-6 shadow-xl space-y-4 mb-8 max-w-md">
                  <div className="flex justify-end">
                    <div className="bg-nyaya-green text-white font-sans text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%]">
                      क्या मेरा मकान मालिक बिना नोटिस दिए मुझे निकाल सकता है?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 text-nyaya-text font-sans text-sm rounded-2xl rounded-tl-sm px-4 py-4 max-w-[95%]">
                      नहीं। किसी भी किरायेदार को बिना नोटिस के नहीं निकाला जा सकता। मकान मालिक को उचित नोटिस देना अनिवार्य है।
                    </div>
                  </div>
                </div>
                <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 text-nyaya-green-bright text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Stat:</span> {'<'} 3 seconds · 10 Indian languages
                </div>
              </motion.div>
            )}

            {/* Panel 02 - Verified Responses */}
            {activeIndex === 1 && (
              <motion.div 
                key="panel-1"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h3 className="font-serif italic text-3xl md:text-5xl text-nyaya-text mb-6 leading-tight">
                  Every answer has a source. Every source is real.
                </h3>
                <p className="font-sans text-lg text-nyaya-muted mb-8 leading-relaxed">
                  Verified Mode employs a strict Retrieval-Augmented Generation pipeline. We don't guess the law; we search the official corpus and cite the exact section. Protected by multi-layer hallucination guards.
                </p>
                <div className="bg-nyaya-dark2 border border-white/10 rounded-xl p-6 shadow-xl mb-8 border-l-4 border-l-nyaya-green max-w-md">
                  <div className="flex gap-3 mb-2">
                    <span className="text-nyaya-green-bright font-mono text-sm">[1]</span>
                    <div className="text-sm font-semibold text-white">The Consumer Protection Act, 2019</div>
                  </div>
                  <div className="text-xs font-mono text-nyaya-muted bg-white/5 p-3 rounded leading-relaxed border border-white/5 ml-7">
                    "Sec 2(47): unfair trade practice means a trade practice which, for the purpose of promoting the sale, use or supply of any goods..."
                  </div>
                </div>
                <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 text-nyaya-green-bright text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Corpus:</span> ILDC + India Code + Indian Kanoon
                </div>
              </motion.div>
            )}

            {/* Panel 03 - Multilingual Voice Feature */}
            {activeIndex === 2 && (
              <motion.div 
                key="panel-2"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h3 className="font-serif italic text-3xl md:text-5xl text-nyaya-text mb-6 leading-tight">
                  Speak. We listen. The law answers.
                </h3>
                <p className="font-sans text-lg text-nyaya-muted mb-10 leading-relaxed">
                  A voice-first design crafted for users who cannot type or prefer spoken interaction. Ask your legal questions via audio in your native dialect.
                </p>
                
                {/* Visual Waveform */}
                <div className="flex items-center justify-center bg-nyaya-dark2 border border-white/10 rounded-2xl py-12 mb-10 max-w-sm">
                  <div className="bg-nyaya-green-bright rounded-full p-4 mr-6">
                    <Mic className="text-nyaya-dark w-8 h-8" />
                  </div>
                  <div className="flex items-end gap-1.5 h-12">
                    <motion.div animate={{ height: ["20%", "80%", "40%", "100%", "30%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="w-2 bg-nyaya-green-bright rounded-full"></motion.div>
                    <motion.div animate={{ height: ["40%", "100%", "20%", "70%", "40%"] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} className="w-2 bg-nyaya-green-bright/80 rounded-full"></motion.div>
                    <motion.div animate={{ height: ["70%", "30%", "90%", "40%", "60%"] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-2 bg-nyaya-green-bright/60 rounded-full"></motion.div>
                    <motion.div animate={{ height: ["30%", "90%", "40%", "80%", "30%"] }} transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} className="w-2 bg-nyaya-green-bright/40 rounded-full"></motion.div>
                    <motion.div animate={{ height: ["90%", "40%", "100%", "20%", "80%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-2 bg-nyaya-green-bright/30 rounded-full"></motion.div>
                  </div>
                </div>

                <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 text-nyaya-green-bright text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Stat:</span> 10 regional languages · 800ms response
                </div>
              </motion.div>
            )}

            {/* Panel 04 - Lawyer Matching */}
            {activeIndex === 3 && (
              <motion.div 
                key="panel-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h3 className="font-serif italic text-3xl md:text-5xl text-nyaya-text mb-6 leading-tight">
                  The right lawyer. Right now. Right here.
                </h3>
                
                {/* 3 Lawyer Cards stacked */}
                <div className="space-y-4 mb-8 max-w-sm">
                  {[
                    { name: "Adv. Sanjay Patel", spec: "Property Law", dist: "2.4 km", rating: "4.9" },
                    { name: "Adv. Meera Reddy", spec: "Family Law", dist: "3.8 km", rating: "4.7" },
                    { name: "Adv. Karan Singh", spec: "Criminal Defense", dist: "5.1 km", rating: "4.8" },
                  ].map((lawyer, i) => (
                    <div key={i} className="bg-nyaya-dark2 border border-white/5 rounded-xl p-4 flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-nyaya-green/30 text-nyaya-green-bright flex items-center justify-center font-serif font-bold text-lg">
                          {lawyer.name.charAt(5)}
                        </div>
                        <div>
                          <div className="text-white font-sans text-sm font-semibold">{lawyer.name}</div>
                          <div className="text-nyaya-muted text-xs font-sans mt-0.5">{lawyer.spec} · {lawyer.dist}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-nyaya-gold text-xs font-semibold">
                        <span>★</span> {lawyer.rating}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 text-nyaya-green-bright text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Stat:</span> GPS-ranked · Verified Bar Council enrollment
                </div>
              </motion.div>
            )}

            {/* Panel 05 - Legal Doc Scanner */}
            {activeIndex === 4 && (
              <motion.div 
                key="panel-4"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h3 className="font-serif italic text-3xl md:text-5xl text-nyaya-text mb-6 leading-tight">
                  What does this document actually mean for you?
                </h3>
                
                {/* Visual: Document risk scan */}
                <div className="bg-white rounded-xl p-6 mb-8 max-w-md shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <ShieldCheck className="text-nyaya-green w-8 h-8" />
                  </div>
                  <div className="w-3/4 h-2 bg-nyaya-dark/10 rounded mb-4"></div>
                  <div className="w-full h-2 bg-nyaya-dark/10 rounded mb-2"></div>
                  <div className="w-5/6 h-2 bg-nyaya-dark/10 rounded mb-6"></div>
                  
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <div className="text-[10px] text-red-600 font-bold uppercase mb-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> High Risk Clause
                    </div>
                    <div className="w-full h-1.5 bg-red-200 rounded mb-2"></div>
                    <div className="w-4/5 h-1.5 bg-red-200 rounded"></div>
                  </div>
                  
                  <div className="bg-nyaya-green/10 border border-nyaya-green/20 rounded p-3">
                    <div className="text-[10px] text-nyaya-green-mid font-bold uppercase mb-1 flex items-center gap-1">
                      <ShieldCheck size={10} /> Standard Clause
                    </div>
                    <div className="w-full h-1.5 bg-nyaya-green/20 rounded mb-2"></div>
                    <div className="w-2/3 h-1.5 bg-nyaya-green/20 rounded"></div>
                  </div>
                </div>

                <div className="inline-block px-4 py-2 bg-white/5 border border-white/10 text-nyaya-green-bright text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Stat:</span> Rental agreements · Employment contracts
                </div>
              </motion.div>
            )}

            {/* Panel 06 - SOS Emergency */}
            {activeIndex === 5 && (
              <motion.div 
                key="panel-5"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                {/* Notice the subtle red tint on text and glow */}
                <h3 className="font-serif italic text-3xl md:text-5xl text-red-100 mb-6 leading-tight">
                  Know your rights in the first 60 seconds.
                </h3>
                <p className="font-sans text-lg text-nyaya-muted mb-10 leading-relaxed">
                  For arrests, domestic violence, and accidents — immediate step-by-step guidance.
                </p>
                
                {/* Visual: SOS Pulsing Button */}
                <div className="flex flex-col items-center justify-center p-8 bg-nyaya-dark2/50 border border-red-900/30 rounded-2xl mb-10 max-w-sm relative">
                  {/* Subtle red background glow */}
                  <div className="absolute inset-0 bg-red-900/10 blur-xl rounded-2xl pointer-events-none"></div>
                  
                  <motion.button 
                    animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0 0 rgba(220, 38, 38, 0.4)", "0 0 0 15px rgba(220, 38, 38, 0)", "0 0 0 0 rgba(220, 38, 38, 0)"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center text-white font-sans font-bold text-xl shadow-lg relative z-10"
                  >
                    SOS
                  </motion.button>
                  
                  <div className="flex gap-4 mt-8 relative z-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                        <ShieldCheck size={20} />
                      </div>
                      <span className="text-[10px] text-nyaya-muted uppercase">Arrest</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                        <AlertTriangle size={20} />
                      </div>
                      <span className="text-[10px] text-nyaya-muted uppercase">Violence</span>
                    </div>
                  </div>
                </div>

                <div className="inline-block px-4 py-2 bg-red-900/20 border border-red-900/40 text-red-400 text-xs font-mono rounded uppercase tracking-wider">
                  <span className="opacity-70">Focus:</span> Immediate legal triage
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
