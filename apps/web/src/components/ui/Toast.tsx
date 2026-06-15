'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// --- Types ---

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

// --- Context ---

const ToastContext = createContext<ToastContextType | null>(null);

// --- Constants ---

const MAX_VISIBLE = 3;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// --- Component ---

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm w-full animate-slide-in ${VARIANT_STYLES[toast.variant]}`}
    >
      {VARIANT_ICONS[toast.variant]}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Provider ---

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, variant, duration: duration ?? DEFAULT_DURATIONS[variant] }];
      // Keep only the latest MAX_VISIBLE
      return next.slice(-MAX_VISIBLE);
    });
  }, []);

  const toast = React.useMemo(
    () => ({
      success: (msg: string, dur?: number) => addToast(msg, 'success', dur),
      error: (msg: string, dur?: number) => addToast(msg, 'error', dur),
      warning: (msg: string, dur?: number) => addToast(msg, 'warning', dur),
      info: (msg: string, dur?: number) => addToast(msg, 'info', dur),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — portal-like, fixed to top-right */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// --- Hook ---

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
