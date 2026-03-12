import React from "react";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <div
      className="max-w-[480px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto px-5 py-10 min-h-screen flex flex-col justify-center items-center"
      style={{ backgroundColor: "#0f0f1a" }}
    >
      {children}
    </div>
  );
}
