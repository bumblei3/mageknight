import { describe, it, expect, beforeEach } from './testRunner.js';
import { TurnManager } from '../js/turnManager.js';
import { createSpy } from './test-mocks.js';
import { TIME_OF_DAY, COMBAT_PHASES } from '../js/constants.js';

describe('TurnManager Coverage', () => {
    let turnManager;
    let mockGame;

    beforeEach(() => {
        mockGame = {
            hero: {
                endTurn: createSpy('endTurn'),
                deck: [],
                prepareNewRound: createSpy('prepareNewRound')
            },
            statisticsManager: {
                trackTurn: createSpy('trackTurn'),
                endGame: createSpy('endGame'),
                set: createSpy('set')
            },
            manaSource: {
                returnDice: createSpy('returnDice'),
                initialize: createSpy('initialize')
            },
            saveManager: {
                autoSave: createSpy('autoSave')
            },
            ui: {
                hidePlayArea: createSpy('hidePlayArea'),
                setButtonEnabled: createSpy('setButtonEnabled'),
                elements: {
                    endTurnBtn: {}
                }
            },
            timeManager: {
                endRound: () => ({ timeOfDay: 'DAY' })
            },
            enemies: [],
            exitMovementMode: createSpy('exitMovementMode'),
            addLog: createSpy('addLog'),
            renderHand: createSpy('renderHand'),
            renderMana: createSpy('renderMana'),
            updateStats: createSpy('updateStats'),
            getGameState: () => ({ test: true }),
            checkAndShowAchievements: createSpy('checkAndShowAchievements'),
            endRangedPhase: createSpy('endRangedPhase'),
            endBlockPhase: createSpy('endBlockPhase'),
            endCombat: createSpy('endCombat')
        };
        turnManager = new TurnManager(mockGame);
    });

    it('should reset turn number', () => {
        turnManager.turnNumber = 5;
        turnManager.reset();
        expect(turnManager.turnNumber).toBe(1);
    });

    it('should handle combat end turn for RANGED phase', () => {
        mockGame.combat = { phase: COMBAT_PHASES.RANGED };
        turnManager.endTurn();
        expect(mockGame.endRangedPhase.called).toBe(true);
    });

    it('should handle combat end turn for BLOCK phase', () => {
        mockGame.combat = { phase: COMBAT_PHASES.BLOCK };
        turnManager.endTurn();
        expect(mockGame.endBlockPhase.called).toBe(true);
    });

    it('should handle combat end turn for ATTACK phase', () => {
        mockGame.combat = { phase: COMBAT_PHASES.ATTACK };
        turnManager.endTurn();
        expect(mockGame.endCombat.called).toBe(true);
    });

    it('should handle combat end turn for all phases', () => {
        const phases = [COMBAT_PHASES.RANGED, COMBAT_PHASES.BLOCK, COMBAT_PHASES.ATTACK];
        const methods = ['endRangedPhase', 'endBlockPhase', 'endCombat'];

        phases.forEach((phase, i) => {
            // Reset spies for each iteration
            mockGame.endRangedPhase.called = false;
            mockGame.endBlockPhase.called = false;
            mockGame.endCombat.called = false;

            mockGame.combat = { phase };
            turnManager.handleCombatEndTurn();
            expect(mockGame[methods[i]].called).toBe(true);
        });
    });

    it('should handle end round logic for Night', () => {
        mockGame.timeManager.endRound = () => ({ timeOfDay: TIME_OF_DAY.NIGHT });
        turnManager.endRound();
        expect(mockGame.manaSource.initialize.called).toBe(true);
    });

    it('should handle round end when deck is empty', () => {
        mockGame.hero.deck = [];
        turnManager.endTurn();
        expect(mockGame.hero.prepareNewRound.called).toBe(true);
        expect(mockGame.manaSource.initialize.called).toBe(true);
    });

    it('should handle victory check with no enemies', () => {
        mockGame.enemies = [];
        turnManager.checkVictory();
        expect(mockGame.gameState).toBe('victory');
        expect(mockGame.statisticsManager.endGame.calledWith(true)).toBe(true);
        expect(mockGame.checkAndShowAchievements.called).toBe(true);
    });

    it('should not trigger victory if enemies remain', () => {
        mockGame.enemies = [{ name: 'Orc' }];
        turnManager.checkVictory();
        expect(mockGame.gameState).not.toBe('victory');
    });

    it('should get and load state', () => {
        turnManager.turnNumber = 10;
        const state = turnManager.getState();
        expect(state.turnNumber).toBe(10);

        turnManager.loadState({ turnNumber: 20 });
        expect(turnManager.turnNumber).toBe(20);

        turnManager.loadState({}); // fallback
        expect(turnManager.turnNumber).toBe(1);
    });
});
