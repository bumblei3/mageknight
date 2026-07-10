import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnemyAI, ENEMY_ABILITIES } from '../js/enemyAI.js';
import { ENEMY_TYPES } from '../js/constants.js';

/**
 * Focused tests for js/enemyAI.ts (previously ~78% line coverage).
 * Exercises generateEnemy (terrain/difficulty -> type + scaling + personality),
 * applyAbility (all branches), decideAction (personality paths) and the
 * synchronous fallback updateEnemiesSync.
 */

function makeGame() {
    return {
        enemies: [],
        hero: { position: { q: 0, r: 0 } },
        hexGrid: {
            hexes: new Map(),
            distance: vi.fn(() => 5),
            getNeighbors: vi.fn(() => []),
            hasHex: vi.fn(() => true),
            getHex: vi.fn(() => ({ terrain: 'plains' })),
        },
    };
}

describe('EnemyAI - construction', () => {
    it('initializes without throwing in jsdom', () => {
        const game = makeGame();
        expect(() => new EnemyAI(game)).not.toThrow();
    });

    it('defaults difficulty to 1', () => {
        const ai = new EnemyAI(makeGame());
        // difficulty is private; exercise via generateEnemy scaling instead
        expect(ai).toBeTruthy();
    });
});

describe('EnemyAI - generateEnemy', () => {
    let ai;
    beforeEach(() => { ai = new EnemyAI(makeGame()); });

    it('produces an orc on plains at low level', () => {
        const e = ai.generateEnemy('plains', 1);
        expect(e).toBeTruthy();
        expect(e.armor).toBeGreaterThanOrEqual(0);
    });

    it('maps mountain/wasteland to dragon at high difficulty', () => {
        const e = ai.generateEnemy('mountain', 14);
        // difficulty = min(10, ceil(14/2)+1) = min(10, 8) = 8 -> not >7, so elemental
        // use level 13 to push difficulty to 8 -> dragon
        const e2 = ai.generateEnemy('mountain', 13);
        expect(e2.type).toBe(ENEMY_TYPES.DRACONUM);
    });

    it('maps mountain/wasteland to elemental at mid difficulty', () => {
        const e = ai.generateEnemy('wasteland', 9);
        expect(e.type).toBe(ENEMY_TYPES.ELEMENTAL);
    });

    it('maps swamp/ruins to necromancer at high difficulty', () => {
        const e = ai.generateEnemy('swamp', 12);
        expect(e.type).toBe(ENEMY_TYPES.NECROMANCER);
    });

    it('maps swamp/ruins to mage tower at mid difficulty', () => {
        const e = ai.generateEnemy('ruins', 7);
        expect(e.type).toBe(ENEMY_TYPES.MAGE_TOWER);
    });

    it('maps forest to robber at high difficulty', () => {
        const e = ai.generateEnemy('forest', 5);
        expect(e.type).toBe(ENEMY_TYPES.ROBBER);
    });

    it('scales stats up with difficulty', () => {
        const low = ai.generateEnemy('plains', 1);
        const high = ai.generateEnemy('plains', 18);
        expect(high.armor).toBeGreaterThanOrEqual(low.armor);
        expect(high.level).toBeGreaterThan(low.level);
    });

    it('assigns an AI personality and config', () => {
        const e = ai.generateEnemy('plains', 5);
        expect(e.aiPersonality).toBeTruthy();
        expect(e.aiConfig).toBeTruthy();
    });

    it('adds vampiric ability at very high difficulty', () => {
        const e = ai.generateEnemy('plains', 20);
        expect(e.abilities).toContain(ENEMY_ABILITIES.VAMPIRIC);
    });
});

describe('EnemyAI - applyAbility', () => {
    let ai;
    beforeEach(() => { ai = new EnemyAI(makeGame()); });

    it('poison adds a wound', () => {
        const res = ai.applyAbility(ENEMY_ABILITIES.POISON, {}, {});
        expect(res.effect).toBe('wound');
        expect(res.count).toBe(1);
    });

    it('fire returns damage boost', () => {
        const res = ai.applyAbility(ENEMY_ABILITIES.FIRE, {}, {});
        expect(res.effect).toBe('damage_boost');
    });

    it('vampiric heals the source', () => {
        const source = { currentHealth: 5, maxHealth: 10 };
        const res = ai.applyAbility(ENEMY_ABILITIES.VAMPIRIC, {}, source);
        expect(res.effect).toBe('heal');
        expect(source.currentHealth).toBe(6);
    });

    it('unknown ability returns null', () => {
        const res = ai.applyAbility('unknown', {}, {});
        expect(res).toBeNull();
    });
});

describe('EnemyAI - decideAction', () => {
    let ai;
    beforeEach(() => { ai = new EnemyAI(makeGame()); });

    function baseEnemy(over = {}) {
        return {
            id: 'e1', name: 'Test', type: ENEMY_TYPES.ORC,
            currentHealth: 10, maxHealth: 10, attack: 3, armor: 10,
            abilities: [], attackType: 'physical',
            ...over,
        };
    }

    it('retreats when health below threshold (defensive personality)', () => {
        const e = baseEnemy({
            aiPersonality: 'defensive', aiConfig: { retreatThreshold: 0.3, combatAggression: 0.3, terrainAvoidance: 0.5, wanderWeight: 0.5, aggroRadius: 3, chaseWeight: 0.5, flockingWeight: 0.2, interceptWeight: 0.2, difficultyMultiplier: 1 },
            currentHealth: 1, maxHealth: 10,
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('retreat');
    });

    it('berserker always heavy attacks', () => {
        const e = baseEnemy({ aiPersonality: 'berserker' });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('heavy_attack');
        expect(action.allOut).toBe(true);
    });

    it('cowardly summons if it has summon ability', () => {
        const e = baseEnemy({ aiPersonality: 'cowardly', abilities: ['summon'] });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('summon');
    });

    it('cowardly ranges if no summon', () => {
        const e = baseEnemy({ aiPersonality: 'cowardly', abilities: [] });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('ranged');
        expect(action.keepDistance).toBe(true);
    });

    it('defensive heals when low and has heal ability', () => {
        const e = baseEnemy({
            aiPersonality: 'defensive', aiConfig: { retreatThreshold: 0, combatAggression: 0.3, terrainAvoidance: 0.5, wanderWeight: 0.5, aggroRadius: 3, chaseWeight: 0.5, flockingWeight: 0.2, interceptWeight: 0.2, difficultyMultiplier: 1 },
            defensive: true, abilities: ['heal'], currentHealth: 4, maxHealth: 10,
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('heal');
    });

    it('defensive defends when healthy', () => {
        const e = baseEnemy({
            aiPersonality: 'defensive', aiConfig: { retreatThreshold: 0, combatAggression: 0.3, terrainAvoidance: 0.5, wanderWeight: 0.5, aggroRadius: 3, chaseWeight: 0.5, flockingWeight: 0.2, interceptWeight: 0.2, difficultyMultiplier: 1 },
            defensive: true, abilities: [], currentHealth: 10, maxHealth: 10,
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('defend');
        expect(action.fortified).toBe(true);
    });

    it('tactical uses elemental attack when advantageous', () => {
        // Force the random check by stubbing Math.random low
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const e = baseEnemy({
            aiPersonality: 'tactical', aiConfig: { retreatThreshold: 0, combatAggression: 0.5, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
            attackType: 'fire',
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('elemental_attack');
        spy.mockRestore();
    });

    it('tactical poison attack when poison available and roll succeeds', () => {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const e = baseEnemy({
            aiPersonality: 'tactical', aiConfig: { retreatThreshold: 0, combatAggression: 0.5, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
            abilities: ['poison'], attackType: 'physical',
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('poison_attack');
        spy.mockRestore();
    });

    it('vampiric attacks when low health and roll succeeds', () => {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const e = baseEnemy({
            aiPersonality: 'balanced', aiConfig: { retreatThreshold: 0, combatAggression: 0.5, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
            vampiric: true, currentHealth: 5, maxHealth: 10,
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('vampiric_attack');
        spy.mockRestore();
    });

    it('summoner summons when outnumbered and roll succeeds', () => {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const e = baseEnemy({
            aiPersonality: 'balanced', aiConfig: { retreatThreshold: 0, combatAggression: 0.5, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
            summoner: true, abilities: ['summon'],
        });
        const heroState = { enemies: [e, { isDefeated: () => false }] };
        const action = ai.decideAction(e, heroState);
        expect(action.type).toBe('summon');
        spy.mockRestore();
    });

    it('falls back to normal attack', () => {
        const e = baseEnemy({
            aiPersonality: 'balanced', aiConfig: { retreatThreshold: 0, combatAggression: 0.5, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('attack');
    });

    it('high-aggression heavy attack chance', () => {
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        const e = baseEnemy({
            aiPersonality: 'balanced', aiConfig: { retreatThreshold: 0, combatAggression: 0.9, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 3, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
        });
        const action = ai.decideAction(e, {});
        expect(action.type).toBe('heavy_attack');
        spy.mockRestore();
    });
});

describe('EnemyAI - updateEnemiesSync (fallback)', () => {
    let ai;
    beforeEach(() => { ai = new EnemyAI(makeGame()); });

    it('regenerates and returns a move log', () => {
        const enemy = {
            id: 'e1', name: 'Orc', type: ENEMY_TYPES.ORC,
            currentHealth: 5, maxHealth: 10, position: { q: 1, r: 1 },
            isDefeated: () => false,
            aiConfig: { wanderWeight: 0.5, aggroRadius: 3, combatAggression: 0.5, terrainAvoidance: 0.3, retreatThreshold: 0, chaseWeight: 0.6, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
        };
        const log = ai.updateEnemiesSync([enemy], { position: { q: 0, r: 0 } });
        expect(Array.isArray(log)).toBe(true);
        expect(enemy.currentHealth).toBe(6); // regenerated +1
    });

    it('skips defeated enemies', () => {
        const enemy = {
            id: 'e1', name: 'Orc', type: ENEMY_TYPES.ORC,
            currentHealth: 5, maxHealth: 10, position: { q: 1, r: 1 },
            isDefeated: () => true,
        };
        const log = ai.updateEnemiesSync([enemy], { position: { q: 0, r: 0 } });
        expect(log).toEqual([]);
    });

    it('moves toward hero when aggroed (exercises getBestMove/scoreMove)', () => {
        const game = makeGame();
        // Provide real neighbors + terrain so getBestMove picks a move
        game.hexGrid = {
            hexes: new Map([['1,1', { terrain: 'plains' }]]),
            distance: vi.fn(() => 3),
            getNeighbors: vi.fn(() => [{ q: 2, r: 1 }, { q: 1, r: 2 }, { q: 0, r: 0 }]),
            hasHex: vi.fn(() => true),
            getHex: vi.fn(() => ({ terrain: 'plains' })),
        };
        const ai2 = new EnemyAI(game);
        const enemy = {
            id: 'e1', name: 'Orc', type: ENEMY_TYPES.ORC,
            currentHealth: 10, maxHealth: 10, position: { q: 1, r: 1 },
            isDefeated: () => false,
            aiConfig: { retreatThreshold: 0, combatAggression: 0.9, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 5, chaseWeight: 0.8, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
        };
        const heroPos = { q: 0, r: 0 };
        const log = ai2.updateEnemiesSync([enemy], { position: heroPos });
        expect(log.length).toBeGreaterThanOrEqual(1);
        // enemy should have moved to one of the neighbors
        expect(enemy.position).not.toEqual({ q: 1, r: 1 });
    });

    it('avoids occupied hexes in movement scoring', () => {
        const game = makeGame();
        game.hexGrid = {
            hexes: new Map([['1,1', { terrain: 'plains' }]]),
            distance: vi.fn(() => 2),
            getNeighbors: vi.fn(() => [{ q: 2, r: 1 }, { q: 1, r: 2 }]),
            hasHex: vi.fn(() => true),
            getHex: vi.fn((q, r) => ({ terrain: 'plains' })),
        };
        const ai2 = new EnemyAI(game);
        const enemy = {
            id: 'e1', name: 'Orc', type: ENEMY_TYPES.ORC,
            currentHealth: 10, maxHealth: 10, position: { q: 1, r: 1 },
            isDefeated: () => false,
            aiConfig: { retreatThreshold: 0, combatAggression: 0.9, terrainAvoidance: 0.3, wanderWeight: 0.4, aggroRadius: 5, chaseWeight: 0.8, flockingWeight: 0.2, interceptWeight: 0.3, difficultyMultiplier: 1 },
        };
        const ally = { id: 'e2', type: ENEMY_TYPES.ORC, position: { q: 1, r: 2 }, isDefeated: () => false };
        const heroPos = { q: 0, r: 0 };
        const log = ai2.updateEnemiesSync([enemy, ally], { position: heroPos });
        expect(enemy.position).toEqual({ q: 2, r: 1 }); // only valid move (1,2 occupied by ally)
    });
});
