import {
  SiBehance,
  SiFacebook,
  SiFiverr,
  SiGooglemaps,
  SiInstagram,
  SiPinterest,
} from 'react-icons/si';

export default function Footer() {
  const links = {
    Studio: ['About', 'Process', 'Careers', 'Contact'],
    Services: ['Brand Identity', 'UI/UX Design', 'Web Development', 'Motion & Film'],
  };

  const socialLinks = [
    { label: 'Fiverr', href: 'https://www.fiverr.com/s/K38YRwb', icon: SiFiverr, color: '#1DBF73' },
    { label: 'Instagram', href: 'https://www.instagram.com/aagspire/', icon: SiInstagram, color: '#E4405F' },
    { label: 'Pinterest', href: 'https://in.pinterest.com/aagspire/', icon: SiPinterest, color: '#E60023' },
    { label: 'Behance', href: 'https://www.behance.net/Aagspire', icon: SiBehance, color: '#1769FF' },
    { label: 'Google Maps', href: 'https://maps.app.goo.gl/jjAYk4USRPfAxCgH7', icon: SiGooglemaps, color: '#4285F4' },
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/profile.php?id=61590180277142&sk=about',
      icon: SiFacebook,
      color: '#1877F2',
    },
  ];

  return (
    <footer className="relative border-t border-white/5 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
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
            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit Aagspire on ${social.label}`}
                    title={social.label}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 opacity-75 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
                      style={{ color: social.color }}
                    />
                  </a>
                );
              })}
            </div>
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
