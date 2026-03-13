interface AvatarProps {
  name: string;
  index?: number;
  size?: "small" | "medium" | "large";
}

const SIZE_CLASSES = {
  small:  "w-8 h-8 text-xs",
  medium: "w-9 h-9 text-sm",
  large:  "w-12 h-12 text-lg",
};

export function Avatar({ name, index = 0, size = "medium" }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  // avatar-gradient-N classes are defined in index.css and reference @theme vars
  const gradientClass = `avatar-gradient-${index % 5}`;

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-semibold text-ink ${SIZE_CLASSES[size]} ${gradientClass}`}
    >
      {initials}
    </div>
  );
}
