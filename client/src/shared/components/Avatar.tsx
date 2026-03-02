import './Avatar.css';

interface AvatarProps {
  name: string;
  index?: number;
  size?: 'small' | 'medium' | 'large';
}

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
];

export function Avatar({ name, index = 0, size = 'medium' }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div 
      className={`avatar avatar-${size}`} 
      style={{ background: gradient }}
    >
      {initials}
    </div>
  );
}
