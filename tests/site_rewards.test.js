
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { MageKnightGame } from '../js/game.js';
import { Site, SITE_TYPES } from '../js/sites.js';
import { createSpy } from './test-mocks.js';

describe('Site Rewards interactions', () => {
    let game;
    let manager;

    beforeEach(() => {
        game = new MageKnightGame();
        manager = new SiteInteractionManager(game);

        // Mock game state for testing
        game.hero.influencePoints = 20;
        game.hero.wounds = [];
        game.hero.addUnit = createSpy(() => true);
        game.hero.healWound = createSpy(() => true);
        game.hero.removeMana = createSpy();
        // game.hero.getManaInventory = () => ['red']; // Mock managed below
    });

    it('should offer Recruitment at Conquered Keeps', () => {
        const keep = new Site(SITE_TYPES.KEEP);
        keep.conquered = true; // Assume conquered

        const options = manager.visitSite({ q: 0, r: 0 }, keep).options;
        const recruitOption = options.find(o => o.id === 'recruit');

        expect(recruitOption).toBeDefined();
        expect(recruitOption.subItems.length).toBeGreaterThan(0);
        expect(recruitOption.subItems[0].type).toBe('unit');
    });

    it('should allow buying Spells at CONQUERED Mage Tower with Mana + Influence', () => {
        const tower = new Site(SITE_TYPES.MAGE_TOWER);
        tower.conquered = true; // Must be conquered first
        const options = manager.visitSite({ q: 0, r: 0 }, tower).options;
        const spellOption = options.find(o => o.id === 'spells');

        expect(spellOption).toBeDefined();

        // Setup Hero with Mana
        game.hero.manaTokens = ['red'];
        game.hero.crystals = { red: 0, blue: 0, green: 0, white: 0 };
        game.hero.getManaInventory = () => ['red'];

        // Find a red spell
        const fireSpell = spellOption.subItems.find(i => i.data.color === 'red');
        expect(fireSpell).toBeDefined();

        const result = fireSpell.action();
        expect(result.success).toBe(true);
        expect(game.hero.discard.length).toBe(1); // Spell added to discard
        expect(game.hero.influencePoints).toBe(20 - 7); // Cost deducted
        expect(game.hero.removeMana.callCount).toBe(1); // Mana used
    });

    it('should offer attack option at UNCONQUERED Mage Tower', () => {
        const tower = new Site(SITE_TYPES.MAGE_TOWER);
        tower.conquered = false;
        const options = manager.visitSite({ q: 0, r: 0 }, tower).options;
        const attackOption = options.find(o => o.id === 'attack');

        expect(attackOption).toBeDefined();
        expect(attackOption.enabled).toBe(true);
    });

    it('should FAIL buying Spells if missing Mana', () => {
        const tower = new Site(SITE_TYPES.MAGE_TOWER);
        tower.conquered = true; // Must be conquered
        const options = manager.visitSite({ q: 0, r: 0 }, tower).options;
        const spellOption = options.find(o => o.id === 'spells');

        // Setup Hero WITHOUT Mana
        game.hero.manaTokens = [];
        game.hero.crystals = { red: 0, blue: 0, green: 0, white: 0 };
        game.hero.getManaInventory = () => [];

        const fireSpell = spellOption.subItems.find(i => i.data.color === 'red');
        const result = fireSpell.action();

        expect(result.success).toBe(false);
        expect(game.hero.influencePoints).toBe(20); // No cost deducted
    });

    it('should allow healing at Monastery', () => {
        const monastery = new Site(SITE_TYPES.MONASTERY);
        game.hero.wounds = [1]; // Has wound

        const options = manager.visitSite({ q: 0, r: 0 }, monastery).options;
        const healOption = options.find(o => o.id === 'heal');

        expect(healOption.enabled).toBe(true);

        const result = healOption.action();
        expect(result.success).toBe(true);
        expect(game.hero.healWound.callCount).toBe(1);
        expect(game.hero.influencePoints).toBe(20 - 2); // Cost 2 for Monastery
    });
});
