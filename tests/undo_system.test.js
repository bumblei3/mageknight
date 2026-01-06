import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setupGlobalMocks, createMockUI, createSpy } from './test-mocks.js';

describe('Undo System', () => {
    let game;
    let actionManager;

    beforeEach(() => {
        setupGlobalMocks(); // Mock window, document, localStorage

        game = new MageKnightGame();

        // Mock UI
        game.ui = createMockUI();
        // Add specific mocks needed for ActionManager
        game.ui.updatePhaseIndicator = createSpy();
        game.ui.showSiteModal = createSpy();
        game.ui.formatEffect = () => 'Effect';
        game.ui.addPlayedCard = createSpy();
        game.ui.showPlayArea = createSpy();
        game.ui.renderManaSource = createSpy();

        // Mock HexGrid (partial)
        game.hexGrid = {
            distance: () => 1,
            getMovementCost: () => 2,
            getScreenPos: () => ({ x: 0, y: 0 }),
            exploreAdjacent: () => [],
            getReachableHexes: () => [],
            highlightHexes: () => { },
            clearSelection: () => { },
            getHex: () => ({ site: null }),
            axialToPixel: () => ({ x: 0, y: 0 })
        };

        // Mock Animator
        game.animator = {
            animateHeroMove: () => Promise.resolve()
        };

        // Mock Sound
        game.sound = {
            cardPlay: () => { },
            cardPlaySideways: () => { },
            error: () => { },
            info: () => { }
        };

        // Mock Stats Manager
        game.statisticsManager = {
            increment: createSpy(),
            loadState: () => { },
            getAll: () => ({ tilesExplored: 0 })
        };

        // Mock Site Manager
        game.siteManager = {
            visitSite: () => ({})
        };

        // Mock Entity Manager
        game.entityManager = {
            createEnemies: () => { }
        };

        // Prepare Hero
        game.hero.initializeDeck();
        game.hero.drawCards(5);
        game.hero.movementPoints = 10;

        actionManager = game.actionManager;

        // Ensure History is empty
        actionManager.history = [];
    });

    it('Should save checkpoint before action', () => {
        expect(actionManager.history.length).toBe(0);
        actionManager.saveCheckpoint();
        expect(actionManager.history.length).toBe(1);

        const checkpoint = actionManager.history[0];
        expect(checkpoint.hero).toBeDefined();
        expect(checkpoint.mana).toBeDefined();
    });

    it('Should undo Movement', async () => {
        const initialQ = 0;
        const initialR = 0;
        const initialMP = 10;

        game.hero.position = { q: initialQ, r: initialR };
        game.hero.movementPoints = initialMP;

        // Set game state to allow move
        game.movementMode = true;
        game.gameState = 'playing';

        await actionManager.moveHero(1, 0);

        expect(game.hero.position.q).toBe(1);
        expect(game.hero.movementPoints).toBe(initialMP - 2);
        expect(actionManager.history.length).toBe(1);

        // Undo
        actionManager.undoLastAction();

        expect(game.hero.position.q).toBe(initialQ);
        expect(game.hero.movementPoints).toBe(initialMP);
        expect(actionManager.history.length).toBe(0);
    });

    it('Should undo Play Card', () => {
        const initialAttack = game.hero.attackPoints;
        const initialHandSize = game.hero.hand.length;

        // Force card at 0 to be attack
        // Override hand[0] for predictability
        game.hero.hand[0] = {
            name: 'Improvised Attack',
            type: 'action',
            color: 'red',
            basicEffect: { attack: 2 },
            getEffect: () => ({ attack: 2 }),
            manaCost: 0,
            isWound: () => false
        };

        const result = actionManager.playCard(0, false, false);
        expect(result).toBeDefined();

        expect(game.hero.attackPoints).toBe(initialAttack + 2);
        expect(game.hero.hand.length).toBe(initialHandSize - 1);

        // Undo
        actionManager.undoLastAction();

        expect(game.hero.attackPoints).toBe(initialAttack);
        expect(game.hero.hand.length).toBe(initialHandSize);
    });

    it('Should undo Take Mana', () => {
        // Setup Mana Source
        game.manaSource.dice = ['gold', 'red', 'blue'];
        game.manaSource.usedDice = new Set();

        // Take Red Die (index 1)
        const mana = actionManager.takeMana(1, 'red');
        expect(mana).toBe('red');
        expect(game.manaSource.usedDice.has(1)).toBeTruthy();
        expect(game.hero.tempMana.includes('red')).toBeTruthy();

        // Undo
        actionManager.undoLastAction();

        expect(game.manaSource.usedDice.has(1)).toBeFalsy();
        expect(game.hero.tempMana.includes('red')).toBeFalsy();
    });

    it('Should clear history on Irreversible Actions (Explore)', () => {
        // Mock explore to return something
        game.hexGrid.exploreAdjacent = () => [{ q: 2, r: 2 }];
        game.gameState = 'playing';
        game.hero.movementPoints = 10;

        actionManager.saveCheckpoint(); // Manual save
        expect(actionManager.history.length).toBe(1);

        actionManager.explore();

        expect(actionManager.history.length).toBe(0);
    });

    it('Should NOT undo during Combat', () => {
        // This test might call window.alert/toast which is mocked
        actionManager.saveCheckpoint();
        game.combat = {}; // In combat

        actionManager.undoLastAction();

        // Should have tried to show error toast and NOT restored state (checked via history)
        // AND cleared history
        expect(actionManager.history.length).toBe(0);
    });
});
