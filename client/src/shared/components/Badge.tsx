import './Badge.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'host' | 'success' | 'warning' | 'danger';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
}
