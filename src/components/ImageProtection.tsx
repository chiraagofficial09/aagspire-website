import { useEffect, useState } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

export default function ImageProtection() {
  const [shieldActive, setShieldActive] = useState(false);
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

    const clearClipboard = () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch {}
    };

    // 1. COMPLETELY DISABLE RIGHT-CLICK ON ENTIRE WEBSITE
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showToast('This artwork is protected by Aagspire');
      return false;
    };

    // 2. COMPLETELY DISABLE DRAGGING ACROSS ENTIRE WEBSITE
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showToast('This artwork is protected by Aagspire');
      return false;
    };

    // 3. SCREEN CAPTURE & SCREENSHOT DETECTION SHIELD
    const triggerShield = () => {
      document.documentElement.classList.add('window-blurred');
      setShieldActive(true);
      showToast('Screen capture restricted. All artwork is copyrighted by Aagspire.');
      clearClipboard();

      setTimeout(() => {
        setShieldActive(false);
      }, 1500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // PrintScreen key (any modifier)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || (e as any).keyCode === 44) {
        e.preventDefault();
        document.documentElement.classList.add('window-blurred');
        triggerShield();
        clearClipboard();
        return false;
      }

      // Windows Key (Meta / OS) - invoked at start of Win+Shift+S Snipping Tool
      if (e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight') {
        document.documentElement.classList.add('window-blurred');
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac (Cmd + Shift + 3/4/5)
      if (
        (e.ctrlKey || e.metaKey || e.key === 'Meta') &&
        e.shiftKey &&
        (e.key === 'S' || e.key === 's' || e.code === 'KeyS' || e.key === '3' || e.key === '4' || e.key === '5')
      ) {
        e.preventDefault();
        document.documentElement.classList.add('window-blurred');
        triggerShield();
        clearClipboard();
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
        showToast('This artwork is protected by Aagspire');
        return false;
      }

      // Select all (Ctrl+A / Cmd+A) outside input fields
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || (e as any).keyCode === 44) {
        clearClipboard();
        triggerShield();
      }
      if ((e.key === 'Meta' || e.key === 'OS') && document.hasFocus()) {
        setTimeout(() => {
          if (document.hasFocus()) {
            document.documentElement.classList.remove('window-blurred');
          }
        }, 300);
      }
    };

    // 4. BLUR ENTIRE WEBSITE WHEN FOCUS IS LOST (e.g. Snipping tool / Screen grabber invoked)
    const handleWindowBlur = () => {
      document.documentElement.classList.add('window-blurred');
      clearClipboard();
    };

    const handleWindowFocus = () => {
      document.documentElement.classList.remove('window-blurred');
    };

    // 5. Visibility change (user minimizes, switches apps, or snipping tool dims screen)
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState !== 'visible') {
        document.documentElement.classList.add('window-blurred');
        clearClipboard();
      } else {
        document.documentElement.classList.remove('window-blurred');
      }
    };

    // 6. Mobile 3-Finger Screenshot Gesture Interception (Android & iOS)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        document.documentElement.classList.add('window-blurred');
        triggerShield();
        showToast('This artwork is protected by Aagspire');
        return false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        document.documentElement.classList.add('window-blurred');
        return false;
      }
    };

    // 7. Mobile Page Lifecycle (App Switcher, Notification Shade, Screen Lock)
    const handlePageHide = () => {
      document.documentElement.classList.add('window-blurred');
      clearClipboard();
    };

    // Shield click handler to restore view
    const shieldEl = document.getElementById('anti-screenshot-shield');
    const handleShieldClick = () => {
      window.focus();
      document.documentElement.classList.remove('window-blurred');
    };
    shieldEl?.addEventListener('click', handleShieldClick);

    // Attach capture listeners to document and window
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pagehide', handlePageHide);
      shieldEl?.removeEventListener('click', handleShieldClick);
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
            All visual identities, artworks, and designs are proprietary to Aagspire.
          </p>
        </div>
      )}

      {/* Center Bottom Notification Toast */}
      {toastMessage && (
        <div className="fixed inset-x-0 bottom-0 z-[9999999] flex justify-center pb-8 sm:pb-10 pointer-events-none select-none px-4">
          <div className="center-toast-pop px-7 py-3.5 rounded-full bg-[#111111]/95 border border-ember/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_35px_rgba(255,90,31,0.35)] backdrop-blur-2xl flex items-center justify-center gap-3 text-xs sm:text-sm text-white font-semibold tracking-wide text-center whitespace-nowrap">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-ember shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
