import { useEffect, useRef } from 'react';

interface SparkPoint {
  x: number;
  y: number;
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  isWhiteHot?: boolean;
  flickerSpeed: number;
  flickerOffset: number;
  wanderSpeed: number;
  wanderOffset: number;
  wanderAmp: number;
  age: number;
  trail: SparkPoint[];
  maxTrail: number;
  type: 'ember' | 'crackle' | 'popping' | 'burst';
  hasPopped?: boolean;
}

interface HeroProps {
  ignited: boolean;
  onIgnite: () => void;
  onOpenWork?: () => void;
  onOpenContact?: () => void;
}

export default function Hero({ ignited, onIgnite, onOpenWork, onOpenContact }: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<FireParticle[]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;

    const createSpark = (x?: number, y?: number, type: 'ember' | 'crackle' | 'popping' = 'ember', isWhite = Math.random() > 0.65): FireParticle => {
      const isCrackle = type === 'crackle';
      const isPopping = type === 'popping';
      // Spawning predominantly along the bottom baseline to rise upward through the hero section
      const startX = x ?? canvas.width * (0.02 + Math.random() * 0.96);
      const startY = y ?? canvas.height * (0.75 + Math.random() * 0.3);

      return {
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * (isCrackle ? 1.0 : 0.6),
        vy: isCrackle ? -Math.random() * 3.2 - 2.0 : -Math.random() * 2.4 - 1.4, // Decisive upward trajectory
        life: 1,
        maxLife: isCrackle ? Math.random() * 70 + 60 : Math.random() * 140 + 90,
        size: isCrackle ? Math.random() * 0.35 + 0.45 : Math.random() * 0.45 + 0.6,
        hue: Math.random() * 8 + 18, // vibrant ember orange
        isWhiteHot: isWhite,
        flickerSpeed: Math.random() * 0.25 + 0.1,
        flickerOffset: Math.random() * Math.PI * 2,
        wanderSpeed: Math.random() * 0.04 + 0.02,
        wanderOffset: Math.random() * Math.PI * 2,
        wanderAmp: isCrackle ? 0.35 : Math.random() * 0.5 + 0.3,
        age: 0,
        trail: [{ x: startX, y: startY }],
        maxTrail: isCrackle ? 6 : 4, // Small, tight, crisp tail
        type,
        hasPopped: !isPopping,
      };
    };

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Continuous upward spark generation capped for silky smooth 60+ FPS
      if (frame % 2 === 0 && particles.current.length < 75) {
        const rand = Math.random();
        if (rand > 0.82) {
          particles.current.push(createSpark(undefined, undefined, 'crackle'));
        } else if (rand > 0.68) {
          particles.current.push(createSpark(undefined, undefined, 'popping'));
        } else {
          particles.current.push(createSpark(undefined, undefined, 'ember'));
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const newSparks: FireParticle[] = [];

      particles.current = particles.current.filter((p) => {
        p.age++;
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) return false;

        // Mouse thermal wind reaction (pushes sparks upward and outward)
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 2) {
            const force = (1 - dist / 140) * 0.6;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force - 0.4; // Strong upward thermal draft
          }
        }

        if (p.type === 'burst') {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.04; // Thermal upward lift on burst sparks
          p.vx *= 0.98;
          p.vy *= 0.98;
        } else {
          const wander = Math.sin(p.age * p.wanderSpeed + p.wanderOffset) * p.wanderAmp;
          p.x += p.vx + wander;
          p.y += p.vy;
          p.vy -= 0.025; // Continuous hot air upward buoyancy
          p.vx *= 0.992;
        }

        // Out of bounds check (cleans up once spark has risen past top of screen)
        if (p.y < -40 || p.x < -30 || p.x > canvas.width + 30) return false;

        // Record smooth trailing path
        p.trail.unshift({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrail) {
          p.trail.pop();
        }

        // Popping ember split into rising mini sparks
        if (p.type === 'popping' && !p.hasPopped && p.life < 0.4) {
          p.hasPopped = true;
          if (particles.current.length < 85) {
            for (let m = 0; m < 2; m++) {
              const angle = (Math.random() - 0.5) * Math.PI * 0.7 - Math.PI / 2; // Upward cone
              const spd = Math.random() * 2.0 + 1.2;
              newSparks.push({
                x: p.x,
                y: p.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 1.2, // Additional upward boost
                life: 1,
                maxLife: Math.random() * 40 + 25,
                size: 0.38,
                hue: Math.random() * 8 + 18,
                isWhiteHot: Math.random() > 0.5,
                flickerSpeed: 0.3,
                flickerOffset: Math.random() * Math.PI * 2,
                wanderSpeed: 0.08,
                wanderOffset: Math.random() * Math.PI * 2,
                wanderAmp: 0.18,
                age: 0,
                trail: [{ x: p.x, y: p.y }],
                maxTrail: 3, // Small trail for popping sparks
                type: 'ember',
                hasPopped: true,
              });
            }
          }
        }

        // Realistic organic flicker
        const flicker = 0.85 + 0.15 * Math.sin(p.age * p.flickerSpeed + p.flickerOffset);
        const alpha = Math.min(1, Math.max(0, p.life * flicker));
        const currentHue = Math.max(16, p.hue - (1 - p.life) * 6);
        const currentSize = p.size * (0.6 + p.life * 0.4);

        // 1. Small Crisp Orange Trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          // Signature vibrant glowing orange trail
          ctx.strokeStyle = `hsla(${currentHue}, 100%, 52%, ${alpha * 0.75})`;
          ctx.lineWidth = Math.max(0.6, currentSize * 0.8);
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // 2. Ultra-Fast Glowing Orange & White-Hot Head (Layered alpha fill)
        // Outer glowing halo (fiery orange aura)
        ctx.fillStyle = `hsla(${currentHue}, 100%, 50%, ${alpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Mid warm ember body
        ctx.fillStyle = p.isWhiteHot
          ? `hsla(${currentHue + 15}, 100%, 80%, ${alpha * 0.85})`
          : `hsla(${currentHue}, 100%, 60%, ${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Intense incandescent White-Hot Spark Core
        ctx.fillStyle = `rgba(255, 255, 255, ${p.isWhiteHot ? alpha : alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * (p.isWhiteHot ? 0.9 : 0.6), 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      if (newSparks.length > 0) {
        particles.current.push(...newSparks);
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(animate);
    };

    let isVisible = true;
    const heroEl = document.getElementById('hero');
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          cancelAnimationFrame(animRef.current);
          animRef.current = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animRef.current);
        }
      },
      { threshold: 0.05 }
    );

    if (heroEl) observer.observe(heroEl);
    animRef.current = requestAnimationFrame(animate);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      observer.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [ignited]);

  const handleIgnite = (e?: React.MouseEvent | MouseEvent) => {
    if (ignited) return;
    onIgnite();
    // Spectacular high-performance radial fiery orange & white spark eruption
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = e && 'clientX' in e && e.clientX ? e.clientX : canvas.width / 2;
      const cy = e && 'clientY' in e && e.clientY ? e.clientY : canvas.height / 2;
      for (let i = 0; i < 75; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 1.6 - Math.PI / 2; // Upward erupting arc
        const speed = Math.random() * 9 + 3.0;
        particles.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 3.5, // Strong upward eruption
          life: 1,
          maxLife: Math.random() * 70 + 45,
          size: Math.random() * 0.5 + 0.7,
          hue: Math.random() * 12 + 16,
          isWhiteHot: Math.random() > 0.4,
          flickerSpeed: Math.random() * 0.3 + 0.15,
          flickerOffset: Math.random() * Math.PI * 2,
          wanderSpeed: 0.05,
          wanderOffset: Math.random() * Math.PI * 2,
          wanderAmp: 0.2,
          age: 0,
          trail: [{ x: cx, y: cy }],
          maxTrail: 4, // Small crisp orange tail
          type: 'burst',
          hasPopped: true,
        });
      }
    }
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

      <div
        className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ${
          ignited ? 'pt-28 sm:pt-36 pb-16 sm:pb-20' : 'py-12'
        }`}
      >
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
          <div className="my-auto flex flex-col items-center gap-6 sm:gap-8 transition-all duration-700 opacity-100 translate-y-0 animate-fade-up">
            {/* Tagline badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 px-5 py-2 backdrop-blur-sm shadow-[0_0_20px_rgba(255,90,31,0.15)]">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ember shadow-[0_0_8px_rgba(255,90,31,0.9),0_0_16px_rgba(255,90,31,0.5)]" />
              </span>
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
              <button
                type="button"
                onClick={onOpenContact}
                className="magnetic-btn group relative px-8 py-4 rounded-full bg-ember text-white text-sm font-semibold ember-glow hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer"
              >
                <span className="relative z-10">Start Your Project</span>
                <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                type="button"
                onClick={onOpenWork}
                className="magnetic-btn px-8 py-4 rounded-full glass-card glass-card-hover text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Our Work</span>
                <span className="text-ember">↗</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
