import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "w-full py-5 px-8 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none";

  const variants = {
    primary:
      "text-ink hover:-translate-y-0.5 shimmer bg-gradient-brand",
    secondary:
      "text-ink border-2 border-rim bg-surface-raised hover:border-brand",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${loading ? "pointer-events-none" : ""} ${className}`}
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
