import { useState } from 'react';
import LawyerCard from './LawyerCard';

interface LawyerSearchProps {
  lawyers: any[];
}

const SPECIALISATIONS = ['criminal','civil','family','labour','consumer','property','corporate'];

export default function LawyerSearch({ lawyers }: LawyerSearchProps) {
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Mobile Search & Filter Bar */}
      <div className="md:hidden flex gap-2 sticky top-0 z-30 bg-slate-50 py-4 -mx-4 px-4 border-b border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Search lawyers by name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 min-h-[44px]"
          />
          <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <button 
          onClick={() => setShowFiltersMobile(true)}
          className="bg-white border border-slate-300 p-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
        </button>
      </div>

      {/* Desktop Filters / Mobile Bottom Sheet Filters */}
      <div className={`${showFiltersMobile ? 'fixed inset-0 z-50 flex flex-col justify-end bg-black bg-opacity-50' : 'hidden md:block w-72 shrink-0'}`}>
        <div className={`${showFiltersMobile ? 'bg-white rounded-t-2xl p-5 w-full max-h-[85vh] overflow-y-auto' : 'sticky top-6'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Filters</h3>
            {showFiltersMobile && (
              <button onClick={() => setShowFiltersMobile(false)} className="p-2 min-h-[44px] min-w-[44px] bg-slate-100 rounded-full">✕</button>
            )}
          </div>

          <div className="space-y-6 pb-6">
            <div>
              <label className="font-semibold text-sm text-slate-700 block mb-3">Specialisation</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALISATIONS.map(s => (
                  <button key={s} className="px-3 py-1.5 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-primary-500 hover:text-primary-500 transition-colors capitalize">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-sm text-slate-700 block mb-3">Max Fee (₹/hr)</label>
              <input type="range" min="0" max="10000" step="500" className="w-full accent-primary-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Free</span>
                <span>₹10,000+</span>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-primary-500 rounded border-slate-300 focus:ring-primary-500" />
                <span className="text-sm font-medium text-slate-700">Offers Free Initial Consultation</span>
              </label>
            </div>
            
            {showFiltersMobile && (
              <button onClick={() => setShowFiltersMobile(false)} className="w-full py-3 bg-primary text-white rounded-md font-medium">Apply Filters</button>
            )}
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1">
        {/* Desktop Search Bar */}
        <div className="hidden md:flex mb-6 relative">
          <input 
            type="text" 
            placeholder="Search lawyers by name, city, or specialization..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
          />
          <svg className="absolute left-4 top-3.5 w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <button className="absolute right-2 top-2 p-2 text-primary-500 hover:bg-primary-50 rounded-md" title="Use My Location">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-600 font-medium">
          Showing {lawyers.length} verified advocates
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {lawyers.map(lawyer => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>
      </div>
    </div>
  );
}
