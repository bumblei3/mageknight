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

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.onmessage = function (e) {
        const { action, payload } = e.data;

        if (action === 'calculateMoves') {
            const { enemies, heroPos, hexes, difficulty, iterations } = payload;
            const results = calculateMoves(enemies, heroPos, hexes, difficulty, iterations || 1);
            self.postMessage({ action: 'movesCalculated', payload: results });
        }
    };
}

function calculateMoves(enemies, heroPos, hexesMap, _difficulty, iterations = 1, heroStats = { armor: 0, wounds: 0, attack: 0 }) {
    const moveLog = [];
    const newPositions = [];

    enemies.forEach(enemy => {
        if (enemy.isDefeated) return;

        const config = enemy.aiConfig || getPersonalityConfig(enemy.aiPersonality);
        const roamingTypes = ['orc', 'draconum', 'elemental', 'robber'];
        const canMoveByType = roamingTypes.includes(enemy.type);
        const canMoveByPersonality = config.wanderWeight > 0.1 || (config.aggroRadius || 0) > 0;

        if (canMoveByType && canMoveByPersonality) {
            const others = enemies.filter(e => e.id !== enemy.id && e.position).map(e => e.position);
            enemy._blockedPositions = others;
            const move = getBestMove(enemy, heroPos, enemies, hexesMap, config, iterations, heroStats);
            if (move) {
                newPositions.push({ id: enemy.id, position: move });
                moveLog.push(`${enemy.name} bewegt sich.`);
            }
        }
    });

    return { newPositions, moveLog };
}

function getBestMove(enemy, heroPos, allEnemies, hexesMap, config, iterations = 1, heroStats = { armor: 0, wounds: 0, attack: 0 }) {
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

    // Monte Carlo Tree Search: when more than one playout is requested, evaluate
    // each candidate move by simulating a few random future steps and pick the
    // one with the best average outcome. Falls back to the heuristic ordering
    // on any error or when iterations <= 1.
    if (iterations > 1 && validMoves.length > 1) {
        try {
            return mctsSelectMove(enemy, heroPos, validMoves, hexesMap, config, iterations, heroStats);
        } catch (_err) {
            // fall through to heuristic
        }
    }

    return validMoves[0];
}

// Simulate a short playout from a candidate move and return the resulting
// distance to the hero. Uses a greedy step toward the hero (with personality
// terrain avoidance) instead of a pure random walk, so the evaluation reflects
// the enemy's actual chasing behaviour.
function simulatePlayout(startMove, heroPos, hexesMap, config) {
    let pos = { q: startMove.q, r: startMove.r };
    for (let step = 0; step < 3; step++) {
        const nbrs = HexUtils.getNeighbors(pos.q, pos.r);
        const legal = nbrs.filter(n => {
            const hex = hexesMap[HexUtils.getHexKey(n.q, n.r)];
            if (!hex) return false;
            if (hex.terrain === 'water' || hex.terrain === 'mountains') return false;
            if (config.terrainAvoidance > 0.5 && hex.terrain === 'wasteland') return false;
            if (config.terrainAvoidance > 0.7 && hex.terrain === 'desert') return false;
            return true;
        });
        if (legal.length === 0) break;
        // Greedy: pick the neighbour that reduces distance to the hero most.
        legal.sort((a, b) =>
            HexUtils.distance(a.q, a.r, heroPos.q, heroPos.r) -
            HexUtils.distance(b.q, b.r, heroPos.q, heroPos.r)
        );
        // Blend greed with personality wander (config.wanderWeight).
        if (Math.random() > (config.chaseWeight || 0.5)) {
            pos = legal[Math.floor(Math.random() * legal.length)];
        } else {
            pos = legal[0];
        }
    }
    return HexUtils.distance(pos.q, pos.r, heroPos.q, heroPos.r);
}

// Richer game-state simulation: enemy chases, hero evades. Returns the final
// distance between enemy and hero after `steps` simulated turns.
function simulateGameState(startMove, heroPos, hexesMap, config, steps = 4, blockedPositions = [], enemy = null, heroStats = { armor: 0, wounds: 0, attack: 0 }) {
    const isBlocked = (q, r) => blockedPositions.some(p => p && p.q === q && p.r === r);
    let enemyPos = { q: startMove.q, r: startMove.r };
    let heroP = { q: heroPos.q, r: heroPos.r };
    let heroWounds = heroStats.wounds || 0;
    let enemyAlive = true;
    for (let step = 0; step < steps; step++) {
        if (!enemyAlive) break;
        const nbrs = HexUtils.getNeighbors(enemyPos.q, enemyPos.r);
        const legal = nbrs.filter(n => {
            const hex = hexesMap[HexUtils.getHexKey(n.q, n.r)];
            if (!hex) return false;
            if (hex.terrain === 'water' || hex.terrain === 'mountains') return false;
            if (config.terrainAvoidance > 0.5 && hex.terrain === 'wasteland') return false;
            if (config.terrainAvoidance > 0.7 && hex.terrain === 'desert') return false;
            if (isBlocked(n.q, n.r)) return false;
            return true;
        });
        if (legal.length > 0) {
            legal.sort((a, b) => {
                const da = HexUtils.distance(a.q, a.r, heroP.q, heroP.r) + (hexesMap[HexUtils.getHexKey(a.q, a.r)]?.terrain === 'forest' ? 1 : 0);
                const db = HexUtils.distance(b.q, b.r, heroP.q, heroP.r) + (hexesMap[HexUtils.getHexKey(b.q, b.r)]?.terrain === 'forest' ? 1 : 0);
                return da - db;
            });
            enemyPos = (Math.random() > (config.chaseWeight || 0.5)) ? legal[Math.floor(Math.random() * legal.length)] : legal[0];
        }
        if (HexUtils.distance(enemyPos.q, enemyPos.r, heroP.q, heroP.r) <= 1) {
            const dmg = Math.max(0, ((enemy && enemy.attack) || 0) - (heroStats.armor || 0));
            if (dmg > 0) heroWounds += 1;
        }
        const hNbrs = HexUtils.getNeighbors(heroP.q, heroP.r);
        const hLegal = hNbrs.filter(n => {
            const hex = hexesMap[HexUtils.getHexKey(n.q, n.r)];
            if (!hex) return false;
            if (hex.terrain === 'water' || hex.terrain === 'mountains') return false;
            if (isBlocked(n.q, n.r)) return false;
            return true;
        });
        if (hLegal.length > 0) {
            hLegal.sort((a, b) =>
                HexUtils.distance(b.q, b.r, enemyPos.q, enemyPos.r) -
                HexUtils.distance(a.q, a.r, enemyPos.q, enemyPos.r)
            );
            heroP = (Math.random() < 0.3) ? hLegal[Math.floor(Math.random() * hLegal.length)] : hLegal[0];
        }
        if (HexUtils.distance(enemyPos.q, enemyPos.r, heroP.q, heroP.r) <= 1) {
            if ((heroStats.attack || 0) >= (((enemy && enemy.armor) || 0)) && ((enemy && enemy.armor) || 0) > 0) {
                enemyAlive = false;
            }
        }
    }
    const finalDist = enemyAlive ? HexUtils.distance(enemyPos.q, enemyPos.r, heroP.q, heroP.r) : 99;
    const combatPenalty = enemyAlive
        ? ((heroWounds - (heroStats.wounds || 0)) * 2 + Math.max(0, (((enemy && enemy.attack) || 0)) - (heroStats.armor || 0)) / 5)
        : -10;
    return finalDist - combatPenalty;
}

function mctsSelectMove(enemy, heroPos, validMoves, hexesMap, config, iterations, heroStats = { armor: 0, wounds: 0, attack: 0 }) {
    const chase = (config.chaseWeight || 0) > 0.5;
    let best = validMoves[0];
    let bestScore = null;
    const blocked = (enemy._blockedPositions || []);
    for (const move of validMoves) {
        let total = 0;
        for (let i = 0; i < iterations; i++) total += simulateGameState(move, heroPos, hexesMap, config, 4, blocked, enemy, heroStats);
        const avg = total / iterations;
        if (bestScore === null || (chase ? avg < bestScore : avg > bestScore)) {
            bestScore = avg;
            best = move;
        }
    }
    return best;
}

export { calculateMoves, getBestMove, mctsSelectMove, simulatePlayout, simulateGameState };
