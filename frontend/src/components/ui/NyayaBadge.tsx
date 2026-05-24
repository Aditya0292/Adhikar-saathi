import { ReactNode } from 'react';

type BadgeVariant = 'fast' | 'verified' | 'sos' | 'verified-lawyer' | 'pending';

interface NyayaBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;

  className?: string;
}

export function NyayaBadge({ variant, children, className = '' }: NyayaBadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-sans';
  
  const variantClasses = {
    'fast': 'bg-amber-50 text-amber-700 border border-amber-200',
    'verified': 'bg-nyaya-green-bright/20 text-nyaya-green-bright border border-nyaya-green-bright/30',
    'sos': 'bg-red-50 text-red-600 border border-red-200',
    'verified-lawyer': 'bg-white/10 text-nyaya-text border border-white/20',
    'pending': 'bg-slate-100 text-slate-600 border border-slate-300'
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
