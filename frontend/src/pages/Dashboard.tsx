import { useState, useRef } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { QueryInterface } from '../components/query/QueryInterface';
import { RiskMeter } from '../components/ui/RiskMeter';
import LawyerCard from '../components/lawyer/LawyerCard';
import { SOSButton } from '../components/layout/SOSButton';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

interface ScannedDoc {
  name: string;
  score: number;
  tier: 'low' | 'medium' | 'high';
  label: string;
  warning: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scannedDoc, setScannedDoc] = useState<ScannedDoc | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Try to get a display name from metadata, fallback to email prefix
  let displayName = 'User';
  if (user) {
    if (user.user_metadata?.full_name) {
      displayName = user.user_metadata.full_name.split(' ')[0];
    } else if (user.email) {
      displayName = user.email.split('@')[0];
    }
  }

  // Capitalize first letter
  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const mockLawyer = {
    id: '1',
    full_name: 'Anjali Sharma',
    specialisations: ['criminal', 'family', 'civil'],
    city: 'Mumbai',
    state: 'MH',
    experience_years: 12,
    fee_per_hour_inr: 1500,
    offers_free_consultation: true,
    rating: 4.8,
    review_count: 142,
    languages: ['English', 'Hindi', 'Marathi']
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    
    // Simulate Verified Response & Legal Doc Scan loading time
    setTimeout(() => {
      setIsScanning(false);
      setScannedDoc({
        name: file.name,
        score: 0.74,
        tier: 'high',
        label: 'High Risk Level',
        warning: 'Warning: Clause 4.2 waives your right to a standard notice period under the Maharashtra Rent Control Act. Consider renegotiating liability limits.'
      });
    }, 2500);
  };

  const handleResetScan = () => {
    setScannedDoc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <AppShell>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          
          {/* Main Query Area (3/4 width on desktop) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-nyaya-text-dark font-bold mb-1">Good afternoon, {displayName}.</h1>
              <p className="font-sans text-xs md:text-sm text-nyaya-muted">How can we help you understand your rights today?</p>
            </div>
            
            <QueryInterface />
          </div>

          {/* Right Sidebar Area (1/4 width on desktop) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            
            {/* Document Risk Card */}
            <div className="bg-white rounded-2xl border border-black/8 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-serif font-bold text-sm text-nyaya-text-dark">Document Analysis</h3>
                {scannedDoc && !isScanning && (
                  <button 
                    onClick={handleResetScan}
                    className="text-[10px] text-nyaya-muted hover:text-nyaya-text-dark flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={10} /> Clear
                  </button>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
              />

              {isScanning ? (
                /* Scanning Loader State */
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="relative mb-3">
                    <div className="w-10 h-10 border-4 border-nyaya-green/20 border-t-nyaya-green rounded-full animate-spin"></div>
                    <FileText size={16} className="absolute inset-0 m-auto text-nyaya-green animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-nyaya-text-dark">Analyzing document...</p>
                  <p className="text-[10px] text-nyaya-muted mt-1 max-w-[180px]">Scanning clauses against verified databases.</p>
                </div>
              ) : scannedDoc ? (
                /* Scan Results State */
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 p-2 bg-black/[0.02] rounded-xl border border-black/5">
                    <FileText size={14} className="text-nyaya-muted flex-shrink-0" />
                    <span className="text-[10px] font-semibold text-nyaya-text-dark truncate">{scannedDoc.name}</span>
                  </div>
                  
                  <div className="flex justify-center border-b border-black/5 pb-4">
                    <RiskMeter score={scannedDoc.score} tier={scannedDoc.tier} label={scannedDoc.label} />
                  </div>
                  
                  <div className="text-[10px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 font-sans flex items-start gap-1.5">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>{scannedDoc.warning}</span>
                  </div>
                </div>
              ) : (
                /* Empty Upload State */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-black/10 hover:border-nyaya-green/40 bg-slate-50/50 hover:bg-nyaya-green/[0.02] rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-black/5 group-hover:bg-nyaya-green/10 flex items-center justify-center mx-auto mb-2 transition-colors">
                    <Upload size={14} className="text-nyaya-muted group-hover:text-nyaya-green transition-colors" />
                  </div>
                  <h4 className="text-xs font-bold text-nyaya-text-dark mb-0.5">Analyze a Document</h4>
                  <p className="text-[10px] text-nyaya-muted max-w-[180px] mx-auto leading-relaxed">
                    Upload lease, contract, or notice to scan for hidden legal risks instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Recommended Lawyer Demo */}
            <div className="flex flex-col gap-2">
              <h3 className="font-serif font-bold text-[11px] text-nyaya-muted uppercase tracking-wider mb-1">Recommended for you</h3>
              <LawyerCard lawyer={mockLawyer} showPhone={false} compact={true} />
            </div>

          </div>
        </div>
      </AppShell>
      <SOSButton />
    </>
  );
}
