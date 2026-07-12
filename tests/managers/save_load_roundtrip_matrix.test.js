import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { setupGlobalMocks, resetMocks, createMockLocalStorage } from '../test-mocks.js';

setupGlobalMocks();

// Build a realistic, schema-conformant save state.
// `scenario` drives hero/enemy/szenario-specific data.
const buildState = (overrides = {}) => ({
    version: 1,
    hero: {
        name: 'Goldyx',
        level: 4,
        fame: 12,
        reputation: 1,
        armor: 2,
        movementPoints: 3,
        attackPoints: 5,
        blockPoints: 2,
        influencePoints: 1,
        healingPoints: 0,
        handLimit: 5,
        commandLimit: 2,
        position: { q: 4, r: -2 },
        deck: ['c1', 'c2', 'c3'],
        hand: ['fire', 'wound'],
        discard: ['block'],
        wounds: ['wound', 'wound'],
        crystals: { red: 1, blue: 0, green: 3 },
        skills: [{ id: 'flight', name: 'Flug' }, { id: 'dragon_scales', name: 'Drachenschuppen' }],
        tempMana: ['gold'],
        units: [{ id: 'u1', hp: 3, maxHp: 5 }],
    },
    enemies: [
        { id: 'ork', type: 'enemy', name: 'Ork', position: { q: 5, r: -2 }, armor: 3, attack: 2, fame: 2, icon: '👹', color: '#888' },
        { id: 'guardian', type: 'enemy', name: 'Wächter', position: { q: 6, r: -3 }, armor: 4, attack: 3, fame: 3, icon: '🛡️', color: '#888', fortified: true },
    ],
    combat: null,
    hexGrid: null,
    time: { round: 7, timeOfDay: 'night' },
    statistics: { turns: 7, enemiesDefeated: 2 },
    achievements: { unlocked: ['first_blood'] },
    turn: { currentPlayer: 'player1', actionsRemaining: 2 },
    scenario: 'mining_expedition',
    timestamp: Date.now(),
    ...overrides,
});

// Deep equality check on the fields that must survive a round-trip exactly.
// (Schema normalizes deck/hand/etc. to string[] and drops unknown enemy fields,
//  so we assert on the canonical shape, not raw object identity.)
const expectRoundTripPreserved = (original, loaded) => {
    expect(loaded).not.toBeNull();
    // Hero core stats
    expect(loaded.hero.name).toBe(original.hero.name);
    expect(loaded.hero.level).toBe(original.hero.level);
    expect(loaded.hero.fame).toBe(original.hero.fame);
    expect(loaded.hero.reputation).toBe(original.hero.reputation);
    // Hex position must survive exactly (regression guard for q/r restore)
    expect(loaded.hero.position).toEqual(original.hero.position);
    expect(loaded.hero.position.q).toBe(4);
    expect(loaded.hero.position.r).toBe(-2);
    // Card collections (string[] after normalization)
    expect(loaded.hero.deck).toEqual(original.hero.deck);
    expect(loaded.hero.hand).toEqual(original.hero.hand);
    expect(loaded.hero.discard).toEqual(original.hero.discard);
    expect(loaded.hero.wounds).toEqual(original.hero.wounds);
    expect(loaded.hero.crystals).toEqual(original.hero.crystals);
    expect(loaded.hero.skills).toEqual(original.hero.skills);
    expect(loaded.hero.tempMana).toEqual(original.hero.tempMana);
    // Units preserve HP
    expect(loaded.hero.units).toEqual(original.hero.units);
    expect(loaded.hero.units[0].hp).toBe(3);
    // Enemies preserved
    expect(loaded.enemies).toHaveLength(2);
    expect(loaded.enemies[0].position).toEqual({ q: 5, r: -2 });
    expect(loaded.enemies[1].fortified).toBe(true);
    // Time / day-night
    expect(loaded.time).toEqual(original.time);
    expect(loaded.time.timeOfDay).toBe('night');
    expect(loaded.time.round).toBe(7);
    // Achievements
    expect(loaded.achievements).toEqual(original.achievements);
    // Turn state
    expect(loaded.turn).toEqual(original.turn);
};

describe('Save/Load Round-Trip Matrix', () => {
    beforeEach(() => {
        resetMocks();
        global.localStorage = createMockLocalStorage();
    });

    it('preserves a fully populated Goldyx night state', () => {
        const state = buildState();
        expect(SaveManager.saveGame('matrix-1', state)).toBe(true);
        expectRoundTripPreserved(state, SaveManager.loadGame('matrix-1'));
    });

    it('preserves a wounded hero with empty hand at day', () => {
        const base = buildState();
        const state = buildState({
            hero: {
                ...base.hero,
                hand: [],
                wounds: ['wound', 'wound', 'wound'],
            },
            time: { round: 2, timeOfDay: 'day' },
        });
        expect(SaveManager.saveGame('matrix-2', state)).toBe(true);
        const loaded = SaveManager.loadGame('matrix-2');
        expect(loaded.hero.hand).toEqual([]);
        expect(loaded.hero.wounds).toEqual(['wound', 'wound', 'wound']);
        expect(loaded.time.timeOfDay).toBe('day');
        expect(loaded.hero.position).toEqual({ q: 4, r: -2 });
    });

    it('preserves different heroes (Norowas) and a different scenario', () => {
        const state = buildState({
            hero: {
                ...buildState().hero,
                name: 'Norowas',
                skills: [{ id: 'motivation', name: 'Motivation' }],
            },
            scenario: 'volkares_quest',
            enemies: [{ id: 'vampire', type: 'enemy', name: 'Vampir', position: { q: -1, r: 3 }, armor: 4, attack: 4, fame: 4, icon: '🦇', color: '#888', vampiric: true }],
        });
        expect(SaveManager.saveGame('matrix-3', state)).toBe(true);
        const loaded = SaveManager.loadGame('matrix-3');
        expect(loaded.hero.name).toBe('Norowas');
        expect(loaded.hero.skills).toEqual([{ id: 'motivation', name: 'Motivation' }]);
        expect(loaded.scenario).toBe('volkares_quest');
        expect(loaded.enemies[0].position).toEqual({ q: -1, r: 3 });
        expect(loaded.enemies[0].vampiric).toBe(true);
    });

    it('preserves zero-state (no units, no enemies, empty crystals)', () => {
        const state = buildState({
            hero: {
                ...buildState().hero,
                units: [],
                crystals: {},
                skills: [],
            },
            enemies: [],
        });
        expect(SaveManager.saveGame('matrix-4', state)).toBe(true);
        const loaded = SaveManager.loadGame('matrix-4');
        expect(loaded.hero.units).toEqual([]);
        expect(loaded.hero.crystals).toEqual({});
        expect(loaded.enemies).toEqual([]);
        expect(loaded.hero.position).toEqual({ q: 4, r: -2 });
    });

    it('is idempotent across multiple save/load cycles', () => {
        const state = buildState();
        expect(SaveManager.saveGame('matrix-5', state)).toBe(true);
        let current = SaveManager.loadGame('matrix-5');
        current = SaveManager.loadGame('matrix-5');
        expectRoundTripPreserved(state, current);
        current = SaveManager.loadGame('matrix-5');
        expectRoundTripPreserved(state, current);
    });

    it('isolates slots: matrix-1 untouched after matrix-6 write', () => {
        const state1 = buildState();
        SaveManager.saveGame('matrix-1', state1);
        const state6 = buildState({
            hero: {
                ...buildState().hero,
                name: 'Tovak',
                position: { q: -9, r: 9 },
            },
            scenario: 'dungeon_lords',
        });
        SaveManager.saveGame('matrix-6', state6);

        const loaded1 = SaveManager.loadGame('matrix-1');
        expect(loaded1.hero.name).toBe('Goldyx');
        expect(loaded1.hero.position).toEqual({ q: 4, r: -2 });
        expect(loaded1.scenario).toBe('mining_expedition');

        const loaded6 = SaveManager.loadGame('matrix-6');
        expect(loaded6.hero.name).toBe('Tovak');
        expect(loaded6.hero.position).toEqual({ q: -9, r: 9 });
        expect(loaded6.scenario).toBe('dungeon_lords');
    });
});
