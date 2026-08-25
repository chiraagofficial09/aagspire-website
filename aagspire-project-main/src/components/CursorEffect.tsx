import { useEffect, useRef, useState } from 'react';

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
  const mouse = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const [isClicking, setIsClicking] = useState(false);

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

    const colors = ['#FF5A1F', '#FF7A45', '#FFB347', '#FF3D00', '#FF6B35'];

    const spawnFireBurst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 3,
          life: 1,
          maxLife: Math.random() * 60 + 40,
          size: Math.random() * 4 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const spawnTrail = (x: number, y: number) => {
      if (Math.random() > 0.3) return;
      particles.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5 - 0.5,
        life: 1,
        maxLife: Math.random() * 25 + 15,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      spawnTrail(mouse.current.x, mouse.current.y);

      particles.current = particles.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.05;
        p.vx *= 0.98;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        const alpha = p.life * 0.9;
        const size = p.size * p.life;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
      }
    };

    const handleClick = (e: MouseEvent) => {
      spawnFireBurst(e.clientX, e.clientY, 60);
      setIsClicking(true);
      setTimeout(() => setIsClicking(false), 300);
    };

    window.addEventListener('mousemove', handleMove);
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
        className="fixed top-0 left-0 w-10 h-10 pointer-events-none z-[9999] rounded-full transition-all duration-150"
        style={{
          border: '1px solid rgba(255,90,31,0.3)',
          transition: 'transform 0.15s ease, width 0.2s ease, height 0.2s ease',
        }}
      />
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: isClicking ? '16px' : '12px',
          height: isClicking ? '16px' : '12px',
          background: isClicking
            ? 'radial-gradient(circle, #FFB347, #FF5A1F)'
            : 'radial-gradient(circle, #FF7A45, #FF5A1F)',
          borderRadius: '50%',
          boxShadow: isClicking
            ? '0 0 20px rgba(255,90,31,0.8), 0 0 40px rgba(255,90,31,0.4)'
            : '0 0 10px rgba(255,90,31,0.6)',
          transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
        }}
      />
    </>
  );
}
