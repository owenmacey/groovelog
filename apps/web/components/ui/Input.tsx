"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-md border bg-bg-elevated px-3 text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent-gold focus:border-border-accent",
            error
              ? "border-error"
              : "border-border-default hover:border-border-strong",
            "transition-colors",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {!error && hint && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
