import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

const projects = [
  {
    title: 'Lumen Finance',
    category: 'Fintech / Brand Identity',
    desc: 'A complete rebrand for a next-gen fintech platform, blending trust with modernity.',
    image: 'https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FF5A1F',
    stats: [{ label: 'Conversion', value: '+240%' }, { label: 'Users', value: '1.2M' }],
  },
  {
    title: 'Nova Aerospace',
    category: 'Aerospace / Web Experience',
    desc: 'An immersive WebGL experience showcasing satellite technology for a space startup.',
    image: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FF7A45',
    stats: [{ label: 'Engagement', value: '+380%' }, { label: 'Awards', value: '3' }],
  },
  {
    title: 'Ember Studios',
    category: 'Creative / Design System',
    desc: 'A scalable design system powering 40+ products across a creative conglomerate.',
    image: 'https://images.pexels.com/photos/3194519/pexels-photo-3194519.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FFB347',
    stats: [{ label: 'Products', value: '40+' }, { label: 'Efficiency', value: '+60%' }],
  },
  {
    title: 'Pulse Health',
    category: 'Healthcare / Product Design',
    desc: 'A patient-centric app redesign reducing appointment friction by 70%.',
    image: 'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FF5A1F',
    stats: [{ label: 'Friction', value: '-70%' }, { label: 'Rating', value: '4.9★' }],
  },
  {
    title: 'Vertex Motors',
    category: 'Automotive / Brand Film',
    desc: 'A cinematic brand film and launch site for an electric vehicle manufacturer.',
    image: 'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FF7A45',
    stats: [{ label: 'Pre-orders', value: '50K' }, { label: 'Views', value: '12M' }],
  },
  {
    title: 'Atlas Capital',
    category: 'Finance / Web Platform',
    desc: 'A premium investment platform with real-time data visualization.',
    image: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1200',
    color: '#FFB347',
    stats: [{ label: 'AUM', value: '$2B' }, { label: 'Retention', value: '+45%' }],
  },
];

export default function Portfolio() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeProject, setActiveProject] = useState<number | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="work" className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6`}>
        <div>
          <p className="section-label mb-4">Selected Work</p>
          <h2 className="section-title max-w-3xl">
            An infinite canvas of{' '}
            <span className="text-gradient">creative milestones.</span>
          </h2>
        </div>
        <p className="text-sm text-white/40 max-w-xs">
          Each project is a story of transformation — from first spark to lasting fire.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project, i) => (
          <div
            key={project.title}
            onClick={() => setActiveProject(i)}
            className={`group relative aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer section-reveal ${
              visible ? 'visible' : ''
            } ${i % 3 === 0 ? 'md:col-span-2 md:aspect-[16/7]' : ''}`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${project.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
            <div className="absolute inset-0 bg-obsidian/30 group-hover:bg-obsidian/10 transition-colors duration-500" />

            {/* Hover glow border */}
            <div className="absolute inset-0 rounded-3xl border border-white/10 group-hover:border-ember/40 transition-colors duration-500" />

            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium text-ember tracking-widest uppercase mb-2">
                    {project.category}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold">{project.title}</h3>
                </div>
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center group-hover:bg-ember group-hover:border-ember transition-all duration-500">
                  <ArrowUpRight className="w-5 h-5 text-white group-hover:rotate-0 transition-transform" />
                </div>
              </div>
              <p className="text-sm text-white/50 mt-4 max-w-md opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {project.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Case Study Modal */}
      {activeProject !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          onClick={() => setActiveProject(null)}
        >
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-xl" />
          <div
            className="relative max-w-4xl w-full glass-card rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveProject(null)}
              className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-ember/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-[16/9] w-full overflow-hidden">
              <img
                src={projects[activeProject].image}
                alt={projects[activeProject].title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-10">
              <p className="section-label mb-3">{projects[activeProject].category}</p>
              <h3 className="text-4xl font-bold mb-4">{projects[activeProject].title}</h3>
              <p className="text-white/60 leading-relaxed mb-8">{projects[activeProject].desc}</p>
              <div className="grid grid-cols-2 gap-4">
                {projects[activeProject].stats.map((stat) => (
                  <div key={stat.label} className="glass-card rounded-2xl p-6">
                    <p className="text-3xl font-bold text-gradient">{stat.value}</p>
                    <p className="text-xs text-white/40 mt-1 tracking-wide uppercase">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
