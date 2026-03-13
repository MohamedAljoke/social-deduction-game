import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`w-full rounded-3xl p-8 shadow-lg border border-rim bg-surface-card ${className}`}
    >
      {children}
    </div>
  );
}
