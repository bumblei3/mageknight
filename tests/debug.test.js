import { describe, it, expect, beforeEach } from 'vitest';
import { DebugManager } from '../js/debug.js';
import { createSpy } from './test-mocks.js';

describe('DebugManager', () => {
    let debugManager;
    let mockGame;
    let mockUI;
    let mockHero;

    beforeEach(() => {
        // Mock Game and its dependencies
        mockUI = {
            addLog: createSpy('addLog'),
            renderHand: () => { }
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
            addLog: createSpy('addLog'),
            updateStats: () => { },
            renderHand: () => { },
            render: () => { },
            hexGrid: { debugMode: false },
            enemies: []
        };

        debugManager = new DebugManager(mockGame);
    });

    it('should initialize correctly', () => {
        expect(debugManager.game).toBe(mockGame);
        expect(debugManager.active).toBe(false);
        expect(debugManager.showCoordinates).toBe(false);
    });

    it('should setup console access', () => {
        expect(window.game).toBe(mockGame);
        expect(window.debug).toBe(debugManager);
    });

    it('should toggle panel', () => {
        debugManager.togglePanel();
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
        debugManager.drawCard();
    });

    it('should reset hand (cheat)', () => {
        mockHero.hand = ['Card1'];
        mockHero.discard = [];
        debugManager.resetHand();
        expect(mockHero.hand.length).toBe(0);
        expect(mockHero.discard).toContain('Card1');
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
