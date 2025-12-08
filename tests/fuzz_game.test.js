import { describe, it, expect, beforeEach } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';
import { createMockDocument } from './test-mocks.js';

describe('Game Fuzzing', () => {
    // Helper to generate random int
    const randomInt = (max) => Math.floor(Math.random() * max);

    beforeEach(() => {
        // Ensure global document exists
        if (!global.document) {
            global.document = createMockDocument();
        }

        // Ensure querySelector returns something usable for game init
        // The game looks for .board-wrapper to append particle canvas
        const originalQuerySelector = global.document.querySelector;
        global.document.querySelector = (selector) => {
            if (selector === '.board-wrapper') {
                return {
                    appendChild: () => { },
                    style: {},
                    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
                };
            }
            // Fallback to original or default mock
            return originalQuerySelector ? originalQuerySelector(selector) : { appendChild: () => { }, style: {} };
        };
    });

    it('should survive random input sequences', async () => {
        const game = new MageKnightGame();
        // Mock UI elements that might be accessed
        if (!document.getElementById('end-turn-btn')) {
            ['end-turn-btn', 'rest-btn', 'explore-btn', 'save-btn', 'load-btn'].forEach(id => {
                const btn = document.createElement('button');
                btn.id = id;
                document.body.appendChild(btn);
            });
        }

        game.init();

        const ACTIONS = [
            'move',
            'playCard',
            'endTurn',
            'clickCanvas',
            'enterMovement',
            'exitMovement',
            'rest',
            'explore'
        ];

        const ITERATIONS = 200; // Increased iterations

        console.log(`    Running ${ITERATIONS} fuzz iterations...`);

        for (let i = 0; i < ITERATIONS; i++) {
            const action = ACTIONS[randomInt(ACTIONS.length)];

            try {
                switch (action) {
                    case 'move':
                        // Random coordinates within reasonable range
                        const q = randomInt(10) - 5;
                        const r = randomInt(10) - 5;
                        game.hero.movementPoints = 10; // Ensure resources
                        game.hero.moveTo(q, r, 1);
                        break;

                    case 'playCard':
                        if (game.hero.hand.length > 0) {
                            const idx = randomInt(game.hero.hand.length);
                            // Avoid playing wound cards which throws warning/error in some contexts or does nothing
                            if (game.hero.hand[idx].type !== 'wound') {
                                game.hero.playCard(idx);
                            }
                        }
                        break;

                    case 'endTurn':
                        game.endTurn();
                        break;

                    case 'clickCanvas':
                        game.handleCanvasClick({
                            clientX: randomInt(800),
                            clientY: randomInt(600),
                            preventDefault: () => { }
                        });
                        break;

                    case 'enterMovement':
                        game.enterMovementMode();
                        break;

                    case 'exitMovement':
                        game.exitMovementMode();
                        break;

                    case 'rest':
                        // Basic rest action if not in combat
                        if (!game.combat) {
                            game.rest();
                        }
                        break;

                    case 'explore':
                        // Attempt exploration
                        if (!game.combat) {
                            game.explore();
                        }
                        break;
                }

                // --- Invariant Checks ---

                // 1. Critical Objects exist
                expect(game.hero).toBeDefined();
                expect(game.hexGrid).toBeDefined();

                // 2. Resources are non-negative (soft check, logic might allow temp dips but usually shouldn't)
                if (game.hero.movementPoints < 0) {
                    // movementPoints might be cleared to 0, but technically shouldn't be negative unless logic error
                    throw new Error('Negative movement points detected');
                }

                // 3. Hand consistency
                if (game.hero.hand.some(c => !c)) {
                    throw new Error('Undefined card found in hand');
                }

                // 4. Turn number sanity
                expect(game.turnNumber).toBeGreaterThanOrEqual(0);

            } catch (e) {
                console.error(`Fuzz failure at iteration ${i}, action: ${action}`);
                console.error(`Game State: Turn ${game.turnNumber}, Phase ${game.phase}, Hand Size ${game.hero.hand.length}`);
                throw e;
            }
        }
    });
});
