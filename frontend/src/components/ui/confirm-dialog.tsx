"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  loading = false,
  className,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const isBusy = loading || busy;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Caller handles toast; keep dialog open on error
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (!isBusy) onOpenChange(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isBusy) onOpenChange(false);
  };

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
    >
      <Card
        className={cn("w-full max-w-md shadow-xl border-[#E5E7EB]", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle id="confirm-dialog-title" className="text-lg font-semibold text-[#111827]">
            {title}
          </CardTitle>
          {description && (
            <p id="confirm-dialog-desc" className="text-sm text-muted mt-1">
              {description}
            </p>
          )}
        </CardHeader>
        <CardFooter className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={isBusy}
            loading={isBusy}
          >
            {confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}

export { ConfirmDialog };
