interface AvatarProps {
  name: string;
  index?: number;
  size?: "small" | "medium" | "large";
}

const GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
];

const SIZE_CLASSES = {
  small: "w-8 h-8 text-xs",
  medium: "w-9 h-9 text-sm",
  large: "w-12 h-12 text-lg",
};

export function Avatar({ name, index = 0, size = "medium" }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-semibold ${SIZE_CLASSES[size]}`}
      style={{ background: gradient }}
    >
      {initials}
    </div>
  );
}
