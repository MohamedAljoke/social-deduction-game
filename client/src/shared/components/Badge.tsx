import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'host' | 'success' | 'warning' | 'danger';
}

const VARIANT_STYLES = {
  default: { bg: '#e94560', color: 'white', border: 'none' },
  host: { bg: '#e94560', color: 'white', border: 'none' },
  success: { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' },
  warning: { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  danger: { bg: 'rgba(233, 69, 96, 0.2)', color: '#e94560', border: 'rgba(233, 69, 96, 0.3)' },
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <span 
      className="text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase"
      style={{ backgroundColor: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}
    >
      {children}
    </span>
  );
}
