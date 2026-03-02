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
          className="block text-xs font-semibold mb-2 uppercase tracking-wider"
          style={{ color: '#a0a0b8' }}
        >
          {label}
        </label>
      )}
      <input 
        id={id}
        className={`w-full py-4 px-5 rounded-xl text-base transition-all duration-200 focus:outline-none placeholder:text-sm ${className}`}
        style={{ 
          backgroundColor: '#1a1a2e', 
          border: '2px solid #2a2a4a',
          color: '#ffffff',
        }}
        {...props}
      />
    </div>
  );
}
