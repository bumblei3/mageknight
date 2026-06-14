import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurnManager } from '../../js/turnManager.js';

describe('TurnManager', () => {
    let turnManager;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            gameState: 'playing',
            hero: {
                movementPoints: 5,
                drawCards: vi.fn().mockReturnValue(2),
                wounds: []
            },
            manaSource: {
                recharge: vi.fn()
            },
            addLog: vi.fn(),
            showToast: vi.fn(),
            timeManager: {
                advanceTime: vi.fn().mockReturnValue('night'),
                getTimeOfDay: vi.fn().mockReturnValue('night')
            },
            phaseManager: {
                updateTimeUI: vi.fn()
            },
            updateStats: vi.fn(),
            renderHand: vi.fn(),
            renderMana: vi.fn(),
            updatePhaseIndicator: vi.fn(),
            stateManager: {
                saveGame: vi.fn()
            }
        };
        turnManager = new TurnManager(mockGame);
    });

    it('should not end turn during combat', async () => {
        mockGame.gameState = 'combat';
        await turnManager.endTurn();
        
        expect(mockGame.addLog).toHaveBeenCalledWith(expect.stringContaining('combat'), 'warning');
        expect(mockGame.showToast).toHaveBeenCalled();
        expect(mockGame.hero.movementPoints).toBe(5); // Not reset
    });

    it('should not end turn if not in playing state', async () => {
        mockGame.gameState = 'paused';
        await turnManager.endTurn();
        
        expect(mockGame.hero.movementPoints).toBe(5); // Not reset
    });

    it('should end turn successfully in playing state', async () => {
        await turnManager.endTurn();
        
        expect(mockGame.hero.movementPoints).toBe(0);
        expect(mockGame.hero.drawCards).toHaveBeenCalled();
        expect(mockGame.manaSource.recharge).toHaveBeenCalled();
        expect(turnManager.turnNumber).toBe(1);
        expect(mockGame.addLog).toHaveBeenCalled();
        expect(mockGame.updateStats).toHaveBeenCalled();
        expect(mockGame.renderHand).toHaveBeenCalled();
        expect(mockGame.renderMana).toHaveBeenCalled();
        expect(mockGame.updatePhaseIndicator).toHaveBeenCalled();
    });

    it('should advance time every 6 turns', async () => {
        // Directly set turnNumber to 5, then endTurn will make it 6
        turnManager.turnNumber = 5;
        
        await turnManager.endTurn();
        
        expect(mockGame.timeManager.advanceTime).toHaveBeenCalled();
        expect(mockGame.phaseManager.updateTimeUI).toHaveBeenCalled();
    });

    it('should not advance time on non-6 turns', async () => {
        turnManager.turnNumber = 3;
        
        await turnManager.endTurn();
        
        expect(mockGame.timeManager.advanceTime).not.toHaveBeenCalled();
    });

    it('should auto-save when stateManager exists', async () => {
        await turnManager.endTurn();
        
        expect(mockGame.stateManager.saveGame).toHaveBeenCalledWith('auto');
    });

    it('should not auto-save when stateManager is missing', async () => {
        mockGame.stateManager = null;
        
        await turnManager.endTurn();
        
        // Should not throw, just skip save
        expect(mockGame.addLog).toHaveBeenCalled();
    });

    it('should reset turn counter', () => {
        turnManager.turnNumber = 10;
        
        turnManager.reset();
        
        expect(turnManager.turnNumber).toBe(0);
    });

    it('should get state', () => {
        turnManager.turnNumber = 7;
        
        const state = turnManager.getState();
        
        expect(state).toEqual({ turnNumber: 7 });
    });

    it('should load state with valid turnNumber', () => {
        turnManager.loadState({ turnNumber: 15 });
        
        expect(turnManager.turnNumber).toBe(15);
    });

    it('should not load state with invalid turnNumber', () => {
        turnManager.turnNumber = 5;
        
        turnManager.loadState({});
        turnManager.loadState(null);
        turnManager.loadState(undefined);
        
        expect(turnManager.turnNumber).toBe(5);
    });
});