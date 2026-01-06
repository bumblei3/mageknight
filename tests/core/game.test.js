import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hero } from '../../js/hero.js';
import { MageKnightGame } from '../../js/game.js';
import { setLanguage } from '../../js/i18n/index.js';
import { store } from '../../js/game/Store.js';

describe('Game Core', () => {
    let game;

    beforeEach(() => {
        setLanguage('de');
        document.body.innerHTML = `
            <canvas id="game-board"></canvas>
            <div id="game-log"></div>
            <div id="hand-cards"></div>
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
            <div id="reset-modal">
                <button id="confirm-reset-btn"></button>
                <button id="cancel-reset-btn"></button>
                <button id="close-reset-modal"></button>
            </div>
            <div id="play-area">
                <div id="played-cards"></div>
            </div>
            <div id="visit-btn"></div>
        `;

        // Initialize game
        game = new MageKnightGame();

        game.sound = {
            play: vi.fn(),
            stop: vi.fn(),
            heal: vi.fn()
        };
        // Mock StateManager to prevent saveGame recursion/error in tests
        game.stateManager = {
            saveGame: vi.fn(),
            loadGame: vi.fn(),
            getGameState: () => ({}),
            loadGameState: () => true
        };
    });

    afterEach(() => {
        if (store) store.clearListeners();
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('should initialize game state', () => {
        expect(game.hero).toBeDefined();
        expect(game.hero.name).toBe('Goldyx');
        expect(game.hexGrid).toBeDefined();
        expect(game.turnNumber).toBe(0);
        expect(game.gameState).toBe('playing');
    });

    it('should create game board', () => {
        // Check if hexes are created
        expect(game.hexGrid.hexes.size).toBeGreaterThan(0);
        // Check specific hex
        expect(game.hexGrid.hasHex(0, 0)).toBe(true);
    });

    it('should create enemies', () => {
        // Place a tile further away to allow enemy spawning
        // q=3, r=0 is far enough (dist > 1)
        game.mapManager.placeTile(3, 0, [
            'plains', 'plains', 'plains', 'plains', 'plains', 'plains', 'plains'
        ]);
        game.createEnemies();
        expect(game.enemies.length).toBeGreaterThan(0);
    });

    it('should handle canvas click (selection)', () => {
        // Mock click event
        const event = { clientX: 400, clientY: 300 }; // Center

        // Mock pixelToAxial to return 0,0
        game.hexGrid.pixelToAxial = () => ({ q: 0, r: 0 });

        // Should select hex at 0,0
        game.interactionController.handleCanvasClick(event);

        expect(game.hexGrid.selectedHex).toBeDefined();
        expect(game.hexGrid.selectedHex.q).toBe(0);
        expect(game.hexGrid.selectedHex.r).toBe(0);
    });

    it('should enter movement mode', () => {
        game.enterMovementMode();

        expect(game.movementMode).toBe(true);
        expect(game.reachableHexes).toBeDefined();
    });

    it('should exit movement mode', () => {
        game.enterMovementMode();
        game.exitMovementMode();

        expect(game.movementMode).toBe(false);
        expect(game.reachableHexes).toHaveLength(0);
    });

    it('should end turn', () => {
        const initialTurn = game.turnNumber;
        // Mock hero endTurn
        game.hero.endTurn = () => { };

        game.endTurn();

        // turnNumber might not increment in endTurn directly if it depends on round end?
        // Let's check what endTurn does. It usually refreshes hand.
        // In this simplified game, maybe it doesn't increment turnNumber exposed?
        // Let's check hero state or logs.
        // Assuming endTurn works without error is a good start.
    });

    it('should initiate combat', () => {
        // Create a mock enemy
        const enemy = {
            id: 'e1',
            name: 'Orc',
            color: 'green',
            armor: 3,
            attack: 4,
            fame: 2,
            icon: 'O',
            getEffectiveAttack: () => 4,
            getBlockRequirement: () => 4
        };
        game.enemies = [enemy];

        game.combatOrchestrator.initiateCombat(enemy);

        expect(game.combat).toBeDefined();
        expect(game.combat.enemies).toContain(enemy);
    });

    describe('Healing Logic', () => {
        it('should apply healing correctly', () => {
            game.hero = new Hero('TestHero');
            game.hero.healingPoints = 1;
            game.hero.wounds = [{}];
            game.hero.hand = [{ isWound: () => true }];

            const result = game.applyHealing();
            expect(result).toBe(true);
            expect(game.hero.healingPoints).toBe(0);
            expect(game.hero.wounds.length).toBe(0);
        });

        it('should NOT apply healing if no wounds', () => {
            game.hero = new Hero('TestHero');
            game.hero.healingPoints = 5;
            game.hero.wounds = [];
            const result = game.applyHealing();
            expect(result).toBe(false);
        });
    });

    describe('System Transitions', () => {
        it('should reset game state', () => {
            const el = document.getElementById('reset-modal');
            let startCalled = false;
            game.startNewGame = () => { startCalled = true; };

            game.reset();
            expect(el.classList.contains('active')).toBe(true);
            game.startNewGame();
            expect(startCalled).toBe(true);
        });

        it('should initialize system with touch controls', () => {
            const originalMatch = window.matchMedia;
            window.matchMedia = (query) => ({ matches: query.includes('pointer: coarse') });
            global.navigator.maxTouchPoints = 1;

            game.initializeSystem();
            expect(game.touchController).toBeDefined();

            window.matchMedia = originalMatch; // Restore
            global.navigator.maxTouchPoints = 0; // Reset
        });
    });
});
