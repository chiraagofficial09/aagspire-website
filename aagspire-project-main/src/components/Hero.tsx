import { useEffect, useRef, useState } from 'react';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface HeroProps {
  ignited: boolean;
  onIgnite: () => void;
}

export default function Hero({ ignited, onIgnite }: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showContent, setShowContent] = useState(false);
  const particles = useRef<FireParticle[]>([]);
  const animRef = useRef<number>(0);
  const scrollY = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;

    const animate = () => {
      frame++;
      ctx.fillStyle = 'rgba(5, 5, 5, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sparse, tiny ambient sparks across the hero background
      if (frame % 10 === 0) {
        particles.current.push({
          x: canvas.width * (0.12 + Math.random() * 0.76),
          y: canvas.height * (0.25 + Math.random() * 0.5),
          vx: (Math.random() - 0.5) * 0.6,
          vy: -Math.random() * 0.8 - 0.4,
          life: 1,
          maxLife: Math.random() * 150 + 120,
          size: Math.random() * 0.9 + 0.5,
          hue: Math.random() * 30 + 10,
        });
      }

      particles.current = particles.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.04;
        p.vx += (Math.random() - 0.5) * 0.1;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        const alpha = p.life * 0.7;
        const size = p.size * (0.3 + p.life * 0.7);
        const lightness = 50 + p.life * 30;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsl(${p.hue}, 100%, ${lightness}%)`;
        ctx.fillStyle = `hsl(${p.hue}, 100%, ${lightness}%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animRef.current);
    };
  }, [ignited]);

  const handleIgnite = (e?: React.MouseEvent | MouseEvent) => {
    if (ignited) return;
    onIgnite();
    // Big burst from click position or center of screen
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = e && 'clientX' in e && e.clientX ? e.clientX : canvas.width / 2;
      const cy = e && 'clientY' in e && e.clientY ? e.clientY : canvas.height / 2;
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 3;
        particles.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: Math.random() * 100 + 60,
          size: Math.random() * 6 + 2,
          hue: Math.random() * 40 + 10,
        });
      }
    }
    setTimeout(() => setShowContent(true), 600);
  };

  // Click anywhere on window to ignite
  useEffect(() => {
    if (ignited) return;
    const onWindowClick = (e: MouseEvent) => {
      handleIgnite(e);
    };
    window.addEventListener('click', onWindowClick);
    return () => window.removeEventListener('click', onWindowClick);
  }, [ignited]);

  return (
    <section
      id="hero"
      onClick={!ignited ? (e) => handleIgnite(e) : undefined}
      className={`relative min-h-screen w-full overflow-hidden ${!ignited ? 'cursor-pointer select-none' : ''}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      />

      {/* Ambient gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-ember/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-ember-deep/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {!ignited ? (
          <div className="flex flex-col items-center gap-12">
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex h-10 w-10 items-center justify-center animate-spark-pulse">
                <div className="absolute inset-2 rounded-full bg-ember/30 blur-lg" />
                <div className="h-1.5 w-1.5 rounded-full bg-ember shadow-[0_0_8px_rgba(255,90,31,0.9),0_0_18px_rgba(255,90,31,0.45)]" />
              </div>
              <p className="text-sm font-medium text-white/40 tracking-[0.3em] uppercase">
                Turning Sparks Into Fire
              </p>
            </div>
            <button
              onClick={handleIgnite}
              className="magnetic-btn group relative px-8 py-4 rounded-full glass-card-hover glass-card text-sm font-semibold tracking-wide flex items-center gap-3"
            >
              <span className="relative z-10">Ignite the Experience</span>
              <span className="relative z-10 w-2 h-2 rounded-full bg-ember animate-pulse" />
            </button>
          </div>
        ) : (
          <div
            className={`flex flex-col items-center gap-8 transition-all duration-1000 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Tagline badge */}
 <div className="inline-flex items-center gap-2 rounded-full border border-gray-700/70 bg-black/40 px-5 py-2 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.03)]">
      <span className="h-2 w-2 rounded-full bg-orange-500"></span>

      <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-gray-300">
        Turning Sparks Into Fire
      </span>
    </div>

            {/* Headline */}
            <h1 className="hero-headline max-w-5xl">
              WE DON'T JUST DESIGN.
              <br />
              <span className="text-gradient text-shadow-glow">WE BUILD BRANDS</span>
              <br />
              PEOPLE REMEMBER.
            </h1>

            <p className="max-w-xl text-base md:text-lg text-white/50 font-light leading-relaxed">
              A premium branding and design studio crafting unforgettable digital experiences
              for visionary brands worldwide.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <a
                href="#contact"
                className="magnetic-btn group relative px-8 py-4 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span className="relative z-10">Start Your Project</span>
                <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#work"
                className="magnetic-btn px-8 py-4 rounded-full glass-card glass-card-hover text-sm font-semibold flex items-center gap-2"
              >
                <span>Explore Our Work</span>
                <span className="text-ember">↗</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {ignited && showContent && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-ember to-transparent" />
        </div>
      )}
    </section>
  );
}
