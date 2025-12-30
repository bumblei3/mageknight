import { describe, it, expect } from './testRunner.js';
import { Hero } from '../js/hero.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { Site, SITE_TYPES } from '../js/sites.js';
import { UNIT_TYPES } from '../js/unit.js';

describe('Site Interactions', () => {
    // Mock Game object
    const mockGame = {
        hero: new Hero('TestHero'),
        addLog: () => { },
        initiateCombat: () => { }
    };
    const manager = new SiteInteractionManager(mockGame);

    it('should generate correct options for Village', () => {
        const village = new Site(SITE_TYPES.VILLAGE);
        const hex = { q: 0, r: 0 };
        const data = manager.visitSite(hex, village);

        expect(data.type).toBe(SITE_TYPES.VILLAGE);
        expect(data.options.length).toBeGreaterThan(0);

        // Check for heal and recruit options
        const healOption = data.options.find(o => o.id === 'heal');
        const recruitOption = data.options.find(o => o.id === 'recruit');

        expect(healOption).toBeDefined();
        expect(recruitOption).toBeDefined();
    });

    it('should allow recruiting units if enough influence', () => {
        mockGame.hero.influencePoints = 10;
        mockGame.hero.commandLimit = 1;
        mockGame.hero.units = [];

        const peasants = {
            name: 'Bauern',
            cost: 3,
            type: UNIT_TYPES.PEASANTS
        };

        const result = manager.recruitUnit(peasants);

        expect(result.success).toBe(true);
        expect(mockGame.hero.units.length).toBe(1);
        expect(mockGame.hero.influencePoints).toBe(7); // 10 - 3
    });

    it('should fail recruiting if not enough influence', () => {
        mockGame.hero.influencePoints = 1;
        mockGame.hero.units = [];

        const peasants = {
            name: 'Bauern',
            cost: 3,
            type: UNIT_TYPES.PEASANTS
        };

        const result = manager.recruitUnit(peasants);

        expect(result.success).toBe(false);
        expect(mockGame.hero.units.length).toBe(0);
    });

    it('should fail recruiting if command limit reached', () => {
        mockGame.hero.influencePoints = 10;
        mockGame.hero.commandLimit = 0; // Full
        mockGame.hero.units = [];

        const peasants = {
            name: 'Bauern',
            cost: 3,
            type: UNIT_TYPES.PEASANTS
        };

        const result = manager.recruitUnit(peasants);

        expect(result.success).toBe(false);
    });

    it('should allow healing wounds', () => {
        mockGame.hero.influencePoints = 5;
        mockGame.hero.takeWound(); // Adds wound to hand and wounds list

        expect(mockGame.hero.wounds.length).toBe(1);

        const result = manager.healWounds(3); // Cost 3

        expect(result.success).toBe(true);
        expect(mockGame.hero.wounds.length).toBe(0);
        expect(mockGame.hero.influencePoints).toBe(2); // 5 - 3
    });

    it('should fail healing if no wounds', () => {
        mockGame.hero.wounds = [];
        mockGame.hero.influencePoints = 5;

        const result = manager.healWounds(3);

        expect(result.success).toBe(false);
    });
});
