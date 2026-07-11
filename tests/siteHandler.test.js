import { describe, it, expect, vi } from 'vitest';
import { BaseSiteHandler } from '../js/sites/BaseSiteHandler.js';

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
});
