import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Database, FileText, Languages, Mic, Users, 
  Inbox, Bell, ChevronRight, Sparkles, Scale
} from 'lucide-react';

// Mocks Data and Configuration
type ActiveTab = 'dashboard' | 'voice' | 'scanner';

export default function HeroLaptopShowcase() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto cycling
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === 'dashboard') return 'voice';
        if (prev === 'voice') return 'scanner';
        return 'dashboard';
      });
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    startTimer(); // reset timer on manual click
  };

  // Get active glow color
  const getGlowColor = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'bg-[radial-gradient(circle_at_center,rgba(82,183,136,0.18)_0%,rgba(59,130,246,0.06)_45%,transparent_70%)]';
      case 'voice':
        return 'bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.22)_0%,rgba(236,72,153,0.06)_45%,transparent_70%)]';
      case 'scanner':
        return 'bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.16)_0%,rgba(249,115,22,0.06)_45%,transparent_70%)]';
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto py-16 px-4 md:py-24 select-none">
      {/* Custom Styles for 3D Laptop Perspective & Animations */}
      <style>{`
        .laptop-perspective-container {
          perspective: 1500px;
        }
        .laptop-chassis {
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (min-width: 768px) {
          .laptop-chassis-3d {
            transform: rotateX(10deg);
          }
          .laptop-chassis-3d:hover {
            transform: rotateX(6deg);
          }
        }
        @media (max-width: 767px) {
          .laptop-chassis-3d {
            transform: none !important;
          }
        }
        @keyframes pulse-wave {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.65;
          }
        }
        @keyframes pulse-wave-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.45;
          }
        }
        @keyframes scan {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        .scan-line {
          animation: scan 4s ease-in-out infinite;
        }
        .pulse-circle {
          animation: pulse-wave 3s ease-in-out infinite;
        }
        .pulse-circle-slow {
          animation: pulse-wave-slow 4.5s ease-in-out infinite;
        }
        .shadow-glow-dashboard {
          box-shadow: 0 0 80px 10px rgba(82, 183, 136, 0.15);
        }
        .shadow-glow-voice {
          box-shadow: 0 0 80px 10px rgba(139, 92, 246, 0.18);
        }
        .shadow-glow-scanner {
          box-shadow: 0 0 80px 10px rgba(201, 168, 76, 0.15);
        }
      `}</style>

      {/* Atmospheric Background Glow Behind Laptop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className={`w-[80%] h-[70%] rounded-full blur-[140px] transition-all duration-1000 ${getGlowColor()}`} />
      </div>

      {/* Interactive Desktop Tabs (Above laptop for standard layout or toggle control) */}
      <div className="relative z-20 flex justify-center items-center gap-2 md:gap-4 mb-10 max-w-2xl mx-auto">
        {(['dashboard', 'voice', 'scanner'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2.5 md:px-6 md:py-3.5 rounded-xl border text-xs md:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeTab === tab
                ? tab === 'dashboard'
                  ? 'bg-nyaya-green/40 border-nyaya-green-bright/40 text-nyaya-green-bright shadow-[0_4px_20px_rgba(82,183,136,0.15)]'
                  : tab === 'voice'
                  ? 'bg-violet-950/40 border-violet-500/40 text-violet-400 shadow-[0_4px_20px_rgba(139,92,246,0.15)]'
                  : 'bg-nyaya-gold/20 border-nyaya-gold/40 text-nyaya-gold shadow-[0_4px_20px_rgba(201,168,76,0.15)]'
                : 'bg-white/[0.02] border-white/5 text-nyaya-muted hover:bg-white/5 hover:border-white/10'
            }`}
          >
            {tab === 'dashboard' && <Scale size={16} />}
            {tab === 'voice' && <Mic size={16} />}
            {tab === 'scanner' && <FileText size={16} />}
            
            {tab === 'dashboard' && 'Advocate Tools'}
            {tab === 'voice' && 'Voice Adviser'}
            {tab === 'scanner' && 'Document Intelligence'}
          </button>
        ))}
      </div>

      {/* Floating 3D Laptop Frame */}
      <div className="laptop-perspective-container relative z-10 w-full flex flex-col items-center justify-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className={`w-full max-w-[850px] laptop-chassis laptop-chassis-3d transition-all duration-700 ${
            activeTab === 'dashboard' ? 'shadow-glow-dashboard' : activeTab === 'voice' ? 'shadow-glow-voice' : 'shadow-glow-scanner'
          }`}
        >
          {/* Laptop Screen Lid */}
          <div className="w-full aspect-[16/10] bg-[#0c0c0e] rounded-t-2xl p-[6px] md:p-[10px] border border-white/10 shadow-[inset_0_4px_20px_rgba(255,255,255,0.05),0_0_2px_rgba(255,255,255,0.2)] relative flex flex-col justify-between">
            {/* Screen Notch & LED */}
            <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-16 h-3 bg-[#0a0a0c] rounded-b-md border-b border-x border-white/5 flex items-center justify-center gap-1.5 z-40">
              <div className="w-1.5 h-1.5 rounded-full bg-[#111] border border-white/10" />
              <div className="w-1 h-1 rounded-full bg-nyaya-green-bright/60 animate-pulse" />
            </div>

            {/* Glossy Reflection Sheet */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.005] to-white/[0.04] rounded-t-2xl z-30" />

            {/* Screen Inner Viewport */}
            <div className="w-full h-full bg-[#070908] rounded-lg overflow-hidden border border-white/5 relative flex flex-col font-sans">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && <AdvocateDashboardMock key="dashboard" />}
                {activeTab === 'voice' && <VoiceAdviserMock key="voice" />}
                {activeTab === 'scanner' && <DocumentScannerMock key="scanner" />}
              </AnimatePresence>
            </div>
          </div>

          {/* Laptop Hinge */}
          <div className="w-[120px] md:w-[180px] h-[6px] md:h-[8px] bg-gradient-to-r from-[#0b0c0d] via-[#1a1b1e] to-[#0b0c0d] mx-auto rounded-t-sm border-t border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.5)] z-20" />

          {/* Laptop Base (Keyboard Deck) */}
          <div className="w-[104%] -ml-[2%] h-[12px] md:h-[18px] bg-gradient-to-b from-[#242428] via-[#141517] to-[#070709] rounded-b-xl relative border-t border-white/20 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.8),0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center justify-center">
            {/* Front Lip / Grip Indent */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[80px] md:w-[120px] h-[3px] md:h-[5px] bg-[#0c0c0e] rounded-b-md border-b border-x border-white/10" />
            {/* Faux Trackpad Reflection */}
            <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-[90px] md:w-[130px] h-[4px] md:h-[8px] border-t border-x border-white/5 rounded-t bg-white/[0.01]" />
          </div>
        </motion.div>
      </div>

      {/* Slide Navigation Dots (Below Laptop) */}
      <div className="flex justify-center items-center gap-3 mt-8">
        {(['dashboard', 'voice', 'scanner'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              activeTab === tab
                ? tab === 'dashboard'
                  ? 'bg-nyaya-green-bright w-6'
                  : tab === 'voice'
                  ? 'bg-violet-400 w-6'
                  : 'bg-nyaya-gold w-6'
                : 'bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to ${tab}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ==========================================
   UI MOCKUP 1: ADVOCATE DASHBOARD (STATE A)
   ========================================== */
function AdvocateDashboardMock() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex bg-[#0c100e] text-[#e2ede5] text-[10px] md:text-xs overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-[60px] md:w-[150px] border-r border-[#1e2a21] bg-[#090c0a] flex flex-col p-2.5 md:p-3 justify-between shrink-0">
        <div className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-1.5 px-1 py-0.5">
            <img src="/logo.png" className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 object-contain" alt="NyayaSatya Logo" />
            <span className="font-serif font-bold text-nyaya-text hidden md:inline tracking-wide text-xs">NyayaSatya</span>
          </div>

          {/* Nav Items */}
          <div className="space-y-1.5">
            {[
              { label: 'Overview', active: true, icon: Briefcase },
              { label: 'Client Requests', active: false, badge: 'Realtime', icon: Inbox },
              { label: 'AI Document Audit', active: false, icon: FileText },
              { label: 'Consultations', active: false, icon: Users },
            ].map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-1.5 md:p-2 rounded-lg cursor-pointer transition-colors ${
                  item.active 
                    ? 'bg-nyaya-green/30 border border-nyaya-green-bright/20 text-nyaya-green-bright font-medium' 
                    : 'text-nyaya-muted hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <item.icon size={13} className="shrink-0" />
                  <span className="hidden md:inline text-[10px]">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="hidden md:inline bg-nyaya-green-bright/20 text-nyaya-green-bright text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lower Sidebar */}
        <div className="pt-2 border-t border-[#1e2a21]/50 hidden md:block">
          <div className="flex items-center gap-2 px-1">
            <div className="w-5 h-5 rounded-full bg-[#1b2b20] border border-[#2d4d38] flex items-center justify-center text-[9px] font-bold text-nyaya-green-bright">
              AV
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-nyaya-text text-[9px]">Adv. A. Verma</p>
              <p className="text-[#647c6a] text-[8px]">Supreme Court of India</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="h-10 md:h-12 border-b border-[#1e2a21] bg-[#0a0e0c]/80 backdrop-blur px-3 md:px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-nyaya-green-bright animate-pulse" />
            <span className="font-medium text-[#c4d6c9] text-[10px] md:text-[11px]">Realtime Intake Channel</span>
          </div>
          
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#122217] border border-nyaya-green-bright/20 px-2 py-0.5 rounded-full">
              <Database size={10} className="text-nyaya-green-bright animate-pulse" />
              <span className="text-nyaya-green-bright font-medium text-[8px] md:text-[9px] uppercase tracking-wider">Supabase Live</span>
            </div>
            <Bell size={12} className="text-nyaya-muted cursor-pointer hover:text-nyaya-text" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-3 md:p-4 overflow-y-auto space-y-3.5 hide-scrollbars">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            {[
              { title: 'New Requests Today', val: '04', detail: 'Realtime updates' },
              { title: 'AI Risk Audit Pending', val: '02', detail: 'Scan contracts' },
              { title: 'Consultations Booked', val: '12', detail: 'This week' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[#111914] border border-[#1e2a21] p-2 md:p-2.5 rounded-lg">
                <p className="text-nyaya-muted text-[8px] uppercase tracking-wider">{stat.title}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-base md:text-xl font-bold text-nyaya-text leading-none">{stat.val}</span>
                  <span className="text-[7px] text-[#5c7a66]">{stat.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Client Intake List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-[#c4d6c9] text-[9px] md:text-[10px] uppercase tracking-wider">Active Client Inquiries</span>
              <span className="text-nyaya-green-bright text-[8px] cursor-pointer hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={10} />
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                { 
                  client: 'Ramesh K. (Pune)', 
                  desc: 'Property dispute over agricultural land subdivision and inheritance claim.',
                  time: 'Just Now', 
                  badge: 'New Request',
                  color: 'border-nyaya-green-bright/30 bg-nyaya-green/10 text-nyaya-green-bright' 
                },
                { 
                  client: 'Priya Sharma (Delhi)', 
                  desc: 'Employment contract review for non-compete clause compliance checks.',
                  time: '12m ago', 
                  badge: 'Pending AI Audit',
                  color: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400' 
                },
                { 
                  client: 'Amit Singh (Bengaluru)', 
                  desc: 'Consumer complaint filing assistance against an e-commerce platform.',
                  time: '1h ago', 
                  badge: 'Draft Ready',
                  color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' 
                }
              ].map((row, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#101612] hover:bg-[#151e19] border border-[#1d2720] hover:border-[#25332a] p-2.5 rounded-lg flex items-start justify-between gap-3 transition-colors duration-200"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-nyaya-text text-[9px] md:text-[10px]">{row.client}</span>
                      <span className="text-[#55695b] text-[8px]">• {row.time}</span>
                    </div>
                    <p className="text-nyaya-muted text-[9px] line-clamp-1 leading-snug">{row.desc}</p>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold shrink-0 uppercase tracking-wider border ${row.color}`}>
                    {row.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ==========================================
   UI MOCKUP 2: VOICE ADVISER (STATE B)
   ========================================== */
function VoiceAdviserMock() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col bg-[#07050d] text-[#eee] overflow-hidden justify-between p-3.5 md:p-5 relative"
    >
      {/* Dense Matrix Dot Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px' 
        }} 
      />

      {/* Floating dynamic top-bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-violet-500/10 pb-2 md:pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[8px] md:text-[9px] font-semibold text-violet-400 uppercase tracking-widest">Sarvam AI ASR Pipeline Active</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[7px] md:text-[8px] text-[#70648c]">Latency: <strong className="text-violet-400 font-mono">72ms</strong></span>
          <span className="text-[7px] md:text-[8px] text-[#70648c]">Routing: <strong className="text-violet-400">HI-IN ➔ EN</strong></span>
        </div>
      </div>

      {/* Central Glowing Waveform */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-2">
        {/* Glowing Pulsing Rings */}
        <div className="absolute w-24 h-24 md:w-36 md:h-36 rounded-full bg-violet-600/10 filter blur-md pulse-circle-slow" />
        <div className="absolute w-16 h-16 md:w-24 md:h-24 rounded-full bg-violet-500/15 filter blur-xs pulse-circle" />
        
        {/* Core Microphone Button */}
        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center border border-violet-400/20 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
          <Mic size={20} className="text-white animate-pulse" />
          
          {/* Rotating Language indicators around microphone */}
          <div className="absolute -top-1 -right-1.5 bg-[#120a22] border border-violet-500/30 rounded-full px-1.5 py-0.5 text-[7px] md:text-[8px] font-bold text-violet-400 shadow-sm">
            ASR
          </div>
        </div>

        {/* Concentric Floating Waveforms */}
        <div className="mt-4 md:mt-5 flex items-center justify-center gap-1 h-6">
          {[12, 28, 48, 32, 16, 36, 52, 40, 20, 32, 48, 24, 12].map((height, idx) => (
            <motion.div
              key={idx}
              animate={{ 
                height: [height * 0.4, height, height * 0.4] 
              }}
              transition={{ 
                duration: 1.2 + (idx % 3) * 0.2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="w-0.5 md:w-1 rounded-full bg-gradient-to-t from-violet-500 via-fuchsia-500 to-violet-400"
              style={{ height: `${height * 0.7}px` }}
            />
          ))}
        </div>

        {/* Selected Languages Pills */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-0.5 rounded-full border border-violet-500/40 bg-violet-950/30 text-violet-300 text-[8px] md:text-[9px] font-semibold flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-violet-400 animate-ping" />
            हिंदी (Hindi)
          </span>
          <span className="px-2.5 py-0.5 rounded-full border border-white/5 bg-white/[0.02] text-white/40 text-[8px] md:text-[9px]">
            English (EN)
          </span>
        </div>
      </div>

      {/* Audio Capture Live Transcription Overlay */}
      <div className="relative z-10 bg-black/60 border border-violet-500/10 rounded-xl p-2.5 md:p-3.5 space-y-1.5 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between text-[7px] md:text-[8px] text-[#70648c]">
          <span className="uppercase tracking-widest font-bold">Speech Transcription</span>
          <span className="flex items-center gap-1"><Languages size={8} /> English Translation Available</span>
        </div>
        
        <div className="space-y-1">
          <p className="font-serif italic text-white/95 text-xs md:text-sm tracking-wide">
            "सुनिए, क्या मैं उपभोक्ता अदालत में सीधे शिकायत दर्ज कर सकता हूँ?"
          </p>
          <div className="flex items-start gap-1 text-[9px] md:text-[10px] text-violet-300 border-t border-white/5 pt-1 mt-1 leading-snug">
            <span className="text-[8px] uppercase tracking-wider font-semibold text-violet-400/80 shrink-0 mt-0.5">[EN TRANS]:</span>
            <p className="italic">"Listen, can I file a complaint directly in the consumer court?"</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ==========================================
   UI MOCKUP 3: DOCUMENT SCANNER (STATE C)
   ========================================== */
function DocumentScannerMock() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex bg-[#0c0a07] text-[#eddcc4] text-[10px] md:text-xs overflow-hidden"
    >
      {/* Left Pane - Document Page Scanned */}
      <div className="w-1/2 border-r border-[#2a2218] bg-[#060504] p-3 flex flex-col justify-between relative overflow-hidden shrink-0">
        
        {/* Scan Green Laser Line */}
        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#52b788] to-transparent shadow-[0_0_8px_#52b788] z-20 scan-line" />

        {/* Document Header */}
        <div className="flex items-center justify-between border-b border-[#2a2218] pb-1.5 z-10 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText size={12} className="text-nyaya-gold shrink-0" />
            <span className="font-mono text-[8px] md:text-[9px] text-nyaya-muted truncate">rental_agreement_draft.pdf</span>
          </div>
          <span className="text-[7px] md:text-[8px] text-[#6b583f] font-mono shrink-0">Page 1 / 3</span>
        </div>

        {/* Stylized Document Page */}
        <div className="flex-1 my-2.5 bg-[#f9f8f6] border border-white/10 rounded p-3 text-[5px] md:text-[7px] text-[#333] space-y-2 relative overflow-hidden z-10 leading-normal select-none shadow-md">
          {/* Absolute overlay for paper look */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.02] pointer-events-none" />
          
          <div className="text-center font-bold border-b border-black/10 pb-1 mb-1 font-serif text-[7px] md:text-[9px] tracking-wide text-black uppercase">
            LEASE AGREEMENT
          </div>

          <p className="leading-relaxed">
            This Lease Agreement is made and entered into this 1st day of June, 2026, by and between <strong>Rajesh Patel</strong> (Lessor) and <strong>Manoj Verma</strong> (Lessee).
          </p>

          {/* Highlights simulating AI marked risk regions */}
          <div className="bg-red-500/15 border-l-2 border-red-500 p-1 rounded-r leading-relaxed">
            <span className="font-bold text-[6px] md:text-[8px] text-red-700">Clause 12 (Escalation):</span> The rent shall increase by <strong>15%</strong> at the completion of every 11-month lease term. The new rent is payable immediately on renewal.
          </div>

          <p className="leading-relaxed">
            The premises shall be used for residential purposes only. The lessee shall keep the premises clean and undamaged.
          </p>

          <div className="bg-amber-500/15 border-l-2 border-amber-500 p-1 rounded-r leading-relaxed">
            <span className="font-bold text-[6px] md:text-[8px] text-amber-700">Clause 19 (Termination):</span> Either party may terminate with 30 days notice. However, a <strong>36-month lock-in</strong> period applies where lessee cannot terminate.
          </div>
        </div>

        {/* Document Footer */}
        <div className="text-[7px] text-nyaya-muted font-mono z-10 shrink-0 flex items-center gap-1 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-nyaya-gold" /> Scan analysis complete
        </div>
      </div>

      {/* Right Pane - AI Audit Extract */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0e0c09] p-3 md:p-4">
        
        {/* Header */}
        <div className="border-b border-[#2a2218] pb-2 mb-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-nyaya-gold animate-pulse" />
            <span className="font-bold text-nyaya-gold text-[9px] md:text-[10px] uppercase tracking-wider">AI Audit Extraction</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold">
            High Risk (72%)
          </div>
        </div>

        {/* Scrollable Risk list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 hide-scrollbars">
          
          {/* Metadata Extracted */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#17130e] border border-[#2a2218] p-1.5 rounded-lg text-[8px] md:text-[9px]">
            <div><span className="text-nyaya-muted">Lessor:</span> <strong className="text-nyaya-text">Rajesh Patel</strong></div>
            <div><span className="text-nyaya-muted">Lessee:</span> <strong className="text-nyaya-text">Manoj Verma</strong></div>
            <div><span className="text-nyaya-muted">Security:</span> <strong className="text-nyaya-text">₹1,50,000</strong></div>
            <div><span className="text-nyaya-muted">Jurisdiction:</span> <strong className="text-nyaya-text">Mumbai</strong></div>
          </div>

          {/* Audit Risks */}
          <div className="space-y-2">
            {[
              {
                clause: 'Rent Escalation (Clause 12)',
                severity: 'CRITICAL',
                color: 'text-red-400 bg-red-950/20 border-red-900/40',
                desc: '15% annual rent escalation is substantially higher than the market benchmark (5% - 8% range).'
              },
              {
                clause: 'Termination Lock-in (Clause 19)',
                severity: 'HIGH RISK',
                color: 'text-amber-400 bg-amber-950/20 border-amber-900/40',
                desc: '36-month lock-in clause is highly restrictive. Should negotiate mutual exits or reduce to 11-month.'
              },
              {
                clause: 'Stamp Duty Audit',
                severity: 'VERIFIED',
                color: 'text-nyaya-green-bright bg-nyaya-green/10 border-nyaya-green-bright/10',
                desc: 'Stamped duty of ₹500 verified and correct for Maharashtra rent agreement regulation.'
              }
            ].map((risk, idx) => (
              <div 
                key={idx}
                className={`border p-2 rounded-lg space-y-1 ${risk.color}`}
              >
                <div className="flex items-center justify-between font-bold text-[8px] md:text-[9px]">
                  <span>{risk.clause}</span>
                  <span className="text-[7px] uppercase tracking-wide border px-1 rounded bg-black/35 border-current/25">{risk.severity}</span>
                </div>
                <p className="text-[8px] md:text-[9px] text-[#bcaaa4] leading-relaxed">{risk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
