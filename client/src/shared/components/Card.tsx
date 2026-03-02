import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`w-full rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.3)] border ${className}`}
      style={{ backgroundColor: "#16213e", borderColor: "#2a2a4a" }}
    >
      <div className="-8">aa{children}</div>
    </div>
  );
}
