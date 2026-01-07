import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CityHandler } from '../../js/sites/CityHandler.js';
import { SITE_TYPES } from '../../js/sites.js';

describe('CityHandler', () => {
    let handler;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                wounds: [],
                influencePoints: 10,
                crystals: { RED: 2, BLUE: 1, GREEN: 0, WHITE: 0 },
                discard: [],
                units: [],
                addUnit: vi.fn().mockReturnValue(true),
                healWound: vi.fn().mockReturnValue(true),
                removeMana: vi.fn(),
                getManaInventory: vi.fn().mockReturnValue(['red', 'blue'])
            },
            addLog: vi.fn(),
            updateStats: vi.fn(),
            combatOrchestrator: {
                initiateCombat: vi.fn()
            }
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
            mockGame.hero.wounds = [{ id: 'wound1' }];
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const healOption = options.find(o => o.id === 'heal');

            expect(healOption.enabled).toBe(true);
        });

        it('should return recruit elite option with units', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const recruitOption = options.find(o => o.id === 'recruit_elite');

            expect(recruitOption).toBeDefined();
            expect(recruitOption.subItems).toBeDefined();
        });

        it('should return spells option', () => {
            const options = handler.getOptions({ type: SITE_TYPES.CITY });
            const spellOption = options.find(o => o.id === 'city_spells');

            expect(spellOption).toBeDefined();
            expect(spellOption.subItems.length).toBeGreaterThan(0);
        });
    });

    describe('healWounds (inherited)', () => {
        it('should heal wound when hero has enough influence', () => {
            mockGame.hero.wounds = [{ id: 'wound1' }];
            mockGame.hero.influencePoints = 10;

            const result = handler.healWounds(4);

            expect(result.success).toBe(true);
            expect(mockGame.hero.healWound).toHaveBeenCalled();
            expect(mockGame.hero.influencePoints).toBe(6);
            expect(mockGame.addLog).toHaveBeenCalledWith('Wunde geheilt!', 'success');
        });

        it('should fail when not enough influence', () => {
            mockGame.hero.wounds = [{ id: 'wound1' }];
            mockGame.hero.influencePoints = 2;

            const result = handler.healWounds(4);

            expect(result.success).toBe(false);
        });

        it('should fail when no wounds', () => {
            mockGame.hero.wounds = [];
            mockGame.hero.influencePoints = 10;

            const result = handler.healWounds(4);

            expect(result.success).toBe(false);
        });
    });

    describe('recruitUnit (inherited)', () => {
        it('should recruit unit when hero has enough influence', () => {
            const unitInfo = { type: 'peasant', cost: 5, create: () => ({ name: 'Peasant', id: 'p1' }) };

            const result = handler.recruitUnit(unitInfo);

            expect(result.success).toBe(true);
            expect(mockGame.hero.addUnit).toHaveBeenCalled();
            expect(mockGame.hero.influencePoints).toBe(5);
        });

        it('should fail when not enough influence', () => {
            mockGame.hero.influencePoints = 2;
            const unitInfo = { type: 'peasant', cost: 5 };

            const result = handler.recruitUnit(unitInfo);

            expect(result.success).toBe(false);
        });
    });

    describe('buyCard (inherited)', () => {
        it('should buy non-spell card when hero has enough influence', () => {
            const cardData = { name: 'Power Card', type: 'action', color: 'red' };

            const result = handler.buyCard(cardData, 8);

            expect(result.success).toBe(true);
            expect(mockGame.hero.influencePoints).toBe(2);
            expect(mockGame.hero.discard.length).toBe(1);
        });

        it('should buy spell and consume mana token', () => {
            const cardData = { name: 'Fireball', type: 'spell', color: 'red' };

            const result = handler.buyCard(cardData, 8);

            expect(result.success).toBe(true);
            expect(mockGame.hero.removeMana).toHaveBeenCalledWith('red');
        });

        it('should fail spell purchase when no mana available', () => {
            mockGame.hero.getManaInventory = vi.fn().mockReturnValue([]);
            mockGame.hero.crystals = { RED: 0, BLUE: 0, GREEN: 0, WHITE: 0 };
            const cardData = { name: 'Fireball', type: 'spell', color: 'red' };

            const result = handler.buyCard(cardData, 8);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Mana');
        });
    });
});
