import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'host' | 'success' | 'warning' | 'danger';
}

const VARIANT_STYLES = {
  default: 'bg-accent-primary text-white',
  host: 'bg-accent-primary text-white',
  success: 'bg-success/20 text-success border border-success/30',
  warning: 'bg-warning/20 text-warning border border-warning/30',
  danger: 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase ${VARIANT_STYLES[variant]}`}>
      {children}
    </span>
  );
}
