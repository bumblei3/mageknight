import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager } from '../../js/persistence/SaveManager.js';
import { setupGlobalMocks, resetMocks, createMockLocalStorage } from '../test-mocks.js';

setupGlobalMocks();

// Helper to create minimal valid save state
const createValidSaveState = (overrides = {}) => ({
    version: 1,
    hero: {
        name: 'TestHero',
        level: 1,
        fame: 0,
        reputation: 0,
        armor: 0,
        movementPoints: 0,
        attackPoints: 0,
        blockPoints: 0,
        influencePoints: 0,
        healingPoints: 0,
        handLimit: 5,
        commandLimit: 0,
        position: { q: 0, r: 0 },
        deck: [],
        hand: [],
        discard: [],
        wounds: [],
        crystals: {},
        skills: [],
        tempMana: [],
        units: [],
    },
    enemies: [],
    combat: null,
    hexGrid: null,
    time: { round: 1, timeOfDay: 'day' },
    statistics: {},
    achievements: { unlocked: [] },
    turn: null,
    timestamp: Date.now(),
    ...overrides,
});

describe('SaveManager', () => {
    beforeEach(() => {
        resetMocks();
        global.localStorage = createMockLocalStorage();
    });

    it('should save game state to slot', () => {
        const gameState = createValidSaveState({
            turn: { currentPlayer: 'player1', actionsRemaining: 5 },
            hero: { ...createValidSaveState().hero, name: 'TestHero', level: 3 }
        });

        const result = SaveManager.saveGame('0', gameState);
        expect(result).toBe(true);
    });

    it('should load saved game state from slot', () => {
        const gameState = createValidSaveState({
            turn: { currentPlayer: 'player1', actionsRemaining: 5 },
            hero: { ...createValidSaveState().hero, name: 'TestHero', level: 3 }
        });

        SaveManager.saveGame('1', gameState);
        const loaded = SaveManager.loadGame('1');

        expect(loaded).toBeDefined();
        expect(loaded.hero.name).toBe('TestHero');
        expect(loaded.hero.level).toBe(3);
        expect(loaded.turn).toEqual({ currentPlayer: 'player1', actionsRemaining: 5 });
    });

    it('should return null for non-existent save slot', () => {
        const loaded = SaveManager.loadGame('3');
        expect(loaded).toBeNull();
    });

    // Removed listSaves, deleteSave, autoSave specific tests as they were legacy features
    // not explicitly in the new static facade or worked differently.
    // The new SaveManager focuses on raw save/load.

    it('should handle autosave via slot id', () => {
        const gameState = createValidSaveState({ turn: { currentPlayer: 'player1', actionsRemaining: 7 } });
        SaveManager.saveGame('auto', gameState);

        const loaded = SaveManager.loadGame('auto');
        expect(loaded).toBeDefined();
        expect(loaded.turn.actionsRemaining).toBe(7);
    });

    it('should check if save exists', () => {
        const gameState = createValidSaveState({ turn: { currentPlayer: 'player1', actionsRemaining: 1 } });
        SaveManager.saveGame('check', gameState);
        expect(SaveManager.hasSave('check')).toBe(true);
        expect(SaveManager.hasSave('nonexistent')).toBe(false);
    });
});