import { describe, it, expect, beforeEach } from 'vitest';
import { ScenarioManager } from '../js/game/ScenarioManager.js';
import { SITE_TYPES } from '../js/sites.js';

/**
 * Builds a minimal mock game that the ScenarioManager reads from.
 * `hexes` is a Map of hex objects (matching the real HexGrid shape).
 */
function makeMockGame({ hexes = [], enemies = [], round = 0 } = {}) {
    const hexMap = new Map();
    hexes.forEach((h) => hexMap.set(h.q + ',' + h.r, h));
    return {
        hexGrid: { hexes: hexMap },
        enemies,
        round,
    };
}

let hexCounter = 0;
function hex(site, type) {
    hexCounter++;
    return {
        q: hexCounter,
        r: 0,
        site: site ? { type, conquered: site.conquered } : null,
        enemy: site && site.enemy ? site.enemy : null,
    };
}

describe('ScenarioManager', () => {
    let game;

    beforeEach(() => {
        game = makeMockGame();
    });

    describe('loadScenario / getCurrentScenario', () => {
        it('loads a known scenario and updates currentScenario', () => {
            const mgr = new ScenarioManager(game);
            const scenario = mgr.loadScenario('druid_nights');
            expect(scenario).not.toBeNull();
            expect(scenario.id).toBe('druid_nights');
            expect(mgr.getCurrentScenario().id).toBe('druid_nights');
        });

        it('returns null for an unknown scenario and keeps default', () => {
            const mgr = new ScenarioManager(game);
            expect(mgr.loadScenario('does_not_exist')).toBeNull();
            // default scenario stays active
            expect(mgr.getCurrentScenario().id).toBe('mines_freedom');
        });
    });

    describe('getObjectivesText / getObjectivesTextForScenario', () => {
        it('maps each scenario id to its objective string', () => {
            const mgr = new ScenarioManager(game);
            const ids = [
                'mines_freedom', 'druid_nights', 'mining_expedition', 'dungeon_lords',
                'labyrinth_rising', 'volkare_quest', 'volkare_return', 'volkare_legacy',
            ];
            for (const id of ids) {
                const scenario = mgr.loadScenario(id);
                const text = mgr.getObjectivesTextForScenario(scenario);
                expect(text).toBeTruthy();
                expect(text).not.toBe(scenario.description);
            }
        });

        it('returns empty string for null scenario', () => {
            const mgr = new ScenarioManager(game);
            expect(mgr.getObjectivesTextForScenario(null)).toBe('');
        });

        it('returns description as fallback for unrecognized id', () => {
            const mgr = new ScenarioManager(game);
            const fake = { id: 'unknown_scenario', description: 'custom desc', victoryConditions: {} };
            expect(mgr.getObjectivesTextForScenario(fake)).toBe('custom desc');
        });

        it('getCurrentScenario objectives text reflects loaded scenario', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('volkare_quest');
            expect(mgr.getObjectivesText()).toContain('Volkare');
        });
    });

    describe('checkVictory - mines_freedom', () => {
        it('is false when no sites conquered', () => {
            const mgr = new ScenarioManager(game);
            expect(mgr.checkVictory()).toBe(false);
        });

        it('is true when required mines and keep are conquered', () => {
            const mgr = new ScenarioManager(game);
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.MINE),
                    hex({ conquered: true }, SITE_TYPES.MINE),
                    hex({ conquered: true }, SITE_TYPES.KEEP),
                ],
            });
            mgr.game = game;
            const result = mgr.checkVictory();
            expect(result.victory).toBe(true);
            expect(result.message).toContain('Minen');
        });

        it('is false when only mines conquered but keep missing', () => {
            const mgr = new ScenarioManager(game);
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.MINE),
                    hex({ conquered: true }, SITE_TYPES.MINE),
                ],
            });
            mgr.game = game;
            expect(mgr.checkVictory()).toBe(false);
        });
    });

    describe('checkVictory - druid_nights', () => {
        it('is true when enough spawning grounds conquered', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('druid_nights');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.SPAWNING_GROUNDS),
                    hex({ conquered: true }, SITE_TYPES.SPAWNING_GROUNDS),
                ],
            });
            mgr.game = game;
            const result = mgr.checkVictory();
            expect(result.victory).toBe(true);
        });
    });

    describe('checkVictory - mining_expedition', () => {
        it('is true when enough mines conquered', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('mining_expedition');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.MINE),
                    hex({ conquered: true }, SITE_TYPES.MINE),
                    hex({ conquered: true }, SITE_TYPES.MINE),
                ],
            });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });
    });

    describe('checkVictory - dungeon_lords', () => {
        it('is true when all four site types conquered', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('dungeon_lords');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.DUNGEON),
                    hex({ conquered: true }, SITE_TYPES.DUNGEON),
                    hex({ conquered: true }, SITE_TYPES.TOMB),
                    hex({ conquered: true }, SITE_TYPES.RUINS),
                    hex({ conquered: true }, SITE_TYPES.LABYRINTH),
                ],
            });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });

        it('counts ruins via both string and constant forms', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('dungeon_lords');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.DUNGEON),
                    hex({ conquered: true }, SITE_TYPES.DUNGEON),
                    hex({ conquered: true }, SITE_TYPES.TOMB),
                    hex({ conquered: true }, SITE_TYPES.RUINS),
                    hex({ conquered: true, type: 'ruins' }, null),
                    hex({ conquered: true }, SITE_TYPES.LABYRINTH),
                ],
            });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });
    });

    describe('checkVictory - labyrinth_rising', () => {
        it('is true when enough labyrinths conquered', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('labyrinth_rising');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.LABYRINTH),
                    hex({ conquered: true }, SITE_TYPES.LABYRINTH),
                    hex({ conquered: true }, SITE_TYPES.LABYRINTH),
                ],
            });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });

        it('returns false (time up) when round exceeds limit and no labyrinths', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('labyrinth_rising');
            game = makeMockGame({ hexes: [], round: 9 });
            mgr.game = game;
            const result = mgr.checkVictory();
            expect(result.victory).toBe(false);
            expect(result.message).toContain('Zeit');
        });
    });

    describe('checkVictory - volkare scenarios (boss defeat)', () => {
        it('volkare_quest is true when boss defeated', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('volkare_quest');
            game = makeMockGame({ enemies: [{ type: 'volkare', isBoss: true }] });
            mgr.game = game;
            // boss present => not defeated => rely on keeps; no keeps => false
            expect(mgr.checkVictory()).toBe(false);

            // boss removed => defeated
            game = makeMockGame({ enemies: [] });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });

        it('volkare_return is true when boss defeated even with no spawns', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('volkare_return');
            game = makeMockGame({ enemies: [{ type: 'other' }] });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });

        it('volkare_legacy is true when boss defeated', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('volkare_legacy');
            game = makeMockGame({
                hexes: [
                    hex({ conquered: true }, SITE_TYPES.SPAWNING_GROUNDS),
                    hex({ conquered: true }, SITE_TYPES.SPAWNING_GROUNDS),
                    hex({ conquered: true }, SITE_TYPES.SPAWNING_GROUNDS),
                ],
                enemies: [],
            });
            mgr.game = game;
            expect(mgr.checkVictory().victory).toBe(true);
        });

        it('detects alive boss in hex grid', () => {
            const mgr = new ScenarioManager(game);
            mgr.loadScenario('volkare_quest');
            game = makeMockGame({
                hexes: [hex({}, 'x')],
                enemies: [],
            });
            mgr.game = game;
            // hex has enemy:null, so boss not found in hexes => defeated via enemy list check
            // but we also add a boss hex enemy to prove alive detection
            const bossHex = { q: 1, r: 1, site: null, enemy: { type: 'volkare', isBoss: true } };
            game.hexGrid.hexes.set('1,1', bossHex);
            expect(mgr.checkVictory()).toBe(false);
        });
    });

    describe('checkVictory - no game state', () => {
        it('returns false when hexGrid missing', () => {
            const mgr = new ScenarioManager({});
            expect(mgr.checkVictory()).toBe(false);
        });
    });
});
