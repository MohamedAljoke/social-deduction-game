import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "host" | "success" | "warning" | "danger";
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-brand text-white border-transparent",
  host:    "bg-brand text-white border-transparent",
  success: "bg-success/20 text-success border border-success/30",
  warning: "bg-warning/20 text-warning border border-warning/30",
  danger:  "bg-brand/20 text-brand-dim border border-brand/30",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
