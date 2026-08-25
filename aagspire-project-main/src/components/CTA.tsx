import { useEffect, useRef, useState } from 'react';

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="contact" className="relative py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className={`relative glass-card rounded-[2.5rem] p-12 md:p-20 text-center overflow-hidden section-reveal ${
            visible ? 'visible' : ''
          }`}
        >
          {/* Glow orbs */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-ember/15 blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-ember-deep/15 blur-[80px]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full glass-card">
              <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />
              <span className="text-xs font-medium text-white/60 tracking-wide">Ready to ignite?</span>
            </div>

            <h2 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight mb-8">
              Let's Build Something
              <br />
              <span className="text-gradient text-shadow-glow">Unforgettable.</span>
            </h2>

            <p className="text-white/50 max-w-xl mx-auto mb-12 leading-relaxed">
              Tell us about your vision. We'll show you how to turn it into a brand the
              world remembers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:hello@aagspire.com"
                className="magnetic-btn group px-8 py-4 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span>Start Your Project</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#work"
                className="magnetic-btn px-8 py-4 rounded-full glass-card glass-card-hover text-sm font-semibold"
              >
                View Our Work
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-xs text-white/30">
              <span>hello@aagspire.com</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Remote · Worldwide</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Response within 24h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
