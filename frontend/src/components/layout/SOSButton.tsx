import { motion } from 'framer-motion';

export function SOSButton() {
  return (
    <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50">
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring ::after equivalent in JSX */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500"
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        
        {/* SOS Button */}
        <button 
          className="w-[56px] h-[56px] bg-red-600 rounded-full text-white font-sans font-bold text-lg shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-500/30 active:scale-95"
          aria-label="Emergency SOS"
        >
          SOS
        </button>
      </div>
    </div>
  );
}
