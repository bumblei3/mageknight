/**
 * Manages game phases, turns, and the Day/Night cycle.
 */
import { eventBus } from '../eventBus.js';
import { GAME_EVENTS } from '../constants.js';
import { store, ACTIONS } from './Store.js';

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

        eventBus.emit(GAME_EVENTS.TURN_ENDED, { turn: this.game.turnNumber });

        // Auto-save
        this.game.saveGame('auto');
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

        if (store) {
            let phase = 'EXPLORATION';
            if (this.game.combat) phase = 'COMBAT';
            else if (this.game.movementMode) phase = 'MOVEMENT';
            store.dispatch(ACTIONS.SET_GAME_PHASE, phase);

            if (this.game.combat) {
                store.dispatch(ACTIONS.SET_COMBAT_STATE, {
                    active: true,
                    phase: this.game.combat.phase
                });
            } else {
                store.dispatch(ACTIONS.SET_COMBAT_STATE, { active: false });
            }
        }
    }
    /**
     * Sets up the listener for day/night cycle changes.
     */
    setupTimeListener() {
        this.game.timeManager.addListener((state) => {
            const isNight = state.timeOfDay === 'night'; // Check string or const

            // Visual Transition
            const overlay = document.getElementById('day-night-overlay');
            const message = document.getElementById('day-night-message');

            if (overlay && message) {
                // Determine text based on i18n or hardcoded fallback (keeping consistent with old logic)
                const nightText = 'Die Nacht bricht herein...';
                const dayText = 'Der Tag bricht an...';

                message.textContent = isNight ? nightText : dayText;
                overlay.classList.add('active');

                this.game.setGameTimeout(() => {
                    // Update Game State visuals behind curtain
                    this.game.hexGrid.setTimeOfDay(isNight);
                    if (typeof document !== 'undefined' && document.body) {
                        document.body.classList.toggle('night-mode', isNight);
                    }

                    // Update UI Icons
                    const timeIcon = document.getElementById('time-icon');
                    const roundNum = document.getElementById('round-number');
                    if (timeIcon) {
                        timeIcon.textContent = isNight ? '🌙' : '☀️';
                        timeIcon.className = `time-icon ${isNight ? 'night' : ''}`;
                    }
                    if (roundNum) roundNum.textContent = state.round;

                    this.game.render();

                    this.game.setGameTimeout(() => {
                        if (overlay) overlay.classList.remove('active');
                    }, 1500);
                }, 1000);
            } else {
                // Fallback if no overlay
                this.game.hexGrid.setTimeOfDay(isNight);
                this.game.render();
            }

            // this.game.addLog(t('game.round', { round: state.round, time: isNight ? t('game.night') : t('game.day') }), 'info');
            // Simplified log for now to avoid t import issues without checking i18n
            this.game.addLog(`Runde ${state.round}: ${isNight ? 'Nacht' : 'Tag'}`, 'info');

            // Enemy Turn / World Update
            this.game.enemyAI.updateEnemies(this.game.enemies, this.game.hero).then(enemyLogs => {
                if (enemyLogs && enemyLogs.length > 0) {
                    enemyLogs.forEach(log => this.game.addLog(log, 'warning'));
                    this.game.showToast('Feinde haben sich bewegt!', 'warning');
                }
            });
        });
    }

    /**
     * Updates the Round and Time icons in the UI based on TimeManager state.
     */
    updateTimeUI() {
        const state = this.game.timeManager.getState();
        const isNight = state.timeOfDay === 'night'; // check const

        const timeIcon = document.getElementById('time-icon');
        const roundNum = document.getElementById('round-number');

        if (timeIcon) {
            timeIcon.textContent = isNight ? '🌙' : '☀️';
            timeIcon.className = `time-icon ${isNight ? 'night' : ''}`;
        }
        if (roundNum) {
            roundNum.textContent = state.round;
        }

        document.body.classList.toggle('night-mode', isNight);
        this.game.hexGrid.setTimeOfDay(isNight);
    }
}
