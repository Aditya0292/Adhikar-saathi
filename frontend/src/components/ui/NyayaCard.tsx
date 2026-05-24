import { ReactNode } from 'react';

type CardTheme = 'light' | 'dark' | 'green';

interface NyayaCardProps {
  theme?: CardTheme;
  children: ReactNode;
  className?: string;
}

export function NyayaCard({ theme = 'light', children, className = '' }: NyayaCardProps) {
  
  const baseClasses = 'rounded-2xl transition-shadow duration-300';
  
  const themeClasses = {
    light: 'bg-white border border-black/8 shadow-sm hover:shadow-md',
    dark: 'bg-nyaya-dark2 border border-white/8',
    green: 'bg-nyaya-green text-nyaya-text shadow-xl shadow-nyaya-green/20'
  };

  return (
    <div className={`${baseClasses} ${themeClasses[theme]} ${className}`}>
      {children}
    </div>
  );
}
