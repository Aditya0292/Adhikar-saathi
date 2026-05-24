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
    
    // Simulate RAG & Document Scan loading time
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Query Area (2/3 width on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div>
              <h1 className="font-serif text-3xl text-nyaya-text-dark font-bold mb-2">Good afternoon, {displayName}.</h1>
              <p className="font-sans text-nyaya-muted">How can we help you understand your rights today?</p>
            </div>
            
            <QueryInterface />
          </div>

          {/* Right Sidebar Area (1/3 width on desktop) */}
          <div className="flex flex-col gap-6">
            
            {/* Document Risk Card */}
            <div className="bg-white rounded-2xl border border-black/8 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-lg text-nyaya-text-dark">Document Analysis</h3>
                {scannedDoc && !isScanning && (
                  <button 
                    onClick={handleResetScan}
                    className="text-xs text-nyaya-muted hover:text-nyaya-text-dark flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={12} /> Clear
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
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="relative mb-4">
                    <div className="w-12 h-12 border-4 border-nyaya-green/20 border-t-nyaya-green rounded-full animate-spin"></div>
                    <FileText size={20} className="absolute inset-0 m-auto text-nyaya-green animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold text-nyaya-text-dark">Analyzing document...</p>
                  <p className="text-xs text-nyaya-muted mt-1 max-w-[200px]">Scanning clauses against verified Indian legal databases.</p>
                </div>
              ) : scannedDoc ? (
                /* Scan Results State */
                <div className="space-y-6">
                  <div className="flex items-center gap-2 p-2.5 bg-black/[0.02] rounded-xl border border-black/5">
                    <FileText size={16} className="text-nyaya-muted flex-shrink-0" />
                    <span className="text-xs font-semibold text-nyaya-text-dark truncate">{scannedDoc.name}</span>
                  </div>
                  
                  <div className="flex justify-center border-b border-black/5 pb-6">
                    <RiskMeter score={scannedDoc.score} tier={scannedDoc.tier} label={scannedDoc.label} />
                  </div>
                  
                  <div className="text-xs text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-100 font-sans flex items-start gap-2">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{scannedDoc.warning}</span>
                  </div>
                </div>
              ) : (
                /* Empty Upload State */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-black/10 hover:border-nyaya-green/40 bg-slate-50/50 hover:bg-nyaya-green/[0.02] rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-full bg-black/5 group-hover:bg-nyaya-green/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Upload size={18} className="text-nyaya-muted group-hover:text-nyaya-green transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-nyaya-text-dark mb-1">Analyze a Document</h4>
                  <p className="text-xs text-nyaya-muted max-w-[200px] mx-auto leading-relaxed">
                    Upload your lease, contract, or notice to scan for hidden legal risks instantly.
                  </p>
                </div>
              )}
            </div>

            {/* Recommended Lawyer Demo */}
            <div className="flex flex-col gap-4">
              <h3 className="font-serif font-bold text-lg text-nyaya-text-dark">Recommended for you</h3>
              <LawyerCard lawyer={mockLawyer} showPhone={false} />
            </div>

          </div>
        </div>
      </AppShell>
      <SOSButton />
    </>
  );
}
