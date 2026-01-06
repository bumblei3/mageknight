
import { describe, it, expect, beforeEach } from 'vitest';
import { ScenarioManager } from '../../js/game/ScenarioManager.js';
import { SITE_TYPES } from '../../js/sites.js';

class MockGame {
    constructor() {
        this.hexGrid = {
            hexes: new Map()
        };
        // Helper to set hex
        this.setHex = (q, r, siteType, conquered) => {
            this.hexGrid.hexes.set(`${q},${r}`, { site: { type: siteType, conquered } });
        };
    }
}

describe('Scenario: Druid Nights', () => {
    let scenarioManager;
    let game;

    beforeEach(() => {
        game = new MockGame();
        scenarioManager = new ScenarioManager(game);
        // Force load Druid Nights
        scenarioManager.loadScenario('druid_nights');
    });

    it('should be the current scenario', () => {
        expect(scenarioManager.currentScenario).toBe('druid_nights');
        expect(scenarioManager.getCurrentScenario().name).toContain('Druiden');
    });

    it('should NOT check victory if only 1 Spawn is destroyed', () => {
        game.setHex(0, 1, SITE_TYPES.SPAWNING_GROUNDS, true);

        const res = scenarioManager.checkVictory();
        expect(res).toBe(false);
    });

    it('should detect victory when 2 Spawns are destroyed', () => {
        game.setHex(0, 1, SITE_TYPES.SPAWNING_GROUNDS, true);
        game.setHex(1, 0, SITE_TYPES.SPAWNING_GROUNDS, true);

        const res = scenarioManager.checkVictory();
        expect(res).toBeTruthy();
        expect(res.victory).toBe(true);
        expect(res.message).toContain('Druiden-Rituale');
    });
});
