import { useEffect, useRef, useState } from 'react';
import { Share2, PenTool, Image, Film, Monitor, Package } from 'lucide-react';

const services = [
  {
    icon: Share2,
    title: 'Social Media Marketing',
    desc: 'Strategic content and campaigns that grow your reach, engagement, and community.',
    tags: ['Content Strategy', 'Campaigns', 'Social Growth'],
  },
  {
    icon: PenTool,
    title: 'Logo Design',
    desc: 'Distinctive and memorable logos crafted to express the heart of your brand.',
    tags: ['Logo Concepts', 'Brand Marks', 'Visual Identity'],
  },
  {
    icon: Image,
    title: 'Poster Design',
    desc: 'Bold, attention-grabbing posters designed for campaigns, events, and promotions.',
    tags: ['Campaign Design', 'Print', 'Digital Posters'],
  },
  {
    icon: Film,
    title: 'Motion & Video',
    desc: 'Engaging motion graphics and video content that bring your brand stories to life.',
    tags: ['Motion Graphics', 'Video Editing', 'Animation'],
  },
  {
    icon: Monitor,
    title: 'UI/UX & Web Development',
    desc: 'Intuitive interfaces and responsive websites built to look sharp and perform smoothly.',
    tags: ['UI/UX Design', 'Web Design', 'Development'],
  },
  {
    icon: Package,
    title: 'Packaging Design',
    desc: 'Standout packaging that protects your product and makes a lasting first impression.',
    tags: ['Product Packaging', 'Labels', 'Print Ready'],
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
