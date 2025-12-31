import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { SiteInteractionManager } from '../js/siteInteraction.js';
import { createMockElement, createSpy } from './test-mocks.js';
import { SITE_TYPES } from '../js/sites.js';

describe('Site Interaction Boost', () => {
    let game;
    let manager;

    beforeEach(() => {
        game = {
            addLog: createSpy('addLog'),
            hero: {
                addItem: createSpy((item) => game.hero.deck.push(item)),
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
                addUnit: createSpy((unit) => { game.hero.units.push(unit); return true; }),
                getManaInventory: createSpy(() => []),
                healWound: createSpy(() => { if (game.hero.wounds.length > 0) game.hero.wounds.pop(); return true; }),
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
            initiateCombat: createSpy(),
            updateStats: createSpy()
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
        expect(game.addLog.calledWith('Einheit Test Unit Instance rekrutiert!', 'success')).toBe(true);
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
        const cardData = { name: 'Fireball', type: 'spell', color: 'red' };
        game.hero.crystals.RED = 1;

        manager.buyCard(cardData, 1);
        expect(game.hero.discard.length).toBe(1);
        expect(game.addLog.calledWith('Karte Fireball gelernt!', 'success')).toBe(true);
    });

    it('should handle healing at Monastery', () => {
        game.hero.wounds = [{}, {}];
        game.hero.influencePoints = 10;

        manager.healWounds(3);
        expect(game.hero.wounds.length).toBe(1);
        expect(game.hero.influencePoints).toBe(7);
    });

    it('should handle attacking sites', () => {
        manager.currentSite = { type: SITE_TYPES.KEEP, name: 'Keep' };
        manager.attackSite();
        expect(game.addLog.calledWith('Kampf gegen Keep gestartet!', 'warning')).toBe(true);
    });
});
