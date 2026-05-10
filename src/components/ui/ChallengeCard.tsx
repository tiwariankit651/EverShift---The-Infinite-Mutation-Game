/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Challenge } from '../../types';
import { motion } from 'motion/react';
import { Zap, Trophy } from 'lucide-react';

interface Props {
  challenge: Challenge;
  onSelect: (challenge: Challenge) => void;
}

export default function ChallengeCard({ challenge, onSelect }: Props) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, x: 4 }}
      className="p-4 bg-white/5 border border-white/10 skew-card hover:border-accent transition-colors cursor-pointer group"
      onClick={() => onSelect(challenge)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-display uppercase tracking-tight group-hover:text-accent transition-colors">
          {challenge.title}
        </h3>
        <div className="flex items-center gap-1 text-[10px] font-mono text-accent">
          <Zap size={10} fill="currentColor" />
          {challenge.rewardXp} XP
        </div>
      </div>
      <p className="text-[11px] text-white/50 font-mono leading-tight uppercase mb-4">
        {challenge.objective}
      </p>
      {challenge.specialMutations && challenge.specialMutations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {challenge.specialMutations.map(m => (
            <span key={m} className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-[8px] font-mono text-red-500 uppercase tracking-tighter">
              {m}
            </span>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center text-[9px] font-mono opacity-40">
        <div className="flex flex-col">
          <span>GENRE: {challenge.rules.genre}</span>
          {challenge.authorName && <span className="text-[8px] text-accent/60">FORGED BY: {challenge.authorName}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Trophy size={10} />
          RANKED
        </div>
      </div>
    </motion.div>
  );
}
