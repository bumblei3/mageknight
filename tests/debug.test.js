import { describe, it, expect, beforeEach } from './testRunner.js';
import { DebugManager } from '../js/debug.js';

describe('DebugManager', () => {
    let debugManager;
    let mockGame;
    let mockUI;
    let mockHero;

    beforeEach(() => {
        // Mock Game and its dependencies
        mockUI = {
            addLog: () => { },
            renderHand: () => { } // Add renderHand mock
        };

        mockHero = {
            crystals: { red: 0, blue: 0, green: 0, white: 0 },
            gainFame: () => { },
            changeReputation: () => { },
            influencePoints: 0,
            wounds: [],
            units: [],
            hand: [],
            discard: [],
            drawCard: () => ({ name: 'Test Card' }),
            drawCards: () => { },
            addUnit: () => true,
            position: { q: 0, r: 0 }
        };

        mockGame = {
            hero: mockHero,
            ui: mockUI,
            updateStats: () => { },
            renderHand: () => { },
            render: () => { },
            hexGrid: { debugMode: false },
            enemies: []
        };

        // Mock global window/document if needed (handled by setup.js mostly)
        // DebugManager accesses document.body.appendChild

        debugManager = new DebugManager(mockGame);
    });

    it('should initialize correctly', () => {
        expect(debugManager.game).toBe(mockGame);
        expect(debugManager.active).toBe(false);
        expect(debugManager.showCoordinates).toBe(false);
    });

    it('should setup console access', () => {
        // setupConsoleAccess is called in constructor
        expect(window.game).toBe(mockGame);
        expect(window.debug).toBe(debugManager);
    });

    it('should toggle panel', () => {
        // Initial state hidden (class 'hidden' added in createDebugUI)
        // But MockHTMLElement classList is simple.
        // Let's check the toggle method logic if possible or just state

        // The panel is created in constructor.
        // debugManager.panel should be a MockHTMLElement

        // Manually check toggle
        debugManager.togglePanel();
        // In mock setup, classList.toggle might not be fully implemented to track state without a real DOM
        // But let's assume we can just call it without error.
        // To verify, we might need to spy or check if we can inspect classList on MockHTMLElement.
        // The MockHTMLElement in setup.js has a dummy classList.
        // So we can't easily verify the class changed unless we improve the mock or just verify no error.
        // For now, verify no error.
    });

    it('should add crystals (cheat)', () => {
        debugManager.addCrystals();

        expect(mockHero.crystals.red).toBe(5);
        expect(mockHero.crystals.blue).toBe(5);
        expect(mockHero.crystals.green).toBe(5);
        expect(mockHero.crystals.white).toBe(5);
    });

    it('should add fame (cheat)', () => {
        let fameAdded = 0;
        mockHero.gainFame = (amount) => { fameAdded += amount; };

        debugManager.addFame();
        expect(fameAdded).toBe(10);
    });

    it('should add reputation (cheat)', () => {
        let repChange = 0;
        mockHero.changeReputation = (amount) => { repChange += amount; };

        debugManager.addReputation();
        expect(repChange).toBe(1);
    });

    it('should add influence (cheat)', () => {
        debugManager.addInfluence();
        expect(mockHero.influencePoints).toBe(10);
    });

    it('should heal all (cheat)', () => {
        mockHero.wounds = ['Wound1', 'Wound2'];
        let unitHealed = false;
        mockHero.units = [{ heal: () => { unitHealed = true; } }];

        debugManager.healAll();

        expect(mockHero.wounds.length).toBe(0);
        expect(unitHealed).toBe(true);
    });

    it('should draw card (cheat)', () => {
        // Mock drawCard returns a card
        debugManager.drawCard();
        // Should log success. We can't easily check log without spying on ui.addLog
        // But we can check if it runs without error.
    });

    it('should reset hand (cheat)', () => {
        mockHero.hand = ['Card1'];
        mockHero.discard = [];

        debugManager.resetHand();

        expect(mockHero.hand.length).toBe(0);
        expect(mockHero.discard).toContain('Card1');
        // drawCards called
    });

    it('should toggle coordinates', () => {
        debugManager.toggleCoordinates();
        expect(debugManager.showCoordinates).toBe(true);
        expect(mockGame.hexGrid.debugMode).toBe(true);

        debugManager.toggleCoordinates();
        expect(debugManager.showCoordinates).toBe(false);
        expect(mockGame.hexGrid.debugMode).toBe(false);
    });

    it('should spawn enemy (cheat)', () => {
        debugManager.spawnEnemy();
        expect(mockGame.enemies.length).toBe(1);
        expect(mockGame.enemies[0].name).toBe('Debug Orc');
    });

    it('should kill enemies (cheat)', () => {
        mockGame.enemies = [{ name: 'Orc' }];
        debugManager.killEnemies();
        expect(mockGame.enemies.length).toBe(0);
    });
});
