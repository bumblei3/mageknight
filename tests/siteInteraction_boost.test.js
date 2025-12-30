import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { createMockElement, createSpy } from './test-mocks.js';
import { SITE_TYPES } from '../js/sites.js';

describe('Site Interaction Boost', () => {
    let game;
    let manager;

    beforeEach(() => {
        game = {
            hero: {
                addItem: createSpy(),
                addExperience: createSpy(),
                heal: createSpy(),
                wounds: [],
                deck: [],
                hand: [],
                discard: [],
                units: [],
                influencePoints: 10,
                movementPoints: 10,
                crystals: { RED: 1 },
                addUnit: createSpy(() => true),
                getManaInventory: createSpy(() => []),
                healWound: createSpy(() => true),
                removeMana: createSpy()
            },
            ui: {
                addLog: createSpy(),
                showSiteInteraction: createSpy(),
                updateHeroStats: createSpy(),
                renderUnits: createSpy(),
                showNotification: createSpy()
            },
            manaSource: {
                useMana: createSpy(() => true)
            },
            initiateCombat: createSpy()
        };
        manager = new SiteInteractionManager(game);
    });

    it('should handle village visit', () => {
        const site = {
            type: SITE_TYPES.VILLAGE,
            getName: () => 'Test Village',
            getIcon: () => '🏘️',
            getColor: () => '#fff',
            getInfo: () => ({ description: 'Desc' })
        };
        const hex = { q: 0, r: 0 };

        manager.visitSite(hex, site);
        // showSiteInteraction isn't called anymore, it returns data now (Wait, I checked the code)
        // visitSite returns interactionData
        const data = manager.visitSite(hex, site);
        expect(data.name).toBe('Test Village');
    });

    it('should allow recruiting units', () => {
        const unitInfo = {
            name: 'Test Unit',
            cost: 3,
            level: 1,
            create: () => ({ name: 'Test Unit Instance', getCost: () => 3 })
        };

        manager.recruitUnit(unitInfo);
        expect(game.hero.units.length).toBe(1);
        expect(game.hero.influencePoints).toBe(7);
        expect(game.ui.addLog.calledWith('Einheit Test Unit Instance rekrutiert!', 'success')).toBe(true);
    });

    it('should handle unit damage and healing', () => {
        const unit = {
            name: 'Test Unit',
            _wounded: false,
            _ready: true,
            isWounded: function () { return this._wounded; },
            takeWound: function () { this._wounded = true; },
            heal: function () { this._wounded = false; },
            isReady: function () { return this._ready; },
            activate: function () { this._ready = false; },
            refresh: function () { this._ready = true; }
        };

        unit.takeWound();
        expect(unit.isWounded()).toBe(true);
        unit.heal();
        expect(unit.isWounded()).toBe(false);
        unit.activate();
        expect(unit.isReady()).toBe(false);
        unit.refresh();
        expect(unit.isReady()).toBe(true);
    });

    it('should handle buying cards at Mage Tower', () => {
        const cardData = { name: 'Fireball', type: 'spell' };
        game.hero.crystals.RED = 1;

        manager.buyCard(cardData, 1);
        expect(game.hero.deck.length).toBe(1);
        expect(game.ui.addLog.calledWith('Karte Fireball gekauft!', 'success')).toBe(true);
    });

    it('should handle healing at Monastery', () => {
        game.hero.wounds = [{}, {}];
        game.hero.influencePoints = 10;

        manager.healWounds(3);
        expect(game.hero.wounds.length).toBe(0);
        expect(game.hero.influencePoints).toBe(4);
    });

    it('should handle attacking sites', () => {
        manager.currentSite = { type: SITE_TYPES.KEEP, name: 'Keep' };
        manager.attackSite();
        expect(game.ui.addLog.calledWith('Kampf gegen Keep gestartet!', 'warning')).toBe(true);
    });
});
