/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameRule } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  rule: GameRule;
  onDeath: () => void;
  onScore: (amount: number) => void;
  onAction: () => void;
}

export default function PuzzleModule({ rule, onDeath, onScore, onAction }: Props) {
  const GRID_SIZE = 10;
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [goalPos, setGoalPos] = useState({ x: 9, y: 9 });
  const [obstacles, setObstacles] = useState<{x: number, y: number, pushable?: boolean}[]>([]);
  const [items, setItems] = useState<{x: number, y: number}[]>([]);
  const [teleporters, setTeleporters] = useState<{x1: number, y1: number, x2: number, y2: number}[]>([]);
  const [vfx, setVfx] = useState<{id: string, x: number, y: number, type: 'collect' | 'teleport' | 'push'}[]>([]);

  const addVfx = (x: number, y: number, type: 'collect' | 'teleport' | 'push') => {
    const id = Math.random().toString(36);
    setVfx(prev => [...prev, { id, x, y, type }]);
    setTimeout(() => setVfx(prev => prev.filter(v => v.id !== id)), 600);
  };

  useEffect(() => {
    // Generate level
    const newObstacles: {x: number, y: number, pushable?: boolean}[] = [];
    const newItems = [];
    
    const isOccupied = (x: number, y: number) => {
      if (x === 0 && y === 0) return true;
      if (x === 9 && y === 9) return true;
      if (newObstacles.some(o => o.x === x && o.y === y)) return true;
      return false;
    };

    for (let i = 0; i < 10 + (rule.difficulty * 3); i++) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (!isOccupied(x, y)) {
        newObstacles.push({ x, y, pushable: Math.random() > 0.7 });
      }
    }
    
    // Teleporters
    const tx1 = Math.floor(Math.random() * GRID_SIZE);
    const ty1 = Math.floor(Math.random() * GRID_SIZE);
    const tx2 = Math.floor(Math.random() * GRID_SIZE);
    const ty2 = Math.floor(Math.random() * GRID_SIZE);
    if (!isOccupied(tx1, ty1) && !isOccupied(tx2, ty2) && (tx1 !== tx2 || ty1 !== ty2)) {
      setTeleporters([{ x1: tx1, y1: ty1, x2: tx2, y2: ty2 }]);
    } else {
      setTeleporters([]);
    }

    for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (!isOccupied(x, y)) {
          newItems.push({ x, y });
        }
      }
    setObstacles(newObstacles);
    setItems(newItems);
    setPlayerPos({ x: 0, y: 0 });
  }, [rule]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let nextX = playerPos.x;
      let nextY = playerPos.y;
      let dx = 0;
      let dy = 0;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') { nextY--; dy = -1; }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { nextY++; dy = 1; }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { nextX--; dx = -1; }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { nextX++; dx = 1; }
      else return;

      onAction();

      if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) return;

      const obstacleIdx = obstacles.findIndex(o => o.x === nextX && o.y === nextY);
      if (obstacleIdx !== -1) {
        const obs = obstacles[obstacleIdx];
        if (obs.pushable) {
          const pushX = nextX + dx;
          const pushY = nextY + dy;
          // Check if spot behind is clear
          if (pushX >= 0 && pushX < GRID_SIZE && pushY >= 0 && pushY < GRID_SIZE && 
              !obstacles.some(o => o.x === pushX && o.y === pushY) &&
              !(pushX === goalPos.x && pushY === goalPos.y)) {
            setObstacles(prev => prev.map((o, index) => index === obstacleIdx ? { ...o, x: pushX, y: pushY } : o));
            addVfx(nextX, nextY, 'push');
          } else {
            return;
          }
        } else {
          onScore(-10); // Penalty for hitting wall
          return;
        }
      }

      // Teleporter logic
      let finalX = nextX;
      let finalY = nextY;
      for (const t of teleporters) {
        if (nextX === t.x1 && nextY === t.y1) { 
          finalX = t.x2; finalY = t.y2; 
          addVfx(t.x1, t.y1, 'teleport');
          addVfx(t.x2, t.y2, 'teleport');
        }
        else if (nextX === t.x2 && nextY === t.y2) { 
          finalX = t.x1; finalY = t.y1; 
          addVfx(t.x2, t.y2, 'teleport');
          addVfx(t.x1, t.y1, 'teleport');
        }
      }

      setPlayerPos({ x: finalX, y: finalY });

      if (finalX === goalPos.x && finalY === goalPos.y) {
        onScore(500);
        addVfx(finalX, finalY, 'collect');
        // Regenerate level (handled by setting player back)
        setPlayerPos({ x: 0, y: 0 });
      }

      const itemIdx = items.findIndex(i => i.x === finalX && i.y === finalY);
      if (itemIdx !== -1) {
        setItems(prev => prev.filter((_, i) => i !== itemIdx));
        onScore(100);
        addVfx(finalX, finalY, 'collect');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, obstacles, items, teleporters, rule]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8">
      <div 
        className="grid gap-1 bg-zinc-900 p-2 rounded-xl border border-zinc-800"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          width: 'min(80vh, 100%)',
          aspectRatio: '1/1'
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isPlayer = playerPos.x === x && playerPos.y === y;
          const isGoal = goalPos.x === x && goalPos.y === y;
          const obstacle = obstacles.find(o => o.x === x && o.y === y);
          const isItem = items.some(it => it.x === x && it.y === y);
          const isTeleporter = teleporters.some(t => (t.x1 === x && t.y1 === y) || (t.x2 === x && t.y2 === y));
          const activeVfx = vfx.filter(v => v.x === x && v.y === y);

          return (
            <div 
              key={i}
              className="relative rounded-sm overflow-hidden flex items-center justify-center transition-colors"
              style={{ backgroundColor: (x + y) % 2 === 0 ? '#18181b' : '#09090b' }}
            >
              <AnimatePresence>
                {activeVfx.map(v => (
                  <motion.div
                    key={v.id}
                    className="absolute inset-0 z-20 pointer-events-none"
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ 
                      backgroundColor: v.type === 'collect' ? '#fbbf24' : v.type === 'teleport' ? '#a855f7' : '#ffffff20',
                      borderRadius: v.type === 'teleport' ? '50%' : '0'
                    }}
                  />
                ))}
                {isTeleporter && (
                  <motion.div 
                    className="absolute inset-2 rounded-full border-2 border-dashed border-purple-500 animate-spin-slow opacity-50"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                {isPlayer && (
                  <motion.div 
                    layoutId="player"
                    className="absolute inset-1 bg-white rounded-sm shadow-[0_0_15px_#fff] z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                {isGoal && (
                  <motion.div 
                    className="absolute inset-1 rounded-sm border-2 border-dashed flex items-center justify-center text-cyan-400 z-0"
                    style={{ borderColor: rule.colorTheme }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    GOAL
                  </motion.div>
                )}
                {obstacle && (
                  <motion.div 
                    layout
                    className="absolute inset-1 rounded-sm shadow-xl"
                    style={{ 
                      backgroundColor: rule.colorTheme, 
                      opacity: obstacle.pushable ? 0.8 : 0.2,
                      border: obstacle.pushable ? '1px solid #ffffff40' : 'none'
                    }}
                  >
                    {obstacle.pushable && (
                      <div className="w-full h-full flex items-center justify-center opacity-30">
                        <div className="w-1 h-1 bg-white rounded-full m-0.5" />
                        <div className="w-1 h-1 bg-white rounded-full m-0.5" />
                      </div>
                    )}
                  </motion.div>
                )}
                {isItem && (
                   <motion.div 
                    className="w-2 h-2 rounded-full bg-yellow-400 z-5"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
