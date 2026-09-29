'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Individual Toast ─────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
  error: <XCircle className="h-4 w-4 flex-shrink-0" />,
  warning: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
  info: <Info className="h-4 w-4 flex-shrink-0" />,
};

// On the prototype's tokens: the palette has no warning colour of its own beyond amber and
// --destructive, so a toast borrows the same tints as Badge and Notice.
const STYLES: Record<ToastVariant, string> = {
  success: 'border-[#10b98135] bg-card text-[#6ee7b7]',
  error: 'border-[#fb718530] bg-card text-[#fda4af]',
  warning: 'border-[#fbbf2430] bg-card text-[#fcd34d]',
  info: 'border-border bg-card text-foreground',
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-primary',
  error: 'text-destructive',
  warning: 'text-[#fcd34d]',
  info: 'text-muted-foreground',
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className={`flex max-w-sm animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 text-ui-md shadow-2xl ${STYLES[toast.variant]}`}
      role="alert"
    >
      <span className={ICON_STYLES[toast.variant]}>{ICONS[toast.variant]}</span>
      <p className="flex-1 font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="-mt-0.5 opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    warning: (m) => toast(m, 'warning'),
    info: (m) => toast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal */}
      <div
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside <ToastProvider>');
  return ctx;
}
