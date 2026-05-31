import { motion } from 'framer-motion';
import { Check, FileSearch, FileType, Scale, FileCheck } from 'lucide-react';

interface DocProgressProps {
  progress: number;
  label: string;
}

const STEPS = [
  { id: 1, name: 'Reading document',      icon: FileSearch, range: [0, 25]  },
  { id: 2, name: 'Identifying type',      icon: FileType,   range: [25, 40] },
  { id: 3, name: 'Analysing your rights', icon: Scale,      range: [40, 75] },
  { id: 4, name: 'Preparing report',      icon: FileCheck,  range: [75, 100] },
];

function getStepStatus(step: typeof STEPS[0], progress: number): 'completed' | 'active' | 'pending' {
  if (progress >= step.range[1]) return 'completed';
  if (progress >= step.range[0]) return 'active';
  return 'pending';
}

export default function DocProgress({ progress, label }: DocProgressProps) {
  return (
    <motion.div
      className="w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step, progress);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center relative">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    status === 'completed'
                      ? 'bg-nyaya-green-bright border-nyaya-green-bright text-white'
                      : status === 'active'
                      ? 'bg-white border-nyaya-green-bright text-nyaya-green-bright shadow-md shadow-nyaya-green-bright/20'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                  animate={status === 'active' ? { scale: [1, 1.08, 1] } : {}}
                  transition={status === 'active' ? { repeat: Infinity, duration: 2 } : {}}
                >
                  {status === 'completed' ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    <Icon size={16} />
                  )}
                </motion.div>
                <span className={`absolute -bottom-6 text-[10px] font-medium whitespace-nowrap ${
                  status === 'completed' ? 'text-nyaya-green-bright' :
                  status === 'active' ? 'text-nyaya-text-dark' :
                  'text-slate-300'
                }`}>
                  {step.name}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-nyaya-green-bright rounded-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: status === 'completed' ? '100%' :
                             status === 'active' ? '50%' : '0%'
                    }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-nyaya-text-dark">{label}</span>
          <span className="text-sm font-bold text-nyaya-green-bright tabular-nums">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2D6A4F, #52B788)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Estimated time */}
      {progress < 30 && (
        <motion.p
          className="text-center text-xs text-slate-400 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1 }}
        >
          This usually takes 30-60 seconds
        </motion.p>
      )}

      {/* Scanning animation */}
      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-nyaya-green-bright"
              animate={{ height: [8, 24, 8] }}
              transition={{
                repeat: Infinity,
                duration: 1,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
