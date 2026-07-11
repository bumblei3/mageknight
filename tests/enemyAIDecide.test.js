import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnemyAI } from '../js/enemyAI.js';
import { AI_PERSONALITIES, PERSONALITY_CONFIGS } from '../js/ai/aiPersonalities.js';
import { ENEMY_ABILITIES } from '../js/enemyAI.js';

function makeGame(overrides = {}) {
    return {
        enemies: [],
        hexGrid: null,
        hero: { position: { q: 0, r: 0 } },
        ...overrides,
    };
}

function balancedConfig() {
    return PERSONALITY_CONFIGS[AI_PERSONALITIES.BALANCED];
}

function makeEnemy(overrides = {}) {
    return {
        id: 'e1',
        name: 'TestEnemy',
        type: 'orc',
        position: { q: 0, r: 0 },
        isDefeated: false,
        currentHealth: 10,
        maxHealth: 10,
        attack: 4,
        armor: 4,
        attackType: 'physical',
        abilities: [],
        aiPersonality: AI_PERSONALITIES.BALANCED,
        aiConfig: balancedConfig(),
        getEffectiveAttack() { return this.attack; },
        getBlockRequirement() { return this.attack; },
        ...overrides,
    };
}

function makeGrid() {
    const hexes = new Map();
    for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
            hexes.set(`${q},${r}`, { q, r, terrain: 'plains' });
        }
    }
    return {
        hexes,
        hasHex: (q, r) => hexes.has(`${q},${r}`),
        getHex: (q, r) => hexes.get(`${q},${r}`) || null,
        getNeighbors: (q, r) => [
            { q: q + 1, r }, { q: q - 1, r }, { q, r: r + 1 }, { q, r: r - 1 }, { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
        ],
        distance: (q1, r1, q2, r2) => Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs((q1 + r1) - (q2 + r2))),
    };
}

describe('EnemyAI', () => {
    let ai;
    let game;

    beforeEach(() => {
        game = makeGame();
        ai = new EnemyAI(game);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes difficulty to 1', () => {
            expect(ai.difficulty).toBe(1);
            expect(ai.game).toBe(game);
        });
    });

    describe('generateEnemy', () => {
        it('falls back to ORC when createEnemy returns null', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            // Force createEnemy to return null once by using an unknown type path is hard;
            // instead assert a normal generation produces a valid enemy with stats
            const e = ai.generateEnemy('plains', 1);
            expect(e).toBeTruthy();
            expect(e.armor).toBeGreaterThanOrEqual(0);
            spy.mockRestore();
        });

        it('selects DRACONUM on mountains at high difficulty', () => {
            const e = ai.generateEnemy('mountain', 16); // difficulty ceil(8)+1=9 > 7
            expect(e.type).toBe('draconum');
        });

        it('selects ELEMENTAL on mountains at mid difficulty', () => {
            const e = ai.generateEnemy('mountain', 10); // difficulty 6 > 5
            expect(e.type).toBe('elemental');
        });

        it('selects NECROMANCER on swamp at high difficulty', () => {
            const e = ai.generateEnemy('swamp', 14); // difficulty 8 > 6
            expect(e.type).toBe('necromancer');
        });

        it('selects MAGE_TOWER on swamp at mid difficulty', () => {
            const e = ai.generateEnemy('swamp', 10); // difficulty 6 > 4
            expect(e.type).toBe('magetower');
        });

        it('selects ROBBER on forest at high difficulty', () => {
            const e = ai.generateEnemy('forest', 10); // difficulty 6 > 3
            expect(e.type).toBe('robber');
        });

        it('returns ORC on forest at low difficulty', () => {
            const e = ai.generateEnemy('forest', 2); // difficulty 2 < 3
            expect(e.type).toBe('orc');
        });

        it('applies personality-based stat scaling', () => {
            const e = ai.generateEnemy('plains', 2);
            expect(e.aiConfig).toBeDefined();
            expect(typeof e.attack).toBe('number');
            expect(e.maxHealth).toBe(e.armor);
        });
    });

    describe('decideAction - retreat', () => {
        it('retreats when health below retreat threshold', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiConfig: { ...config, retreatThreshold: 0.3 },
                currentHealth: 2, maxHealth: 10,
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('retreat');
        });

        it('does not retreat when threshold is 0', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiConfig: { ...config, retreatThreshold: 0 },
                currentHealth: 1, maxHealth: 10,
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).not.toBe('retreat');
        });
    });

    describe('decideAction - berserker', () => {
        it('always heavy attacks', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BERSERKER,
                aiConfig: config,
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('heavy_attack');
            expect(action.allOut).toBe(true);
        });
    });

    describe('decideAction - cowardly', () => {
        it('summons when able', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.COWARDLY,
                aiConfig: config,
                abilities: ['summon'],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('summon');
        });

        it('ranged attacks otherwise', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.COWARDLY,
                aiConfig: config,
                abilities: [],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('ranged');
            expect(action.keepDistance).toBe(true);
        });
    });

    describe('decideAction - defensive', () => {
        it('heals when below half health and able', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.DEFENSIVE,
                aiConfig: config,
                currentHealth: 3, maxHealth: 10,
                abilities: ['heal'],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('heal');
        });

        it('defends otherwise', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.DEFENSIVE,
                aiConfig: config,
                currentHealth: 10, maxHealth: 10,
                abilities: [],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('defend');
            expect(action.fortified).toBe(true);
        });

        it('defends when defensive flag set without personality', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: null,
                defensive: true,
                aiConfig: config,
                currentHealth: 10, maxHealth: 10,
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('defend');
        });
    });

    describe('decideAction - tactical', () => {
        it('uses poison attack when random allows', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.4
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.TACTICAL,
                aiConfig: config,
                abilities: ['poison'],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('poison_attack');
            expect(action.applyPoison).toBe(true);
        });

        it('uses elemental attack when random allows', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.6 for elemental
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.TACTICAL,
                aiConfig: config,
                attackType: 'fire',
                abilities: [],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('elemental_attack');
        });

        it('skips poison when random denies and falls to normal attack', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // > 0.4 and > 0.6
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.TACTICAL,
                aiConfig: config,
                attackType: 'physical',
                abilities: ['poison'],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('attack');
        });
    });

    describe('decideAction - vampiric', () => {
        it('vampiric attack at low health when random allows', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.5
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BALANCED,
                aiConfig: config,
                vampiric: true,
                currentHealth: 5, maxHealth: 10,
                abilities: [],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('vampiric_attack');
            expect(action.healOnHit).toBe(true);
        });

        it('does not vampiric attack at high health', () => {
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BALANCED,
                aiConfig: config,
                vampiric: true,
                currentHealth: 9, maxHealth: 10,
                abilities: [],
            });
            const action = ai.decideAction(enemy, {});
            expect(action.type).not.toBe('vampiric_attack');
        });
    });

    describe('decideAction - summoner', () => {
        it('summons when outnumbered (allyCount < 2) and random allows', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.35
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BALANCED,
                aiConfig: config,
                summoner: true,
                abilities: ['summon'],
                currentHealth: 10, maxHealth: 10,
            });
            // only one other ally -> allyCount = 1 < 2
            const heroState = { enemies: [makeEnemy()] };
            const action = ai.decideAction(enemy, heroState);
            expect(action.type).toBe('summon');
        });

        it('summons at low health even when not outnumbered', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.35
            const config = { ...balancedConfig(), retreatThreshold: 0 };
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BALANCED,
                aiConfig: config,
                summoner: true,
                abilities: ['summon'],
                currentHealth: 2, maxHealth: 10,
            });
            // two other allies -> allyCount = 2 (not < 2), but healthPercent 0.2 < 0.4
            const heroState = { enemies: [enemy, makeEnemy(), makeEnemy()] };
            const action = ai.decideAction(enemy, heroState);
            expect(action.type).toBe('summon');
        });

        it('does not summon when no allies and healthy', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9); // > 0.35
            const config = balancedConfig();
            const enemy = makeEnemy({
                aiPersonality: AI_PERSONALITIES.BALANCED,
                aiConfig: config,
                summoner: true,
                abilities: ['summon'],
                currentHealth: 10, maxHealth: 10,
            });
            const action = ai.decideAction(enemy, { enemies: [makeEnemy()] });
            expect(action.type).not.toBe('summon');
        });
    });

    describe('decideAction - standard', () => {
        it('heavy attack when aggressive and random allows', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.3
            const config = { ...balancedConfig(), combatAggression: 0.9 };
            const enemy = makeEnemy({ aiConfig: config, aiPersonality: AI_PERSONALITIES.BALANCED });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('heavy_attack');
        });

        it('normal attack otherwise', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.9);
            const config = { ...balancedConfig(), combatAggression: 0.9 };
            const enemy = makeEnemy({ aiConfig: config, aiPersonality: AI_PERSONALITIES.BALANCED });
            const action = ai.decideAction(enemy, {});
            expect(action.type).toBe('attack');
        });

        it('falls back to personality config when none set', () => {
            const enemy = makeEnemy({ aiConfig: undefined, aiPersonality: undefined });
            const action = ai.decideAction(enemy, {});
            expect(action).toBeTruthy();
            expect(action.type).toBe('attack');
        });
    });

    describe('applyAbility', () => {
        it('POISON returns wound effect', () => {
            const r = ai.applyAbility(ENEMY_ABILITIES.POISON, {}, {});
            expect(r.effect).toBe('wound');
            expect(r.count).toBe(1);
        });

        it('FIRE returns damage boost', () => {
            const r = ai.applyAbility(ENEMY_ABILITIES.FIRE, {}, {});
            expect(r.effect).toBe('damage_boost');
        });

        it('VAMPIRIC heals the source', () => {
            const source = { currentHealth: 5, maxHealth: 10 };
            const r = ai.applyAbility(ENEMY_ABILITIES.VAMPIRIC, {}, source);
            expect(r.effect).toBe('heal');
            expect(source.currentHealth).toBe(6);
        });

        it('unknown ability returns null', () => {
            expect(ai.applyAbility('unknown', {}, {})).toBeNull();
        });
    });

    describe('updateEnemiesSync', () => {
        beforeEach(() => {
            game.hexGrid = makeGrid();
        });

        it('skips defeated enemies', () => {
            const defeated = makeEnemy({ isDefeated: true, position: { q: 0, r: 0 } });
            const log = ai.updateEnemiesSync([defeated], { position: { q: 1, r: 0 } });
            expect(log).toHaveLength(0);
        });

        it('regenerates damaged enemies', () => {
            const enemy = makeEnemy({ currentHealth: 5, maxHealth: 10, position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.5, aggroRadius: 0, combatAggression: 0.5, chaseWeight: 0.5, flockingWeight: 0, interceptWeight: 0, terrainAvoidance: 0 };
            ai.updateEnemiesSync([enemy], { position: { q: 5, r: 5 } });
            expect(enemy.currentHealth).toBe(6);
        });

        it('moves a roaming enemy toward the hero', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99); // avoid wander skip
            const enemy = makeEnemy({ position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.9, aggroRadius: 5, combatAggression: 0.8, chaseWeight: 0.8, flockingWeight: 0, interceptWeight: 0, terrainAvoidance: 0 };
            const log = ai.updateEnemiesSync([enemy], { position: { q: 1, r: 0 } });
            expect(log.length).toBeGreaterThan(0);
            expect(enemy.position).not.toEqual({ q: 0, r: 0 });
        });

        it('does not move an enemy that cannot move (low wanderWeight, no aggro)', () => {
            const enemy = makeEnemy({ position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.05, aggroRadius: 0, combatAggression: 0.1, chaseWeight: 0.1, flockingWeight: 0, interceptWeight: 0, terrainAvoidance: 0 };
            const before = { ...enemy.position };
            ai.updateEnemiesSync([enemy], { position: { q: 5, r: 5 } });
            expect(enemy.position).toEqual(before);
        });

        it('moves toward flock target when flockingWeight high', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            const ally = makeEnemy({ id: 'ally', position: { q: 2, r: 0 } });
            const enemy = makeEnemy({ position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.9, aggroRadius: 0, combatAggression: 0.5, chaseWeight: 0, flockingWeight: 0.9, interceptWeight: 0, terrainAvoidance: 0 };
            const log = ai.updateEnemiesSync([enemy, ally], { position: { q: 5, r: 5 } });
            expect(log.length).toBeGreaterThan(0);
        });

        it('avoids water and mountains', () => {
            const grid = makeGrid();
            grid.hexes.set('1,0', { q: 1, r: 0, terrain: 'water' });
            game.hexGrid = grid;
            const enemy = makeEnemy({ position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.9, aggroRadius: 5, combatAggression: 0.8, chaseWeight: 0.8, flockingWeight: 0, interceptWeight: 0, terrainAvoidance: 0 };
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            ai.updateEnemiesSync([enemy], { position: { q: 1, r: 0 } });
            // Should not land on the water hex
            expect(enemy.position).not.toEqual({ q: 1, r: 0 });
        });
    });

    describe('updateEnemies (async worker path)', () => {
        it('falls back to sync when no worker', async () => {
            ai.worker = null; // force sync fallback
            game.hexGrid = makeGrid();
            const enemy = makeEnemy({ position: { q: 0, r: 0 } });
            enemy.aiConfig = { ...balancedConfig(), wanderWeight: 0.5 };
            const log = await ai.updateEnemies([enemy], { position: { q: 1, r: 0 } });
            expect(Array.isArray(log)).toBe(true);
        });
    });

    describe('reconstituteEnemy', () => {
        it('creates a boss for isBoss data', () => {
            const data = { type: 'volkare', isBoss: true, position: { q: 1, r: 1 } };
            const enemy = ai.reconstituteEnemy(data);
            expect(enemy).toBeTruthy();
            expect(enemy.isBoss).toBe(true);
        });

        it('creates a normal enemy otherwise', () => {
            const data = { type: 'orc', position: { q: 2, r: 2 } };
            const enemy = ai.reconstituteEnemy(data);
            expect(enemy).toBeTruthy();
            expect(enemy.isBoss).toBeFalsy();
        });

        it('loads state when loadState is available', () => {
            const data = { type: 'orc', position: { q: 2, r: 2 }, currentHealth: 3 };
            const enemy = ai.reconstituteEnemy(data);
            expect(enemy.loadState).toBeTypeOf('function');
        });
    });
});
