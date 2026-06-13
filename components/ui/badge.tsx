import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-brand-light)] text-[var(--color-brand)]",
        secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
        destructive: "bg-red-50 text-red-600",
        outline: "border border-[var(--color-border)] text-[var(--color-foreground)]",
        warning: "bg-amber-50 text-amber-700",
        muted: "bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
