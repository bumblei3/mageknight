
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MapManager } from '../../js/mapManager.js';
import { TERRAIN_TYPES } from '../../js/constants.js';
import { SITE_TYPES } from '../../js/sites.js';
import { setRandomSeed, restoreRandom, createMockElement } from '../test-mocks.js';

// Mock HexGrid
const mockHexGrid = {
    setHex: () => { },
    hasHex: () => false,
    getNeighbors: () => [],
    getHex: () => ({})
};

describe('Site Generation', () => {
    let mapManager;

    beforeEach(() => {
        mapManager = new MapManager(mockHexGrid);
        setRandomSeed(12345); // Set deterministic seed for testing probabilities
    });

    afterEach(() => {
        restoreRandom();
    });

    it('should generate Spawning Grounds in Forest', () => {
        // We know Forest logic: < 0.2 => SPAWNING_GROUNDS
        // We need to find a seed or mock Math.random to return < 0.2

        // Let's brute force valid seeds or just mock the function specifically for this test
        // modifying the class method temporarily is easier here since we don't control the seed algo perfectly

        const originalRandom = Math.random;
        Math.random = () => 0.1; // Force < 0.2

        const site = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.FOREST);
        expect(site).toBe(SITE_TYPES.SPAWNING_GROUNDS);

        Math.random = originalRandom;
    });

    it('should generate Labyrinth in Desert', () => {
        // Desert logic: < 0.3 => LABYRINTH

        const originalRandom = Math.random;
        Math.random = () => 0.2; // Force < 0.3

        const site = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.DESERT);
        expect(site).toBe(SITE_TYPES.LABYRINTH);

        Math.random = originalRandom;
    });

    it('should generate Labyrinth in Wasteland', () => {
        // Wasteland logic: < 0.2 => LABYRINTH

        const originalRandom = Math.random;
        Math.random = () => 0.1;

        const site = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.WASTELAND);
        expect(site).toBe(SITE_TYPES.LABYRINTH);

        Math.random = originalRandom;
    });

    it('should generate Tomb in Wasteland', () => {
        // Wasteland logic: 0.4 to 0.6 => TOMB

        const originalRandom = Math.random;
        Math.random = () => 0.5;

        const site = mapManager.getRandomSiteForTerrain(TERRAIN_TYPES.WASTELAND);
        expect(site).toBe(SITE_TYPES.TOMB);

        Math.random = originalRandom;
    });
});
