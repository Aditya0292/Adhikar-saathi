import { motion } from 'framer-motion';
import { fadeUp, staggerChildren } from '../../lib/motion';

export default function FinalCTA() {
  const stats = [
    { number: "10", label: "Indian languages supported" },
    { number: "3 sec", label: "Fast Mode answer time" },
    { number: "₹0", label: "Cost for basic legal awareness" },
    { number: "76%", label: "of Indians lack access to legal help — we're changing that" },
  ];

  return (
    <section className="bg-nyaya-dark py-24 md:py-32 px-6 md:px-8 lg:px-12 relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        
        {/* Stats Row */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerChildren}
        >
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={fadeUp} className="flex flex-col items-center">
              <div className="font-serif text-display-md lg:text-display-xl text-nyaya-green-bright mb-2">
                {stat.number}
              </div>
              <div className="font-sans text-sm text-nyaya-muted max-w-[200px]">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="w-full h-px bg-white/10 my-16 md:my-24 origin-center"
        />

        {/* Final CTA Block */}
        <motion.div 
          className="max-w-3xl mx-auto text-center flex flex-col items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerChildren}
        >
          <motion.h2 
            variants={fadeUp} 
            className="font-serif italic text-display-md md:text-display-xl text-nyaya-text leading-tight"
          >
            "The right to justice is meaningless without the knowledge that it exists."
          </motion.h2>
          
          <motion.div variants={fadeUp} className="font-sans text-sm text-nyaya-muted mt-6 uppercase tracking-widest font-semibold">
            — NyayaSatya Mission Statement
          </motion.div>
          
          <motion.div variants={fadeUp} className="mt-12 flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-nyaya-green-bright text-nyaya-dark font-sans font-semibold text-base px-8 py-4 rounded-xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-nyaya-green-bright/25">
              Ask Your First Question — It's Free
            </button>
            <button className="w-full sm:w-auto border border-white/20 text-nyaya-text font-sans font-medium px-8 py-4 rounded-xl hover:bg-white/5 transition-colors duration-300">
              Register as a Lawyer →
            </button>
          </motion.div>
          
          <motion.p variants={fadeUp} className="mt-8 text-xs text-nyaya-muted font-sans max-w-md mx-auto leading-relaxed">
            No signup required for basic queries · Verified Indian legal corpus · Disclaimer: General information, not legal advice
          </motion.p>
        </motion.div>

      </div>
    </section>
  );
}
