import { useEffect, useRef, useState } from 'react';

interface SparkPoint {
  x: number;
  y: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  flickerSpeed: number;
  flickerOffset: number;
  wanderSpeed: number;
  wanderOffset: number;
  wanderAmp: number;
  age: number;
  trail: SparkPoint[];
  maxTrail: number;
  type: 'ember' | 'burst';
}

function isTouchOrMobile(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches ||
    window.innerWidth < 1024
  );
}

function DesktopCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Spark[]>([]);
  const mouse = useRef({ x: -100, y: -100 });
  const lastSpawn = useRef({ x: -100, y: -100 });
  const animRef = useRef<number>(0);

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

    const createSmallOrangeSpark = (
      x: number,
      y: number,
      vx?: number,
      vy?: number,
      sizeMultiplier: number = 1
    ): Spark => {
      return {
        x,
        y,
        vx: vx ?? (Math.random() - 0.5) * 0.8,
        vy: vy ?? -Math.random() * 1.5 - 0.6, // Decisive upward trajectory like hero spark
        life: 1,
        maxLife: Math.random() * 25 + 20,
        size: (Math.random() * 0.4 + 0.6) * sizeMultiplier, // Small delicate spark size
        hue: Math.random() * 10 + 17, // Pure vibrant ember orange (17-27 deg)
        flickerSpeed: Math.random() * 0.3 + 0.15,
        flickerOffset: Math.random() * Math.PI * 2,
        wanderSpeed: Math.random() * 0.06 + 0.03,
        wanderOffset: Math.random() * Math.PI * 2,
        wanderAmp: Math.random() * 0.3 + 0.2,
        age: 0,
        trail: [{ x, y }],
        maxTrail: 4, // Small, tight, crisp tail like hero section
        type: 'ember',
      };
    };

    // Spectacular high-performance fiery orange spark eruption matching Hero section click ignite
    const spawnHeroClickEruption = (cx: number, cy: number, count: number = 48) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 1.6 - Math.PI / 2; // Upward erupting arc
        const speed = Math.random() * 9 + 2.8;
        particles.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 3.5, // Strong upward eruption like hero section
          life: 1,
          maxLife: Math.random() * 65 + 40, // Elegant lingering arc
          size: Math.random() * 0.5 + 0.65, // Small crisp hero spark
          hue: Math.random() * 12 + 16, // Pure vibrant ember orange (16-28 deg)
          flickerSpeed: Math.random() * 0.3 + 0.15,
          flickerOffset: Math.random() * Math.PI * 2,
          wanderSpeed: 0.05,
          wanderOffset: Math.random() * Math.PI * 2,
          wanderAmp: 0.2,
          age: 0,
          trail: [{ x: cx, y: cy }],
          maxTrail: 4, // Small crisp orange tail
          type: 'burst',
        });
      }
    };

    let isRunning = false;
    const startAnimating = () => {
      if (!isRunning) {
        isRunning = true;
        animRef.current = requestAnimationFrame(animate);
      }
    };

    const animate = () => {
      if (particles.current.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isRunning = false;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.age++;

        // Physics matching Hero spark physics
        if (p.type === 'ember') {
          const wander = Math.sin(p.age * p.wanderSpeed + p.wanderOffset) * p.wanderAmp;
          p.x += p.vx + wander;
          p.y += p.vy;
          p.vy -= 0.03; // Thermal upward buoyancy
          p.vx *= 0.985;
          p.vy *= 0.985;
        } else {
          // Burst eruption physics
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.04; // Hero upward buoyancy lift
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        // Store high-precision trail positions
        p.trail.unshift({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrail) {
          p.trail.pop();
        }

        p.life = Math.max(0, 1 - p.age / p.maxLife);

        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }

        // Organic micro-flicker
        const flicker =
          0.75 +
          0.25 * Math.sin(p.age * p.flickerSpeed + p.flickerOffset);
        const currentAlpha = p.life * flicker;
        const currentHue = p.hue + (1 - p.life) * 8; // Transitions gracefully within pure orange hue

        // 1. Draw glowing fiery trailing tail
        if (p.trail.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = `hsla(${currentHue}, 100%, 54%, ${currentAlpha * 0.6})`;
          ctx.lineWidth = Math.max(0.6, p.size * 0.9 * p.life);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        // 2. Draw outer ember fiery aura
        const glowRadius = p.size * 2.8;
        const auraGrad = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          glowRadius
        );
        auraGrad.addColorStop(
          0,
          `hsla(${currentHue}, 100%, 52%, ${currentAlpha * 0.8})`
        );
        auraGrad.addColorStop(
          0.6,
          `hsla(${currentHue - 4}, 100%, 46%, ${currentAlpha * 0.3})`
        );
        auraGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw small crisp golden-orange spark core (Strictly orange, zero white)
        const coreRadius = Math.max(0.5, p.size * 0.75 * p.life);
        ctx.fillStyle = `hsla(${currentHue + 8}, 100%, 68%, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(animate);
    };

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      mouse.current = { x, y };

      if (cursorRef.current && cursorRef.current.style.opacity !== '1') {
        cursorRef.current.style.opacity = '1';
      }
      if (trailRef.current && trailRef.current.style.opacity !== '1') {
        trailRef.current.style.opacity = '1';
      }

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x - 5}px, ${y - 5}px, 0)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0)`;
      }

      // Spawn small orange hero spark on cursor movement
      const dx = x - lastSpawn.current.x;
      const dy = y - lastSpawn.current.y;
      if (dx * dx + dy * dy > 36 && particles.current.length < 80) {
        lastSpawn.current = { x, y };
        particles.current.push(
          createSmallOrangeSpark(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 0.7,
            -Math.random() * 1.2 - 0.4
          )
        );
        startAnimating();
      }
    };

    const handleClick = (e: MouseEvent) => {
      spawnHeroClickEruption(e.clientX, e.clientY, 48);
      startAnimating();
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX - 7}px, ${e.clientY - 7}px, 0) scale(1.4)`;
        setTimeout(() => {
          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate3d(${mouse.current.x - 5}px, ${mouse.current.y - 5}px, 0) scale(1)`;
          }
        }, 180);
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      if (trailRef.current) trailRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '1';
      if (trailRef.current) trailRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('click', handleClick);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="custom-cursor-container hidden lg:block" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[99998]"
        style={{ mixBlendMode: 'screen' }}
      />
      {/* Outer subtle ember pulse ring */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 w-9 h-9 pointer-events-none z-[99999] rounded-full will-change-transform opacity-0"
        style={{
          border: '1px solid rgba(255, 90, 31, 0.4)',
          boxShadow: '0 0 10px rgba(255, 90, 31, 0.15)',
          transition: 'transform 0.1s ease-out, opacity 0.2s ease',
        }}
      />
      {/* Inner glowing ember bead (solid orange, no white) */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full will-change-transform opacity-0"
        style={{
          width: '10px',
          height: '10px',
          background: 'radial-gradient(circle, #FF7A45 40%, #FF5A1F 100%)',
          boxShadow: '0 0 10px rgba(255, 90, 31, 0.8), 0 0 4px #FF7A45',
          transition: 'transform 0.05s ease-out, opacity 0.2s ease',
        }}
      />
    </div>
  );
}

export default function CursorEffect() {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    const updateStatus = () => {
      const isMobile = isTouchOrMobile();
      setEnabled(!isMobile);
      if (isMobile) {
        document.documentElement.classList.add('no-custom-cursor');
      } else {
        document.documentElement.classList.remove('no-custom-cursor');
      }
    };

    updateStatus();
    window.addEventListener('resize', updateStatus);
    return () => window.removeEventListener('resize', updateStatus);
  }, []);

  if (!enabled) {
    return null;
  }

  return <DesktopCursor />;
}
