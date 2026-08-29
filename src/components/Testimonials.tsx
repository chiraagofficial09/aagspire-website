import { useEffect, useRef, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { ImageWithLoader } from './ImageWithLoader';

const testimonials = [
  {
    quote: "Aagspire didn't just redesign our brand — they redefined how the world sees us. The results speak for themselves.",
    author: 'Sarah Chen',
    role: 'CEO, Lumen Finance',
    avatar: 'https://images.pexels.com/photos/4158290/pexels-photo-4158290.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    quote: 'Working with Aagspire felt like collaborating with true artists who also happen to be strategic geniuses.',
    author: 'Marcus Reid',
    role: 'Founder, Nova Aerospace',
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    quote: 'The level of craft and attention to detail is unmatched. Every interaction feels intentional and premium.',
    author: 'Elena Vasquez',
    role: 'CPO, Pulse Health',
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
  {
    quote: 'They turned our vision into a digital experience that closed a $50M funding round. Worth every penny.',
    author: 'David Okonkwo',
    role: 'CEO, Vertex Motors',
    avatar: 'https://images.pexels.com/photos/3777943/pexels-photo-3777943.jpeg?auto=compress&cs=tinysrgb&w=200',
    rating: 5,
  },
];

// Double the list for seamless infinite loop from right to left
const marqueeList = [...testimonials, ...testimonials];

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden w-full">
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-16 text-center max-w-7xl mx-auto px-6`}>
        <p className="section-label mb-4">Client Voices</p>
        <h2 className="section-title">
          Trusted by <span className="text-gradient">visionaries.</span>
        </h2>
      </div>

      <div className={`section-reveal ${visible ? 'visible' : ''} relative w-full overflow-hidden`}>
        {/* Left & Right gradient masks for smooth edge fade */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 md:w-48 z-10 bg-gradient-to-r from-obsidian via-obsidian/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 md:w-48 z-10 bg-gradient-to-l from-obsidian via-obsidian/80 to-transparent" />

        {/* Right-to-Left Continuous Marquee Track */}
        <div className="flex gap-6 animate-marquee-left py-4">
          {marqueeList.map((t, idx) => (
            <div
              key={`${t.author}-${idx}`}
              className="w-[340px] sm:w-[400px] md:w-[460px] shrink-0"
            >
              <article className="marquee-card glass-card-hover group relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-3xl p-8 md:p-10 border border-white/10 transition-all duration-300 hover:border-ember/40">
                <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-ember/5 blur-2xl group-hover:bg-ember/15 transition-all duration-500" />
                
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <Quote className="h-8 w-8 text-ember/40 group-hover:text-ember transition-colors duration-300" />
                    <div className="flex gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-ember text-ember" />
                      ))}
                    </div>
                  </div>

                  <p className="text-base md:text-lg font-light leading-relaxed text-white/80 group-hover:text-white transition-colors duration-300">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
                  <ImageWithLoader
                    src={t.avatar}
                    alt={t.author}
                    showSpinner={false}
                    wrapperClassName="h-12 w-12 rounded-full border-2 border-ember/30 overflow-hidden shrink-0 group-hover:border-ember transition-colors duration-300"
                    className="w-full h-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-white group-hover:text-ember-light transition-colors duration-300">
                      {t.author}
                    </p>
                    <p className="text-xs md:text-sm text-white/40">{t.role}</p>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

