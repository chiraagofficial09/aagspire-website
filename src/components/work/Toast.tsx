import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

// ─── Context ───────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue['toast'] => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};

// ─── Variant Config ────────────────────────────────────────────
const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; bg: string; border: string; text: string; glow: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-ember/10',
    border: 'border-ember/30',
    text: 'text-ember',
    glow: 'shadow-[0_0_20px_rgba(255,90,31,0.2)]',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-ember/10',
    border: 'border-ember/30',
    text: 'text-ember',
    glow: 'shadow-[0_0_20px_rgba(255,90,31,0.15)]',
  },
  info: {
    icon: Info,
    bg: 'bg-white/10',
    border: 'border-white/20',
    text: 'text-white',
    glow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)]',
  },
};

// ─── Single Toast Item ─────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast: t,
  onDismiss,
}) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const cfg = variantConfig[t.variant];
  const Icon = cfg.icon;

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(t.id), 300);
    }, t.duration);
    return () => clearTimeout(timerRef.current);
  }, [t.duration, t.id, onDismiss]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(t.id), 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3.5 rounded-xl border
        bg-[#0c0e16]/90 backdrop-blur-xl
        ${cfg.border} ${cfg.glow}
        transition-all duration-300 ease-out
        ${exiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'}
        animate-toast-enter
        shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)]
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.text}`} />
      <p className="text-sm text-white/90 font-medium flex-1 leading-snug">{t.message}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Provider ──────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((variant: ToastVariant, message: string, duration = 4000) => {
    const id = `toast-${++counterRef.current}-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration, createdAt: Date.now() }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur),
    warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container — Bottom Right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 w-[380px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
