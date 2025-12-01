import { describe, it, expect, beforeEach } from './testRunner.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { SITE_TYPES } from '../js/sites.js';

// Mock dependencies
const mockHero = {
    wounds: [],
    influencePoints: 10,
    discard: [],
    units: [],
    commandLimit: 2,
    healWound: () => true,
    addUnit: (unit) => true
};

const mockGame = {
    hero: mockHero,
    initiateCombat: () => { }
};

describe('SiteInteractionManager', () => {
    let manager;

    beforeEach(() => {
        // Reset mock hero state
        mockHero.wounds = [];
        mockHero.influencePoints = 10;
        mockHero.discard = [];
        mockHero.units = [];
        mockHero.addUnit = (unit) => {
            if (mockHero.units.length < mockHero.commandLimit) {
                mockHero.units.push(unit);
                return true;
            }
            return false;
        };

        manager = new SiteInteractionManager(mockGame);
    });

    it('should generate village options', () => {
        const site = { type: SITE_TYPES.VILLAGE, getName: () => 'Village', getIcon: () => '🏠', getColor: () => 'green', getInfo: () => ({ description: 'Desc' }) };
        const hex = {};

        const data = manager.visitSite(hex, site);

        expect(data.type).toBe(SITE_TYPES.VILLAGE);
        expect(data.options).toHaveLength(2); // Heal, Recruit
        expect(data.options[0].id).toBe('heal');
        expect(data.options[1].id).toBe('recruit');
    });

    it('should heal wounds in village', () => {
        mockHero.wounds = ['Wound1'];
        mockHero.healWound = () => { mockHero.wounds.pop(); return true; };

        const result = manager.healWounds(3);

        expect(result.success).toBe(true);
        expect(mockHero.influencePoints).toBe(7); // 10 - 3
        expect(mockHero.wounds).toHaveLength(0);
    });

    it('should fail to heal if not enough influence', () => {
        mockHero.wounds = ['Wound1'];
        mockHero.influencePoints = 2;

        const result = manager.healWounds(3);

        expect(result.success).toBe(false);
        expect(mockHero.influencePoints).toBe(2);
    });

    it('should recruit unit', () => {
        const unitInfo = { name: 'Peasants', cost: 3 };

        const result = manager.recruitUnit(unitInfo);

        expect(result.success).toBe(true);
        expect(mockHero.influencePoints).toBe(7);
        expect(mockHero.units).toHaveLength(1);
    });

    it('should fail recruit if command limit reached', () => {
        mockHero.units = ['Unit1', 'Unit2']; // Full (limit 2)
        const unitInfo = { name: 'Peasants', cost: 3 };

        const result = manager.recruitUnit(unitInfo);

        expect(result.success).toBe(false);
        expect(mockHero.influencePoints).toBe(10);
    });

    it('should buy card in monastery', () => {
        const cardData = { name: 'Advanced Action', id: 'adv1' };
        const cost = 6;

        const result = manager.buyCard(cardData, cost);

        expect(result.success).toBe(true);
        expect(mockHero.influencePoints).toBe(4);
        expect(mockHero.discard).toHaveLength(1);
        expect(mockHero.discard[0].name).toBe('Advanced Action');
    });

    it('should generate keep options', () => {
        const site = { type: SITE_TYPES.KEEP, getName: () => 'Keep', getIcon: () => '🏰', getColor: () => 'grey', getInfo: () => ({ description: 'Desc' }), conquered: false };
        const hex = {};

        const data = manager.visitSite(hex, site);

        expect(data.options).toHaveLength(1);
        expect(data.options[0].id).toBe('attack');
    });
});
