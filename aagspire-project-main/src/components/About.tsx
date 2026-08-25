import { useEffect, useRef, useState } from 'react';

const milestones = [
  { year: '2019', title: 'The Spark', desc: 'Aagspire is founded with a single mission: turn sparks into fire.' },
  { year: '2020', title: 'First Flame', desc: 'Delivered our first award-winning project for a global fintech brand.' },
  { year: '2021', title: 'Growing Fire', desc: 'Expanded to a team of 20 designers, developers, and strategists.' },
  { year: '2023', title: 'Wildfire', desc: 'Recognized by Awwwards, CSS Design Awards, and FWA across 15+ projects.' },
  { year: '2025', title: 'Eternal Flame', desc: 'Partnering with Fortune 500 brands and high-growth startups worldwide.' },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="about" className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className={`section-reveal ${visible ? 'visible' : ''} lg:sticky lg:top-32`}>
          <p className="section-label mb-4">Our Story</p>
          <h2 className="section-title mb-6">
            We are <span className="text-gradient">Aagspire.</span>
          </h2>
          <p className="text-white/50 leading-relaxed mb-6">
            A premium branding and design studio built on a simple belief: every great brand
            starts as a spark — an idea, a vision, a moment of clarity. Our job is to turn
            that spark into a fire that the world can't ignore.
          </p>
          <p className="text-white/50 leading-relaxed mb-10">
            We blend strategy, design, and technology to craft digital experiences that
            don't just look stunning — they drive measurable growth and forge lasting
            emotional connections with audiences.
          </p>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '120+', label: 'Projects' },
              { value: '40+', label: 'Awards' },
              { value: '98%', label: 'Retention' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5 text-center">
                <p className="text-2xl md:text-3xl font-bold text-gradient">{stat.value}</p>
                <p className="text-[11px] text-white/40 mt-1 tracking-wide uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className={`section-reveal ${visible ? 'visible' : ''} relative`}>
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-ember via-ember/30 to-transparent" />
          <div className="flex flex-col gap-12">
            {milestones.map((m, i) => (
              <div
                key={m.year}
                className={`relative pl-12 transition-all duration-700 ${
                  visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-ember ember-glow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <p className="text-ember text-sm font-bold mb-1">{m.year}</p>
                <h3 className="text-xl font-bold mb-2">{m.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
