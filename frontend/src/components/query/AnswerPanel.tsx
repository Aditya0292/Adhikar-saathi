import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface Citation {
  id: string;
  title: string;
  type: string;
  snippet: string;
}

interface AnswerPanelProps {
  answerText: string;
  citations: Citation[];
}

export default function AnswerPanel({ answerText, citations }: AnswerPanelProps) {
  const [showCitationsMobile, setShowCitationsMobile] = useState(false);

  return (
    <div className="w-full bg-white shadow-sm md:shadow-md md:rounded-xl border-y md:border border-slate-200 overflow-hidden">
      
      {/* Lawyer Banner */}
      <div className="w-full bg-accent-light text-primary-900 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-nyaya-green shrink-0" />
          <span className="text-sm md:text-base font-medium">Need official legal representation?</span>
        </div>
        <Link to="/lawyers" className="w-full md:w-auto text-center px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-500 transition-colors min-h-[44px] flex items-center justify-center shadow-sm">
          Find a Lawyer near you
        </Link>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Main Answer Area */}
        <div className="flex-1 p-5 md:p-8">
          <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-headings:text-primary-900 prose-a:text-accent-dark">
             {/* Simulating markdown render */}
             <div className="whitespace-pre-wrap text-[15px] md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: answerText }} />
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               <button className="p-2 min-h-[44px] min-w-[44px] text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center" title="Helpful"><ThumbsUp size={16} /></button>
               <button className="p-2 min-h-[44px] min-w-[44px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center" title="Not helpful"><ThumbsDown size={16} /></button>
               <button className="p-2 min-h-[44px] min-w-[44px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center ml-2" title="Copy to clipboard">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </button>
             </div>
             
             {/* Mobile View Citations Trigger */}
             {citations.length > 0 && (
               <button 
                 onClick={() => setShowCitationsMobile(true)}
                 className="md:hidden px-4 py-2 text-sm font-medium text-primary bg-primary-50 rounded-lg min-h-[44px]"
               >
                 View Citations ({citations.length})
               </button>
             )}
          </div>
        </div>

        {/* Desktop Citations Sidebar */}
        {citations.length > 0 && (
          <div className="hidden md:block w-80 lg:w-96 bg-slate-50 border-l border-slate-200 p-6 shrink-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Sources & Citations
            </h3>
            <div className="space-y-4">
              {citations.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-accent transition-colors">
                  <div className="text-xs font-semibold text-accent-dark mb-1 uppercase">{c.type}</div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">{c.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3">{c.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Citations Bottom Sheet */}
      {showCitationsMobile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black bg-opacity-50 md:hidden" onClick={() => setShowCitationsMobile(false)}>
          <div className="bg-slate-50 rounded-t-2xl p-5 w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-50 pt-2 pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Sources & Citations</h3>
              <button onClick={() => setShowCitationsMobile(false)} className="p-2 min-h-[44px] min-w-[44px] bg-slate-200 rounded-full flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="space-y-4 pb-8">
              {citations.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="text-xs font-semibold text-accent-dark mb-1 uppercase">{c.type}</div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2 leading-tight">{c.title}</h4>
                  <p className="text-sm text-slate-600">{c.snippet}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
