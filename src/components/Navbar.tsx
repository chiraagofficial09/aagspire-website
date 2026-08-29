import { useEffect, useState } from 'react';

interface NavbarProps {
  visible?: boolean;
  isWorkOpen?: boolean;
  onOpenWork?: () => void;
  onCloseWork?: () => void;
  onOpenContact?: () => void;
}

export default function Navbar({
  visible = true,
  isWorkOpen = false,
  onOpenWork,
  onCloseWork,
  onOpenContact,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>('Home');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll spy to detect active section in viewport
  useEffect(() => {
    if (isWorkOpen) {
      setActiveItem('Our Work');
      return;
    }

    const sectionIds = [
      { id: 'hero', label: 'Home' },
      { id: 'services', label: 'Services' },
      { id: 'process', label: 'Process' },
      { id: 'about', label: 'About Us' },
      { id: 'contact', label: 'Contact Us' },
    ];

    const handleScroll = () => {
      if (isWorkOpen) return;
      const scrollPosition = window.scrollY + 180;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i].id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveItem(sectionIds[i].label);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isWorkOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const links = [
    { label: 'Home', href: '#hero' },
    { label: 'Services', href: '#services' },
    { label: 'Our Work', href: '#services', isAction: true },
    { label: 'Process', href: '#process' },
    { label: 'About Us', href: '#about' },
    { label: 'Contact Us', href: '#contact', primary: true },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[10000] border-b backdrop-blur-xl transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-full pointer-events-none'
      } ${
        scrolled || isWorkOpen
          ? 'border-white/10 bg-obsidian/95 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
          : 'border-white/5 bg-obsidian/90'
      }`}
    >
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6"
      >
        <a
          href="#hero"
          aria-label="Aagspire home"
          onClick={() => {
            setActiveItem('Home');
            onCloseWork?.();
          }}
          className="group flex w-fit items-center cursor-pointer"
        >
          <img
            src="/Aagspire_Logo.png"
            alt="Aagspire"
            className="h-8 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80"
          />
        </a>

        <div className="ml-auto hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 md:flex">
          {links.map((link) => {
            const isActive = link.isAction
              ? isWorkOpen
              : !isWorkOpen && activeItem === link.label;

            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  setActiveItem(link.label);
                  if (link.primary && onOpenContact) {
                    e.preventDefault();
                    onCloseWork?.();
                    onOpenContact();
                  } else if (link.isAction) {
                    e.preventDefault();
                    onOpenWork?.();
                  } else {
                    onCloseWork?.();
                  }
                }}
                className={`group relative rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 cursor-pointer ${
                  link.primary
                    ? 'bg-ember text-white ember-glow-sm hover:bg-ember-light'
                    : isActive
                    ? 'bg-ember/15 text-ember font-semibold border border-ember/30 shadow-[0_0_15px_rgba(255,90,31,0.2)]'
                    : 'text-white/60 hover:bg-ember/10 hover:text-ember focus-visible:text-white border border-transparent'
                }`}
              >
                {link.label}
                {!link.primary && !isActive && (
                  <span className="absolute inset-x-4 bottom-1.5 h-px origin-left scale-x-0 bg-ember transition-transform duration-300 group-hover:scale-x-100" />
                )}
              </a>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 justify-self-end rounded-full border border-white/10 bg-white/5 md:hidden"
        >
          <span className={`w-6 h-px bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-6 h-px bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-px bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="mx-4 mb-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-obsidian/95 p-4 shadow-2xl md:hidden"
        >
          {links.map((link) => {
            const isActive = link.isAction
              ? isWorkOpen
              : !isWorkOpen && activeItem === link.label;

            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  setActiveItem(link.label);
                  setMenuOpen(false);
                  if (link.primary && onOpenContact) {
                    e.preventDefault();
                    onCloseWork?.();
                    onOpenContact();
                  } else if (link.isAction) {
                    e.preventDefault();
                    onOpenWork?.();
                  } else {
                    onCloseWork?.();
                  }
                }}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  link.primary
                    ? 'mt-2 bg-ember text-center font-semibold text-white'
                    : isActive
                    ? 'bg-ember/15 text-ember font-semibold border border-ember/30'
                    : 'text-white/70 hover:bg-ember/10 hover:text-ember'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}
