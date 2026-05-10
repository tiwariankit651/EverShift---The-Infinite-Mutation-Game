/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, LeaderboardEntry, Challenge, SaveState } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function login() {
  return signInWithPopup(auth, provider);
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const ref = doc(db, 'profiles', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createProfile(user: User): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    username: user.displayName || 'Shiftwalker',
    level: 1,
    xp: 0,
    unlockedGenres: [],
    ruleFragments: [],
    unlockedCosmetics: [],
    totalMutationsSurvived: 0,
    highScores: {},
  };
  await setDoc(doc(db, 'profiles', user.uid), profile);
  return profile;
}

export async function addXP(userId: string, amount: number) {
  const ref = doc(db, 'profiles', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  
  const current = snap.data() as UserProfile;
  const newXp = current.xp + amount;
  const newLevel = Math.floor(newXp / 1000) + 1;
  const updates: any = { xp: newXp, level: newLevel };

  // Example unlock: Get a rule fragment every level up
  if (newLevel > current.level) {
    const fragments = [...current.ruleFragments, `Fragment_${newLevel}`];
    updates.ruleFragments = fragments;
  }

  await updateDoc(ref, updates);
}

export async function saveHighScore(userId: string, challengeId: string, score: number, username: string) {
  const entryId = `${userId}_${challengeId}`;
  const entry: LeaderboardEntry = {
    userId,
    username,
    score,
    challengeId,
    timestamp: Date.now(), // Rules expect request.time which is serverTimestamp
  };
  
  // Need to use serverTimestamp for the rules to pass if I strictly validated it
  // But my rules are using request.time, so I should use serverTimestamp() in the data
  const data = {
    ...entry,
    timestamp: serverTimestamp()
  };

  await setDoc(doc(db, 'leaderboards', challengeId, 'entries', entryId), data);
}

export async function getLeaderboard(challengeId: string): Promise<LeaderboardEntry[]> {
  const ref = collection(db, 'leaderboards', challengeId, 'entries');
  const q = query(ref, orderBy('score', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LeaderboardEntry);
}

export async function getChallenges(): Promise<Challenge[]> {
  const snap = await getDocs(collection(db, 'challenges'));
  return snap.docs.map(d => d.data() as Challenge);
}

export async function submitChallenge(challenge: Challenge) {
  const ref = doc(db, 'challenges', challenge.id);
  await setDoc(ref, challenge);
}

export async function saveGame(save: SaveState) {
  const ref = doc(db, 'saves', save.userId);
  const data = {
    ...save,
    timestamp: serverTimestamp()
  };
  await setDoc(ref, data);
}

export async function loadGame(userId: string): Promise<SaveState | null> {
  const ref = doc(db, 'saves', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  // Handle timestamp conversion back to number if needed, or just use as is
  return {
    ...data,
    timestamp: data.timestamp?.toMillis?.() || Date.now()
  } as SaveState;
}

export async function hasSavedGame(userId: string): Promise<boolean> {
  const ref = doc(db, 'saves', userId);
  const snap = await getDoc(ref);
  return snap.exists();
}
