import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone } from 'lucide-react';
import { api } from '../../api/client';
import AdvocateMap from '../lawyer/AdvocateMap';

export function SOSButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const handleSOSCall = async () => {
    console.log("Connect clicked, initiating API request to /api/v1/voice/sos-call...");
    setIsCalling(true);
    setCallStatus('Connecting...');
    try {
      await api.post('/api/v1/voice/sos-call', {});
      setCallStatus('Call initiated! Your phone should ring shortly.');
      setTimeout(() => {
        setIsOpen(false);
        setIsCalling(false);
        setCallStatus(null);
      }, 3000);
    } catch (err: any) {
      console.error("SOS call failed:", err);
      const errMsg = err?.message || 'Failed to connect. Please dial 112 manually.';
      setCallStatus(errMsg);
      setTimeout(() => {
        setIsCalling(false);
      }, 6000);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50">
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring ::after equivalent in JSX */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-500 pointer-events-none"
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          
          {/* SOS Button */}
          <motion.button 
            whileHover={{ scale: 1.08, boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.4)" }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              console.log("Floating SOS button clicked, opening modal");
              setIsOpen(true);
            }}
            className="w-[56px] h-[56px] bg-red-600 rounded-full text-white font-sans font-bold text-lg shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/30 cursor-pointer"
            aria-label="Emergency SOS"
          >
            SOS
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-xs">
            {!isCalling && (
              <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
            )}

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative z-10 border border-black/5 flex flex-col md:flex-row gap-6 max-h-[92vh] overflow-y-auto"
            >
              {/* Left Side: Call Controls */}
              <div className="w-full md:w-[42%] flex flex-col justify-between text-center md:text-left">
                <div className="flex-grow flex flex-col justify-center">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 text-red-600">
                    <AlertTriangle size={24} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {isCalling ? 'Emergency Legal Call' : 'Start Emergency Call?'}
                  </h2>
                  
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    {callStatus ? (
                      <span className="font-semibold text-slate-700">{callStatus}</span>
                    ) : (
                      'This will trigger an outbound emergency voice call to your registered phone number. Use only for genuine legal emergencies.'
                    )}
                  </p>

                  {isCalling && (
                    <div className="flex justify-center md:justify-start items-center gap-1.5 h-8 mb-6">
                      <motion.div className="w-1.5 h-4 bg-red-400 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.0 }} />
                      <motion.div className="w-1.5 h-6 bg-red-500 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.15 }} />
                      <motion.div className="w-1.5 h-8 bg-red-600 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} />
                      <motion.div className="w-1.5 h-6 bg-red-500 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.45 }} />
                      <motion.div className="w-1.5 h-4 bg-red-400 rounded-full" animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.6 }} />
                    </div>
                  )}

                  {/* Emergency Numbers Banner */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Emergency Numbers</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-650">
                      <div>🚨 Police: <strong className="text-slate-800">100 / 112</strong></div>
                      <div>👩 Women: <strong className="text-slate-800">181</strong></div>
                    </div>
                  </div>
                </div>

                {!isCalling ? (
                  <div className="flex gap-3 mt-auto">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl text-sm hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSOSCall}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Phone size={14} /> Connect
                    </motion.button>
                  </div>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsOpen(false);
                      setIsCalling(false);
                      setCallStatus(null);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl transition-all text-sm cursor-pointer mt-auto"
                  >
                    Close Window
                  </motion.button>
                )}
              </div>

              {/* Right Side: Emergency Map */}
              <div className="w-full md:w-[58%] h-[320px] md:h-[450px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 flex-shrink-0">
                <AdvocateMap
                  mode="emergency"
                  showFilters={false}
                  className="h-full w-full !border-0"
                />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
