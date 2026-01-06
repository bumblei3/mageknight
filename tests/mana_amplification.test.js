import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks, createMockUI, createSpy } from './test-mocks.js';

describe('Mana Amplification', () => {
    let game;
    let actionManager;

    beforeEach(() => {
        setupGlobalMocks();
        game = new MageKnightGame();

        // Mock UI
        game.ui = createMockUI();
        game.ui.formatEffect = () => 'Effect';

        // Mock HexGrid
        game.hexGrid = {
            exploreAdjacent: () => [],
            getHex: () => ({}),
            clearSelection: () => { },
            getReachableHexes: () => [],
            highlightHexes: () => { }
        };

        // Mock Sound
        game.sound = { cardPlay: () => { }, error: () => { } };

        // Mock ActionManager
        actionManager = game.actionManager;

        // Setup Hero with a card
        game.hero.initializeDeck();
        game.hero.drawCards(5);

        // Put a test card in hand
        game.hero.hand = [{
            name: 'Test Card',
            color: 'blue',
            basicEffect: { movement: 2 },
            strongEffect: { movement: 4 },
            manaCost: 0, // Not used directly in logic but good for mock
            getEffect: (strong) => strong ? { movement: 4 } : { movement: 2 },
            isWound: () => false
        }];
    });

    it('Should play basic effect without consuming mana', () => {
        const initialMana = game.hero.tempMana.length;
        const initialMoves = game.hero.movementPoints;

        const result = game.hero.playCard(0, false, false);

        expect(result).toBeDefined();
        expect(result.usedStrong).toBe(false);
        expect(game.hero.movementPoints).toBe(initialMoves + 2);
        expect(game.hero.tempMana.length).toBe(initialMana);
    });

    it('Should play strong effect and consume mana', () => {
        // Give hero Blue mana
        game.hero.tempMana.push('blue');

        const initialMoves = game.hero.movementPoints;

        const result = game.hero.playCard(0, true, false); // useStrong = true, isNight = false

        expect(result).toBeDefined();
        expect(result.usedStrong).toBe(true);
        expect(game.hero.movementPoints).toBe(initialMoves + 4);
        expect(game.hero.tempMana.includes('blue')).toBe(false); // Mana consumed
    });

    it('Should fail to play strong effect if insufficient mana', () => {
        // Hero has no mana
        game.hero.tempMana = [];

        const result = game.hero.playCard(0, true, false);

        expect(result).toBeNull(); // Should return null on failure
        // Card should still be in hand
        expect(game.hero.hand.length).toBe(1);
    });

    it('Should use Gold mana for strong effect during Day', () => {
        game.hero.tempMana.push('gold');

        const result = game.hero.playCard(0, true, false); // isNight = false

        expect(result).toBeDefined();
        expect(result.usedStrong).toBe(true);
        expect(game.hero.tempMana.length).toBe(0); // Gold consumed
    });

    it('Should NOT use Gold mana for strong effect during Night', () => {
        game.hero.tempMana.push('gold');

        const result = game.hero.playCard(0, true, true); // isNight = true

        expect(result).toBeNull(); // Fail
    });

    it('Should Undo strong play and restore mana', () => {
        game.hero.tempMana.push('blue');
        game.actionManager.saveCheckpoint();

        // Play Strong via Action Manager (simulating InteractionController flow)
        game.actionManager.playCard(0, true, false);

        expect(game.hero.movementPoints).toBe(4);
        expect(game.hero.tempMana.length).toBe(0);

        // Undo
        game.actionManager.undoLastAction();

        expect(game.hero.movementPoints).toBe(0);
        expect(game.hero.tempMana.includes('blue')).toBe(true);
    });
});
