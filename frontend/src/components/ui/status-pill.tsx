"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

export type StatusPillStatus = "Open" | "In Progress" | "Resolved";

const statusConfig: Record<
  StatusPillStatus,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  Open: {
    label: "Open",
    dotClass: "bg-accent",
    bgClass: "bg-accent/10 border-accent/30",
    textClass: "text-accent font-medium",
  },
  "In Progress": {
    label: "In Progress",
    dotClass: "bg-warning",
    bgClass: "bg-warning/10 border-warning/30",
    textClass: "text-warning font-medium",
  },
  Resolved: {
    label: "Resolved",
    dotClass: "bg-success",
    bgClass: "bg-success/10 border-success/30",
    textClass: "text-success font-medium",
  },
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

function StatusPill({ status, className, ...props }: StatusPillProps) {
  const normalized =
    status === "Open" || status === "In Progress" || status === "Resolved"
      ? status
      : "Open";
  const config = statusConfig[normalized];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        config.bgClass,
        config.textClass,
        className
      )}
      {...props}
    >
      <Circle className={cn("h-1.5 w-1.5 fill-current", config.dotClass)} />
      {config.label}
    </span>
  );
}

export { StatusPill };
