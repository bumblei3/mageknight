/**
 * ExplorationHandler - Coverage Boost
 * Targets js/sites/ExplorationHandler.ts (was ~74% lines).
 * Covers getOptions (conquered + all site types), reward config, and every explore* combat path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExplorationHandler } from '../../js/sites/ExplorationHandler.js';
import { SITE_TYPES } from '../../js/sites.js';
import { SiteRewardManager } from '../../js/sites/SiteRewards.js';

describe('ExplorationHandler - Coverage Boost', () => {
    let game;
    let handler;
    let initiated;

    beforeEach(() => {
        initiated = { enemy: null, cb: null };
        game = {
            addLog: vi.fn(),
            hero: { name: 'Held' },
            combatOrchestrator: {
                initiateCombat: (enemy, cb) => { initiated.enemy = enemy; initiated.cb = cb; },
            },
        };
        handler = new ExplorationHandler(game);
        // Stub the singleton so onCombatEnd (triggered via combat callbacks) stays isolated
        vi.spyOn(SiteRewardManager, 'getInstance').mockReturnValue({
            rollRewards: vi.fn(() => [{ type: 'mana', value: 'red' }]),
            applyRewards: vi.fn(() => ['+1 Rotes Mana']),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getOptions — conquered', () => {
        it('returns a disabled looted option per site type', () => {
            const types = [
                SITE_TYPES.DUNGEON, SITE_TYPES.RUINS, SITE_TYPES.TOMB,
                SITE_TYPES.LABYRINTH, SITE_TYPES.SPAWNING_GROUNDS,
            ];
            for (const type of types) {
                const opts = handler.getOptions({ type, conquered: true });
                expect(opts).toHaveLength(1);
                expect(opts[0].enabled).toBe(false);
                expect(opts[0].id).toBe('looted');
            }
        });

        it('falls back to generic label for unknown conquered type', () => {
            const opts = handler.getOptions({ type: 'unknown_x', conquered: true });
            expect(opts[0].label).toBe('Bereits erkundet');
        });
    });

    describe('getOptions — active', () => {
        it('returns an enabled explore option per known site type', () => {
            const map = [
                [SITE_TYPES.DUNGEON, 'explore_dungeon'],
                [SITE_TYPES.RUINS, 'explore_ruin'],
                [SITE_TYPES.TOMB, 'explore_tomb'],
                [SITE_TYPES.LABYRINTH, 'explore_labyrinth'],
                [SITE_TYPES.SPAWNING_GROUNDS, 'explore_spawning'],
            ];
            for (const [type, id] of map) {
                const opts = handler.getOptions({ type, conquered: false });
                expect(opts).toHaveLength(1);
                expect(opts[0].enabled).toBe(true);
                expect(opts[0].id).toBe(id);
            }
        });

        it('returns empty for unknown active site type', () => {
            expect(handler.getOptions({ type: 'nope', conquered: false })).toEqual([]);
        });

        it('executing each option triggers the matching explore method', () => {
            const types = [
                SITE_TYPES.DUNGEON, SITE_TYPES.RUINS, SITE_TYPES.TOMB,
                SITE_TYPES.LABYRINTH, SITE_TYPES.SPAWNING_GROUNDS,
            ];
            for (const type of types) {
                const opt = handler.getOptions({ type, conquered: false })[0];
                initiated = { enemy: null, cb: null };
                const res = opt.action();
                expect(res.success).toBe(true);
                expect(initiated.enemy).toBeTruthy();
                expect(typeof initiated.cb).toBe('function');
                // Trigger the onCombatEnd callback chain to cover reward handling
                initiated.cb();
            }
        });
    });

    describe('explore methods', () => {
        it('exploreDungeon picks elemental or draconum based on Math.random', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // <0.5 -> draconum
            const r1 = handler.exploreDungeon();
            expect(r1.message).toBe('Verlies betreten!');
            expect(initiated.enemy.name).toBe('Drakonier-Elite');
            expect(typeof initiated.cb).toBe('function');

            Math.random.mockReturnValue(0.99); // elemental branch
            const r2 = handler.exploreDungeon();
            expect(initiated.enemy.name).toBe('Feuer-Elemental');
        });

        it('exploreRuin picks summoner or guardian', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.1); // <0.4 -> guardian
            handler.exploreRuin();
            expect(initiated.enemy.name).toBe('Ruinen-Wächter');

            Math.random.mockReturnValue(0.99); // summoner
            handler.exploreRuin();
            expect(initiated.enemy.name).toBe('Ruinen-Beschwörer');
        });

        it('exploreTomb picks among three undead variants', () => {
            // roll>0.7 vampire, 0.3<roll<=0.7 phantom, else skeleton
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            handler.exploreTomb();
            expect(initiated.enemy.name).toBe('Vampir-Lord');

            Math.random.mockReturnValue(0.5);
            handler.exploreTomb();
            expect(initiated.enemy.name).toBe('Phantom');

            Math.random.mockReturnValue(0.1);
            handler.exploreTomb();
            expect(initiated.enemy.name).toBe('Skelett-Krieger');
        });

        it('exploreLabyrinth builds two enemies (mage/golem, dragon/orc)', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99); // mage + dragon
            handler.exploreLabyrinth();
            expect(Array.isArray(initiated.enemy)).toBe(true);
            expect(initiated.enemy).toHaveLength(2);
            expect(initiated.enemy[0].name).toBe('Labyrinth-Magier');
            expect(initiated.enemy[1].name).toBe('Drakonier');

            Math.random.mockReturnValue(0.1); // golem + orc
            handler.exploreLabyrinth();
            expect(initiated.enemy[0].name).toBe('Stein-Golem');
            expect(initiated.enemy[1].name).toBe('Minotaurus');
        });

        it('exploreSpawningGrounds builds queen/horde + minion', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99); // queen
            handler.exploreSpawningGrounds();
            expect(initiated.enemy[0].name).toBe('Spinnen-Königin');
            expect(initiated.enemy[1].name).toBe('Sumpf-Ratte');

            Math.random.mockReturnValue(0.1); // horde
            handler.exploreSpawningGrounds();
            expect(initiated.enemy[0].name).toBe('Ork-Horde');
        });
    });

    describe('onCombatEnd / reward config', () => {
        it('rolls and applies rewards for a dungeon and logs on success', () => {
            const rollRewards = vi.fn(() => [{ type: 'mana', value: 'red' }]);
            const applyRewards = vi.fn(() => ['+1 Rotes Mana']);
            SiteRewardManager.getInstance.mockReturnValue({ rollRewards, applyRewards });

            handler.exploreDungeon();
            initiated.cb(); // trigger onCombatEnd(DUNGEON)

            expect(rollRewards).toHaveBeenCalledWith(SITE_TYPES.DUNGEON, 'uncommon', 2);
            expect(applyRewards).toHaveBeenCalled();
            expect(game.addLog).toHaveBeenCalledWith('Belohnung: +1 Rotes Mana', 'success');
        });

        it('does not log when reward messages are empty', () => {
            SiteRewardManager.getInstance.mockReturnValue({
                rollRewards: vi.fn(() => []),
                applyRewards: vi.fn(() => []),
            });
            handler.exploreRuin();
            initiated.cb();
            // Only the explore() addLog call (warning) should have fired, no success reward log
            expect(game.addLog).not.toHaveBeenCalledWith(expect.stringContaining('Belohnung'), 'success');
        });

        it('getSiteRewardConfig defaults for unknown type', () => {
            const cfg = handler.getSiteRewardConfig('zzz');
            expect(cfg).toEqual({ difficulty: 'common', count: 1 });
        });
    });
});
