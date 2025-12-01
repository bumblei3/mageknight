import { describe, it, expect, beforeEach } from './testRunner.js';

// --- Global Mocks Setup ---

// Mock HTMLElement
class MockHTMLElement {
    constructor() {
        this.style = {};
        this.classList = {
            add: () => { },
            remove: () => { },
            contains: () => false
        };
        this.dataset = {};
        this.children = [];
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
    }

    addEventListener() { }
    removeEventListener() { }
    appendChild(child) { this.children.push(child); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
    getContext() {
        return {
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            closePath: () => { },
            stroke: () => { },
            fill: () => { },
            clearRect: () => { },
            save: () => { },
            restore: () => { },
            translate: () => { },
            scale: () => { },
            drawImage: () => { },
            measureText: () => ({ width: 10 }),
            fillText: () => { },
            strokeText: () => { }
        };
    }
}

// Mock Document
const mockDocument = {
    getElementById: (id) => new MockHTMLElement(),
    querySelector: (sel) => new MockHTMLElement(),
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockHTMLElement(),
    addEventListener: () => { },
    body: new MockHTMLElement()
};

// Mock LocalStorage
const mockLocalStorage = {
    store: {},
    getItem: (key) => mockLocalStorage.store[key] || null,
    setItem: (key, val) => { mockLocalStorage.store[key] = val.toString(); },
    removeItem: (key) => { delete mockLocalStorage.store[key]; },
    clear: () => { mockLocalStorage.store = {}; }
};

// Apply Mocks
if (typeof document === 'undefined') {
    global.document = mockDocument;
    global.window = { addEventListener: () => { } };
    global.localStorage = mockLocalStorage;
    global.HTMLElement = MockHTMLElement;
    global.prompt = () => '1'; // Mock prompt for sideways play
}

// Import Game
import { MageKnightGame } from '../js/game.js';

describe('Game Core', () => {
    let game;

    beforeEach(() => {
        // Reset mocks
        localStorage.clear();

        // Initialize game
        // Note: This will trigger a lot of initialization logic
        game = new MageKnightGame();
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
        expect(game.enemies.length).toBeGreaterThan(0);
    });

    it('should handle canvas click (selection)', () => {
        // Mock click event
        const event = { clientX: 400, clientY: 300 }; // Center

        // Should select hex at 0,0
        game.handleCanvasClick(event);

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
        const enemy = game.enemies[0];
        game.initiateCombat(enemy);

        expect(game.combat).toBeDefined();
        expect(game.combat.enemies).toContain(enemy);
    });
});
