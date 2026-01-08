import { describe, it, expect, beforeEach } from 'vitest';
import { HexGridLogic } from '../../js/hexgrid/HexGridLogic';
import { Terrain } from '../../js/terrain';
import { TERRAIN_TYPES } from '../../js/constants';
import { ActionManager } from '../../js/game/ActionManager';

describe('Mage Knight Rule Compliance: Movement & Exploration', () => {
    let hexGridLogic;
    let terrainSystem;
    let mockGame;
    let actionManager;

    beforeEach(() => {
        // Mock Game and dependencies
        mockGame = {
            hero: { movementPoints: 0, hasSkill: () => false, position: { q: 0, r: 0 } },
            timeManager: { isDay: () => true, isNight: () => false },
            mapManager: { explore: () => ({ success: true }) },
            hexGrid: { exploreAdjacent: () => [], getHex: () => null, distance: () => 1 },
            gameState: 'playing',
            combat: null,
            addLog: () => { },
            showToast: () => { },
            updateStats: () => { },
            render: () => { },
            entityManager: { createEnemies: () => { } }
        };

        terrainSystem = new Terrain();
        // Mock terrain system if needed, or use real one since we test rule compliance

        // Setup HexGridLogic with mocked storage
        const mockStorage = {
            getHex: (q, r) => null
        };
        hexGridLogic = new HexGridLogic(100, 100);
        hexGridLogic.setTerrainSystem(terrainSystem);

        // Overwrite internal storage access for testing isolate logic
        hexGridLogic.hexes = new Map();
        hexGridLogic.getHex = (q, r) => hexGridLogic.hexes.get(`${q},${r}`);
        hexGridLogic.setHex = (q, r, data) => hexGridLogic.hexes.set(`${q},${r}`, data);

        actionManager = new ActionManager(mockGame);
    });

    describe('Rule: City Movement Cost', () => {
        it('should cost exactly 2 points to enter a City, regardless of terrain', () => {
            // Setup a hex with high cost terrain (Mountain = 5) BUT with a City
            hexGridLogic.setHex(1, 0, {
                terrain: TERRAIN_TYPES.MOUNTAINS,
                site: { type: 'city' }
            });

            const cost = hexGridLogic.getMovementCost(1, 0, false, false); // Day, No Flight
            expect(cost).toBe(2);
        });

        it('should cost exactly 2 points to enter a City at NIGHT, even on expensive terrain', () => {
            // Mountain at night is usually 5
            hexGridLogic.setHex(1, 0, {
                terrain: TERRAIN_TYPES.MOUNTAINS,
                site: { type: 'city' }
            });

            const cost = hexGridLogic.getMovementCost(1, 0, true, false); // Night, No Flight
            expect(cost).toBe(2);
        });

        it('should normally cost 5 to enter Mountains without a City', () => {
            hexGridLogic.setHex(1, 0, { terrain: TERRAIN_TYPES.MOUNTAINS });
            const cost = hexGridLogic.getMovementCost(1, 0, false, false);
            expect(cost).toBe(5);
        });
    });

    describe('Rule: Flight Movement', () => {
        it('should cost exactly 2 points to move with Flight', () => {
            hexGridLogic.setHex(1, 0, { terrain: TERRAIN_TYPES.MOUNTAINS }); // High cost
            const cost = hexGridLogic.getMovementCost(1, 0, false, true); // Has Flight
            expect(cost).toBe(2);
        });

        it('should cost exactly 2 points to move with Flight even at Night', () => {
            hexGridLogic.setHex(1, 0, { terrain: TERRAIN_TYPES.FOREST }); // Forest Night = 5
            const cost = hexGridLogic.getMovementCost(1, 0, true, true); // Night, Has Flight
            expect(cost).toBe(2);
        });
    });

    describe('Rule: Exploration Cost', () => {
        // We need to inspect purely the logic or how ActionManager determines validity
        // Since explore() modifies state, checking the pre-condition logic is key.

        it('should require exactly 2 movement points to explore during the DAY', () => {
            // Mock hero stats
            mockGame.hero.movementPoints = 2; // Exact amount
            mockGame.timeManager.isDay = () => true;

            // Spy on mapManager.explore to verify it gets called
            let explored = false;
            mockGame.mapManager.explore = () => { explored = true; return { success: true }; };

            actionManager.explore();

            expect(explored).toBe(true);
            expect(mockGame.hero.movementPoints).toBe(0); // 2 - 2 = 0
        });

        it('should require exactly 2 movement points to explore at NIGHT (Override Default Rule)', () => {
            // Mock hero stats
            mockGame.hero.movementPoints = 2; // Exact amount
            mockGame.timeManager.isDay = () => false; // Night
            mockGame.timeManager.isNight = () => true;

            // Spy
            let explored = false;
            mockGame.mapManager.explore = () => { explored = true; return { success: true }; };

            actionManager.explore();

            expect(explored).toBe(true);
            expect(mockGame.hero.movementPoints).toBe(0); // 2 - 2 = 0
        });

        it('should fail if hero has less than 2 movement points', () => {
            mockGame.hero.movementPoints = 1;

            let explored = false;
            mockGame.mapManager.explore = () => { explored = true; return { success: true }; };

            // Mock toast to prevent error
            let toastMsg = '';
            mockGame.showToast = (msg) => { toastMsg = msg; };

            actionManager.explore();

            expect(explored).toBe(false);
            expect(toastMsg).toContain('Nicht genug');
        });
    });
});
