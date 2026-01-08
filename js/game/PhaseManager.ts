import { eventBus } from '../eventBus';
import { GAME_EVENTS } from '../constants';
import { store, ACTIONS } from './Store';

/**
 * Manages game phases, turns, and the Day/Night cycle.
 */
export class PhaseManager {
    private game: any;

    constructor(game: any) {
        this.game = game;
    }

    /**
     * Ends the current player turn.
     */
    endTurn(): void {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'combat') return;

        // Delegate to game's turnManager
        if (this.game.turnManager) {
            this.game.turnManager.endTurn();
        }

        // Update statistics
        if (this.game.statisticsManager) {
            this.game.statisticsManager.increment('turns');
        }

        // Check achievements
        if (typeof this.game.checkAndShowAchievements === 'function') {
            this.game.checkAndShowAchievements();
        }

        this.game.addLog('Zug beendet.', 'info');

        eventBus.emit(GAME_EVENTS.TURN_ENDED, { turn: this.game.turnNumber });

        // Auto-save
        if (typeof this.game.saveGame === 'function') {
            this.game.saveGame('auto');
        }
    }

    /**
     * Executes the rest action.
     */
    rest(): void {
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
     * Updates the UI phase indicator.
     */
    updatePhaseIndicator(): void {
        const phaseText = document.querySelector('.phase-text') as HTMLElement;
        const phaseHint = document.getElementById('phase-hint') as HTMLElement;

        if (!phaseText || !phaseHint) return;

        // Clear existing highlights
        const panels = document.querySelectorAll('.panel');
        panels.forEach(p => {
            p.classList.remove('phase-highlight-movement', 'phase-highlight-combat');
        });

        if (this.game.combat) {
            const phaseNames: Record<string, string> = {
                'ranged': 'Fernkampf-Phase',
                'block': 'Block-Phase',
                'damage': 'Schadens-Phase',
                'attack': 'Angriffs-Phase',
                'complete': 'Kampf Ende'
            };

            const hints: Record<string, string> = {
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
            const isDay = this.game.timeManager && this.game.timeManager.isDay();
            const timeIcon = isDay ? '☀️' : '🌙';
            phaseText.textContent = `Erkundung(${timeIcon})`;
            phaseHint.textContent = '🎴 Spiele Karten oder bewege dich (1-5)';
        }

        // Emit event for UI sync
        eventBus.emit(GAME_EVENTS.PHASE_CHANGED, {
            combat: !!this.game.combat,
            movementMode: !!this.game.movementMode,
            isDay: this.game.timeManager && this.game.timeManager.isDay()
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
    setupTimeListener(): void {
        if (!this.game.timeManager) return;

        this.game.timeManager.addListener((state: any) => {
            const isNight = state.timeOfDay === 'night' || state.timeOfDay === 1; // Assuming 1 is night if numeric

            // Visual Transition
            const overlay = document.getElementById('day-night-overlay');
            const message = document.getElementById('day-night-message');

            if (overlay && message) {
                const nightText = 'Die Nacht bricht herein...';
                const dayText = 'Der Tag bricht an...';

                message.textContent = isNight ? nightText : dayText;
                overlay.classList.add('active');

                this.game.setGameTimeout(() => {
                    // Update Game State visuals behind curtain
                    if (this.game.hexGrid) {
                        this.game.hexGrid.setTimeOfDay(isNight);
                    }
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
                if (this.game.hexGrid) {
                    this.game.hexGrid.setTimeOfDay(isNight);
                }
                this.game.render();
            }

            this.game.addLog(`Runde ${state.round}: ${isNight ? 'Nacht' : 'Tag'}`, 'info');

            // Enemy Turn / World Update
            if (this.game.enemyAI) {
                this.game.enemyAI.updateEnemies(this.game.enemies, this.game.hero).then((enemyLogs: string[]) => {
                    if (enemyLogs && enemyLogs.length > 0) {
                        enemyLogs.forEach(log => this.game.addLog(log, 'warning'));
                        this.game.showToast('Feinde haben sich bewegt!', 'warning');
                    }
                });
            }

        });
    }

    /**
     * Updates the Round and Time icons in the UI based on TimeManager state.
     */
    updateTimeUI(): void {
        if (!this.game.timeManager) return;

        const state = this.game.timeManager.getState();
        const isNight = state.timeOfDay === 'night' || state.timeOfDay === 1;

        const timeIcon = document.getElementById('time-icon');
        const roundNum = document.getElementById('round-number');

        if (timeIcon) {
            timeIcon.textContent = isNight ? '🌙' : '☀️';
            timeIcon.className = `time-icon ${isNight ? 'night' : ''}`;
        }
        if (roundNum) {
            roundNum.textContent = state.round;
        }

        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('night-mode', isNight);
        }
        if (this.game.hexGrid) {
            this.game.hexGrid.setTimeOfDay(isNight);
        }
    }
}
