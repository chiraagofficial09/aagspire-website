import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function CursorEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);
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

    const colors = ['#FF5A1F', '#FFFFFF', '#FF7A45', '#FFF5EB', '#FFB347', '#FFFFFF', '#FF3D00'];

    const spawnFireBurst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2,
          life: 1,
          maxLife: Math.random() * 40 + 25,
          size: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    let isAnimating = false;

    const startAnimating = () => {
      if (!isAnimating) {
        isAnimating = true;
        animRef.current = requestAnimationFrame(animate);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.current.length === 0) {
        isAnimating = false;
        return;
      }

      ctx.globalCompositeOperation = 'lighter';

      particles.current = particles.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.04;
        p.vx *= 0.97;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        const alpha = p.life * 0.85;
        const size = p.size * p.life;

        // Outer fiery aura / colored glow
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Mid warm body
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Incandescent white spark core
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = alpha * 0.95;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.65, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      mouse.current = { x, y };

      // Update cursor position directly via hardware-accelerated translate3d
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${x - 20}px, ${y - 20}px, 0)`;
      }

      // Spawn trail particle only if moved significantly
      const dx = x - lastSpawn.current.x;
      const dy = y - lastSpawn.current.y;
      if (dx * dx + dy * dy > 49 && particles.current.length < 25) {
        lastSpawn.current = { x, y };
        particles.current.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -Math.random() * 1.1 - 0.3,
          life: 1,
          maxLife: Math.random() * 18 + 10,
          size: Math.random() * 2 + 0.6,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
        startAnimating();
      }
    };

    const handleClick = (e: MouseEvent) => {
      spawnFireBurst(e.clientX, e.clientY, 18);
      startAnimating();
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 8}px, 0) scale(1.3)`;
        setTimeout(() => {
          if (cursorRef.current) {
            cursorRef.current.style.transform = `translate3d(${mouse.current.x - 6}px, ${mouse.current.y - 6}px, 0) scale(1)`;
          }
        }, 200);
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ mixBlendMode: 'screen' }}
      />
      <div
        ref={trailRef}
        className="fixed top-0 left-0 w-10 h-10 pointer-events-none z-[9999] rounded-full will-change-transform"
        style={{
          border: '1px solid rgba(255,90,31,0.35)',
          transition: 'transform 0.1s ease-out',
        }}
      />
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full will-change-transform"
        style={{
          width: '12px',
          height: '12px',
          background: 'radial-gradient(circle, #FF7A45, #FF5A1F)',
          boxShadow: '0 0 10px rgba(255,90,31,0.6)',
          transition: 'transform 0.05s ease-out',
        }}
      />
    </>
  );
}
