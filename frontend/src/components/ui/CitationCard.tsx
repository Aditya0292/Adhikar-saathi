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
    <div className="flex gap-3 mb-3 last:mb-0">
      <span className="text-nyaya-green-bright font-mono text-xs mt-0.5">[{index}]</span>
      <div className="flex-1">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left focus:outline-none group"
        >
          <span className="text-xs font-semibold text-nyaya-text group-hover:text-nyaya-green-bright transition-colors">
            {title}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-nyaya-muted" />
          ) : (
            <ChevronDown size={14} className="text-nyaya-muted" />
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
              <div className="text-[10px] font-mono text-nyaya-muted mt-2 bg-white/5 p-2.5 rounded border border-white/5 leading-relaxed">
                "{excerpt}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
