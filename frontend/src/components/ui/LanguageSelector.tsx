import { useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

interface LanguageSelectorProps {
  value?: string;
  onChange?: (code: string) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [internalLang, setInternalLang] = useState('en');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedLang = value !== undefined ? value : internalLang;

  const handleSelect = (code: string) => {
    if (onChange) {
      onChange(code);
    } else {
      setInternalLang(code);
    }
    setIsOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === selectedLang);

  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm font-sans text-nyaya-text-dark font-medium px-3 py-2 border border-black/10 rounded-lg bg-white/50 min-h-[44px]"
        >
          <Globe size={16} className="text-nyaya-muted" />
          <span lang={currentLang?.code}>{currentLang?.native}</span>
        </button>
        
        <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="pt-2 pb-4">
            <h3 className="font-sans font-bold text-lg text-nyaya-text-dark mb-4 px-2">Select Language</h3>
            <div className="flex flex-col">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex items-center justify-between px-4 py-3 min-h-[56px] border-b border-black/5 last:border-0 rounded-lg ${selectedLang === lang.code ? 'bg-nyaya-green/5' : 'hover:bg-black/5'}`}
                >
                  <div className="flex flex-col items-start">
                    <span lang={lang.code} className={`font-sans text-base ${selectedLang === lang.code ? 'text-nyaya-green font-semibold' : 'text-nyaya-text-dark'}`}>
                      {lang.native}
                    </span>
                    <span className="text-xs text-nyaya-muted">{lang.name}</span>
                  </div>
                  {selectedLang === lang.code && <Check size={18} className="text-nyaya-green" />}
                </button>
              ))}
            </div>
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Globe size={16} className="text-nyaya-muted" />
      </div>
      <select
        value={selectedLang}
        onChange={(e) => handleSelect(e.target.value)}
        className="pl-8 pr-6 py-1.5 w-[140px] bg-transparent font-sans text-sm text-nyaya-text-dark font-medium appearance-none cursor-pointer focus:outline-none hover:bg-black/5 rounded-lg transition-colors"
      >
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.native} ({lang.name})
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-nyaya-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  );
}
