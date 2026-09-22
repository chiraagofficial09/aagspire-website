import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'alert' | 'warning' | 'info' | 'error' | 'success';
  variant?: 'alert' | 'warning' | 'info' | 'error' | 'success';
  onOk?: () => void;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'danger' | 'warning' | 'info';
  variant?: 'confirm' | 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalState {
  isOpen: boolean;
  isConfirm: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'alert' | 'warning' | 'info' | 'error' | 'success' | 'confirm' | 'danger';
  resolve?: (value: boolean) => void;
}

interface AlertContextType {
  showAlert: (messageOrOptions: string | AlertOptions) => Promise<void>;
  showConfirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | null>(null);

let globalShowAlert: ((messageOrOptions: string | AlertOptions) => Promise<void>) | null = null;
let globalShowConfirm: ((messageOrOptions: string | ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Programmatic standalone helper to trigger custom alert popup anywhere
 */
export const triggerAlert = (messageOrOptions: string | AlertOptions): Promise<void> => {
  if (globalShowAlert) {
    return globalShowAlert(messageOrOptions);
  }
  const msg = typeof messageOrOptions === 'string' ? messageOrOptions : messageOrOptions.message;
  // Fallback before React mounts
  window.alert(msg);
  return Promise.resolve();
};

/**
 * Programmatic standalone helper to trigger custom confirmation popup anywhere
 */
export const triggerConfirm = (messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
  if (globalShowConfirm) {
    return globalShowConfirm(messageOrOptions);
  }
  const msg = typeof messageOrOptions === 'string' ? messageOrOptions : messageOrOptions.message;
  return Promise.resolve(window.confirm(msg));
};

export const useAlert = (): AlertContextType => {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    return {
      showAlert: triggerAlert,
      showConfirm: triggerConfirm,
    };
  }
  return ctx;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    isConfirm: false,
    title: 'Alert',
    message: '',
    confirmText: 'Okay',
    cancelText: 'Cancel',
    type: 'alert',
  });

  const okBtnRef = useRef<HTMLButtonElement>(null);

  const showAlert = useCallback((messageOrOptions: string | AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      const opts: AlertOptions =
        typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

      setModal({
        isOpen: true,
        isConfirm: false,
        title: opts.title || 'Alert',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Okay',
        cancelText: 'Cancel',
        type: opts.type || opts.variant || 'alert',
        resolve: () => {
          opts.onOk?.();
          resolve();
        },
      });
    });
  }, []);

  const showConfirm = useCallback((messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions =
        typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

      setModal({
        isOpen: true,
        isConfirm: true,
        title: opts.title || 'Please Confirm',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Okay',
        cancelText: opts.cancelText || 'Cancel',
        type: opts.type || opts.variant || 'confirm',
        resolve: (val: boolean) => {
          if (val) opts.onConfirm?.();
          else opts.onCancel?.();
          resolve(val);
        },
      });
    });
  }, []);

  // Intercept standard window.alert globally across the entire app
  useEffect(() => {
    globalShowAlert = showAlert;
    globalShowConfirm = showConfirm;

    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      showAlert(String(message ?? ''));
    };

    return () => {
      window.alert = originalAlert;
      globalShowAlert = null;
      globalShowConfirm = null;
    };
  }, [showAlert, showConfirm]);

  // Handle keyboard events (Enter or Escape) and auto-focus Okay button
  useEffect(() => {
    if (modal.isOpen) {
      const timer = setTimeout(() => {
        okBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [modal.isOpen]);

  const handleClose = (result: boolean) => {
    const res = modal.resolve;
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (res) {
      res(result);
    }
  };

  const renderIcon = () => {
    switch (modal.type) {
      case 'success':
        return (
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        );
      case 'danger':
      case 'error':
        return (
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      case 'info':
        return (
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.2)]">
            <Info className="w-7 h-7" />
          </div>
        );
      case 'warning':
      case 'confirm':
      case 'alert':
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] shadow-[0_0_25px_rgba(255,90,31,0.25)]">
            <AlertCircle className="w-7 h-7" />
          </div>
        );
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Screen-centered custom alert popup */}
      {modal.isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-200"
          onClick={() => handleClose(false)}
        >
          {/* Centered Modal Card */}
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-[#0b0c10] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden text-center space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top orange glow effect */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#FF5A1F]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="flex justify-center pt-1">{renderIcon()}</div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {modal.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-h-60 overflow-y-auto px-2 custom-scrollbar whitespace-pre-wrap">
                {modal.message}
              </p>
            </div>

            {/* Action Buttons with Orange Okay Button */}
            <div className="pt-3 flex items-center justify-center gap-3">
              {modal.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-zinc-300 hover:text-white text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer"
                >
                  {modal.cancelText}
                </button>
              )}

              <button
                ref={okBtnRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`px-6 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04810] text-white text-xs sm:text-sm font-semibold transition-all duration-150 shadow-lg shadow-[#FF5A1F]/25 hover:shadow-[#FF5A1F]/40 active:scale-[0.98] cursor-pointer ${
                  modal.isConfirm ? 'flex-1' : 'w-full sm:w-auto min-w-[130px]'
                }`}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
