import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  return (
    <div className="mb-5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold mb-2 uppercase tracking-wider text-ink-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full py-4 px-5 rounded-xl text-base transition-all duration-200
          focus:outline-none placeholder:text-sm
          bg-surface-raised border-2 border-rim text-ink
          focus:border-brand ${className}`}
        {...props}
      />
    </div>
  );
}
