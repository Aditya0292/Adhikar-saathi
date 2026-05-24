import { useState } from 'react';
import { LanguageSelector } from '../ui/LanguageSelector';

interface QueryBoxProps {
  onSubmit: (query: string, lang: string) => void;
  isLoading: boolean;
}

export default function QueryBox({ onSubmit, isLoading }: QueryBoxProps) {
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState('en');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSubmit(query, lang);
  };

  const isLongQuery = query.length > 1500;

  return (
    <div className="w-full bg-white md:rounded-2xl shadow-sm md:shadow-lg border-y md:border border-slate-200 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your legal situation or ask a question in your preferred language..."
          className="w-full p-4 md:p-6 text-base md:text-lg resize-none outline-none min-h-[150px] md:min-h-[200px] text-slate-800 placeholder-slate-400 bg-transparent"
          disabled={isLoading}
        />
        
        <div className="flex flex-col md:flex-row items-center justify-between p-3 md:p-4 bg-slate-50 border-t border-slate-100 gap-3 md:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <LanguageSelector value={lang} onChange={setLang} />
            
            {/* Character counter shown only when >1500 chars (hidden on mobile mostly to reduce clutter unless long) */}
            <span className={`text-xs ${isLongQuery ? 'text-slate-500' : 'hidden md:inline-block text-slate-400'}`}>
              {query.length} chars
            </span>
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={`w-full md:w-auto px-6 py-3 md:py-2.5 rounded-lg md:rounded-full text-white font-medium min-h-[44px] transition-all flex items-center justify-center gap-2
              ${query.trim() && !isLoading ? 'bg-primary hover:bg-primary-500 shadow-md transform hover:-translate-y-0.5' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Analyzing...
              </span>
            ) : (
              <>
                <span>Get Legal Guidance</span>
                <svg className="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
