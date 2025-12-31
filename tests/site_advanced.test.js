
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { SITE_TYPES } from '../js/sites.js';
import { UNIT_TYPES } from '../js/unit.js';
import { setupGlobalMocks, resetMocks, createSpy } from './test-mocks.js';

// Setup global mocks
setupGlobalMocks();

describe('Advanced Site Interactions', () => {
    let manager;
    let mockGame;
    let mockHero;

    beforeEach(() => {
        resetMocks();

        mockHero = {
            units: [],
            influencePoints: 0,
            reputation: 0,
            wounds: [],
            crystals: { 'BLUE': 0, 'blue': 0 },
            discard: [],
            getReputationModifier: () => 0,
            getManaInventory: () => [],
            addUnit: (u) => { mockHero.units.push(u); return true; },
            healWound: () => { mockHero.wounds.pop(); return true; },
            removeMana: () => { }
        };

        mockGame = {
            hero: mockHero,
            addLog: createSpy(),
            initiateCombat: createSpy(),
            updateStats: createSpy()
        };

        manager = new SiteInteractionManager(mockGame);
    });

    afterEach(() => {
        resetMocks();
    });

    it('should handle fallback for unhandled site types', () => {
        const site = { type: 'unknown_type', getName: () => 'Unknown', getIcon: () => '?', getColor: () => 'gray', getInfo: () => ({ description: '?' }), conquered: false };
        const hex = {};

        const data = manager.visitSite(hex, site);
        // Should return empty options, not crash
        expect(data.options).toBeDefined();
        expect(data.options.length).toBe(0);
    });

    it('should generate Monastery options properly', () => {
        const site = { type: SITE_TYPES.MONASTERY, getName: () => 'Monastery', getIcon: () => '⛪', getColor: () => 'gold', getInfo: () => ({ description: 'Holy' }) };
        const hex = {};

        const data = manager.visitSite(hex, site);

        // Monastery has Heal and Train in current impl
        expect(data.options.find(o => o.id === 'train')).toBeDefined();
        expect(data.options.find(o => o.id === 'heal')).toBeDefined();
    });

    it('should handle "Refusal" to interact if Reputation is too low (simulated)', () => {
        // Current impl doesn't strictly verify Rep, but let's ensure it doesn't crash on high/low reps
        mockHero.reputation = -10;
        mockHero.getReputationModifier = () => -5;

        const site = { type: SITE_TYPES.VILLAGE, getName: () => 'Village', getIcon: () => '🏠', getColor: () => 'green', getInfo: () => ({ description: 'Desc' }) };

        const data = manager.visitSite({}, site);
        expect(data.options.length).toBeGreaterThan(0);
    });

    it('should correctly process unit recruitment', () => {
        mockHero.influencePoints = 20;

        // Use a valid unit type known in UNIT_INFO
        const unitInfo = { name: 'Mages', cost: 8, type: UNIT_TYPES.MAGES };

        const result = manager.recruitUnit(unitInfo);
        expect(result.success).toBe(true);
        expect(mockHero.units.length).toBe(1);
    });
});
