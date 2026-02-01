"use client";

import * as React from "react";
import { ToastProvider, ToastViewport, Toast } from "@/components/ui/toast";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
};

const TOAST_EVENT = "erp-toast";

export function Toaster() {
  const [toasts, setToasts] = React.useState<Array<ToastOptions & { id: number }>>([]);
  const idRef = React.useRef(0);

  React.useEffect(() => {
    const handler = (e: CustomEvent<ToastOptions>) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { ...e.detail, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 5000);
    };
    window.addEventListener(TOAST_EVENT, handler as EventListener);
    return () => window.removeEventListener(TOAST_EVENT, handler as EventListener);
  }, []);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastProvider>
      <ToastViewport />
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          open
          onOpenChange={(open) => !open && remove(t.id)}
        />
      ))}
    </ToastProvider>
  );
}

export function useToast() {
  return {
    toast: (opts: ToastOptions) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: opts }));
      }
    },
  };
}
