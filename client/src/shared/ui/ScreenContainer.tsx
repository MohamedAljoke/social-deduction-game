import React from 'react';

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <div 
      className="max-w-[480px] mx-auto px-5 py-10 min-h-screen flex flex-col justify-center items-center"
      style={{ backgroundColor: '#0f0f1a' }}
    >
      {children}
    </div>
  );
}
