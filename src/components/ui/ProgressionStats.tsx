/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Star, Shield, Lock, Info } from 'lucide-react';

interface Props {
  profile: UserProfile;
}

export default function ProgressionStats({ profile }: Props) {
  const nextLevelXp = profile.level * 1000;
  const progress = (profile.xp % 1000) / 10;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 border-2 border-accent flex items-center justify-center relative">
          <div className="absolute inset-0 bg-accent/10 animate-pulse" />
          <span className="text-3xl font-display">{profile.level}</span>
          <div className="absolute -bottom-2 -right-2 bg-accent text-black text-[8px] font-bold px-1 uppercase px-1 py-0.5">
            LVL
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Shift_rank</span>
            <span className="text-[10px] font-mono text-accent">{profile.xp} / {nextLevelXp} XP</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 overflow-hidden">
            <motion.div 
              className="h-full bg-accent shadow-[0_0_10px_#00FF7F]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="MUTATIONS" value={profile.totalMutationsSurvived} icon={<Star size={12} />} />
        <StatBox 
          label="FRAGMENTS" 
          value={profile.ruleFragments.length} 
          icon={<Shield size={12} />} 
          tooltip="Rule fragments can be used to influence future mutations and weave new permanent changes into the reality engine."
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Unlocks</h4>
        <div className="flex flex-wrap gap-2">
          {profile.unlockedGenres.map(g => (
            <div key={g} className="px-2 py-1 bg-accent/20 border border-accent/30 text-[9px] font-mono uppercase text-accent">
              {g}
            </div>
          ))}
          {profile.unlockedGenres.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/20 italic">
              <Lock size={10} />
              Default Path Only
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, tooltip }: { label: string, value: any, icon: any, tooltip?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="p-3 bg-white/5 border border-white/10 flex flex-col gap-1 skew-card relative cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
        {tooltip && <Info size={8} className="opacity-40" />}
      </div>
      <div className="text-xl font-display leading-none">{value}</div>

      <AnimatePresence>
        {isHovered && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 bottom-full left-0 mb-2 w-48 p-2 bg-black border border-accent/30 text-[9px] font-mono leading-tight shadow-xl"
          >
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-black border-r border-b border-accent/30 rotate-45" />
            <span className="text-accent uppercase tracking-tighter block mb-1">Information //</span>
            <span className="text-white/80">{tooltip}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
