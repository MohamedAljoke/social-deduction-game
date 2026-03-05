import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`w-full rounded-3xl p-8 shadow-lg border ${className}`}
      style={{ backgroundColor: "#16213e", borderColor: "#2a2a4a" }}
    >
      {children}
    </div>
  );
}
