/**
 * AI Personality System
 * Defines distinct behavioral profiles for enemy AI
 */

import { ENEMY_TYPES, EnemyType } from '../constants';

/** Personality archetypes for enemy behavior */
export const AI_PERSONALITIES = {
    AGGRESSIVE: 'aggressive',
    DEFENSIVE: 'defensive',
    BALANCED: 'balanced',
    TACTICAL: 'tactical',
    BERSERKER: 'berserker',
    COWARDLY: 'cowardly',
    PATROL: 'patrol',
} as const;

export type AIPersonality = typeof AI_PERSONALITIES[keyof typeof AI_PERSONALITIES];

/** Personality configuration affecting AI decisions */
export interface PersonalityConfig {
    /** Display name for UI */
    name: string;
    /** German display name */
    nameDE: string;
    /** Description of behavior */
    description: string;
    /** Aggro radius - distance at which enemy engages hero (hexes) */
    aggroRadius: number;
    /** Movement preference when not in aggro range */
    wanderWeight: number;    // 0-1: probability to move vs stay
    /** Movement preference when IN aggro range */
    chaseWeight: number;     // 0-1: how directly to path toward hero
    /** Tendency to avoid unfavorable terrain */
    terrainAvoidance: number; // 0-1: how much to avoid water/mountains
    /** Preference for grouping with other enemies */
    flockingWeight: number;  // 0-1: move toward other enemies
    /** Tendency to intercept/block hero's path */
    interceptWeight: number; // 0-1: predict hero movement
    /** Combat behavior modifier */
    combatAggression: number; // 0-1: attack vs hold ground
    /** Retreat threshold (health %) */
    retreatThreshold: number; // 0-1: flee when health below this
    /** Difficulty scaling factor */
    difficultyMultiplier: number;
    /** Which enemy types this personality applies to (empty = all) */
    applicableTypes: EnemyType[];
    /** UI color for personality badge */
    color: string;
    /** Icon for personality */
    icon: string;
}

/** Default personality configurations */
export const PERSONALITY_CONFIGS: Record<AIPersonality, PersonalityConfig> = {
    [AI_PERSONALITIES.AGGRESSIVE]: {
        name: 'Aggressive',
        nameDE: 'Aggressiv',
        description: 'Sucht aktiv den Kampf, jagt den Helden über die Karte',
        aggroRadius: 5,
        wanderWeight: 0.3,
        chaseWeight: 0.95,
        terrainAvoidance: 0.2,
        flockingWeight: 0.4,
        interceptWeight: 0.3,
        combatAggression: 0.9,
        retreatThreshold: 0.1,
        difficultyMultiplier: 1.2,
        applicableTypes: [],
        color: '#ef4444',
        icon: '⚔️',
    },
    [AI_PERSONALITIES.DEFENSIVE]: {
        name: 'Defensive',
        nameDE: 'Defensiv',
        description: 'Hält Position, greift nur an wenn Helden in Reichweite kommen',
        aggroRadius: 2,
        wanderWeight: 0.1,
        chaseWeight: 0.3,
        terrainAvoidance: 0.8,
        flockingWeight: 0.7,
        interceptWeight: 0.1,
        combatAggression: 0.3,
        retreatThreshold: 0.3,
        difficultyMultiplier: 0.8,
        applicableTypes: [ENEMY_TYPES.MAGE_TOWER, ENEMY_TYPES.GOBLIN],
        color: '#3b82f6',
        icon: '🛡️',
    },
    [AI_PERSONALITIES.BALANCED]: {
        name: 'Balanced',
        nameDE: 'Ausgewogen',
        description: 'Standard-Verhalten: Patrouilliert und greift opportunistisch an',
        aggroRadius: 3,
        wanderWeight: 0.5,
        chaseWeight: 0.6,
        terrainAvoidance: 0.5,
        flockingWeight: 0.5,
        interceptWeight: 0.2,
        combatAggression: 0.6,
        retreatThreshold: 0.2,
        difficultyMultiplier: 1.0,
        applicableTypes: [],
        color: '#10b981',
        icon: '⚖️',
    },
    [AI_PERSONALITIES.TACTICAL]: {
        name: 'Tactical',
        nameDE: 'Taktisch',
        description: 'Versucht Helden abzufangen, nutzt Geländevorteile, flankt',
        aggroRadius: 4,
        wanderWeight: 0.2,
        chaseWeight: 0.5,
        terrainAvoidance: 0.4,
        flockingWeight: 0.6,
        interceptWeight: 0.8,
        combatAggression: 0.7,
        retreatThreshold: 0.25,
        difficultyMultiplier: 1.15,
        applicableTypes: [ENEMY_TYPES.ROBBER, ENEMY_TYPES.NECROMANCER],
        color: '#8b5cf6',
        icon: '🎯',
    },
    [AI_PERSONALITIES.BERSERKER]: {
        name: 'Berserker',
        nameDE: 'Berserker',
        description: 'Ignoriert Gefahr, stürmt blindlings voran, nie Rückzug',
        aggroRadius: 6,
        wanderWeight: 0.4,
        chaseWeight: 1.0,
        terrainAvoidance: 0.0,
        flockingWeight: 0.0,
        interceptWeight: 0.0,
        combatAggression: 1.0,
        retreatThreshold: 0.0,
        difficultyMultiplier: 1.3,
        applicableTypes: [ENEMY_TYPES.DRACONUM, ENEMY_TYPES.ELEMENTAL],
        color: '#dc2626',
        icon: '💀',
    },
    [AI_PERSONALITIES.COWARDLY]: {
        name: 'Cowardly',
        nameDE: 'Feige',
        description: 'Flüchtet vor dem Helden, nur aus der Distanz gefährlich',
        aggroRadius: 1,
        wanderWeight: 0.8,
        chaseWeight: 0.1,
        terrainAvoidance: 0.9,
        flockingWeight: 0.8,
        interceptWeight: 0.0,
        combatAggression: 0.1,
        retreatThreshold: 0.5,
        difficultyMultiplier: 0.7,
        applicableTypes: [ENEMY_TYPES.GOBLIN],
        color: '#9ca3af',
        icon: '🏃',
    },
    [AI_PERSONALITIES.PATROL]: {
        name: 'Patrol',
        nameDE: 'Patrouille',
        description: 'Bewegt sich auf festen Routen, reagiert nur bei direkter Kollision',
        aggroRadius: 1,
        wanderWeight: 0.9,
        chaseWeight: 0.2,
        terrainAvoidance: 0.6,
        flockingWeight: 0.3,
        interceptWeight: 0.0,
        combatAggression: 0.4,
        retreatThreshold: 0.4,
        difficultyMultiplier: 0.9,
        applicableTypes: [ENEMY_TYPES.ORC],
        color: '#6b7280',
        icon: '🚶',
    },
};

/** Get personality config by name */
export function getPersonalityConfig(personality: AIPersonality): PersonalityConfig {
    return PERSONALITY_CONFIGS[personality] || PERSONALITY_CONFIGS[AI_PERSONALITIES.BALANCED];
}

/** Get all available personalities */
export function getAllPersonalities(): AIPersonality[] {
    return Object.values(AI_PERSONALITIES);
}

/** Get personalities suitable for a specific enemy type */
export function getPersonalitiesForType(enemyType: EnemyType): AIPersonality[] {
    return Object.entries(PERSONALITY_CONFIGS)
        .filter(([, config]) => config.applicableTypes.length === 0 || config.applicableTypes.includes(enemyType))
        .map(([key]) => key as AIPersonality);
}

/** Select a personality for an enemy (can be random, weighted, or fixed) */
export function selectPersonalityForEnemy(
    enemyType: EnemyType,
    difficulty: number,
    rng: () => number = Math.random
): AIPersonality {
    const suitable = getPersonalitiesForType(enemyType);

    // Weight by difficulty: higher difficulty -> more aggressive personalities
    const weights = suitable.map(p => {
        const config = PERSONALITY_CONFIGS[p];
        let weight = config.difficultyMultiplier;

        // Boost aggressive types at high difficulty
        const aggressiveTypes: ReadonlySet<AIPersonality> = new Set([AI_PERSONALITIES.AGGRESSIVE, AI_PERSONALITIES.BERSERKER, AI_PERSONALITIES.TACTICAL]);
        if (difficulty >= 7 && aggressiveTypes.has(p)) {
            weight *= 1.5;
        }
        // Boost defensive at low difficulty
        const defensiveTypes: ReadonlySet<AIPersonality> = new Set([AI_PERSONALITIES.DEFENSIVE, AI_PERSONALITIES.PATROL, AI_PERSONALITIES.COWARDLY]);
        if (difficulty <= 3 && defensiveTypes.has(p)) {
            weight *= 1.5;
        }

        return { personality: p, weight };
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = rng() * totalWeight;

    for (const w of weights) {
        random -= w.weight;
        if (random <= 0) return w.personality;
    }

    return suitable[0] || AI_PERSONALITIES.BALANCED;
}

/** Merge personality config with base enemy stats */
export function applyPersonalityToEnemy(enemy: any, personality: AIPersonality): any {
    const config = getPersonalityConfig(personality);
    return {
        ...enemy,
        aiPersonality: personality,
        aiConfig: config,
        // Override stats based on personality
        attack: Math.round(enemy.attack * (0.8 + config.combatAggression * 0.4)),
        armor: Math.round(enemy.armor * (0.9 + config.difficultyMultiplier * 0.2)),
    };
}