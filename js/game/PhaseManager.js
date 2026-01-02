/**
 * Manages game phases, turns, and the Day/Night cycle.
 */
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS } from '../constants.js';

export class PhaseManager {
    constructor(game) {
        this.game = game;
    }

    /**
     * Ends the current player turn
     */
    endTurn() {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'combat') return;

        // Delegate to game's turnManager
        this.game.turnManager.endTurn();

        // Update statistics
        this.game.statisticsManager.increment('turns');

        // Check achievements
        this.game.checkAndShowAchievements();

        this.game.addLog('Zug beendet.', 'info');

        // Auto-save
        this.game.saveGame();
    }

    /**
     * Executes the rest action
     */
    rest() {
        if (this.game.gameState !== 'playing') return;

        const result = this.game.hero.rest();
        if (result.success) {
            this.game.addLog(result.message, 'success');
            this.endTurn();
        } else {
            this.game.addLog(result.message, 'error');
        }
    }

    /**
     * Updates the UI phase indicator
     */
    updatePhaseIndicator() {
        const phaseText = document.querySelector('.phase-text');
        const phaseHint = document.getElementById('phase-hint');

        if (!phaseText || !phaseHint) return;

        // Clear existing highlights
        const panels = document.querySelectorAll('.panel');
        panels.forEach(p => {
            p.classList.remove('phase-highlight-movement', 'phase-highlight-combat');
        });

        if (this.game.combat) {
            const phaseNames = {
                'ranged': 'Fernkampf-Phase',
                'block': 'Block-Phase',
                'damage': 'Schadens-Phase',
                'attack': 'Angriffs-Phase',
                'complete': 'Kampf Ende'
            };

            const hints = {
                'ranged': '🏹 Nutze Fernkampf- oder Belagerungsangriffe (Töten sofort!)',
                'block': '🛡️ Spiele blaue Karten zum Blocken',
                'damage': '💔 Schaden wird verrechnet...',
                'attack': '⚔️ Spiele rote Karten zum Angreifen',
                'complete': '✅ Kampf abgeschlossen!'
            };

            phaseText.textContent = phaseNames[this.game.combat.phase] || 'Kampf';
            phaseHint.textContent = hints[this.game.combat.phase] || 'Kämpfe!';

            // Apply combat highlight to action and combat panels
            document.querySelector('.action-panel')?.classList.add('phase-highlight-combat');
            document.getElementById('combat-panel')?.classList.add('phase-highlight-combat');
        } else if (this.game.movementMode) {
            phaseText.textContent = 'Bewegung';
            phaseHint.textContent = `👣 ${this.game.hero.movementPoints} Punkte - Klicke auf ein Feld`;

            // Apply movement highlight
            document.querySelector('.movement-panel')?.classList.add('phase-highlight-movement');
            document.querySelector('.action-panel')?.classList.add('phase-highlight-movement');
        } else {
            const timeIcon = this.game.timeManager.isDay() ? '☀️' : '🌙';
            phaseText.textContent = `Erkundung(${timeIcon})`;
            phaseHint.textContent = '🎴 Spiele Karten oder bewege dich (1-5)';
        }

        // Emit event for UI sync
        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, {
            combat: !!this.game.combat,
            movementMode: !!this.game.movementMode,
            isDay: this.game.timeManager.isDay()
        });
    }
}
