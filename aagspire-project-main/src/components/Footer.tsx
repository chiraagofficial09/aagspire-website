import {
  SiBehance,
  SiFacebook,
  SiFiverr,
  SiGooglemaps,
  SiInstagram,
  SiPinterest,
} from 'react-icons/si';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const links = {
    Studio: ['About', 'Process', 'Careers', 'Contact'],
    Services: ['Brand Identity', 'UI/UX Design', 'Web Development', 'Motion & Film'],
  };

  const socialLinks = [
    { label: 'Fiverr', href: 'https://www.fiverr.com/s/K38YRwb', icon: SiFiverr },
    { label: 'Instagram', href: 'https://www.instagram.com/aagspire/', icon: SiInstagram },
    { label: 'Pinterest', href: 'https://in.pinterest.com/aagspire/', icon: SiPinterest },
    { label: 'Behance', href: 'https://www.behance.net/Aagspire', icon: SiBehance },
    { label: 'Google Maps', href: 'https://maps.app.goo.gl/jjAYk4USRPfAxCgH7', icon: SiGooglemaps },
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/profile.php?id=61590180277142&sk=about',
      icon: SiFacebook,
    },
  ];

  return (
    <footer className="relative border-t border-white/5 py-16 px-6">
      {/* SVG Gradient Definition for Social Icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="ember-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5A1F" />
            <stop offset="50%" stopColor="#FF7A45" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
        </defs>
      </svg>

      <div className="max-w-7xl mx-auto">
        <div className="mb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1.4fr] gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-4">
              <img
                src="/Aagspire_Logo.png"
                alt="Aagspire"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs mb-6">
              Turning sparks into fire. A premium branding and design studio.
            </p>
            <div className="flex flex-wrap gap-3">
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
                    className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-ember/50 hover:bg-gradient-to-br hover:from-ember/20 hover:via-ember-light/10 hover:to-transparent hover:shadow-[0_0_20px_rgba(255,90,31,0.3)]"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 transition-all duration-300 group-hover:scale-110"
                      style={{ fill: 'url(#ember-icon-gradient)' }}
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
                      href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm text-white/50 hover:text-ember transition-colors duration-300"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Location / Address */}
          <div>
            <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-4">
              Location
            </p>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-ember shrink-0 mt-1" />
              <address className="not-italic text-sm text-white/50 leading-relaxed">
                5, First Floor, Parmeshwar Arcade,
                <br />
                Halvad - Maliya Highway,
                <br />
                Halvad - 363330
              </address>
            </div>
            <a
              href="https://maps.app.goo.gl/jjAYk4USRPfAxCgH7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ember hover:text-ember-light transition-colors mt-3 pl-6"
            >
              View on Google Maps →
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} <strong className="font-bold text-white/60">Aagspire</strong> . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
