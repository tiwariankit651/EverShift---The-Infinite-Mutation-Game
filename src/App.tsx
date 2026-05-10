/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameRule, PlayerStats, BehaviorSnapshot, Genre, UserProfile, Challenge, LeaderboardEntry } from './types';
import { mutateGameRule, generateChallenge } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, Trophy, Skull, LogIn, Award } from 'lucide-react';
import { auth, login, getProfile, createProfile, addXP, saveHighScore, getLeaderboard, getChallenges, submitChallenge, saveGame, loadGame, hasSavedGame } from './services/firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { SaveState } from './types';
import { Save, Download, RotateCcw } from 'lucide-react';

// Modules
import PlatformerModule from './components/game/PlatformerModule';
import ShooterModule from './components/game/ShooterModule';
import PuzzleModule from './components/game/PuzzleModule';

// UI Components
import ChallengeCard from './components/ui/ChallengeCard';
import ProgressionStats from './components/ui/ProgressionStats';
import LeaderboardList from './components/ui/LeaderboardList';
import ChallengeEditor from './components/ui/ChallengeEditor';
import MusicPlayer from './components/ui/MusicPlayer';

type GameMode = 'FREE_PLAY' | 'CHALLENGE' | 'LOBBY';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('LOBBY');
  const [currentRule, setCurrentRule] = useState<GameRule | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    deaths: 0,
    sessionTime: 0,
    actions: 0,
    currentGenreTime: 0,
  });
  
  const [isMutating, setIsMutating] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const mutationCooldown = useRef(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const triggerFlash = (color: string = "rgba(255,255,255,0.2)") => {
    setFlash(color);
    setTimeout(() => setFlash(null), 150);
  };

  const [behavior, setBehavior] = useState<BehaviorSnapshot>({
    aggression: 0.5,
    mobility: 0.5,
    curiosity: 0.5,
    frustration: 0,
  });

  // Auth & Profile Lifecycle
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        let p = await getProfile(u.uid);
        if (!p) p = await createProfile(u);
        setProfile(p);
        const exists = await hasSavedGame(u.uid);
        setHasSave(exists);
      } else {
        setProfile(null);
      }
    });
  }, []);

  // Load Challenges
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const challenges = await getChallenges();
        if (challenges.length === 0) {
          // If no challenges exist yet, generate some fallback ones
          const c1 = await generateChallenge();
          const c2 = await generateChallenge();
          setAvailableChallenges([c1, c2]);
        } else {
          setAvailableChallenges(challenges);
        }
      } catch (e) {
        console.error("Failed to load challenges", e);
      }
    };
    if (gameMode === 'LOBBY') loadChallenges();
  }, [gameMode]);

  const handleCreateChallenge = async (challenge: Challenge) => {
    if (!user) return;
    
    const finalChallenge = {
      ...challenge,
      authorId: user.uid,
      authorName: profile?.username || 'Unknown Voyager'
    };

    try {
      await submitChallenge(finalChallenge);
      setAvailableChallenges(prev => [...prev, finalChallenge]);
      setIsEditorOpen(false);
    } catch (e) {
      console.error("Submission failed", e);
    }
  };

  const triggerMutation = async (reason: string) => {
    if (mutationCooldown.current || gameMode === 'CHALLENGE') return;
    mutationCooldown.current = true;
    setIsMutating(true);
    triggerShake();
    triggerFlash("rgba(0, 255, 127, 0.3)"); // Green flash for mutation
    
    const newRule = await mutateGameRule(currentRule, behavior, reason);
    
    setTimeout(() => {
      setCurrentRule(newRule);
      setStats(prev => ({ ...prev, currentGenreTime: 0 }));
      setIsMutating(false);
      
      if (user) {
        addXP(user.uid, 50);
        setProfile(prev => prev ? { ...prev, xp: prev.xp + 50, totalMutationsSurvived: prev.totalMutationsSurvived + 1 } : null);
      }
      
      setTimeout(() => {
        mutationCooldown.current = false;
      }, 5000);
    }, 1000);
  };

  const startChallenge = async (challenge: Challenge) => {
    setActiveChallenge(challenge);
    setCurrentRule(challenge.rules);
    setGameMode('CHALLENGE');
    setStats({ score: 0, deaths: 0, sessionTime: 0, actions: 0, currentGenreTime: 0 });
    
    const lb = await getLeaderboard(challenge.id);
    setLeaderboard(lb);
  };

  const quitToLobby = () => {
    setGameMode('LOBBY');
    setActiveChallenge(null);
    setCurrentRule(null);
    // When returning to lobby, check again for save
    if (user) hasSavedGame(user.uid).then(setHasSave);
  };

  const handleSaveGame = async () => {
    if (!user || !currentRule) return;
    setIsSaving(true);
    try {
      const state: SaveState = {
        userId: user.uid,
        timestamp: Date.now(),
        currentRule,
        stats,
        gameMode,
        challengeId: activeChallenge?.id,
        behavior
      };
      await saveGame(state);
      setHasSave(true);
      triggerFlash("rgba(0, 255, 127, 0.4)");
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadGame = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const state = await loadGame(user.uid);
      if (state) {
        setCurrentRule(state.currentRule);
        setStats(state.stats);
        setBehavior(state.behavior);
        setGameMode(state.gameMode);
        if (state.challengeId) {
          const challenges = await getChallenges();
          const challenge = challenges.find(c => c.id === state.challengeId);
          if (challenge) setActiveChallenge(challenge);
        }
        triggerFlash("rgba(0, 200, 255, 0.4)");
      }
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlayerDeath = () => {
    setStats(prev => ({ ...prev, deaths: prev.deaths + 1 }));
    setBehavior(prev => ({ ...prev, frustration: Math.min(1, prev.frustration + 0.2) }));
    triggerShake();
    triggerFlash("rgba(255, 0, 0, 0.4)"); // Red flash for death
    
    if (gameMode === 'FREE_PLAY' && stats.deaths > 3) {
      triggerMutation("High Frustration Reset");
    }
  };

  const onScore = (amount: number) => {
    setStats(prev => ({ ...prev, score: prev.score + amount }));
    setBehavior(prev => ({ ...prev, aggression: Math.min(1, prev.aggression + 0.05) }));
  };

  const onAction = () => {
    setStats(prev => ({ ...prev, actions: prev.actions + 1 }));
    setBehavior(prev => ({ ...prev, mobility: Math.min(1, prev.mobility + 0.01) }));
    triggerShake();
    triggerFlash("rgba(255, 255, 255, 0.1)"); // Subtle white flash for action
  };

  useEffect(() => {
    if (gameMode === 'FREE_PLAY' && stats.currentGenreTime > 60 && !isMutating) {
      triggerMutation("Time-based Mutation");
    }
  }, [stats.currentGenreTime, gameMode, isMutating]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        sessionTime: prev.sessionTime + 1,
        currentGenreTime: prev.currentGenreTime + 1,
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFinishChallenge = async () => {
    if (user && activeChallenge) {
      await saveHighScore(user.uid, activeChallenge.id, stats.score, profile?.username || 'Player');
      await addXP(user.uid, activeChallenge.rewardXp);
      setProfile(prev => prev ? { ...prev, xp: prev.xp + activeChallenge.rewardXp } : null);
    }
    quitToLobby();
  };

  return (
    <div className="h-screen w-full bg-bg-dark text-[#F0F0F0] font-sans flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 scanline-overlay opacity-10" />

      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="text-3xl font-display tracking-widest uppercase glitch-text leading-none cursor-pointer" onClick={quitToLobby}>
            EverShift
          </div>
          {gameMode !== 'LOBBY' && (
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-mono tracking-tighter opacity-60">
                MODE: {gameMode}
              </div>
              {activeChallenge && (
                <div className="px-3 py-1 bg-accent/20 border border-accent/40 text-[10px] font-mono tracking-tighter text-accent uppercase">
                  OBJ: {activeChallenge.objective}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-8 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono uppercase opacity-50">{profile?.username} // LVL {profile?.level}</span>
                <div className="w-24 h-1 bg-white/10 mt-1 overflow-hidden">
                  <motion.div 
                    className="h-full bg-accent" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(profile?.xp || 0) % 1000 / 10}%` }}
                  />
                </div>
              </div>
              <div className="w-10 h-10 border border-white/10 p-1">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-full h-full object-cover" alt="Avatar" />
              </div>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[10px] font-mono uppercase tracking-widest"
            >
              <LogIn size={14} />
              Sync Shard
            </button>
          )}
          <div className="text-xs font-mono tabular-nums opacity-40">
            {new Date().toLocaleTimeString([], { hour12: false })}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {gameMode === 'LOBBY' ? (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full grid grid-cols-12 overflow-y-auto"
            >
              <section className="col-span-3 border-r border-white/10 flex flex-col p-8">
                <div className="mb-12">
                  <h3 className="text-[10px] font-mono uppercase text-white/40 tracking-[0.3em] mb-4">// Shiftwalker_Registry</h3>
                  {profile ? (
                    <ProgressionStats profile={profile} />
                  ) : (
                    <div className="p-8 border border-dashed border-white/10 text-center opacity-30 italic text-[10px] font-mono leading-relaxed">
                      [IDENTITY_NOT_FOUND]<br/>SYNC_REQUIRED_FOR_PROGRESSION
                    </div>
                  )}
                </div>

                <div className="mt-auto space-y-4">
                  <button 
                    onClick={() => {
                      setGameMode('FREE_PLAY');
                      triggerMutation("Initial Freeplay Session");
                    }}
                    className="w-full py-4 bg-white text-black font-display text-xl tracking-tighter uppercase hover:bg-accent transition-colors"
                  >
                    Enter Freeplay
                  </button>

                  {hasSave && (
                    <button 
                      onClick={handleLoadGame}
                      disabled={isLoading}
                      className="w-full py-3 bg-accent/20 border border-accent/40 text-accent font-display text-sm tracking-widest uppercase hover:bg-accent hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? <RotateCcw className="animate-spin" size={14} /> : <Download size={14} />}
                      Continue Shard
                    </button>
                  )}
                  
                  {user && (
                    <button 
                      onClick={() => setIsEditorOpen(true)}
                      className="w-full py-2 border border-white/20 text-white/40 font-mono text-[10px] uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Award size={14} />
                      Forge Challenge
                    </button>
                  )}
                </div>
              </section>

              <section className="col-span-6 bg-mutation border-x border-white/5 p-12">
                <div className="max-w-xl mx-auto space-y-12">
                  <div className="space-y-4 text-center">
                    <h2 className="text-7xl font-display uppercase tracking-tighter leading-none glitch-text">Active Trials</h2>
                    <p className="text-[10px] font-mono text-white/40 leading-relaxed uppercase tracking-[0.2em]">
                      Select a fixed-rule reality to test your skills
                    </p>
                  </div>

                  <div className="grid gap-6">
                    {availableChallenges.map(c => (
                      <ChallengeCard key={c.id} challenge={c} onSelect={startChallenge} />
                    ))}
                    {availableChallenges.length === 0 && (
                      <div className="h-48 border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
                        <span className="text-[10px] font-mono uppercase">Scanning Multiverse...</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="col-span-3 p-8 space-y-12">
                <div className="p-6 border-accent-glow bg-accent/5 skew-card">
                  <h3 className="text-[10px] font-mono uppercase mb-4 flex items-center gap-2">
                    <Activity size={12} className="text-accent" />
                    Shard Instability
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-4xl font-display">{(behavior.aggression * 100).toFixed(0)}%</span>
                      <span className="text-[10px] font-mono opacity-50 uppercase mb-1">Fluctuating</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 relative overflow-hidden">
                      <motion.div 
                        className="h-full bg-accent" 
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Shard_Updates</h3>
                   {[
                     "GENRE_SHIFT: Horror context removed.",
                     "LEADERBOARD: New records in 'Void' shard.",
                     "UPGRADE: Physics v4.2 stable."
                   ].map((log, i) => (
                     <div key={i} className="text-[10px] text-white/40 font-mono uppercase flex gap-4">
                        <span className="text-accent">0{i+1}</span>
                        <span>{log}</span>
                     </div>
                   ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="gameplay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full grid grid-cols-12"
            >
              <section className="col-span-3 border-r border-white/10 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto">
                <div>
                  <h3 className="text-[10px] font-mono uppercase text-accent tracking-widest mb-4">// Metrics</h3>
                  <div className="flex justify-between items-end">
                    <span className="text-5xl font-display">{behavior.aggression.toFixed(2)}</span>
                    <span className="text-[10px] font-mono text-white/40 uppercase mb-2">Entropy</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                   <h3 className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Mechanics</h3>
                   <div className="flex flex-col gap-2">
                     {currentRule?.mechanics.map(m => (
                       <div key={m} className="p-3 bg-white/5 border border-white/10 border-l-2 border-l-accent text-[10px] font-mono uppercase flex justify-between items-center">
                          {m.replace('_', ' ')}
                          <div className="w-1 h-1 bg-accent rounded-full shadow-[0_0_5px_#00FF7F]" />
                       </div>
                     ))}
                   </div>
                </div>

                {activeChallenge?.specialMutations && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-[10px] font-mono uppercase text-red-500/60 tracking-widest">Active_Mutations</h3>
                    <div className="flex flex-col gap-2">
                      {activeChallenge.specialMutations.map(m => (
                        <div key={m} className="p-3 bg-red-500/5 border border-red-500/20 border-l-2 border-l-red-500 text-[10px] font-mono uppercase">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto p-4 border border-dashed border-white/20">
                   <div className="text-[9px] font-mono text-white/40 uppercase leading-none mb-2">Rule Description</div>
                   <div className="text-[11px] font-mono text-white/80 uppercase leading-relaxed">{currentRule?.description}</div>
                </div>
              </section>

              <section className="col-span-6 relative flex flex-col items-center justify-center p-8 bg-mutation border-x border-white/5 overflow-hidden">
                 <AnimatePresence mode="wait">
                   {isMutating ? (
                     <motion.div key="mutating_ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <div className="w-16 h-16 border-2 border-t-accent border-white/10 rounded-full animate-spin mx-auto mb-6" />
                        <h2 className="text-5xl font-display uppercase tracking-tighter glitch-text">Shifting...</h2>
                     </motion.div>
                   ) : currentRule && (
                     <motion.div key={currentRule.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col relative">
                        <motion.div 
                          animate={shake ? {
                            x: [-8, 8, -8, 8, -4, 4, 0],
                            y: [-5, 5, -5, 5, -2, 2, 0],
                            rotate: [-1, 1, -1, 1, 0]
                          } : { x: 0, y: 0, rotate: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="flex-1 bg-black/40 border border-white/10 rounded overflow-hidden relative shadow-2xl"
                        >
                          <AnimatePresence>
                            {flash && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 pointer-events-none"
                                style={{ backgroundColor: flash }}
                              />
                            )}
                          </AnimatePresence>
                          {currentRule.genre === Genre.PLATFORMER && <PlatformerModule rule={currentRule} onDeath={onPlayerDeath} onScore={onScore} onAction={onAction} />}
                          {currentRule.genre === Genre.SHOOTER && <ShooterModule rule={currentRule} onDeath={onPlayerDeath} onScore={onScore} onAction={onAction} />}
                          {currentRule.genre === Genre.PUZZLE && <PuzzleModule rule={currentRule} onDeath={onPlayerDeath} onScore={onScore} onAction={onAction} />}
                        </motion.div>
                        
                        <div className="absolute top-8 left-8 pointer-events-none">
                           <h2 className="text-4xl font-display tracking-tighter glitch-text uppercase">{currentRule.genre}</h2>
                        </div>

                        {gameMode === 'CHALLENGE' && (
                          <div className="absolute bottom-12 right-12">
                             <button onClick={handleFinishChallenge} className="px-8 py-3 bg-white text-black font-display text-sm tracking-widest uppercase hover:bg-accent transition-colors shadow-2xl">
                               Complete Trial
                             </button>
                          </div>
                        )}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </section>

              <section className="col-span-3 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto">
                {gameMode === 'CHALLENGE' && (
                  <LeaderboardList entries={leaderboard} title="High_Scores" />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 skew-card">
                    <div className="text-[9px] font-mono text-white/40 uppercase mb-1">Score</div>
                    <div className="text-3xl font-display text-accent">{stats.score}</div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 skew-card text-red-500">
                    <div className="text-[9px] font-mono text-white/40 uppercase mb-1">Deaths</div>
                    <div className="text-3xl font-display">{stats.deaths}</div>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                   {user && (
                     <button 
                       onClick={handleSaveGame}
                       disabled={isSaving || !currentRule}
                       className="w-full py-2 bg-accent/10 border border-accent/20 text-accent font-mono text-[9px] uppercase hover:bg-accent/20 transition-all flex items-center justify-center gap-2"
                     >
                       {isSaving ? <RotateCcw className="animate-spin" size={10} /> : <Save size={10} />}
                       Save Shard
                     </button>
                   )}
                   {gameMode === 'FREE_PLAY' && (
                     <button 
                       onClick={() => triggerMutation("Manual Shatter")}
                       disabled={isMutating || mutationCooldown.current}
                       className="w-full py-4 bg-white text-black font-display text-sm tracking-widest uppercase hover:bg-accent transition-colors disabled:opacity-20"
                     >
                       Shatter Reality
                     </button>
                   )}
                   <button onClick={quitToLobby} className="w-full py-2 border border-white/10 text-white/20 font-mono text-[9px] uppercase hover:text-white transition-colors">
                     Back to Lobby
                   </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-8 py-4 bg-black border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-white/40">
        <div className="flex gap-8 items-center">
           <MusicPlayer />
           <div className="flex gap-8 ml-8">
              <span>PLAYERS: 001</span>
              <span>ENGINE: v12.4_AI</span>
           </div>
        </div>
        <div className="text-accent uppercase tracking-widest animate-pulse">Connection_Stable</div>
      </footer>

      {isEditorOpen && (
        <ChallengeEditor 
          onClose={() => setIsEditorOpen(false)} 
          onSubmit={handleCreateChallenge} 
        />
      )}
    </div>
  );
}
