import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CityHandler } from '../../js/sites/CityHandler.js';
import { SITE_TYPES } from '../../js/sites.js';
import * as unitModule from '../../js/unit.js';

describe('CityHandler', () => {
    let handler;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                wounds: [],
                units: [],
                discard: [],
                influencePoints: 0,
                commandLimit: 1,
                healWound: vi.fn().mockReturnValue(true),
                addUnit: vi.fn().mockReturnValue(true),
                removeMana: vi.fn(),
                getManaInventory: vi.fn().mockReturnValue([]),
                crystals: { RED: 0, BLUE: 0, GREEN: 0, WHITE: 0, GOLD: 0, red: 0, blue: 0, green: 0, white: 0, gold: 0 }
            },
            addLog: vi.fn(),
            updateStats: vi.fn()
        };
        handler = new CityHandler(mockGame);
    });

    describe('getOptions', () => {
        it('should return heal option disabled when no wounds', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const healOption = options.find(o => o.id === 'heal');

            expect(healOption).toBeDefined();
            expect(healOption.enabled).toBe(false);
        });

        it('should return heal option enabled when hero has wounds', () => {
            mockGame.hero.wounds = [{ id: 'w1' }];
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const healOption = options.find(o => o.id === 'heal');

            expect(healOption.enabled).toBe(true);
        });

        it('should return recruit elite option with units', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const recruitOption = options.find(o => o.id === 'recruit_elite');

            expect(recruitOption).toBeDefined();
            expect(recruitOption.subItems).toBeDefined();
            expect(recruitOption.subItems.length).toBeGreaterThan(0);
        });

        it('should handle empty units list', () => {
            const spy = vi.spyOn(unitModule, 'getUnitsForLocation').mockReturnValue([]);

            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const recruitOption = options.find(o => o.id === 'recruit_elite');

            expect(recruitOption).toBeDefined();
            expect(recruitOption.subItems).toBeDefined();
            expect(recruitOption.subItems.length).toBe(1);
            expect(recruitOption.subItems[0].label).toBe('Keine Einheiten verfügbar');
            expect(recruitOption.subItems[0].enabled).toBe(false);

            spy.mockRestore();
        });

        it('should return spells option', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const spellsOption = options.find(o => o.id === 'city_spells');

            expect(spellsOption).toBeDefined();
            expect(spellsOption.subItems.length).toBeGreaterThan(0);
            expect(spellsOption.subItems[0].cost).toBeDefined();
        });
    });

    describe('healWounds (inherited)', () => {
        it('should heal wound when hero has enough influence', () => {
            mockGame.hero.wounds = [{ id: 'w1' }];
            mockGame.hero.influencePoints = 5;

            const result = handler.healWounds(4);
            expect(result.success).toBe(true);
            expect(mockGame.hero.healWound).toHaveBeenCalledWith(false);
        });

        it('should fail when not enough influence', () => {
            mockGame.hero.wounds = [{ id: 'w1' }];
            mockGame.hero.influencePoints = 2;

            const result = handler.healWounds(4);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Einfluss');
        });

        it('should fail when no wounds', () => {
            mockGame.hero.wounds = [];
            const result = handler.healWounds(4);
            expect(result.success).toBe(false);
        });
    });

    describe('recruitUnit (inherited)', () => {
        it('should recruit unit when hero has enough influence', () => {
            mockGame.hero.influencePoints = 10;
            const unit = { id: 'u1', name: 'Test Unit', cost: 5, type: 'village_guard', create: () => ({ name: 'Test Unit' }) };

            const result = handler.recruitUnit(unit);
            expect(result.success).toBe(true);
            expect(mockGame.hero.addUnit).toHaveBeenCalled();
        });

        it('should fail when not enough influence', () => {
            mockGame.hero.influencePoints = 3;
            const unit = { id: 'u1', cost: 5 };

            const result = handler.recruitUnit(unit);
            expect(result.success).toBe(false);
        });
    });

    describe('buyCard (inherited)', () => {
        it('should buy non-spell card when hero has enough influence', () => {
            mockGame.hero.influencePoints = 10;
            const card = { id: 'c1', type: 'advanced', name: 'Test Card' };

            const result = handler.buyCard(card, 5);
            expect(result.success).toBe(true);
            expect(mockGame.hero.discard.length).toBeGreaterThan(0);
        });

        it('should buy spell and consume mana token', () => {
            mockGame.hero.influencePoints = 10;
            mockGame.hero.getManaInventory.mockReturnValue(['red']);
            const card = { id: 'c1', type: 'spell', color: 'red', name: 'Fireball' };

            const result = handler.buyCard(card, 5);
            expect(result.success).toBe(true);
            expect(mockGame.hero.removeMana).toHaveBeenCalledWith('red');
        });

        it('should fail spell purchase when no mana available', () => {
            mockGame.hero.influencePoints = 10;
            mockGame.hero.getManaInventory.mockReturnValue([]);
            const card = { id: 'c1', type: 'spell', color: 'red', name: 'Fireball' };

            const result = handler.buyCard(card, 5);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Mana');
        });
    });

    describe('Action Invocation from getOptions', () => {
        it('should call healWounds from option action', () => {
            mockGame.hero.wounds = [{ id: 'w1' }];
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const healOption = options.find(o => o.id === 'heal');

            const spy = vi.spyOn(handler, 'healWounds').mockReturnValue({ success: true });
            healOption.action();
            expect(spy).toHaveBeenCalledWith(4);
            spy.mockRestore();
        });

        it('should call recruitUnit from option action', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const recruitOption = options.find(o => o.id === 'recruit_elite');
            const unitItem = recruitOption.subItems[0];

            if (unitItem.action) {
                const spy = vi.spyOn(handler, 'recruitUnit').mockReturnValue({ success: true });
                unitItem.action();
                // In CityHandler.js: action: () => this.recruitUnit(u)
                expect(spy).toHaveBeenCalledWith(unitItem.data);
                spy.mockRestore();
            }
        });

        it('should call buyCard from option action', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const spellsOption = options.find(o => o.id === 'city_spells');
            const spellItem = spellsOption.subItems[0];

            if (spellItem.action) {
                const spy = vi.spyOn(handler, 'buyCard').mockReturnValue({ success: true });
                spellItem.action();
                // In CityHandler.js: action: () => this.buyCard(c, 8)
                expect(spy).toHaveBeenCalledWith(spellItem.data, 8);
                spy.mockRestore();
            }
        });
    });
});
