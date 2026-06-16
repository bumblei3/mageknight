/**
 * AI Web Worker
 * Offloads heavy pathfinding and decision logic from the main thread.
 * Now supports AI Personalities for varied enemy behavior.
 */

import * as HexUtils from '../utils/hexUtils.js';

// Personality configs mirrored for worker (no imports in worker)
const PERSONALITY_CONFIGS = {
    aggressive: {
        name: 'Aggressive', nameDE: 'Aggressiv', aggroRadius: 5,
        wanderWeight: 0.3, chaseWeight: 0.95, terrainAvoidance: 0.2,
        flockingWeight: 0.4, interceptWeight: 0.3, combatAggression: 0.9,
        retreatThreshold: 0.1, difficultyMultiplier: 1.2,
        applicableTypes: [], color: '#ef4444', icon: '⚔️',
    },
    defensive: {
        name: 'Defensive', nameDE: 'Defensiv', aggroRadius: 2,
        wanderWeight: 0.1, chaseWeight: 0.3, terrainAvoidance: 0.8,
        flockingWeight: 0.7, interceptWeight: 0.1, combatAggression: 0.3,
        retreatThreshold: 0.3, difficultyMultiplier: 0.8,
        applicableTypes: ['magetower', 'goblin'], color: '#3b82f6', icon: '🛡️',
    },
    balanced: {
        name: 'Balanced', nameDE: 'Ausgewogen', aggroRadius: 3,
        wanderWeight: 0.5, chaseWeight: 0.6, terrainAvoidance: 0.5,
        flockingWeight: 0.5, interceptWeight: 0.2, combatAggression: 0.6,
        retreatThreshold: 0.2, difficultyMultiplier: 1.0,
        applicableTypes: [], color: '#10b981', icon: '⚖️',
    },
    tactical: {
        name: 'Tactical', nameDE: 'Taktisch', aggroRadius: 4,
        wanderWeight: 0.2, chaseWeight: 0.5, terrainAvoidance: 0.4,
        flockingWeight: 0.6, interceptWeight: 0.8, combatAggression: 0.7,
        retreatThreshold: 0.25, difficultyMultiplier: 1.15,
        applicableTypes: ['robber', 'necromancer'], color: '#8b5cf6', icon: '🎯',
    },
    berserker: {
        name: 'Berserker', nameDE: 'Berserker', aggroRadius: 6,
        wanderWeight: 0.4, chaseWeight: 1.0, terrainAvoidance: 0.0,
        flockingWeight: 0.0, interceptWeight: 0.0, combatAggression: 1.0,
        retreatThreshold: 0.0, difficultyMultiplier: 1.3,
        applicableTypes: ['draconum', 'elemental'], color: '#dc2626', icon: '💀',
    },
    cowardly: {
        name: 'Cowardly', nameDE: 'Feige', aggroRadius: 1,
        wanderWeight: 0.8, chaseWeight: 0.1, terrainAvoidance: 0.9,
        flockingWeight: 0.8, interceptWeight: 0.0, combatAggression: 0.1,
        retreatThreshold: 0.5, difficultyMultiplier: 0.7,
        applicableTypes: ['goblin'], color: '#9ca3af', icon: '🏃',
    },
    patrol: {
        name: 'Patrol', nameDE: 'Patrouille', aggroRadius: 1,
        wanderWeight: 0.9, chaseWeight: 0.2, terrainAvoidance: 0.6,
        flockingWeight: 0.3, interceptWeight: 0.0, combatAggression: 0.4,
        retreatThreshold: 0.4, difficultyMultiplier: 0.9,
        applicableTypes: ['orc'], color: '#6b7280', icon: '🚶',
    },
};

function getPersonalityConfig(personality) {
    return PERSONALITY_CONFIGS[personality] || PERSONALITY_CONFIGS.balanced;
}

self.onmessage = function (e) {
    const { action, payload } = e.data;

    if (action === 'calculateMoves') {
        const { enemies, heroPos, hexes, difficulty } = payload;
        const results = calculateMoves(enemies, heroPos, hexes, difficulty);
        self.postMessage({ action: 'movesCalculated', payload: results });
    }
};

function calculateMoves(enemies, heroPos, hexesMap, _difficulty) {
    const moveLog = [];
    const newPositions = [];

    enemies.forEach(enemy => {
        if (enemy.isDefeated) return;

        const config = enemy.aiConfig || getPersonalityConfig(enemy.aiPersonality);
        const roamingTypes = ['orc', 'draconum', 'elemental', 'robber'];
        const canMoveByType = roamingTypes.includes(enemy.type);
        const canMoveByPersonality = config.wanderWeight > 0.1 || (config.aggroRadius || 0) > 0;

        if (canMoveByType && canMoveByPersonality) {
            const move = getBestMove(enemy, heroPos, enemies, hexesMap, config);
            if (move) {
                newPositions.push({ id: enemy.id, position: move });
                moveLog.push(`${enemy.name} bewegt sich.`);
            }
        }
    });

    return { newPositions, moveLog };
}

function getBestMove(enemy, heroPos, allEnemies, hexesMap, config) {
    if (!enemy.position) return null;

    const currentQ = enemy.position.q;
    const currentR = enemy.position.r;
    const neighbors = HexUtils.getNeighbors(currentQ, currentR);

    // Filter valid moves
    const validMoves = neighbors.filter(n => {
        const key = HexUtils.getHexKey(n.q, n.r);
        const hex = hexesMap[key];

        if (!hex) return false;
        // Always avoid Water/Mountains (impassable terrain)
        if (hex.terrain === 'water' || hex.terrain === 'mountains') return false;
        // Additional terrain avoidance based on personality (wasteland, etc.)
        if (config.terrainAvoidance > 0.5 && hex.terrain === 'wasteland') return false;
        if (config.terrainAvoidance > 0.7 && hex.terrain === 'desert') return false;

        const isOccupied = allEnemies.some(e =>
            e.id !== enemy.id &&
            !e.isDefeated &&
            e.position &&
            e.position.q === n.q &&
            e.position.r === n.r
        );
        if (isOccupied) return false;

        if (heroPos.q === n.q && heroPos.r === n.r && config.combatAggression < 0.9) return false;

        return true;
    });

    if (validMoves.length === 0) return null;

    const aggroRadius = config.aggroRadius || 3;
    const distToHero = HexUtils.distance(currentQ, currentR, heroPos.q, heroPos.r);
    const isAggro = distToHero <= aggroRadius;

    // Flocking target
    let flockTarget = null;
    if (config.flockingWeight > 0.4) {
        const allies = allEnemies.filter(e =>
            e.id !== enemy.id &&
            e.type === enemy.type &&
            e.position &&
            !e.isDefeated
        );
        if (allies.length > 0) {
            const avgQ = allies.reduce((sum, e) => sum + (e.position ? e.position.q : 0), 0) / allies.length;
            const avgR = allies.reduce((sum, e) => sum + (e.position ? e.position.r : 0), 0) / allies.length;
            flockTarget = { q: Math.round(avgQ), r: Math.round(avgR) };
        }
    }

    // Scoring function
    const scoreMove = (move) => {
        let score = 0;

        if (isAggro) {
            const dist = HexUtils.distance(move.q, move.r, heroPos.q, heroPos.r);
            score += (1 - config.chaseWeight) * dist * 10;
            score -= config.chaseWeight * 50;
        }

        if (flockTarget && config.flockingWeight > 0) {
            const flockDist = HexUtils.distance(move.q, move.r, flockTarget.q, flockTarget.r);
            score -= config.flockingWeight * flockDist * 5;
        }

        const hex = hexesMap[HexUtils.getHexKey(move.q, move.r)];
        if (hex && hex.terrain !== 'plains') {
            score += config.terrainAvoidance * 10;
        }

        if (!isAggro) {
            score += Math.random() * (1 - config.wanderWeight) * 20;
        }

        return score;
    };

    validMoves.sort((a, b) => scoreMove(a) - scoreMove(b));

    // For backwards compatibility: enemies without explicit personality use old wander logic
    const hasPersonality = !!(enemy.aiConfig || enemy.aiPersonality);
    if (!isAggro) {
        if (hasPersonality) {
            // Personality-based: skip move if wanderWeight low and random check fails
            if (config.wanderWeight < 0.3 && Math.random() > config.wanderWeight) {
                return null;
            }
        } else {
            // Old behavior: 20% chance to not move when wandering
            if (Math.random() < 0.2) return null;
        }
    }

    return validMoves[0];
}
