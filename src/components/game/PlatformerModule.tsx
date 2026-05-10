/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { GameRule, Mechanic } from '../../types';

interface Props {
  rule: GameRule;
  onDeath: () => void;
  onScore: (amount: number) => void;
  onAction: () => void;
}

export default function PlatformerModule({ rule, onDeath, onScore, onAction }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Game state
  const player = useRef({
    x: 50,
    y: 0,
    vx: 0,
    vy: 0,
    w: 32,
    h: 32,
    onGround: false,
    jumps: 0,
  });

  const particles = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string, size?: number}[]>([]);
  const trail = useRef<{x: number, y: number, life: number}[]>([]);
  const keys = useRef<Record<string, boolean>>({});
  const platforms = useRef<{
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    type: 'normal' | 'destructible' | 'gravity_zone',
    life?: number,
    gravityMult?: number
  }[]>([]);
  const coins = useRef<{x: number, y: number, collected: boolean}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initLevel();
    };

    const initLevel = () => {
      platforms.current = [
        { x: 0, y: canvas.height - 40, w: canvas.width * 2, h: 40, type: 'normal' }, // Ground
        { x: 300, y: canvas.height - 150, w: 200, h: 20, type: 'normal' },
        { x: 600, y: canvas.height - 250, w: 200, h: 20, type: 'destructible', life: 1 },
        { x: 200, y: canvas.height - 350, w: 200, h: 20, type: 'normal' },
        { x: 500, y: canvas.height - 450, w: 200, h: 20, type: 'gravity_zone', gravityMult: -0.5 },
        { x: 100, y: canvas.height - 550, w: 100, h: 20, type: 'destructible', life: 1 },
      ];
      
      coins.current = platforms.current.filter(p => p.type !== 'gravity_zone').slice(1).map(p => ({
        x: p.x + p.w/2,
        y: p.y - 40,
        collected: false
      }));

      player.current.y = canvas.height - 100;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      onAction();
    };
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnParticles = (x: number, y: number, count: number, color: string, size: number = 2) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          color,
          size
        });
      }
    };

    const update = () => {
      const p = player.current;
      const { gravity, friction, speed } = rule.physics;
      
      // Horizontal movement
      if (keys.current['ArrowLeft'] || keys.current['KeyA']) p.vx -= 1;
      if (keys.current['ArrowRight'] || keys.current['KeyD']) p.vx += 1;
      
      p.vx *= friction;
      p.x += p.vx * speed;

      // Jump logic
      const maxJumps = rule.mechanics.includes(Mechanic.DOUBLE_JUMP) ? 2 : 1;
      if ((keys.current['Space'] || keys.current['ArrowUp'] || keys.current['KeyW'])) {
        if (p.onGround) {
          p.vy = -12;
          p.onGround = false;
          p.jumps = 1;
          keys.current['Space'] = false; // Prevent auto-repeat
          spawnParticles(p.x + p.w/2, p.y + p.h, 10, '#ffffff', 1); // Jump dust
        } else if (p.jumps < maxJumps) {
          p.vy = -12;
          p.jumps++;
          keys.current['Space'] = false;
          spawnParticles(p.x + p.w/2, p.y + p.h/2, 10, rule.colorTheme, 1);
        }
      }

      // Logic
      let currentGravity = gravity * 2;
      
      // Collision Detection
      p.onGround = false;
      for (let i = platforms.current.length - 1; i >= 0; i--) {
        const platform = platforms.current[i];
        const isColliding = p.x < platform.x + platform.w &&
                           p.x + p.w > platform.x &&
                           p.y + p.h > platform.y &&
                           p.y < platform.y + platform.h;

        if (isColliding) {
          if (platform.type === 'gravity_zone') {
            currentGravity = gravity * (platform.gravityMult || 1);
          } else if (p.vy > 0 && p.y + p.h - p.vy <= platform.y) {
            p.y = platform.y - p.h;
            p.vy = 0;
            p.onGround = true;
            p.jumps = 0;
            
            if (platform.type === 'destructible') {
              platform.life = (platform.life || 0) - 0.02; // Slow dissolve
              if (Math.random() < 0.3) spawnParticles(p.x + Math.random() * p.w, platform.y, 1, '#ef4444', 1);
              if (platform.life <= 0) {
                spawnParticles(platform.x + platform.w/2, platform.y + platform.h/2, 20, '#ef4444', 3);
                platforms.current.splice(i, 1);
                onAction(); // Shake or effect trigger
              }
            }
          }
        }
      }

      // Physics
      p.vy += currentGravity;
      p.y += p.vy;

      // Collect coins
      for (const coin of coins.current) {
        if (!coin.collected && Math.hypot(p.x + p.w/2 - coin.x, p.y + p.h/2 - coin.y) < 30) {
          coin.collected = true;
          spawnParticles(coin.x, coin.y, 15, '#fbbf24', 2);
          onScore(100);
        }
      }

      // Bounds
      if (p.y > canvas.height) {
        spawnParticles(p.x + p.w/2, canvas.height - 10, 30, '#ef4444', 3);
        onDeath();
        p.x = 50;
        p.y = canvas.height - 100;
        p.vy = 0;
      }
      if (p.x < 0) p.x = 0;
      if (p.x > canvas.width - p.w) p.x = canvas.width - p.w;

      // Update Particles
      particles.current = particles.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
      });

      // Update Trail
      if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
        trail.current.push({ x: p.x, y: p.y, life: 0.5 });
      }
      trail.current = trail.current.filter(t => {
        t.life -= 0.05;
        return t.life > 0;
      });

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#ffffff05';
      ctx.lineWidth = 1;
      for(let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for(let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

      // Draw Trail
      for (const t of trail.current) {
        ctx.globalAlpha = t.life * 0.3;
        ctx.fillStyle = rule.colorTheme;
        ctx.fillRect(t.x, t.y, p.w, p.h);
      }
      ctx.globalAlpha = 1;

      // Draw Platforms
      for (const platform of platforms.current) {
        if (platform.type === 'gravity_zone') {
          ctx.fillStyle = '#6366f120';
          ctx.strokeStyle = '#6366f140';
          ctx.setLineDash([5, 5]);
          ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
          ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
          ctx.setLineDash([]);
          
          // Draw arrows
          ctx.fillStyle = '#6366f140';
          const direction = (platform.gravityMult || 0) < 0 ? -1 : 1;
          for(let dx = 20; dx < platform.w; dx += 40) {
            ctx.beginPath();
            ctx.moveTo(platform.x + dx, platform.y + (direction > 0 ? 5 : platform.h - 5));
            ctx.lineTo(platform.x + dx - 5, platform.y + (direction > 0 ? 15 : platform.h - 15));
            ctx.lineTo(platform.x + dx + 5, platform.y + (direction > 0 ? 15 : platform.h - 15));
            ctx.fill();
          }
        } else {
          ctx.fillStyle = platform.type === 'destructible' ? '#ef4444' : rule.colorTheme;
          if (platform.type === 'destructible') {
             ctx.globalAlpha = platform.life || 1;
          }
          ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
          ctx.strokeStyle = '#ffffff20';
          ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
          ctx.globalAlpha = 1;
        }
      }

      // Draw Coins
      ctx.fillStyle = '#fbbf24';
      for (const coin of coins.current) {
        if (!coin.collected) {
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Particles
      for (const part of particles.current) {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size || 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Draw Player
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = rule.colorTheme;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.shadowBlur = 0;

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [rule]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full cursor-none"
    />
  );
}
