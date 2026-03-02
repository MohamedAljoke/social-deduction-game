import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-bg-card border border-border rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.3)] ${className}`}>
      {children}
    </div>
  );
}
