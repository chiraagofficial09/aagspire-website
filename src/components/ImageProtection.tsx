import { useEffect, useState } from 'react';
import { ShieldAlert, Lock, ShieldCheck } from 'lucide-react';

export default function ImageProtection() {
  const [shieldActive, setShieldActive] = useState(false);
  const [windowBlurred, setWindowBlurred] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let toastTimeout: ReturnType<typeof setTimeout> | null = null;

    const showToast = (msg: string) => {
      setToastMessage(msg);
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
    };

    // 1. COMPLETELY DISABLE RIGHT-CLICK ON ENTIRE WEBSITE
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showToast('Right click is disabled');
      return false;
    };

    // 2. COMPLETELY DISABLE DRAGGING ACROSS ENTIRE WEBSITE
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 3. SCREEN CAPTURE & SCREENSHOT DETECTION SHIELD
    const triggerShield = () => {
      setShieldActive(true);
      showToast('Screen capture restricted. All artwork is copyrighted by Aagspire.');

      // Clear clipboard buffer if PrintScreen was pressed
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch {}

      setTimeout(() => {
        setShieldActive(false);
      }, 1500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // PrintScreen key (any modifier)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerShield();
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac (Cmd + Shift + 3/4/5)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4' || e.key === '5')
      ) {
        e.preventDefault();
        triggerShield();
        return false;
      }

      // Developer Tools & Inspect Element (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        showToast('Developer tools and element inspection are disabled.');
        return false;
      }

      // Save Page (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        showToast('Saving webpage is disabled.');
        return false;
      }

      // Print Page (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        showToast('Printing this website is disabled.');
        return false;
      }

      // View Source (Ctrl+U / Cmd+U)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        showToast('Viewing page source is disabled.');
        return false;
      }

      // Copy text (Ctrl+C / Cmd+C) outside input fields
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        showToast('Copying website content is disabled.');
        return false;
      }

      // Select all (Ctrl+A / Cmd+A) outside input fields
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        triggerShield();
      }
    };

    // 4. BLUR ENTIRE WEBSITE WHEN FOCUS IS LOST (e.g. Snipping tool / Screen grabber invoked)
    const handleWindowBlur = () => {
      setWindowBlurred(true);
      document.documentElement.classList.add('window-blurred');
    };

    const handleWindowFocus = () => {
      setWindowBlurred(false);
      document.documentElement.classList.remove('window-blurred');
    };

    // 5. Visibility change (user minimizes or switches apps to record)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWindowBlurred(true);
        document.documentElement.classList.add('window-blurred');
      } else {
        setWindowBlurred(false);
        document.documentElement.classList.remove('window-blurred');
      }
    };

    // Attach capture listeners to document and window
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, []);

  return (
    <>
      {/* Blackout Curtain on Screenshot / PrintScreen Attempt */}
      {shieldActive && (
        <div
          className="fixed inset-0 z-[9999999] bg-[#050505] flex flex-col items-center justify-center text-center p-6 select-none pointer-events-auto"
          aria-hidden="true"
        >
          <div className="w-16 h-16 rounded-full bg-ember/20 border border-ember/50 flex items-center justify-center text-ember mb-4 shadow-[0_0_30px_rgba(255,90,31,0.5)]">
            <Lock className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-white mb-1">Protected Intellectual Property</h4>
          <p className="text-xs text-white/50 max-w-sm">
            All visual identities, artworks, and designs are proprietary to Aagspire Studio.
          </p>
        </div>
      )}

      {/* Snipping Tool / Window Blur Privacy Shield */}
      {windowBlurred && (
        <div
          className="fixed inset-0 z-[999999] bg-black/75 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-6 select-none pointer-events-none transition-opacity duration-200"
          aria-hidden="true"
        >
          <div className="w-16 h-16 rounded-full bg-ember/20 border border-ember/40 flex items-center justify-center text-ember mb-4 shadow-[0_0_30px_rgba(255,90,31,0.4)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Content Protected · Aagspire Studio</h4>
          <p className="text-xs text-white/50 max-w-sm leading-relaxed">
            Screen capture and external recording are restricted. Click back to resume browsing.
          </p>
        </div>
      )}

      {/* Center Bottom Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999999] px-6 py-3 rounded-full bg-[#111111]/95 border border-ember/50 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(255,90,31,0.3)] backdrop-blur-2xl flex items-center justify-center gap-2.5 text-xs sm:text-sm text-white font-semibold tracking-wide animate-fade-up pointer-events-none select-none text-center whitespace-nowrap">
          <ShieldAlert className="w-4 h-4 text-ember shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
