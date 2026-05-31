import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CitationCardProps {
  index: number;
  actName?: string;
  section?: string;
  caseName?: string;
  court?: string;
  year?: string;
  excerpt: string;
}

export function CitationCard({ 
  index, 
  actName, 
  section, 
  caseName, 
  court, 
  year, 
  excerpt 
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = caseName 
    ? `${caseName}${court || year ? ` (${[court, year].filter(Boolean).join(', ')})` : ''}`
    : `${actName || 'Citation'}${section ? ` - ${section}` : ''}`;

  return (
    <div className="flex gap-3 bg-white p-3.5 rounded-2xl border border-black/[0.04] shadow-2xs hover:shadow-xs transition-all duration-200">
      <span className="text-nyaya-green font-mono text-xs mt-0.5 font-bold">[{index}]</span>
      <div className="flex-1">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left focus:outline-none group cursor-pointer"
        >
          <span className="text-xs font-bold text-nyaya-text-dark group-hover:text-nyaya-green transition-colors leading-snug">
            {title}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-nyaya-muted ml-2" />
          ) : (
            <ChevronDown size={14} className="text-nyaya-muted ml-2" />
          )}
        </button>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-xs font-sans text-slate-600 mt-2 bg-nyaya-warm p-2.5 rounded-xl border border-black/[0.04] leading-relaxed">
                "{excerpt}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
