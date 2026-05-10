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

export default function ShooterModule({ rule, onDeath, onScore, onAction }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  const player = useRef({
    x: 0,
    y: 0,
    w: 30,
    h: 30,
    angle: 0,
  });

  const bullets = useRef<{x: number, y: number, vx: number, vy: number}[]>([]);
  const enemies = useRef<{x: number, y: number, health: number, lastHit?: number}[]>([]);
  const barriers = useRef<{x: number, y: number, w: number, h: number, health: number, lastHit?: number}[]>([]);
  const zones = useRef<{x: number, y: number, w: number, h: number, speedMult: number}[]>([]);
  const particles = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string}[]>([]);
  const keys = useRef<Record<string, boolean>>({});
  const mouse = useRef({ x: 0, y: 0 });
  const lastShot = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      player.current.x = canvas.width / 2;
      player.current.y = canvas.height / 2;
      
      initLevel();
    };

    const initLevel = () => {
      barriers.current = [
        { x: canvas.width * 0.2, y: canvas.height * 0.2, w: 40, h: 200, health: 200 },
        { x: canvas.width * 0.8, y: canvas.height * 0.6, w: 40, h: 200, health: 200 },
      ];
      zones.current = [
        { x: canvas.width * 0.4, y: canvas.height * 0.4, w: 200, h: 200, speedMult: 0.5 }, // Slime zone
      ];
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      onAction();
    };
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    const handleMouseDown = () => {
      if (Date.now() - lastShot.current > 200) {
        shoot();
        onAction();
        lastShot.current = Date.now();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    const spawnParticles = (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          color
        });
      }
    };

    const shoot = () => {
      const p = player.current;
      const angle = Math.atan2(mouse.current.y - p.y, mouse.current.x - p.x);
      bullets.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
      });
    };

    const spawnEnemy = () => {
      if (enemies.current.length < 5 + (rule.difficulty * 2)) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * canvas.width; y = -50; }
        else if (side === 1) { x = canvas.width + 50; y = Math.random() * canvas.height; }
        else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + 50; }
        else { x = -50; y = Math.random() * canvas.height; }
        enemies.current.push({ x, y, health: 100 });
      }
    };

    const update = () => {
      const p = player.current;
      let { speed } = rule.physics;
      
      // Check zones for speed modifications
      for (const zone of zones.current) {
        if (p.x > zone.x && p.x < zone.x + zone.w && p.y > zone.y && p.y < zone.y + zone.h) {
          speed *= zone.speedMult;
        }
      }

      // Movement with barrier collision
      const nextX = p.x + ((keys.current['KeyD'] || keys.current['ArrowRight'] ? 1 : 0) - (keys.current['KeyA'] || keys.current['ArrowLeft'] ? 1 : 0)) * speed;
      const nextY = p.y + ((keys.current['KeyS'] || keys.current['ArrowDown'] ? 1 : 0) - (keys.current['KeyW'] || keys.current['ArrowUp'] ? 1 : 0)) * speed;

      let canMoveX = true;
      let canMoveY = true;

      for (const b of barriers.current) {
        if (nextX + p.w/2 > b.x && nextX - p.w/2 < b.x + b.w && p.y + p.h/2 > b.y && p.y - p.h/2 < b.y + b.h) canMoveX = false;
        if (p.x + p.w/2 > b.x && p.x - p.w/2 < b.x + b.w && nextY + p.h/2 > b.y && nextY - p.h/2 < b.y + b.h) canMoveY = false;
      }

      if (canMoveX) p.x = nextX;
      if (canMoveY) p.y = nextY;

      // Rotation
      p.angle = Math.atan2(mouse.current.y - p.y, mouse.current.x - p.x);

      // Bullets
      bullets.current = bullets.current.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        return b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height;
      });

      // Enemies
      enemies.current.forEach(e => {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(angle) * (1 + rule.difficulty);
        e.y += Math.sin(angle) * (1 + rule.difficulty);

        // Collision with player
        if (Math.hypot(p.x - e.x, p.y - e.y) < 25) {
          onDeath();
          enemies.current = [];
          bullets.current = [];
        }
      });

      // Bullet-Enemy collision
      bullets.current.forEach((b, bi) => {
        enemies.current.forEach((e, ei) => {
          if (Math.hypot(b.x - e.x, b.y - e.y) < 20) {
            e.health -= 50;
            e.lastHit = Date.now();
            bullets.current.splice(bi, 1);
            spawnParticles(b.x, b.y, 5, '#ffffff'); // Hit sparks
            
            if (e.health <= 0) {
              spawnParticles(e.x, e.y, 20, rule.colorTheme); // Explosion
              enemies.current.splice(ei, 1);
              onScore(50);
            }
          }
        });
      });

      // Bullet-Barrier collision
      bullets.current.forEach((b, bi) => {
        barriers.current.forEach((bar, bari) => {
          if (b.x > bar.x && b.x < bar.x + bar.w && b.y > bar.y && b.y < bar.y + bar.h) {
            bar.health -= 25;
            bar.lastHit = Date.now();
            bullets.current.splice(bi, 1);
            spawnParticles(b.x, b.y, 3, '#ffffff');
            
            if (bar.health <= 0) {
              spawnParticles(bar.x + bar.w/2, bar.y + bar.h/2, 15, '#4b5563');
              barriers.current.splice(bari, 1);
              onAction();
            }
          }
        });
      });

      // Update Particles
      particles.current = particles.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
      });

      if (Math.random() < 0.02) spawnEnemy();

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#ffffff05';
      for(let x = 0; x < canvas.width; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for(let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

      // Draw Zones
      for (const zone of zones.current) {
        ctx.fillStyle = zone.speedMult < 1 ? '#10b98120' : '#f59e0b20';
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.strokeStyle = zone.speedMult < 1 ? '#10b98140' : '#f59e0b40';
        ctx.setLineDash([2, 5]);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);
      }

      // Draw Particles
      for (const p of particles.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw Barriers
      for (const b of barriers.current) {
        const hitFlash = b.lastHit && Date.now() - b.lastHit < 50;
        ctx.fillStyle = hitFlash ? '#ffffff' : '#4b5563';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#ffffff20';
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        // Health bar for barrier
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(b.x, b.y - 5, (b.health / 200) * b.w, 3);
      }

      // Draw Bullets
      ctx.fillStyle = '#f87171';
      for (const b of bullets.current) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Draw Enemies
      for (const e of enemies.current) {
        const hitFlash = e.lastHit && Date.now() - e.lastHit < 50;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Date.now() / 500);
        ctx.fillStyle = hitFlash ? '#ffffff' : rule.colorTheme;
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(-15, -15, 30, 30);
        ctx.restore();
      }

      // Draw Player
      ctx.save();
      ctx.translate(p.x, p.y);
      
      // Cooldown visual
      const cd = Math.max(0, 1 - (Date.now() - lastShot.current) / 200);
      if (cd > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d440';
        ctx.lineWidth = 2;
        ctx.arc(0, 0, 35, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * cd));
        ctx.stroke();
      }

      ctx.rotate(p.angle);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [rule]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full cursor-crosshair"
    />
  );
}
