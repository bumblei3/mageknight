
import { describe, it, expect, beforeEach, afterEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { Card } from '../js/card.js';
import { MockHTMLElement } from './test-mocks.js';

describe('Game Logic & Persistence', () => {
    let game;

    beforeEach(() => {
        // Clear potential state from previous tests
        localStorage.clear();
        document.body.innerHTML = '';

        // Initialize game
        // Note: MageKnightGame constructor calls init() -> initializeSystem() -> startNewGame()
        game = new MageKnightGame();
    });

    afterEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    describe('Level-Up System', () => {
        it('should trigger level-up when fame threshold reached', () => {
            // Mock triggerLevelUp to verify it was called
            let triggeredLevel = null;
            game.triggerLevelUp = (level) => {
                triggeredLevel = level;
            };

            // Initial level is 1. Fame needed for level 2 is usually small.
            // Let's assume gainFame(10) triggers it.
            game.gainFame(20);

            expect(triggeredLevel).toBe(2);
        });

        it('should apply selection from level-up modal', () => {
            const initialSkillCount = game.hero.skills.length;
            const initialHandCount = game.hero.hand.length;
            const initialLevel = game.hero.level;

            const selection = {
                skill: { id: 'test-skill', name: 'Test Skill' },
                card: new Card({ id: 'test-card', name: 'Test Card' })
            };

            game.handleLevelUpSelection(selection);

            expect(game.hero.level).toBe(initialLevel + 1);
            expect(game.hero.skills.length).toBe(initialSkillCount + 1);
            expect(game.hero.skills.find(s => s.id === 'test-skill')).toBeDefined();
            expect(game.hero.hand.length).toBe(initialHandCount + 1);
            expect(game.hero.hand.find(c => c.id === 'test-card')).toBeDefined();
        });
    });

    describe('Persistence (Save/Load)', () => {
        it('should generate a valid game state object', () => {
            const state = game.getGameState();

            expect(state).toBeDefined();
            expect(state.hero).toBe(game.hero);
            expect(state.turn).toBe(game.turnNumber);
            expect(state.enemies).toBe(game.enemies);
        });

        it('should save game to localStorage via SaveManager', () => {
            // We use slot 0
            game.saveGame();

            const savedData = localStorage.getItem('mageknight_saves');
            expect(savedData).not.toBeNull();

            const parsed = JSON.parse(savedData);
            expect(parsed[0]).toBeDefined();
            expect(parsed[0].state.turn).toBe(game.turnNumber);
        });

        it('should load game state and restore hero stats', () => {
            const newHeroState = {
                position: { q: 5, r: 5 },
                deck: [],
                hand: [new Card({ id: 'c1', name: 'Loaded Card' })],
                discard: [],
                wounds: [],
                fame: 100,
                reputation: 5,
                crystals: { red: 3 },
                movementPoints: 10,
                attackPoints: 0,
                blockPoints: 0,
                influencePoints: 0,
                healingPoints: 0
            };

            const mockState = {
                turn: 42,
                hero: newHeroState,
                enemies: [],
                manaSource: game.manaSource,
                terrain: game.terrain,
                selectedHex: null,
                movementMode: false
            };

            game.loadGameState(mockState);

            expect(game.turnNumber).toBe(42);
            expect(game.hero.fame).toBe(100);
            expect(game.hero.hand.length).toBe(1);
            expect(game.hero.hand[0].name).toBe('Loaded Card');
            expect(game.hero.crystals.red).toBe(3);
        });
    });

    describe('Turn & Round Transitions', () => {
        it('should increment turn number on endTurn', () => {
            const initialTurn = game.turnNumber;
            game.endTurn();
            expect(game.turnNumber).toBe(initialTurn + 1);
        });

        it('should trigger end of round when deck is empty', () => {
            // Force empty deck
            game.hero.deck = [];

            // Initial round state
            const initialRound = game.timeManager.round;

            game.endTurn();

            // Round should have ended/incremented
            expect(game.timeManager.round).toBe(initialRound + 1);
        });
    });

    describe('Misc Actions', () => {
        it('should allow resting if not in combat', () => {
            const initialHandSize = game.hero.hand.length;
            // Add a non-wound card
            game.hero.hand.push(new Card({ id: 'rest-card', name: 'Rest Card', type: 'action' }));

            game.rest();

            // Rest usually discards one card
            expect(game.hero.hand.length).toBe(initialHandSize); // Added 1, discarded 1
        });

        it('should prevent resting during combat', () => {
            game.combat = { phase: 'ranged' };
            const initialHandSize = game.hero.hand.length;

            game.rest();

            expect(game.hero.hand.length).toBe(initialHandSize);
        });

        it('should handle exploration costs', () => {
            game.hero.movementPoints = 5;

            // Mock mapManager.explore to succeed
            game.mapManager.explore = () => ({ success: true, message: 'Explored' });

            game.explore();

            expect(game.hero.movementPoints).toBe(3); // Cost is 2
        });

        it('should fail exploration if points insufficient', () => {
            game.hero.movementPoints = 1;

            const initialHandSize = game.hero.hand.length;
            game.explore();

            expect(game.hero.movementPoints).toBe(1); // No change
        });
    });
});
