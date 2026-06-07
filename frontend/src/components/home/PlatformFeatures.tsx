import { Zap, Search, MapPin, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, staggerChildren } from '../../lib/motion';

export default function PlatformFeatures() {
  return (
    <section className="bg-nyaya-warm py-24 md:py-32 px-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          className="mb-16 md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerChildren}
        >
          <motion.span variants={fadeUp} className="text-sm font-sans font-bold text-nyaya-green-mid uppercase tracking-widest block mb-4">
            The Platform
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-display-md md:text-display-xl text-nyaya-text-dark mb-6">
            Two modes. One truth.
          </motion.h2>
          <motion.p variants={fadeUp} className="font-sans text-lg text-nyaya-muted max-w-2xl">
            Choose quick general awareness or source-grounded verified responses from real Indian statutes.
          </motion.p>
        </motion.div>

        {/* Feature Cards Grid - 2 Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
          
          {/* Card 1 - Fast Mode */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-nyaya-dark/5 shadow-sm p-8 flex flex-col h-full"
          >
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold uppercase tracking-wider mb-6 font-sans">
                <Zap size={14} fill="currentColor" /> Quick Answer
              </span>
              <h3 className="font-serif text-3xl text-nyaya-text-dark mb-4">Instant Legal Awareness</h3>
              <p className="font-sans text-nyaya-muted">
                Ask anything. Get a clear, plain-language answer with the relevant law named. In under 3 seconds. In your language.
              </p>
            </div>
            
            {/* Mock UI */}
            <div className="mt-auto bg-nyaya-warm border border-black/5 rounded-xl p-4 sm:p-6 space-y-4">
              <div className="flex justify-end">
                <div className="bg-nyaya-green text-white font-sans text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                  क्या मेरा मकान मालिक बिना नोटिस दिए मुझे निकाल सकता है?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white text-nyaya-text-dark font-sans text-sm rounded-2xl rounded-tl-sm px-4 py-4 max-w-[90%] shadow-sm border border-black/5">
                  <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-[10px] uppercase tracking-wider mb-2">
                    <Zap size={12} fill="currentColor" /> Quick Answer
                  </div>
                  <p className="mb-3 leading-relaxed">
                    नहीं। किसी भी किरायेदार को बिना नोटिस के नहीं निकाला जा सकता। मकान मालिक को उचित नोटिस देना अनिवार्य है।
                  </p>
                  <div className="inline-block px-2 py-1 bg-nyaya-warm text-nyaya-muted text-xs rounded border border-black/5 font-medium">
                    Law: Maharashtra Rent Control Act, 1999
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-sans rounded-lg px-4 py-3 w-full flex items-center justify-between">
                <span>⚠ This situation may benefit from professional advice</span>
                <span className="font-semibold whitespace-nowrap ml-2">Find a Lawyer →</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Verified Mode */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="bg-nyaya-green rounded-2xl p-8 flex flex-col h-full text-nyaya-text shadow-xl shadow-nyaya-green/20"
          >
            <div className="mb-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nyaya-green-bright/20 text-nyaya-green-bright border border-nyaya-green-bright/30 text-xs font-semibold uppercase tracking-wider mb-6 font-sans">
                <Search size={14} /> Verified Response
              </span>
              <h3 className="font-serif text-3xl text-white mb-4">Source-Grounded Responses</h3>
              <p className="font-sans text-nyaya-muted/90">
                Every answer cited to the exact statute, section, or landmark judgement. Hallucination-guarded. Legally traceable.
              </p>
            </div>
            
            {/* Mock UI */}
            <div className="mt-auto bg-nyaya-dark2 border border-white/10 rounded-xl p-4 sm:p-6 space-y-4">
              <div className="flex justify-start mb-2">
                <div className="text-nyaya-text font-sans text-sm font-medium">
                  What is the punishment for dowry harassment?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-nyaya-dark border border-white/10 text-nyaya-text font-sans text-sm rounded-xl px-4 py-4 w-full">
                  <p className="mb-4 leading-relaxed text-nyaya-text/90">
                    Under Indian law, whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment for a term which may extend to three years and shall also be liable to fine <sup className="text-nyaya-green-bright bg-nyaya-green-bright/20 px-1 rounded">[1]</sup>. However, arrests must follow specific guidelines to prevent misuse <sup className="text-nyaya-green-bright bg-nyaya-green-bright/20 px-1 rounded">[2]</sup>.
                  </p>
                  
                  {/* Citations Panel */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                    <div className="flex gap-3">
                      <span className="text-nyaya-green-bright font-mono text-xs mt-0.5">[1]</span>
                      <div>
                        <div className="text-xs font-semibold text-white">IPC Section 498A</div>
                        <div className="text-[10px] font-mono text-nyaya-muted mt-1 bg-white/5 p-1.5 rounded">
                          "Husband or relative of husband of a woman subjecting her to cruelty..."
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <span className="text-nyaya-green-bright font-mono text-xs mt-0.5">[2]</span>
                      <div>
                        <div className="text-xs font-semibold text-white">Arnesh Kumar v. State of Bihar (SC, 2014)</div>
                        <div className="text-[10px] font-mono text-nyaya-muted mt-1 bg-white/5 p-1.5 rounded">
                          Guidelines established to prevent arbitrary arrests under 498A.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-nyaya-green-bright/10 border border-nyaya-green-bright/20 text-nyaya-green-bright text-xs font-sans rounded-lg px-4 py-3 w-full flex items-center justify-center font-medium">
                <span className="mr-1.5 text-base leading-none">🟢</span> High Confidence · Hallucination guard passed
              </div>
            </div>
          </motion.div>

        </div>

        {/* Small Feature Cards - 3 Column */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerChildren}
        >
          {/* Card A */}
          <motion.div variants={fadeUp} className="bg-white border border-nyaya-dark/5 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-nyaya-green/10 flex items-center justify-center mb-5">
              <MapPin className="text-nyaya-green-mid" size={20} />
            </div>
            <h4 className="font-serif text-xl font-bold text-nyaya-text-dark mb-2">GPS Lawyer Finder</h4>
            <p className="font-sans text-sm text-nyaya-muted leading-relaxed">
              Top 5 verified lawyers near you, ranked by specialisation and success rate.
            </p>
          </motion.div>

          {/* Card B */}
          <motion.div variants={fadeUp} className="bg-white border border-nyaya-dark/5 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-nyaya-green/10 flex items-center justify-center mb-5">
              <FileText className="text-nyaya-green-mid" size={20} />
            </div>
            <h4 className="font-serif text-xl font-bold text-nyaya-text-dark mb-2">Legal Doc Scanner</h4>
            <p className="font-sans text-sm text-nyaya-muted leading-relaxed">
              Upload any legal document. Get a plain-language risk analysis instantly.
            </p>
          </motion.div>

          {/* Card C */}
          <motion.div variants={fadeUp} className="bg-white border border-nyaya-dark/5 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-5">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <h4 className="font-serif text-xl font-bold text-nyaya-text-dark mb-2">SOS Legal Help</h4>
            <p className="font-sans text-sm text-nyaya-muted leading-relaxed">
              Emergency legal guidance for arrest, domestic violence, or accidents.
            </p>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
