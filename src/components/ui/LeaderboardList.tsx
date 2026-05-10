/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderboardEntry } from '../../types';
import { motion } from 'motion/react';

interface Props {
  entries: LeaderboardEntry[];
  title: string;
}

export default function LeaderboardList({ entries, title }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em]">{title} // Leaderboard</h3>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map((entry, i) => (
          <motion.div 
            key={`${entry.userId}_${entry.timestamp}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 bg-white/5 border-l-2 border-l-accent/30 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-white/40">{(i + 1).toString().padStart(2, '0')}</span>
              <span className="text-sm font-bold uppercase tracking-tight">{entry.username}</span>
            </div>
            <span className="text-lg font-display text-accent tabular-nums">
              {entry.score.toLocaleString()}
            </span>
          </motion.div>
        ))}
        {entries.length === 0 && (
          <div className="text-[10px] font-mono text-white/20 italic p-4 text-center border border-dashed border-white/5 uppercase">
            No Records Found In Shard
          </div>
        )}
      </div>
    </div>
  );
}
