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

    // 1. Prevent Right-Click on images, canvas, and protected areas
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isImageOrProtected =
        target.tagName === 'IMG' ||
        target.tagName === 'CANVAS' ||
        target.closest('img') ||
        target.closest('canvas') ||
        target.closest('.protected-image') ||
        target.closest('[data-protected="true"]') ||
        target.closest('.artwork-container');

      if (isImageOrProtected) {
        e.preventDefault();
        e.stopPropagation();
        showToast('Artwork is protected. Right-click, saving, and copying are disabled.');
      }
    };

    // 2. Prevent dragging images onto desktop or other windows
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'IMG' || target.closest('img'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 3. Screen Capture & PrintScreen detection
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
      }, 1400);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        triggerShield();
        return;
      }

      // Windows Snipping Tool (Windows + Shift + S) or Mac (Cmd + Shift + 3/4)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4')
      ) {
        triggerShield();
        return;
      }

      // Save Page (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        showToast('Saving this page is disabled.');
        return;
      }

      // Print Page (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        showToast('Printing this page is disabled.');
        return;
      }

      // View Source (Ctrl+U)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        triggerShield();
      }
    };

    // 4. Blur protection when window loses focus (e.g. Snipping Tool opened)
    const handleWindowBlur = () => {
      document.documentElement.classList.add('window-blurred');
    };

    const handleWindowFocus = () => {
      document.documentElement.classList.remove('window-blurred');
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      if (toastTimeout) clearTimeout(toastTimeout);
    };
  }, []);

  return (
    <>
      {/* Blackout Curtain on Screenshot / PrintScreen Attempt */}
      {shieldActive && (
        <div
          className="fixed inset-0 z-[999999] bg-[#050505] flex flex-col items-center justify-center text-center p-6 select-none pointer-events-auto"
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

      {/* Floating Protective Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] px-5 py-3 rounded-full bg-[#141414]/95 border border-ember/40 shadow-[0_15px_40px_rgba(0,0,0,0.95)] backdrop-blur-xl flex items-center gap-2.5 text-xs text-white font-medium animate-fade-up pointer-events-none select-none">
          <ShieldAlert className="w-4 h-4 text-ember shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
