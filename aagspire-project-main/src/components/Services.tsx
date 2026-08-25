import { useEffect, useRef, useState } from 'react';
import { Palette, Layers, Code2, Sparkles, TrendingUp, Film } from 'lucide-react';

const services = [
  {
    icon: Palette,
    title: 'Brand Identity',
    desc: 'Distinctive visual systems that define how the world recognizes you.',
    tags: ['Logo Design', 'Visual Identity', 'Brand Guidelines'],
  },
  {
    icon: Layers,
    title: 'UI / UX Design',
    desc: 'Interfaces engineered for delight, conversion, and lasting engagement.',
    tags: ['Product Design', 'Design Systems', 'Prototyping'],
  },
  {
    icon: Code2,
    title: 'Web Development',
    desc: 'Pixel-perfect, performant builds with cinematic motion and depth.',
    tags: ['React', 'WebGL', 'Motion'],
  },
  {
    icon: Sparkles,
    title: 'Social Media Marketing',
    desc: 'Strategic art direction that aligns every touchpoint with your vision.',
    tags: ['Strategy', 'Art Direction', 'Concept'],
  },
  {
    icon: TrendingUp,
    title: 'Brand Strategy',
    desc: 'Positioning, messaging, and narrative frameworks that drive growth.',
    tags: ['Positioning', 'Messaging', 'Research'],
  },
  {
    icon: Film,
    title: 'Motion & Video',
    desc: 'Cinematic motion design and brand films that move audiences.',
    tags: ['Animation', 'Brand Films', '3D'],
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative py-32 px-6 max-w-7xl mx-auto"
    >
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-20`}>
        <p className="section-label mb-4">What We Do</p>
        <h2 className="section-title max-w-3xl">
          Services engineered for{' '}
          <span className="text-gradient">brands that burn bright.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, i) => {
          const Icon = service.icon;
          return (
            <div
              key={service.title}
              className={`glass-card glass-card-hover rounded-3xl p-8 group section-reveal ${
                visible ? 'visible' : ''
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="relative w-14 h-14 rounded-2xl bg-ember/10 border border-ember/20 flex items-center justify-center mb-6 group-hover:bg-ember/20 group-hover:border-ember/40 transition-all duration-500">
                <Icon className="w-6 h-6 text-ember" />
                <div className="absolute inset-0 rounded-2xl bg-ember/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">{service.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-6">{service.desc}</p>
              <div className="flex flex-wrap gap-2">
                {service.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
