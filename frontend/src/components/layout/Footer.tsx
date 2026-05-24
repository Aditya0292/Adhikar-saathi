import { Link } from 'react-router-dom';

export default function Footer() {
  const languages = ["EN", "हि", "த", "తె", "বা", "म", "ગુ", "ಕ", "മ", "ਪੰ", "ଓ"];

  return (
    <footer className="bg-nyaya-dark border-t border-white/10 pt-16 pb-8 px-6 md:px-8 lg:px-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Section: Logo & Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-8 mb-16 gap-y-12">
          
          {/* Column 1: Logo + Mission */}
          <div className="md:col-span-1">
            <div className="flex flex-col items-start mb-4">
              <span className="font-serif font-semibold text-nyaya-text flex items-center gap-2 text-2xl tracking-tight">
                <img src="/logo.png" alt="NyayaSatya Logo" className="h-8 w-auto object-contain brightness-0 invert" />
                <span>NyayaSatya</span>
              </span>
              <span className="font-sans text-[10px] text-nyaya-muted ml-10 tracking-widest uppercase">
                न्यायसत्य
              </span>
            </div>
            <p className="text-nyaya-muted text-sm max-w-xs leading-relaxed">
              Democratising legal knowledge for every Indian — fast answers, cited truth, human dignity.
            </p>
          </div>
          
          {/* Column 2: Platform Links */}
          <div className="flex flex-col">
            <h4 className="text-nyaya-text font-semibold text-sm uppercase tracking-wider mb-6">Platform</h4>
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Quick Answer</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Verified Answers</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Voice Agent</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">SOS Help</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Document Scanner</Link>
            </div>
          </div>
          
          {/* Column 3: For Lawyers */}
          <div className="flex flex-col">
            <h4 className="text-nyaya-text font-semibold text-sm uppercase tracking-wider mb-6">For Lawyers</h4>
            <div className="flex flex-col space-y-4">
              <Link to="/auth/lawyer/register" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Register as Lawyer</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Verify Your Profile</Link>
              <Link to="/lawyer/dashboard" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Lawyer Dashboard</Link>
            </div>
          </div>
          
          {/* Column 4: Company */}
          <div className="flex flex-col">
            <h4 className="text-nyaya-text font-semibold text-sm uppercase tracking-wider mb-6">Company</h4>
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">About</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Security</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Privacy Policy</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Terms</Link>
              <Link to="/" className="text-nyaya-muted text-sm hover:text-nyaya-green-bright transition-colors">Contact</Link>
            </div>
          </div>

        </div>

        {/* Bottom Section: Trust Badges Row */}
        <div className="border-t border-white/10 pt-8 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-nyaya-muted text-xs">
            © 2026 NyayaSatya. All rights reserved.
          </div>
          
          <div className="flex items-center flex-wrap justify-center gap-2">
            {languages.map((lang, idx) => (
              <span key={idx} className="text-nyaya-muted/70 hover:text-nyaya-text transition-colors cursor-pointer text-xs font-medium px-2 py-1 rounded bg-white/5 border border-white/5">
                {lang}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-nyaya-muted text-xs font-mono">
            <span>DPDP Act 2023 Compliant</span>
            <span className="text-white/20">|</span>
            <span>End-to-end encrypted</span>
          </div>
        </div>

        {/* Critical Legal Disclaimer */}
        <div className="text-center mt-2">
          <p className="text-nyaya-muted/50 text-[11px] max-w-4xl mx-auto leading-relaxed">
            NyayaSatya provides general legal information, not legal advice. For advice specific to your situation, consult a qualified advocate.
          </p>
        </div>

      </div>
    </footer>
  );
}
