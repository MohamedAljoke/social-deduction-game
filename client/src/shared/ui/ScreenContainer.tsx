import React from "react";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-10 min-h-screen flex flex-col justify-center items-center bg-surface-base">
      {children}
    </div>
  );
}
