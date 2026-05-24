import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type RiskTier = 'low' | 'medium' | 'high';

interface RiskMeterProps {
  score: number; // 0 to 1
  tier: RiskTier;
  label?: string;
}

export function RiskMeter({ score, tier, label = 'Risk Score' }: RiskMeterProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Arc calculation for an SVG half-circle (gauge)
  const radius = 40;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = mounted ? circumference - (score * circumference) : circumference;
  
  const tierColors = {
    low: '#52B788', // nyaya-green-bright
    medium: '#F59E0B', // amber-500
    high: '#DC2626' // red-600
  };

  const color = tierColors[tier];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        {/* Background Arc */}
        <svg className="absolute top-0 left-0 w-24 h-24 transform -rotate-180" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#E2E8F0" // slate-200 for light mode background
            strokeWidth="8"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Animated Value Arc */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute bottom-0 inset-x-0 text-center flex flex-col items-center justify-end h-full pb-1">
          <span className="font-sans font-bold text-lg text-nyaya-text-dark leading-none" style={{ color }}>
            {Math.round(score * 100)}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-nyaya-muted mt-2 font-sans font-semibold">
          {label}
        </span>
      )}
    </div>
  );
}
