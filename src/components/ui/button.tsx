import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Every tappable control is at least 44px tall; primary actions are 48px
 * (PRD §5.1). Variants map directly onto the colour tokens.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-card border text-body font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary: "border-line bg-background text-ink hover:bg-surface",
        subtle: "border-transparent bg-surface text-ink hover:bg-line",
        danger: "border-danger bg-danger text-white hover:opacity-90",
        ghost: "border-transparent bg-transparent text-accent hover:bg-accent-soft",
        whatsapp: "border-success bg-success text-white hover:opacity-90",
      },
      size: {
        sm: "h-11 px-3 text-small",
        md: "h-11 px-4",
        lg: "h-touch px-5",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. an `<a>`) with button styling. */
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", ...props },
  ref,
) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
