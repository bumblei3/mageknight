import { GAME_EVENTS } from './constants';
import { eventBus } from './eventBus';
import { t } from './i18n/index';

/**
 * Manages game turns and rounds.
 */
export class TurnManager {
    private game: any;
    public turnNumber: number = 0;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Ends the current turn and prepares for the next.
     */
    async endTurn(): Promise<void> {
        if (this.game.gameState === 'combat') {
            this.game.addLog(t('game.endTurnCombatBlocked'), 'warning');
            this.game.showToast(t('game.endTurnCombatBlocked'), 'warning');
            return;
        }
        if (this.game.gameState !== 'playing') return;

        // 1. Reset Move Points
        this.game.hero.movementPoints = 0;

        // 2. Discard cards (optional in real rules, but here auto-refill)
        // For now, we just draw up to hand limit
        const cardsDrawn = this.game.hero.drawCards();
        if (cardsDrawn > 0) {
            this.game.addLog(t('game.cardsDrawn', { count: cardsDrawn }), 'info');
        }

        // 3. Reset Mana Source
        this.game.manaSource.recharge();
        this.game.addLog(t('game.manaRecharged'), 'info');

        // 4. Update Game State / Turn Number
        this.turnNumber++;
        this.game.addLog(t('game.turnEnded', { number: this.turnNumber }), 'info');

        // 5. Check if Round ends (e.g. after X turns or manual call)
        // Simple logic: every 6 turns a day/night cycle
        if (this.turnNumber % 6 === 0) {
            this.game.timeManager.advanceTime();
            this.game.addLog(t('game.timeAdvanced', { time: this.game.timeManager.getTimeOfDay() }), 'warning');

            if (this.game.phaseManager) {
                this.game.phaseManager.updateTimeUI();
            }
        }

        // 6. UI Updates
        this.game.updateStats();
        this.game.renderHand();
        this.game.renderMana();
        this.game.updatePhaseIndicator();

        // 7. Auto-save
        if (this.game.stateManager) {
            this.game.stateManager.saveGame('auto');
        }

        eventBus.emit(GAME_EVENTS.TURN_ENDED, { turn: this.turnNumber });

        // Show notification
        this.game.showToast(t('game.nextTurn'), 'success');
    }

    /**
     * Resets the turn counter.
     */
    reset(): void {
        this.turnNumber = 0;
    }

    /**
     * Gets the current game state for saving.
     */
    getState(): any {
        return {
            turnNumber: this.turnNumber
        };
    }

    /**
     * Loads the turn manager state.
     */
    loadState(state: any): void {
        if (state && state.turnNumber !== undefined) {
            this.turnNumber = state.turnNumber;
        }
    }
}
