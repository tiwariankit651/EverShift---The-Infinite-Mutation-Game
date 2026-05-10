/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Genre {
  PLATFORMER = 'platformer',
  SHOOTER = 'shooter',
  PUZZLE = 'puzzle',
  HORROR = 'horror',
  SURVIVAL = 'survival',
  VOID = 'void', // Special transition state
}

export enum Mechanic {
  DOUBLE_JUMP = 'double_jump',
  GRAVITY_FLIP = 'gravity_flip',
  DASH = 'dash',
  TIME_SLOW = 'time_slow',
  SHIELD = 'shield',
  RECOIL_JUMP = 'recoil_jump',
}

export enum WinCondition {
  SCORE = 'score',
  SURVIVAL = 'survival',
  COLLECT = 'collect',
  REACH_GOAL = 'reach_goal',
}

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  timeScale: number;
  speed: number;
}

export interface GameRule {
  id: string;
  genre: Genre;
  physics: PhysicsConfig;
  winCondition: WinCondition;
  targetValue: number;
  mechanics: Mechanic[];
  description: string;
  difficulty: number;
  colorTheme: string;
}

export interface PlayerStats {
  score: number;
  deaths: number;
  sessionTime: number;
  actions: number;
  currentGenreTime: number;
}

export interface Challenge {
  id: string;
  title: string;
  objective: string;
  rules: GameRule;
  rewardXp: number;
  timeLimit?: number;
  authorId?: string;
  authorName?: string;
  specialMutations?: string[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  timestamp: number;
  challengeId: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  level: number;
  xp: number;
  unlockedGenres: Genre[];
  ruleFragments: string[];
  unlockedCosmetics: string[];
  totalMutationsSurvived: number;
  highScores: Record<string, number>;
}

export interface BehaviorSnapshot {
  aggression: number;
  mobility: number;
  curiosity: number;
  frustration: number;
}

export interface SaveState {
  userId: string;
  timestamp: number;
  currentRule: GameRule;
  stats: PlayerStats;
  gameMode: 'FREE_PLAY' | 'CHALLENGE' | 'LOBBY';
  challengeId?: string;
  behavior: BehaviorSnapshot;
}
