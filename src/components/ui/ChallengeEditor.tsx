/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Genre, Challenge } from '../../types';
import { evaluateChallengeSuggestion } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Wand2, Send, X, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSubmit: (challenge: Challenge) => void;
}

export default function ChallengeEditor({ onClose, onSubmit }: Props) {
  const [suggestion, setSuggestion] = useState({
    title: '',
    objective: '',
    genre: Genre.PLATFORMER
  });
  
  const [analyzing, setAnalyzing] = useState(false);
  const [evaluatedChallenge, setEvaluatedChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!suggestion.title || !suggestion.objective) {
      setError("Please fill in title and objective");
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    try {
      const result = await evaluateChallengeSuggestion(suggestion);
      setEvaluatedChallenge(result as Challenge);
    } catch (e) {
      setError("Failed to analyze challenge. The Shard is unstable.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-bg-dark border border-white/10 w-full max-w-lg overflow-hidden flex flex-col skew-card"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-xl font-display uppercase tracking-tighter glitch-text">Forge New Reality</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 text-white/40">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Reality_Name</label>
              <input 
                type="text" 
                value={suggestion.title}
                onChange={e => setSuggestion(s => ({ ...s, title: e.target.value }))}
                placeholder="E.g. GRAVITY COLLAPSE"
                className="w-full bg-white/5 border border-white/10 p-3 font-mono text-xs focus:border-accent outline-none transition-colors"
                maxLength={32}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Mission_Objective</label>
              <textarea 
                value={suggestion.objective}
                onChange={e => setSuggestion(s => ({ ...s, objective: e.target.value }))}
                placeholder="E.g. SURVIVE FOR 5 MINUTES WITHOUT TOUCHING THE FLOOR"
                className="w-full bg-white/5 border border-white/10 p-3 font-mono text-xs focus:border-accent outline-none transition-colors h-24 resize-none"
                maxLength={128}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Base_Genre</label>
              <select 
                value={suggestion.genre}
                onChange={e => setSuggestion(s => ({ ...s, genre: e.target.value as Genre }))}
                className="w-full bg-white/5 border border-white/10 p-3 font-mono text-xs focus:border-accent outline-none transition-colors appearance-none uppercase"
              >
                {Object.values(Genre).filter(g => g !== Genre.VOID).map(g => (
                  <option key={g} value={g} className="bg-bg-dark">{g}</option>
                ))}
              </select>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {evaluatedChallenge ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-accent/10 border border-accent/20 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-accent">AI ANALYSIS COMPLETE</span>
                  <span className="text-[10px] font-mono bg-accent text-black px-2 py-0.5">EST. REWARD: {evaluatedChallenge.rewardXp} XP</span>
                </div>
                <div className="text-[10px] font-mono text-white/60 leading-relaxed uppercase">
                  Rules: {evaluatedChallenge.rules.description}
                </div>
                {evaluatedChallenge.specialMutations && (
                  <div className="flex flex-wrap gap-1">
                    {evaluatedChallenge.specialMutations.map(m => (
                      <span key={m} className="text-[8px] font-mono bg-red-500/20 px-1 py-0.5 text-red-400 border border-red-500/30 font-bold">{m}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {evaluatedChallenge.rules.mechanics.map(m => (
                    <span key={m} className="text-[8px] font-mono border border-accent/30 px-1 py-0.5 text-accent">{m}</span>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono flex items-center gap-2">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center justify-center gap-2 py-4 border border-white/20 text-[11px] font-mono uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-20"
            >
              <Wand2 size={14} />
              {analyzing ? 'Analyzing Shard...' : 'Analyze Reality'}
            </button>
            
            <button 
              onClick={() => evaluatedChallenge && onSubmit(evaluatedChallenge)}
              disabled={!evaluatedChallenge}
              className="flex items-center justify-center gap-2 py-4 bg-white text-black font-display text-sm uppercase tracking-tighter hover:bg-accent transition-colors disabled:opacity-20"
            >
              <Send size={14} />
              Submit to Multiverse
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
