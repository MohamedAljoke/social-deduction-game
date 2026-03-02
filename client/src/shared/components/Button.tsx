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
  const baseStyles = "w-full py-5 px-8 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none";
  
  const variantStyles = variant === 'primary' 
    ? "text-white hover:-translate-y-0.5"
    : "text-white border-2 hover:border-[#e94560]";
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${loading ? 'pointer-events-none' : ''} ${className}`}
      style={{ 
        background: variant === 'primary' ? 'linear-gradient(135deg, #e94560, #ff6b6b)' : '#1a1a2e',
        borderColor: variant === 'secondary' ? '#2a2a4a' : 'transparent',
      }}
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
