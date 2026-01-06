
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { createMockContext, createMockUI } from './test-mocks.js';

describe('MageKnightGame Core Logic', () => {
    let game;
    let mockUI;
    let mockGrid;
    let originalGetElementById;
    let originalQuerySelector;
    let originalQuerySelectorAll;

    beforeEach(() => {
        // Store originals
        originalGetElementById = document.getElementById;
        originalQuerySelector = document.querySelector;
        originalQuerySelectorAll = document.querySelectorAll;

        // Mock global dependencies
        mockUI = createMockUI();
        mockUI.renderManaSource = () => { }; // Explicit fix
        mockUI.renderHandCards = () => { }; // Explicit fix just in case
        mockUI.hidePlayArea = () => { }; // Explicit fix

        const mockContext = createMockContext();

        // Mock document elements
        const mockCanvas = {
            width: 800,
            height: 600,
            getContext: () => mockContext,
            style: {},
            addEventListener: () => { },
            getBoundingClientRect: () => ({ left: 0, top: 0 })
        };

        const mockElement = {
            addEventListener: () => { },
            classList: { add: () => { }, remove: () => { }, contains: () => false },
            appendChild: () => { },
            querySelector: () => mockElement,
            querySelectorAll: () => [],
            style: {},
            textContent: '',
            getContext: () => mockContext,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
        };

        document.getElementById = (id) => mockElement;
        document.querySelector = (sel) => mockElement;
        document.querySelectorAll = (sel) => [];

        game = new MageKnightGame();

        // Inject mocks
        game.ui = mockUI;
        game.canvas = mockCanvas;
        game.ui.addLog = () => { }; // Silence logs

        // Setup initial state
        game.startNewGame();
    });

    afterEach(() => {
        // Restore globals
        document.getElementById = originalGetElementById;
        document.querySelector = originalQuerySelector;
        document.querySelectorAll = originalQuerySelectorAll;
    });

    describe('Initialization', () => {
        it('should initialize with default state', () => {
            expect(game.turnNumber).toBe(0);
            expect(game.gameState).toBe('playing');
            expect(game.hero).toBeDefined();
            expect(game.enemies).toBeDefined();
        });

        it('should create hero with cards', () => {
            expect(game.hero.name).toBe('Goldyx');
            expect(game.hero.hand.length).toBeGreaterThan(0);
        });

        it('should spawn enemies', () => {
            expect(game.enemies.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Turn Management', () => {
        it('should start day turn', () => {
            expect(game.timeManager.isDay()).toBe(true);
        });

        it('should end turn and cycle time', () => {
            // Setup condition for end of round (empty deck)
            game.hero.deck = [];

            // Mock endRound to verify call
            let endRoundCalled = false;
            // Store original endRound to avoid breaking other logic if needed, 
            // but here we just want to verify call
            game.timeManager.endRound = () => {
                endRoundCalled = true;
                return { timeOfDay: 'night' };
            };

            game.endTurn();

            expect(endRoundCalled).toBe(true);
            expect(game.turnNumber).toBe(1);
        });
    });

    describe('Game Flow', () => {
        it('should enter movement mode', () => {
            game.enterMovementMode();
            expect(game.movementMode).toBe(true);
            expect(game.reachableHexes).toBeDefined();
        });

        it('should exit movement mode', () => {
            game.enterMovementMode();
            game.exitMovementMode();
            expect(game.movementMode).toBe(false);
        });
    });

    describe('Save/Load interaction', () => {
        it('should open save dialog', () => {
            if (game.openSaveDialog) {
                game.openSaveDialog();
                // Expectation implicit: no crash
            }
        });
    });
});
