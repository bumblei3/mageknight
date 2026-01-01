import { TIME_OF_DAY, COMBAT_PHASES } from './constants.js';
// TurnManager

export class TurnManager {
    constructor(game) {
        this.game = game;
        this.turnNumber = 1;
    }

    reset() {
        this.turnNumber = 1;
    }

    endTurn() {
        if (this.game.combat) {
            this.handleCombatEndTurn();
            return;
        }

        this.turnNumber++;
        this.game.statisticsManager.trackTurn();
        this.game.hero.endTurn();
        this.game.manaSource.returnDice();
        this.game.exitMovementMode();

        // Check for end of round
        // Round ends when Deck is empty AND Hand is empty (or player decides, but here we force when empty)
        if (this.game.hero.deck.length === 0 && this.game.hero.hand.length === 0) {
            this.endRound();
        }

        this.game.addLog(`--- Zug ${this.turnNumber} beendet ---`, 'info');
        this.game.addLog('Neue Karten gezogen', 'info');
        this.game.ui.hidePlayArea();

        this.game.renderHand();
        this.game.renderMana();
        this.game.updateStats();

        // Auto-save
        this.game.saveManager.autoSave(this.game.getGameState());

        // Check victory
        this.checkVictory();
    }

    handleCombatEndTurn() {
        const combat = this.game.combat;
        if (combat.phase === COMBAT_PHASES.RANGED) {
            this.game.endRangedPhase();
        } else if (combat.phase === COMBAT_PHASES.BLOCK) {
            this.game.endBlockPhase();
        } else if (combat.phase === COMBAT_PHASES.ATTACK) {
            this.game.endCombat();
        }
    }

    endRound() {
        const roundInfo = this.game.timeManager.endRound();
        const timeStr = roundInfo.timeOfDay === TIME_OF_DAY.DAY ? 'Tag' : 'Nacht';
        this.game.addLog(`🌙 Runde beendet! Es ist jetzt ${timeStr}.`, 'info');

        // Re-roll mana source
        this.game.manaSource.initialize();

        // Prepare hero deck
        this.game.hero.prepareNewRound();
    }

    checkVictory() {
        if (this.game.enemies.length === 0) {
            this.game.gameState = 'victory';
            this.game.statisticsManager.endGame(true);
            this.game.statisticsManager.set('turns', this.turnNumber);
            this.game.checkAndShowAchievements();
            this.game.addLog('🎉 SIEG! Alle Feinde wurden besiegt!', 'info');
            this.game.ui.setButtonEnabled(this.game.ui.elements.endTurnBtn, false);
        }
    }

    getState() {
        return {
            turnNumber: this.turnNumber
        };
    }

    loadState(state) {
        this.turnNumber = state.turnNumber || 1;
    }
}
