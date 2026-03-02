import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  loading = false,
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = "w-full py-4 px-6 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none";
  
  const variantStyles = variant === 'primary' 
    ? "bg-gradient-to-br from-accent-primary to-accent-secondary text-white border-none hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(233,69,96,0.4)]"
    : "bg-bg-secondary border-2 border-border text-text-primary hover:border-accent-primary hover:shadow-none";
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${loading ? 'pointer-events-none' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      )}
      {children}
    </button>
  );
}
