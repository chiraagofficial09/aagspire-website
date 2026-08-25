import { useEffect, useRef, useState } from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "Aagspire didn't just redesign our brand — they redefined how the world sees us. The results speak for themselves.",
    author: 'Sarah Chen',
    role: 'CEO, Lumen Finance',
    avatar: 'https://images.pexels.com/photos/4158290/pexels-photo-4158290.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    quote: 'Working with Aagspire felt like collaborating with true artists who also happen to be strategic geniuses.',
    author: 'Marcus Reid',
    role: 'Founder, Nova Aerospace',
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    quote: 'The level of craft and attention to detail is unmatched. Every interaction feels intentional and premium.',
    author: 'Elena Vasquez',
    role: 'CPO, Pulse Health',
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    quote: 'They turned our vision into a digital experience that closed a $50M funding round. Worth every penny.',
    author: 'David Okonkwo',
    role: 'CEO, Vertex Motors',
    avatar: 'https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setActive((p) => (p + 1) % testimonials.length), 5000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-20 text-center`}>
        <p className="section-label mb-4">Client Voices</p>
        <h2 className="section-title">
          Trusted by <span className="text-gradient">visionaries.</span>
        </h2>
      </div>

      <div className={`section-reveal ${visible ? 'visible' : ''} relative max-w-4xl mx-auto`}>
        <div className="glass-card rounded-3xl p-10 md:p-16 relative overflow-hidden">
          <div className="absolute top-8 right-8 w-20 h-20 rounded-full bg-ember/5 blur-2xl" />
          <Quote className="w-12 h-12 text-ember/30 mb-8" />

          <div className="relative min-h-[180px]">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-700 ${
                  active === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
              >
                <p className="text-xl md:text-2xl font-light leading-relaxed mb-8 text-white/80">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={t.avatar}
                    alt={t.author}
                    className="w-12 h-12 rounded-full object-cover border-2 border-ember/30"
                  />
                  <div>
                    <p className="font-semibold">{t.author}</p>
                    <p className="text-sm text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                active === i ? 'w-10 bg-ember' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
