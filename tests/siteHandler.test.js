import { describe, it, expect, vi } from 'vitest';
import { BaseSiteHandler } from '../js/sites/BaseSiteHandler.js';
import { VillageHandler } from '../js/sites/VillageHandler.js';
import { CityHandler } from '../js/sites/CityHandler.js';
import { MonasteryHandler } from '../js/sites/MonasteryHandler.js';

function makeGame(overrides = {}) {
    return {
        hero: {
            influencePoints: 10,
            wounds: [],
            crystals: { red: 0, blue: 0, green: 0, white: 0 },
            healWound: vi.fn(() => true),
            addUnit: vi.fn(() => true),
            getManaInventory: () => [],
            removeMana: vi.fn(),
            discard: [],
            updateStats: vi.fn(),
        },
        addLog: vi.fn(),
        updateStats: vi.fn(),
        ...overrides,
    };
}

describe('BaseSiteHandler', () => {
    let game;
    let handler;

    beforeEach(() => {
        game = makeGame();
        handler = new BaseSiteHandler(game);
    });

    describe('getOptions', () => {
        it('returns empty array by default', () => {
            expect(handler.getOptions({})).toEqual([]);
        });
    });

    describe('healWounds', () => {
        it('heals when enough influence and has wounds', () => {
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 5;
            const r = handler.healWounds(2);
            expect(r.success).toBe(true);
            expect(game.hero.healWound).toHaveBeenCalledWith(false);
            expect(game.hero.influencePoints).toBe(3);
        });

        it('fails without enough influence', () => {
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 1;
            const r = handler.healWounds(2);
            expect(r.success).toBe(false);
            expect(game.hero.healWound).not.toHaveBeenCalled();
        });

        it('fails without wounds', () => {
            game.hero.wounds = [];
            game.hero.influencePoints = 5;
            const r = handler.healWounds(2);
            expect(r.success).toBe(false);
        });

        it('fails when healWound returns false', () => {
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 5;
            game.hero.healWound = vi.fn(() => false);
            const r = handler.healWounds(2);
            expect(r.success).toBe(false);
        });
    });

    describe('recruitUnit', () => {
        it('recruits a known unit type', () => {
            const unitInfo = { type: 'peasants', cost: 4, name: 'Bauern' };
            const r = handler.recruitUnit(unitInfo);
            expect(r.success).toBe(true);
            expect(game.hero.addUnit).toHaveBeenCalled();
            expect(game.hero.influencePoints).toBe(6);
        });

        it('recruits via explicit create()', () => {
            const created = { id: 'x', name: 'Custom' };
            const unitInfo = { type: 'custom', cost: 3, create: () => created };
            const r = handler.recruitUnit(unitInfo);
            expect(r.success).toBe(true);
            expect(game.hero.addUnit).toHaveBeenCalledWith(created);
        });

        it('fails for unknown unit type', () => {
            const unitInfo = { type: 'nonexistent', cost: 3 };
            const r = handler.recruitUnit(unitInfo);
            expect(r.success).toBe(false);
            expect(r.message).toContain('unbekannt');
        });

        it('fails when not enough influence', () => {
            game.hero.influencePoints = 1;
            const unitInfo = { type: 'orc', cost: 4 };
            const r = handler.recruitUnit(unitInfo);
            expect(r.success).toBe(false);
            expect(r.message).toContain('Einfluss');
        });

        it('fails when hero has no space (addUnit false)', () => {
            game.hero.addUnit = vi.fn(() => false);
            const unitInfo = { type: 'peasants', cost: 4 };
            const r = handler.recruitUnit(unitInfo);
            expect(r.success).toBe(false);
            expect(r.message).toContain('Command Limit');
        });
    });

    describe('buyCard', () => {
        it('buys a normal card when enough influence', () => {
            const cardData = { name: 'Strike', type: 'action', color: 'red' };
            const r = handler.buyCard(cardData, 3);
            expect(r.success).toBe(true);
            expect(game.hero.discard).toContainEqual(expect.objectContaining({ name: 'Strike' }));
            expect(game.hero.influencePoints).toBe(7);
        });

        it('fails a normal card without enough influence', () => {
            game.hero.influencePoints = 1;
            const cardData = { name: 'Strike', type: 'action', color: 'red' };
            const r = handler.buyCard(cardData, 3);
            expect(r.success).toBe(false);
        });

        it('buys a spell using a mana token', () => {
            game.hero.getManaInventory = () => ['blue'];
            const cardData = { name: 'Frost', type: 'spell', color: 'blue' };
            const r = handler.buyCard(cardData, 2);
            expect(r.success).toBe(true);
            expect(game.hero.removeMana).toHaveBeenCalledWith('blue');
        });

        it('buys a spell using a crystal', () => {
            game.hero.crystals.blue = 1;
            const cardData = { name: 'Frost', type: 'spell', color: 'blue' };
            const r = handler.buyCard(cardData, 2);
            expect(r.success).toBe(true);
            expect(game.hero.crystals.blue).toBe(0);
        });

        it('fails a spell without mana token or crystal', () => {
            game.hero.getManaInventory = () => [];
            game.hero.crystals = { red: 0, blue: 0, green: 0, white: 0 };
            const cardData = { name: 'Frost', type: 'spell', color: 'blue' };
            const r = handler.buyCard(cardData, 2);
            expect(r.success).toBe(false);
            expect(r.message).toContain('Mana');
        });

        it('fails a spell with enough influence but no mana', () => {
            game.hero.influencePoints = 9;
            game.hero.getManaInventory = () => [];
            game.hero.crystals = { red: 0, blue: 0, green: 0, white: 0 };
            const cardData = { name: 'Frost', type: 'spell', color: 'blue' };
            const r = handler.buyCard(cardData, 2);
            expect(r.success).toBe(false);
        });
    });

    describe('reputation prices', () => {
        it('lowers healing, recruitment, and card prices and shows them', () => {
            game.hero.getReputationModifier = () => 2;
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 1;

            const village = new VillageHandler(game);
            const heal = village.getOptions({}).find((option) => option.id === 'heal');
            expect(heal.label).toBe('Heilen (1 Einfluss / Wunde)');
            const recruit = village.getOptions({}).find((option) => option.id === 'recruit');
            expect(recruit.subItems[0].cost).toBe(village.influenceCost(recruit.subItems[0].data.cost));

            expect(handler.healWounds(3).success).toBe(true);
            expect(game.hero.influencePoints).toBe(0);

            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 2;
            expect(handler.recruitUnit({ type: 'peasants', cost: 4, name: 'Bauern' }).success).toBe(true);
            expect(game.hero.influencePoints).toBe(0);

            game.hero.influencePoints = 4;
            expect(handler.buyCard({ name: 'Strike', type: 'action', color: 'red' }, 6).success).toBe(true);
            expect(game.hero.influencePoints).toBe(0);

            const city = new CityHandler(game);
            const spells = city.getOptions({}).find((option) => option.id === 'city_spells');
            expect(spells.label).toBe('Zauber im Laden (6 Einfluss + Mana)');
            expect(spells.subItems[0].cost).toBe(6);

            const monastery = new MonasteryHandler(game);
            const training = monastery.getOptions({}).find((option) => option.id === 'train');
            expect(training.subItems[0].cost).toBe(4);
        });

        it('raises the price when reputation is poor', () => {
            game.hero.getReputationModifier = () => -2;
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 3;
            expect(handler.healWounds(2).success).toBe(false);

            game.hero.influencePoints = 4;
            expect(handler.healWounds(2).success).toBe(true);
            expect(game.hero.influencePoints).toBe(0);
        });

        it('never charges less than zero', () => {
            game.hero.getReputationModifier = () => 9;
            game.hero.wounds = ['w1'];
            game.hero.influencePoints = 0;
            expect(handler.influenceCost(2)).toBe(0);
            expect(handler.healWounds(2).success).toBe(true);
            expect(game.hero.influencePoints).toBe(0);
        });

        it('does not spend spell mana when influence is short', () => {
            game.hero.getReputationModifier = () => -2;
            game.hero.influencePoints = 2;
            game.hero.getManaInventory = () => ['blue'];
            const result = handler.buyCard({ name: 'Frost', type: 'spell', color: 'blue' }, 2);
            expect(result.success).toBe(false);
            expect(game.hero.removeMana).not.toHaveBeenCalled();
        });
    });
});
