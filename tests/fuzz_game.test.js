import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MageKnightGame } from '../js/game.js';
import { setLanguage } from '../js/i18n/index.js';
import { store } from '../js/game/Store.js';

describe('Game Fuzzing', () => {
    // Helper to generate random int
    const randomInt = (max) => Math.floor(Math.random() * max);

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
            <div id="play-area" style="display: none;">
                <div id="played-cards"></div>
            </div>
            <div id="mana-source"></div>
            <div id="fame-value">0</div>
            <div id="reputation-value">0</div>
            <div id="hero-armor">0</div>
            <div id="hero-handlimit">0</div>
            <div id="hero-wounds">0</div>
            <div id="hero-name">Hero</div>
            <div id="movement-points">0</div>
            <div id="skill-list"></div>
            <div id="healing-points">0</div>
            <div id="mana-bank"></div>
            <div id="particle-layer" class="canvas-layer"></div>
            <div class="board-wrapper"></div>
            <div id="end-turn-btn"></div>
            <div id="rest-btn"></div>
            <div id="explore-btn"></div>
            <div id="save-btn"></div>
            <div id="load-btn"></div>
        `;
    });

    let game;

    afterEach(() => {
        if (game && game.destroy) game.destroy();
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('should survive random input sequences with resets', { timeout: 30000 }, async () => {
        game = new MageKnightGame();

        game.init();

        const ACTIONS = [
            'move',
            'playCard',
            'endTurn',
            'clickCanvas',
            'enterMovement',
            'exitMovement',
            'rest',
            'explore',
            'resetGame' // New action
        ];

        const ITERATIONS = 300;

        console.log(`    Running ${ITERATIONS} fuzz iterations with resets...`);

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
                        game.interactionController.handleCanvasClick({
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
                            game.phaseManager.rest();
                        }
                        break;

                    case 'explore':
                        // Attempt exploration
                        if (!game.combat) {
                            game.actionManager.explore();
                        }
                        break;

                    case 'enterCombat':
                        // Find an enemy to fight if not in combat
                        if (!game.combat && game.enemies.length > 0) {
                            const enemy = game.enemies[randomInt(game.enemies.length)];
                            game.combatOrchestrator.initiateCombat(enemy);
                        }
                        break;

                    case 'resetGame':
                        // occasionally reset
                        if (randomInt(100) < 5) { // 5% chance
                            // Destroy old usage
                            if (game.destroy) game.destroy();
                            game = new MageKnightGame();
                            game.init();
                        }
                        break;
                }

                // --- Invariant Checks ---

                // 1. Critical Objects exist
                expect(game.hero).toBeDefined();
                expect(game.hexGrid).toBeDefined();

                // 2. Resources are non-negative
                if (game.hero.movementPoints < 0) throw new Error('Negative movementPoints');
                if (game.hero.blockPoints < 0) throw new Error('Negative blockPoints');
                if (game.hero.attackPoints < 0) throw new Error('Negative attackPoints');
                if (game.hero.influencePoints < 0) throw new Error('Negative influencePoints');
                if (game.hero.healingPoints < 0) throw new Error('Negative healingPoints');

                // 3. Hand consistency
                if (game.hero.hand.some(c => !c)) {
                    throw new Error('Undefined card found in hand');
                }

                // 4. Turn number sanity
                expect(game.turnNumber).toBeGreaterThanOrEqual(0);

            } catch (e) {
                console.error(`Fuzz failure at iteration ${i}, action: ${action}`);
                console.error(`Game State: Turn ${game.turnNumber}, Phase ${game.phase}, Hand Size ${game.hero.hand.length}`);
                if (game.hero && game.hero.position) {
                    console.error(`Hero Pos: (${game.hero.position.q}, ${game.hero.position.r})`);
                }
                throw e;
            }
        }
    });
});
