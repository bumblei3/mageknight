
import { describe, it, expect, beforeEach } from 'vitest';
import { ScenarioManager } from '../../js/game/ScenarioManager.js';
import { SITE_TYPES } from '../../js/sites.js';

class MockGame {
    constructor() {
        this.statisticsManager = {
            getAll: () => ({})
        };
        // Mock HexGrid with ability to iterate
        this.hexGrid = {
            hexes: new Map(),
            setHex: (q, r, siteType, conquered) => {
                this.hexGrid.hexes.set(`${q},${r}`, { site: { type: siteType, conquered } });
            }
        };
        this.turnNumber = 1;
    }
}

describe('Scenario System', () => {
    let scenarioManager;
    let game;

    beforeEach(() => {
        game = new MockGame();
        scenarioManager = new ScenarioManager(game);
    });

    it('should load default scenario Mines Freedom', () => {
        const scenario = scenarioManager.getCurrentScenario();
        expect(scenario).toBeTruthy();
        expect(scenario.id).toBe('mines_freedom');
        expect(scenario.victoryConditions.mines).toBe(2);
    });

    it('should NOT check victory if conditions not met', () => {
        // No sites conquered
        const res = scenarioManager.checkVictory();
        expect(res).toBe(false);
    });

    it('should detect victory for Mines Freedom', () => {
        // Mock conquering 2 Mines and 1 Keep
        game.hexGrid.setHex(0, 1, SITE_TYPES.MINE, true);
        game.hexGrid.setHex(1, 0, SITE_TYPES.MINE, true);
        game.hexGrid.setHex(2, 0, SITE_TYPES.KEEP, true);

        const res = scenarioManager.checkVictory();

        expect(res).toBeTruthy();
        expect(res.victory).toBe(true);
        expect(res.message).toContain('erfolgreich');
    });

    it('should NOT declare victory if missing a Keep', () => {
        game.hexGrid.setHex(0, 1, SITE_TYPES.MINE, true);
        game.hexGrid.setHex(1, 0, SITE_TYPES.MINE, true);
        // No Keep

        const res = scenarioManager.checkVictory();
        expect(res).toBe(false);
    });
});
