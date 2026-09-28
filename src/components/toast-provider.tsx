"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };
type ToastContextValue = { showToast: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-4 bottom-24 z-[90] flex flex-col items-center gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96">
        {toasts.map((toast) => (
          <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-[0_16px_40px_-16px_#17251d90] ${toast.tone === "error" ? "border-red-200" : toast.tone === "info" ? "border-[#d7e0d2]" : "border-[#cfe0cf]"}`}>
            <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${toast.tone === "error" ? "bg-red-50 text-red-700" : toast.tone === "info" ? "bg-[#eef2e9] text-[#45634c]" : "bg-[#e7f1e5] text-[#365d3e]"}`}>{toast.tone === "error" ? "!" : toast.tone === "info" ? "i" : "✓"}</span>
            <p className="pt-1 text-sm font-medium text-[#314036]">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
