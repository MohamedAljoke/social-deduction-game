import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div className="mb-5">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input 
        id={id}
        className={`w-full py-4 px-5 bg-bg-secondary border-2 border-border rounded-xl text-text-primary text-base font-inherit transition-all duration-200 focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_4px_rgba(233,69,96,0.4)] placeholder:text-text-muted ${className}`}
        {...props}
      />
    </div>
  );
}
