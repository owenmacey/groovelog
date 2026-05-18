"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-gold text-text-inverse font-medium hover:bg-accent-amber",
  secondary:
    "bg-bg-elevated border border-border-default text-text-primary hover:border-border-strong",
  ghost:
    "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
  danger:
    "bg-error text-text-primary hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-3 text-sm rounded-sm",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-base rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-body select-none transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";
