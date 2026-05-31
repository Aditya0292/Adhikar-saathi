import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface RiskMeterProps {
  score: number; // 0.0 to 1.0
  tier: string;  // "low" | "medium" | "high" | "critical"
  summary?: string;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'LOW RISK' },
  medium:   { color: '#eab308', bg: 'rgba(234,179,8,0.1)',  label: 'MEDIUM RISK' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'HIGH RISK' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'CRITICAL RISK' },
};

function getScoreColor(score: number): string {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.50) return '#f97316';
  if (score >= 0.25) return '#eab308';
  return '#22c55e';
}

export default function RiskMeter({ score, tier, summary }: RiskMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = TIER_CONFIG[tier] || TIER_CONFIG.low;
  const displayScore = Math.round(score * 100);
  const color = getScoreColor(score);

  // Arc geometry
  const cx = 120;
  const cy = 120;
  const r = 90;
  const strokeWidth = 14;
  const startAngle = 180;
  const endAngle = 0;
  const totalAngle = 180; // semicircle

  // Background arc path (full semicircle)
  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);

  // Filled arc path (proportional to score)
  const fillAngle = startAngle - (score * totalAngle);
  const fillArc = describeArc(cx, cy, r, startAngle, Math.max(fillAngle, endAngle + 0.1));

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(displayScore), 100);
    return () => clearTimeout(timer);
  }, [displayScore]);

  return (
    <div className="flex flex-col items-center">
      {/* SVG Arc Gauge */}
      <div className="relative" style={{ width: 240, height: 140 }}>
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* Background track */}
          <path
            d={bgArc}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated fill */}
          <motion.path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <motion.span
            className="text-4xl font-bold tabular-nums"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            {animatedScore}
          </motion.span>
          <span className="text-xs text-slate-400 font-medium -mt-1">/ 100</span>
        </div>
      </div>

      {/* Risk tier label */}
      <motion.div
        className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
        style={{ backgroundColor: config.bg, color: config.color }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        {config.label}
      </motion.div>

      {/* Summary */}
      {summary && (
        <motion.p
          className="mt-3 text-sm text-slate-500 text-center leading-relaxed max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {summary}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Create an SVG arc path from startAngle to endAngle (degrees, 0=right, 180=left).
 */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy - r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy - r * Math.sin(endRad);
  
  const largeArc = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;
  const sweep = startAngle > endAngle ? 1 : 0;
  
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}
