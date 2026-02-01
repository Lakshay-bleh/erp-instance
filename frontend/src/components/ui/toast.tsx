"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    title?: string;
    description?: string;
    variant?: "default" | "success" | "error";
  }
>(({ className, title, description, variant = "default", ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
      variant === "success" && "border-success/30 bg-success/5",
      variant === "error" && "border-danger/30 bg-danger/5",
      variant === "default" && "border-[#E5E7EB] bg-surface",
      className
    )}
    {...props}
  >
    <div className="grid gap-1">
      {title && <div className="text-sm font-semibold">{title}</div>}
      {description && <div className="text-sm text-muted">{description}</div>}
    </div>
    <ToastPrimitive.Close
      className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </ToastPrimitive.Close>
  </ToastPrimitive.Root>
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastClose = ToastPrimitive.Close;

export { ToastProvider, ToastViewport, Toast, ToastClose };
