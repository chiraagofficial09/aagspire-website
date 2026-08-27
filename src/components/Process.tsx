import { useEffect, useRef, useState } from 'react';
import { Flame, Lightbulb, PenTool, Rocket, TrendingUp, Zap, Sparkles } from 'lucide-react';

const steps = [
  { icon: Zap, title: 'Spark', desc: 'We discover the core idea — the initial spark that defines your brand.' },
  { icon: Lightbulb, title: 'Strategy', desc: 'Research, positioning, and a roadmap built for measurable impact.' },
  { icon: PenTool, title: 'Design', desc: 'Crafting every pixel, interaction, and motion with obsessive precision.' },
  { icon: Rocket, title: 'Launch', desc: 'Ship with confidence — performant, polished, and ready to scale.' },
  { icon: TrendingUp, title: 'Growth', desc: 'Iterate and optimize based on real data and audience behavior.' },
  { icon: Flame, title: 'Fire', desc: 'Your brand becomes a movement — unforgettable and unstoppable.' },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

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
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <section ref={sectionRef} id="process" className="relative py-32 px-6 max-w-7xl mx-auto">
      <div className={`section-reveal ${visible ? 'visible' : ''} mb-24 text-center`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-ember" />
          <p className="section-label">How We Work</p>
        </div>
        <h2 className="section-title">
          From spark to <span className="text-gradient">fire.</span>
        </h2>
        <p className="text-sm text-white/40 max-w-md mx-auto mt-4">
          A proven 6-stage blueprint engineered to ignite brands and scale them to market leaders.
        </p>
      </div>

      <div className="relative">
        {/* Signature Orange Ember Connecting Line Behind Cards (Desktop) */}
        <div className="hidden lg:block absolute top-[48px] left-[7%] right-[7%] h-[3px] -translate-y-1/2 -z-10 pointer-events-none">
          {/* Base Orange Ambient Track */}
          <div className="w-full h-full bg-ember/25 rounded-full shadow-[0_0_10px_rgba(255,90,31,0.3)]" />
          
          {/* Ambient Glowing Orange Aura */}
          <div className="absolute inset-0 bg-gradient-to-r from-ember/40 via-ember-light/50 to-amber-500/40 blur-[4px]" />
          
          {/* Active Progress Glowing Orange Beam */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF5A1F] via-[#FF7A45] to-[#FFB347] transition-all duration-700 ease-out rounded-full shadow-[0_0_20px_rgba(255,90,31,0.9),0_0_40px_rgba(255,90,31,0.5)]"
            style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
          />

          {/* Traveling Orange Spark Glow Bead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 rounded-full bg-[#FFB347] shadow-[0_0_12px_#FFB347,0_0_25px_#FF5A1F,0_0_40px_#FF5A1F] transition-all duration-700 ease-out z-0"
            style={{ left: `${(activeStep / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative z-10">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = activeStep === i;
            const isPassed = activeStep >= i;

            return (
              <div
                key={step.title}
                onClick={() => setActiveStep(i)}
                className={`flex flex-col items-center text-center section-reveal cursor-pointer group ${
                  visible ? 'visible' : ''
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Step Icon Card with Solid Dark Backdrop to Frame the Line */}
                <div
                  className={`relative z-20 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 border ${
                    isActive
                      ? 'border-ember shadow-[0_0_25px_rgba(255,90,31,0.4)] scale-110 bg-[#1a0d08]'
                      : isPassed
                      ? 'border-ember/40 bg-[#0e0e0e]'
                      : 'border-white/10 hover:border-white/20 bg-[#0c0c0c]'
                  }`}
                >
                  <Icon
                    className={`w-8 h-8 transition-all duration-500 ${
                      isActive
                        ? 'text-ember scale-110'
                        : isPassed
                        ? 'text-ember-light'
                        : 'text-white/40 group-hover:text-white/70'
                    }`}
                  />

                  {/* Active Pulse Glow Aura */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-3xl bg-ember/15 blur-xl animate-pulse-glow -z-10" />
                  )}
                </div>

                <h3
                  className={`text-base font-bold mb-1.5 transition-colors ${
                    isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                  }`}
                >
                  {step.title}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed max-w-[160px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

