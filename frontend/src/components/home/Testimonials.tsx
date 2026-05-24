import { motion } from 'framer-motion';
import { fadeUp, staggerChildren } from '../../lib/motion';
import { CheckCircle, Scale } from 'lucide-react';

export default function Testimonials() {
  return (
    <section className="bg-nyaya-warm py-24 md:py-32 px-6 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div 
          className="mb-16 md:mb-24 text-center md:text-left"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerChildren}
        >
          <motion.span variants={fadeUp} className="text-sm font-sans font-bold text-nyaya-green-mid uppercase tracking-widest block mb-4">
            Impact stories
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-display-md md:text-display-lg text-nyaya-text-dark">
            Real people. Real questions. Real answers.
          </motion.h2>
        </motion.div>

        {/* Featured Quote (Hero Testimonial) */}
        <motion.div 
          className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-center mb-16 md:mb-24 pl-0 md:pl-8 border-l-0 md:border-l-[4px] border-nyaya-green-bright"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className="flex-shrink-0 flex flex-col items-center md:items-start text-center md:text-left mx-auto md:mx-0">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 border-nyaya-green-bright p-1 mb-4">
              {/* Fallback avatar if no image */}
              <div className="w-full h-full rounded-full bg-slate-300 flex items-center justify-center text-slate-500 font-serif text-4xl font-semibold">
                R
              </div>
            </div>
            <div className="font-sans font-semibold text-lg text-nyaya-text-dark">Ramesh Jadhav</div>
            <div className="font-sans text-sm text-nyaya-muted">Factory worker, Pune</div>
          </div>
          
          <div className="flex-1 relative">
            <span className="absolute -top-10 -left-6 text-8xl text-nyaya-green/10 font-serif pointer-events-none">"</span>
            <blockquote className="font-serif italic text-2xl md:text-3xl text-nyaya-text-dark leading-snug mb-6 relative z-10">
              "मुझे नहीं पता था कि मैं ओवरटाइम के लिए दावा कर सकता हूँ। NyayaSatya ने मुझे Payment of Wages Act Section 14 बताया।"
            </blockquote>
            <p className="font-sans text-sm text-nyaya-muted">
              "I didn't know I could claim overtime. NyayaSatya told me about Payment of Wages Act Section 14."
            </p>
          </div>
        </motion.div>

        {/* Secondary Quotes Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerChildren}
        >
          {/* Quote 1 */}
          <motion.div variants={fadeUp} className="bg-white rounded-xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
            <blockquote className="font-sans italic text-nyaya-text-dark mb-6 text-lg">
              "My landlord threatened to throw my belongings out tomorrow. NyayaSatya showed me the state Rent Control Act requiring proper notice and court orders."
            </blockquote>
            <div className="flex flex-col mt-auto">
              <div className="font-sans font-semibold text-sm text-nyaya-text-dark">Sunita M.</div>
              <div className="font-sans text-xs text-nyaya-muted mb-4">Tenant, Mumbai</div>
              <div className="inline-block px-3 py-1.5 bg-nyaya-warm text-nyaya-text-dark text-xs font-mono rounded border border-black/5">
                Law: Maharashtra Rent Control Act
              </div>
            </div>
          </motion.div>

          {/* Quote 2 */}
          <motion.div variants={fadeUp} className="bg-white rounded-xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
            <blockquote className="font-sans italic text-nyaya-text-dark mb-6 text-lg">
              "Used the SOS feature during a domestic dispute. It immediately gave me the helpline numbers and told me about my rights under PWDVA."
            </blockquote>
            <div className="flex flex-col mt-auto">
              <div className="font-sans font-semibold text-sm text-nyaya-text-dark">Anonymous User</div>
              <div className="font-sans text-xs text-nyaya-muted mb-4">Delhi</div>
              <div className="inline-block px-3 py-1.5 bg-nyaya-warm text-nyaya-text-dark text-xs font-mono rounded border border-black/5">
                Law: PWDVA, 2005
              </div>
            </div>
          </motion.div>

          {/* Quote 3 */}
          <motion.div variants={fadeUp} className="bg-white rounded-xl p-8 border border-black/5 shadow-sm hover:shadow-md transition-shadow">
            <blockquote className="font-sans italic text-nyaya-text-dark mb-6 text-lg">
              "A distributor refused to replace defective stock. Asked the AI in Gujarati and found out I could file a complaint under the Consumer Protection Act."
            </blockquote>
            <div className="flex flex-col mt-auto">
              <div className="font-sans font-semibold text-sm text-nyaya-text-dark">Ketan B.</div>
              <div className="font-sans text-xs text-nyaya-muted mb-4">Shop Owner, Ahmedabad</div>
              <div className="inline-block px-3 py-1.5 bg-nyaya-warm text-nyaya-text-dark text-xs font-mono rounded border border-black/5">
                Law: Consumer Protection Act, 2019
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Lawyer Testimonial */}
        <motion.div 
          className="bg-nyaya-green rounded-2xl p-8 md:p-12 text-nyaya-text shadow-xl max-w-4xl mx-auto relative overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          {/* Decorative watermark */}
          <Scale className="absolute -right-10 -bottom-10 text-white/5 w-64 h-64 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <blockquote className="font-serif italic text-2xl md:text-3xl mb-8 max-w-3xl leading-snug">
              "As a lawyer, I've seen clients come in not knowing they had rights. NyayaSatya closes that gap before they reach my office."
            </blockquote>
            <div className="flex flex-col items-center">
              <div className="font-sans font-semibold text-lg mb-1 text-white">Advocate Priya Nair</div>
              <div className="font-sans text-sm text-nyaya-muted mb-4">Kerala High Court</div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-sans text-nyaya-text uppercase tracking-wider font-semibold">
                <CheckCircle size={14} className="text-nyaya-green-bright" /> Verified Partner Advocate
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
