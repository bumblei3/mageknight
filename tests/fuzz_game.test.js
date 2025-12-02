import { describe, it, expect } from './testRunner.js';
import { MageKnightGame } from '../js/game.js';

describe('Game Fuzzing', () => {
    // Helper to generate random int
    const randomInt = (max) => Math.floor(Math.random() * max);

    it('should survive random input sequences', async () => {
        const game = new MageKnightGame();
        game.init();

        const ACTIONS = [
            'move',
            'playCard',
            'endTurn',
            'clickCanvas',
            'enterMovement',
            'exitMovement'
        ];

        const ITERATIONS = 100;

        for (let i = 0; i < ITERATIONS; i++) {
            const action = ACTIONS[randomInt(ACTIONS.length)];

            try {
                switch (action) {
                    case 'move':
                        // Random coordinates
                        const q = randomInt(10) - 5;
                        const r = randomInt(10) - 5;
                        game.hero.movementPoints = 10; // Give resources
                        game.hero.moveTo(q, r, 1);
                        break;

                    case 'playCard':
                        if (game.hero.hand.length > 0) {
                            const idx = randomInt(game.hero.hand.length);
                            game.hero.playCard(idx);
                        }
                        break;

                    case 'endTurn':
                        game.endTurn();
                        break;

                    case 'clickCanvas':
                        game.handleCanvasClick({
                            clientX: randomInt(800),
                            clientY: randomInt(600)
                        });
                        break;

                    case 'enterMovement':
                        game.enterMovementMode();
                        break;

                    case 'exitMovement':
                        game.exitMovementMode();
                        break;
                }

                // Invariant check: Game should not crash and critical state should be valid
                expect(game.hero).toBeDefined();
                expect(game.hexGrid).toBeDefined();
                expect(game.turnNumber).toBeGreaterThanOrEqual(0);

            } catch (e) {
                console.error(`Fuzz failure at iteration ${i}, action: ${action}`);
                throw e;
            }
        }
    });
});
