import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExplorationHandler } from '../../js/sites/ExplorationHandler.js';
import { SITE_TYPES } from '../../js/sites.js';

describe('ExplorationHandler', () => {
    let handler;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                position: { q: 0, r: 0 }
            },
            addLog: vi.fn(),
            combatOrchestrator: {
                initiateCombat: vi.fn()
            },
            initiateCombat: vi.fn()
        };
        handler = new ExplorationHandler(mockGame);
    });

    describe('getOptions', () => {
        it('should return explore option for unconquered site', () => {
            const site = { type: SITE_TYPES.DUNGEON, conquered: false };
            const options = handler.getOptions(site);

            expect(options.length).toBe(1);
            expect(options[0].id).toBe('explore_dungeon');
            expect(options[0].enabled).toBe(true);
        });

        it('should return looted option for conquered site', () => {
            const site = { type: SITE_TYPES.DUNGEON, conquered: true };
            const options = handler.getOptions(site);

            expect(options.length).toBe(1);
            expect(options[0].id).toBe('looted');
            expect(options[0].enabled).toBe(false);
            expect(options[0].label).toBe('Verlies bereits geplündert');
        });

        it('should return correct labels for different conquered sites', () => {
            const types = [
                { type: SITE_TYPES.RUIN, label: 'Ruine bereits geplündert' },
                { type: SITE_TYPES.TOMB, label: 'Grabstätte bereits geplündert' },
                { type: SITE_TYPES.LABYRINTH, label: 'Labyrinth bereits durchquert' },
                { type: SITE_TYPES.SPAWNING_GROUNDS, label: 'Brutstätte bereits gesäubert' }
            ];

            types.forEach(({ type, label }) => {
                const options = handler.getOptions({ type, conquered: true });
                expect(options[0].label).toBe(label);
            });
        });

        it('should return empty array for unknown site type', () => {
            const options = handler.getOptions({ type: 'unknown', conquered: false });
            expect(options).toEqual([]);
        });
    });

    describe('exploreDungeon', () => {
        it('should initiate combat with an enemy', () => {
            const result = handler.exploreDungeon();
            expect(result.success).toBe(true);
            expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('Dunkel'), 'warning');
            expect(mockGame.combatOrchestrator.initiateCombat).toHaveBeenCalled();
        });

        it('should handle random branching (Elemental vs Draconian)', () => {
            const enemies = new Set();
            for (let i = 0; i < 20; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i % 2 === 0 ? 0.6 : 0.4);
                handler.exploreDungeon();
                const enemy = mockGame.combatOrchestrator.initiateCombat.mock.calls[i][0];
                enemies.add(enemy.name);
                vi.restoreAllMocks();
            }
            expect(enemies).toContain('Feuer-Elementar');
            expect(enemies).toContain('Drakonier-Elite');
        });
    });

    describe('exploreRuin', () => {
        it('should handle random branching (Summoner vs Guard)', () => {
            const enemies = new Set();
            for (let i = 0; i < 20; i++) {
                vi.spyOn(Math, 'random').mockReturnValueOnce(i % 2 === 0 ? 0.5 : 0.3);
                handler.exploreRuin();
                const enemy = mockGame.combatOrchestrator.initiateCombat.mock.calls[i][0];
                enemies.add(enemy.name);
                vi.restoreAllMocks();
            }
            expect(enemies).toContain('Ruinen-Beschwörer');
            expect(enemies).toContain('Ruinen-Wächter');
        });
    });

    describe('exploreTomb', () => {
        it('should handle random branching (Vampire vs Phantom vs Skeleton)', () => {
            const enemies = new Set();
            vi.spyOn(Math, 'random').mockReturnValueOnce(0.8);
            handler.exploreTomb();

            vi.spyOn(Math, 'random').mockReturnValueOnce(0.5);
            handler.exploreTomb();

            vi.spyOn(Math, 'random').mockReturnValueOnce(0.2);
            handler.exploreTomb();

            const calls = mockGame.initiateCombat.mock.calls;
            expect(calls[0][0].name).toBe('Vampir-Lord');
            expect(calls[1][0].name).toBe('Phantom');
            expect(calls[2][0].name).toBe('Skelett-Krieger');
            vi.restoreAllMocks();
        });
    });

    describe('exploreLabyrinth', () => {
        it('should initiate combat with multiple enemies', () => {
            const result = handler.exploreLabyrinth();
            expect(result.success).toBe(true);
            const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(Array.isArray(enemies)).toBe(true);
            expect(enemies.length).toBe(2);
        });

        it('should handle random branching for enemies', () => {
            vi.spyOn(Math, 'random').mockReturnValueOnce(0.6).mockReturnValueOnce(0.7);
            handler.exploreLabyrinth();

            vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0.4);
            handler.exploreLabyrinth();

            const call1 = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            const call2 = mockGame.combatOrchestrator.initiateCombat.mock.calls[1][0];

            expect(call1[0].name).toBe('Labyrinth-Magier');
            expect(call1[1].name).toBe('Drakonier');
            expect(call2[0].name).toBe('Stein-Golem');
            expect(call2[1].name).toBe('Minotaurus');
            vi.restoreAllMocks();
        });
    });

    describe('exploreSpawningGrounds', () => {
        it('should initiate combat with multiple enemies', () => {
            const result = handler.exploreSpawningGrounds();
            expect(result.success).toBe(true);
            const enemies = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            expect(enemies.length).toBe(2);
        });

        it('should handle random branching for first enemy', () => {
            vi.spyOn(Math, 'random').mockReturnValueOnce(0.6);
            handler.exploreSpawningGrounds();

            vi.spyOn(Math, 'random').mockReturnValueOnce(0.4);
            handler.exploreSpawningGrounds();

            const call1 = mockGame.combatOrchestrator.initiateCombat.mock.calls[0][0];
            const call2 = mockGame.combatOrchestrator.initiateCombat.mock.calls[1][0];

            expect(call1[0].name).toBe('Spinnen-Königin');
            expect(call2[0].name).toBe('Ork-Horde');
            vi.restoreAllMocks();
        });
    });

    describe('Action Invocation from getOptions', () => {
        it('should call explore methods from option actions', () => {
            const types = [
                { type: SITE_TYPES.DUNGEON, method: 'exploreDungeon' },
                { type: SITE_TYPES.RUIN, method: 'exploreRuin' },
                { type: SITE_TYPES.TOMB, method: 'exploreTomb' },
                { type: SITE_TYPES.LABYRINTH, method: 'exploreLabyrinth' },
                { type: SITE_TYPES.SPAWNING_GROUNDS, method: 'exploreSpawningGrounds' }
            ];

            types.forEach(({ type, method }) => {
                const options = handler.getOptions({ type, conquered: false });
                const spy = vi.spyOn(handler, method).mockReturnValue({ success: true });
                options[0].action();
                expect(spy).toHaveBeenCalled();
                spy.mockRestore();
            });
        });
    });
});
