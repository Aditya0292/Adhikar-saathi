import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';
type Theme = 'dark' | 'light'; // Controls text colors for ghost buttons

interface NyayaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  theme?: Theme;
  children: ReactNode;
  fullWidth?: boolean;
}

export function NyayaButton({
  variant = 'primary',
  size = 'md',
  theme = 'light',
  children,
  className = '',
  fullWidth = false,
  ...props
}: NyayaButtonProps) {
  
  const baseClasses = 'font-sans rounded-xl transition-all duration-300 flex items-center justify-center gap-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-nyaya-green-bright';
  
  const sizeClasses = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base px-6 py-3 font-medium',
    lg: 'text-base px-8 py-4 font-semibold'
  };
  
  const variantClasses = {
    primary: 'bg-nyaya-green-bright text-nyaya-dark hover:scale-[1.02] shadow-lg shadow-nyaya-green-bright/25',
    ghost: theme === 'dark' 
      ? 'border border-white/20 text-nyaya-text hover:bg-white/5' 
      : 'border border-black/20 text-nyaya-text-dark hover:bg-black/5',
    outline: theme === 'dark' 
      ? 'border border-white/20 text-nyaya-text hover:bg-white/5' 
      : 'border border-black/20 text-nyaya-text-dark hover:bg-black/5',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20'
  };

  return (
    <button 
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
