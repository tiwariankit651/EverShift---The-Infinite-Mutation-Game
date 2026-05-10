/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { GameRule, Genre, Mechanic, WinCondition, BehaviorSnapshot, Challenge } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function evaluateChallengeSuggestion(suggestion: { title: string, objective: string, genre: Genre }): Promise<Partial<Challenge>> {
  const prompt = `
    A player wants to create a custom challenge for EverShift.
    Title: ${suggestion.title}
    Objective: ${suggestion.objective}
    Genre: ${suggestion.genre}

    Generate a balanced "GameRule" set for this challenge. 
    Adjust physics and mechanics to match the objective's complexity.
    Estimate a fair rewardXp (between 100 and 2000) based on perceived difficulty.

    Return the result strictly as a Challenge object (without author/timestamp fields).
    Include a "specialMutations" array with 1-3 creative, difficulty-enhancing rules.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            objective: { type: Type.STRING },
            rewardXp: { type: Type.NUMBER },
            specialMutations: { type: Type.ARRAY, items: { type: Type.STRING } },
            rules: {
              type: Type.OBJECT,
              properties: {
                genre: { type: Type.STRING, enum: Object.values(Genre) },
                physics: {
                  type: Type.OBJECT,
                  properties: {
                    gravity: { type: Type.NUMBER },
                    friction: { type: Type.NUMBER },
                    timeScale: { type: Type.NUMBER },
                    speed: { type: Type.NUMBER },
                  },
                  required: ["gravity", "friction", "timeScale", "speed"],
                },
                winCondition: { type: Type.STRING, enum: Object.values(WinCondition) },
                targetValue: { type: Type.NUMBER },
                mechanics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING, enum: Object.values(Mechanic) }
                },
                description: { type: Type.STRING },
                difficulty: { type: Type.NUMBER },
                colorTheme: { type: Type.STRING },
              },
              required: ["genre", "physics", "winCondition", "targetValue", "mechanics", "description", "difficulty", "colorTheme"],
            },
          },
          required: ["title", "objective", "rewardXp", "rules", "specialMutations"],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    const challengeId = `custom-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    return {
      ...result,
      id: challengeId,
      rules: {
        ...result.rules,
        id: `rule-${challengeId}`
      }
    } as Challenge;
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw error;
  }
}

export async function mutateGameRule(
  currentRule: GameRule | null,
  behavior: BehaviorSnapshot,
  reason: string
): Promise<GameRule> {
  const prompt = `
    You are the "Mutation Engine" for EverShift, an infinite mutation game.
    Current Game Rule: ${currentRule ? JSON.stringify(currentRule) : 'First Session'}
    Player Behavior: ${JSON.stringify(behavior)}
    Mutation Reason: ${reason}

    Based on the player's behavior and the mutation reason, generate a brand new set of game rules. 
    If the player is bored (low mobile/aggression), switch to a high-octane genre like SHOOTER.
    If the player is frustrated (high frustration), simplify the rules or add a helpful mechanic like SHIELD.
    If the reason is "Reality Shatter", be extremely creative and mix weird physics.

    Color Theme: Use hex colors like "#00FF7F" (accent green), "#FF00FF" (magenta glitch), or "#00FFFF" (cyan).

    Return the new rule strictly following the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { 
              type: Type.STRING, 
              enum: Object.values(Genre) 
            },
            physics: {
              type: Type.OBJECT,
              properties: {
                gravity: { type: Type.NUMBER },
                friction: { type: Type.NUMBER },
                timeScale: { type: Type.NUMBER },
                speed: { type: Type.NUMBER },
              },
              required: ["gravity", "friction", "timeScale", "speed"],
            },
            winCondition: { 
              type: Type.STRING, 
              enum: Object.values(WinCondition) 
            },
            targetValue: { type: Type.NUMBER },
            mechanics: {
              type: Type.ARRAY,
              items: { type: Type.STRING, enum: Object.values(Mechanic) }
            },
            description: { type: Type.STRING },
            difficulty: { type: Type.NUMBER },
            colorTheme: { type: Type.STRING },
          },
          required: ["genre", "physics", "winCondition", "targetValue", "mechanics", "description", "difficulty", "colorTheme"],
        },
      },
    });

    const rule = JSON.parse(response.text || '{}') as GameRule;
    rule.id = `rule-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    return rule;
  } catch (error) {
    console.error("Mutation failed, falling back to default:", error);
    return getDefaultRule();
  }
}

export async function generateChallenge(): Promise<Challenge> {
  const prompt = `
    Generate a highly challenging "EverShift" mission.
    The mission must be unique and have a specific goal.
    Examples: 
    1. "The Floor is Lava": Platformer with high gravity and constant health decay.
    2. "Bullet Hell Puzzle": Avoid projectiles while solving a tile puzzle.
    3. "Blind Survival": Horror genre with extremely limited visibility and speed boost.

    Return the challenge strictly following the schema.
    Include a "specialMutations" array containing unique environmental or behavioral twists (e.g. "Low Visibility", "Inverted Controls", "Aggressive Physics").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            objective: { type: Type.STRING },
            rewardXp: { type: Type.NUMBER },
            specialMutations: { type: Type.ARRAY, items: { type: Type.STRING } },
            rules: {
              type: Type.OBJECT,
              properties: {
                genre: { type: Type.STRING, enum: Object.values(Genre) },
                physics: {
                  type: Type.OBJECT,
                  properties: {
                    gravity: { type: Type.NUMBER },
                    friction: { type: Type.NUMBER },
                    timeScale: { type: Type.NUMBER },
                    speed: { type: Type.NUMBER },
                  },
                  required: ["gravity", "friction", "timeScale", "speed"],
                },
                winCondition: { type: Type.STRING, enum: Object.values(WinCondition) },
                targetValue: { type: Type.NUMBER },
                mechanics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING, enum: Object.values(Mechanic) }
                },
                description: { type: Type.STRING },
                difficulty: { type: Type.NUMBER },
                colorTheme: { type: Type.STRING },
              },
              required: ["genre", "physics", "winCondition", "targetValue", "mechanics", "description", "difficulty", "colorTheme"],
            },
          },
          required: ["title", "objective", "rewardXp", "rules", "specialMutations"],
        },
      },
    });

    const challenge = JSON.parse(response.text || '{}') as Challenge;
    const challengeId = `mission-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
    challenge.id = challengeId;
    challenge.rules.id = `rule-${challengeId}`;
    return challenge;
  } catch (error) {
    console.error("Challenge generation failed:", error);
    const fallbackId = `fallback-${Date.now()}`;
    return {
      id: fallbackId,
      title: "The Initial Trial",
      objective: "Reach score 500",
      rewardXp: 500,
      rules: { ...getDefaultRule(), id: `rule-${fallbackId}` },
      specialMutations: ["Reality instability"]
    };
  }
}

function getDefaultRule(): GameRule {
  const idValue = `rule-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  return {
    id: idValue,
    genre: Genre.PLATFORMER,
    physics: { gravity: 0.5, friction: 0.8, timeScale: 1.0, speed: 5 },
    winCondition: WinCondition.REACH_GOAL,
    targetValue: 1,
    mechanics: [Mechanic.DOUBLE_JUMP],
    description: "Navigate to the exit. Stability is low.",
    difficulty: 1,
    colorTheme: "#00FF7F",
  };
}
