"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted/30 text-muted border border-muted/30",
        severity_p1: "bg-danger/15 text-danger border border-danger/30",
        severity_p2: "bg-warning/15 text-warning border border-warning/30",
        severity_p3: "bg-muted/30 text-muted border border-muted/30",
        status_open: "bg-accent/15 text-accent border border-accent/30",
        status_in_progress: "bg-warning/15 text-warning border border-warning/30",
        status_resolved: "bg-success/15 text-success border border-success/30",
        module: "bg-primary/12 text-primary border border-primary/25",
        category: "bg-muted/30 text-muted border border-muted/30",
        tag: "bg-surface text-muted border border-[#E5E7EB]",
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
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
