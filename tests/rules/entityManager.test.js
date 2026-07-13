/**
 * EntityManager behavioral tests (foundation hardening).
 * Covers enemy spawning rules (dependency guard, starting-area skip,
 * terrain-based guaranteed spawn, random gate, water exclusion, level
 * derivation), enemy lookup (class + legacy position shape), removal,
 * hero-unit delegation, and reset.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntityManager } from '../../js/game/EntityManager';

describe('EntityManager — enemy spawning', () => {
    let game;
    let em;
    let terrain;
    let enemyAI;
    let generated;

    beforeEach(() => {
        generated = [];
        terrain = { getName: (t) => t }; // identity mapping for test control
        enemyAI = {
            generateEnemy: (name, level) => {
                const e = { name, level, isDefeated: () => false };
                generated.push(e);
                return e;
            }
        };
        game = {
            hexGrid: { hexes: new Map() },
            terrain,
            enemyAI
        };
        em = new EntityManager(game);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function seedHex(q, r, terrainName) {
        game.hexGrid.hexes.set(`${q},${r}`, { q, r, terrain: terrainName });
    }

    it('returns [] and warns when dependencies are missing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        em = new EntityManager({ hexGrid: null, terrain: null, enemyAI: null });
        const result = em.createEnemies();
        expect(result).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith('Cannot create enemies: Dependencies not initialized');
    });

    it('never spawns in the starting area (|q|<=1 && |r|<=1)', () => {
        // All of these are inside the protected radius
        seedHex(0, 0, 'ruins');
        seedHex(1, 0, 'city');
        seedHex(0, 1, 'keep');
        seedHex(-1, -1, 'mage_tower');
        seedHex(1, 1, 'ruins');
        // A guaranteed-spawn terrain just outside the radius
        seedHex(2, 0, 'ruins');

        const result = em.createEnemies();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('ruins');
    });

    it('always spawns on guaranteed terrains (ruins/keep/mage_tower/city) regardless of random', () => {
        // Force random HIGH so the random gate alone would NOT spawn
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        seedHex(2, 0, 'ruins');
        seedHex(3, 0, 'keep');
        seedHex(4, 0, 'mage_tower');
        seedHex(5, 0, 'city');
        seedHex(2, 1, 'plains'); // non-guaranteed, should NOT spawn with high random

        const result = em.createEnemies();
        expect(result.map((e) => e.name).sort()).toEqual(
            ['city', 'keep', 'mage_tower', 'ruins'].sort()
        );
    });

    it('random gate spawns plains ~30% (random<0.3) but not when >=0.3', () => {
        seedHex(2, 0, 'plains');
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        expect(em.createEnemies().length).toBe(1);

        // fresh run, high random
        seedHex(3, 0, 'plains');
        vi.spyOn(Math, 'random').mockReturnValue(0.9);
        expect(em.createEnemies().length).toBe(0);
    });

    it('never spawns on water even with low random', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.01);
        seedHex(2, 0, 'water');
        expect(em.createEnemies().length).toBe(0);
    });

    it('derives enemy level from hex distance (max(|q|,|r|,|q+r|)/2, min 1)', () => {
        seedHex(2, 0, 'ruins'); // distance 2 -> level 1
        seedHex(5, 0, 'keep');  // distance 5 -> level 2
        seedHex(3, 3, 'city');  // max(3,3,6)=6 -> level 3
        em.createEnemies();
        expect(generated.map((e) => e.level).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });

    it('assigns a position and a unique id to each spawned enemy', () => {
        seedHex(2, 0, 'ruins');
        const result = em.createEnemies();
        expect(result[0].position).toEqual({ q: 2, r: 0 });
        expect(result[0].id).toMatch(/^enemy_2_0_/);
    });

    it('mirrors the spawned list onto game.enemies', () => {
        seedHex(2, 0, 'ruins');
        const result = em.createEnemies();
        expect(game.enemies).toBe(result);
        expect(game.enemies.length).toBe(1);
    });
});

describe('EntityManager — lookup / removal / lifecycle', () => {
    let game;
    let em;

    beforeEach(() => {
        game = { hexGrid: { hexes: new Map() }, terrain: { getName: (t) => t }, enemyAI: { generateEnemy: (n, l) => ({ name: n, level: l }) } };
        em = new EntityManager(game);
    });

    it('getEnemyAt finds by class-shaped position', () => {
        const e = { position: { q: 2, r: 0 }, id: 'a' };
        em.enemies = [e];
        expect(em.getEnemyAt(2, 0)).toBe(e);
        expect(em.getEnemyAt(3, 0)).toBeUndefined();
    });

    it('getEnemyAt handles legacy objects whose position is themselves', () => {
        const e = { q: 2, r: 0, id: 'legacy' }; // no .position -> treated as legacy
        em.enemies = [e];
        expect(em.getEnemyAt(2, 0)).toBe(e);
    });

    it('removeEnemy splices from list and updates game.enemies', () => {
        const a = { id: 'a' };
        const b = { id: 'b' };
        em.enemies = [a, b];
        em.removeEnemy(a);
        expect(em.enemies).toEqual([b]);
        expect(game.enemies).toEqual([b]);
    });

    it('removeEnemy on a non-member is a no-op', () => {
        const a = { id: 'a' };
        em.enemies = [a];
        em.removeEnemy({ id: 'ghost' });
        expect(em.enemies).toEqual([a]);
    });

    it('getUnits returns hero units when a hero is set', () => {
        em.setHero({ units: ['u1', 'u2'] });
        expect(em.getUnits()).toEqual(['u1', 'u2']);
        expect(game.hero.units).toEqual(['u1', 'u2']); // setHero mirrors to game
    });

    it('getUnits returns [] when no hero is present', () => {
        expect(em.getUnits()).toEqual([]);
    });

    it('reset clears enemies, units, and game.enemies', () => {
        em.enemies = [{ id: 'x' }];
        em.units = ['u'];
        em.reset();
        expect(em.enemies).toEqual([]);
        expect(em.units).toEqual([]);
        expect(game.enemies).toEqual([]);
    });
});
