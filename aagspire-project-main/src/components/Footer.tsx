export default function Footer() {
  const links = {
    Studio: ['About', 'Process', 'Careers', 'Contact'],
    Services: ['Brand Identity', 'UI/UX Design', 'Web Development', 'Motion & Film'],
    Social: ['Twitter', 'Instagram', 'LinkedIn', 'Dribbble'],
  };

  return (
    <footer className="relative border-t border-white/5 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <img
                src="/Aagspire_Logo.png"
                alt="Aagspire"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              Turning sparks into fire. A premium branding and design studio.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-4">
                {title}
              </p>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-white/50 hover:text-ember transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Aagspire Studio. All rights reserved.
          </p>
          <p className="text-xs text-white/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
            Turning Sparks Into Fire
          </p>
        </div>
      </div>
    </footer>
  );
}
