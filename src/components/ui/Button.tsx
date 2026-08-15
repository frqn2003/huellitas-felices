"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-brand-900 hover:bg-accent-600 active:scale-[0.97] disabled:hover:bg-accent-500",
  secondary:
    "bg-brand-900 text-cream-50 hover:bg-brand-700 active:scale-[0.97] disabled:hover:bg-brand-900",
  outline:
    "border border-brand-900 bg-transparent text-brand-900 hover:bg-brand-900/5 active:scale-[0.97]",
  ghost: "bg-transparent text-brand-900 hover:bg-brand-900/10 active:scale-[0.97]",
  destructive:
    "bg-destructive text-white hover:bg-red-700 active:scale-[0.97] disabled:hover:bg-destructive",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 min-h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 min-h-11 px-5 text-sm gap-2",
  lg: "h-12 min-h-12 px-6 text-base gap-2",
  icon: "h-11 w-11",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex cursor-pointer items-center justify-center rounded-pill font-bold transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
