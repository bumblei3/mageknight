/**
 * Handles user input (keyboard, mouse, UI buttons)
 */
export class InputController {
    private game: any;
    private canvas: HTMLCanvasElement;
    private abortController: AbortController;

    constructor(game: any) {
        this.game = game;
        this.canvas = game.canvas;
        this.abortController = new AbortController();
    }

    setup(): void {
        const signal = this.abortController.signal;

        // UI Buttons
        if (this.game.ui.elements.endTurnBtn) {
            this.game.ui.elements.endTurnBtn.addEventListener('click', () => {
                if (this.isUIBlocked()) return;
                this.game.turnManager.endTurn();
            }, { signal });
        }

        if (this.game.ui.elements.restBtn) {
            this.game.ui.elements.restBtn.addEventListener('click', () => {
                if (this.isUIBlocked()) return;
                this.game.rest();
            }, { signal });
        }

        if (this.game.ui.elements.healBtn) {
            this.game.ui.elements.healBtn.addEventListener('click', () => {
                if (this.isUIBlocked()) return;
                this.game.applyHealing();
            }, { signal });
        }

        if (this.game.ui.elements.exploreBtn) {
            this.game.ui.elements.exploreBtn.addEventListener('click', () => {
                if (this.isUIBlocked()) return;
                this.game.actionManager.explore();
            }, { signal });
        }

        const visitBtn = document.getElementById('visit-btn');
        if (visitBtn) visitBtn.addEventListener('click', () => this.game.actionManager.visitSite(), { signal });

        const executeAttackBtn = document.getElementById('execute-attack-btn');
        if (executeAttackBtn) executeAttackBtn.addEventListener('click', () => this.game.combatOrchestrator.executeAttackAction(), { signal });

        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.game.openSaveDialog(), { signal });
        if (loadBtn) loadBtn.addEventListener('click', () => this.game.openLoadDialog(), { signal });

        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) undoBtn.addEventListener('click', () => this.game.actionManager.undoLastAction(), { signal });

        if (this.game.ui.elements.newGameBtn) {
            this.game.ui.elements.newGameBtn.addEventListener('click', () => this.game.reset(), { signal });
        }

        // Canvas Events
        this.canvas.addEventListener('click', (e) => {
            if (this.isUIBlocked()) return;
            // NOTE: InteractionController handles both mouse and touch via separate listeners if needed,
            // but for simple clicks it's here.
            if (this.game.interactionController && typeof this.game.interactionController.handleClick === 'function') {
                this.game.interactionController.handleClick(e);
            }
        }, { signal });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isUIBlocked()) return;
            if (this.game.interactionController && typeof this.game.interactionController.handleMouseMove === 'function') {
                this.game.interactionController.handleMouseMove(e);
            }
        }, { signal });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.game.ui.tooltipManager) {
                this.game.ui.tooltipManager.hideTooltip();
            }
            if (this.game.interactionController && typeof this.game.interactionController.handleMouseLeave === 'function') {
                this.game.interactionController.handleMouseLeave();
            }
        }, { signal });

        // --- Drag and Drop Over Canvas ---
        this.canvas.addEventListener('dragenter', () => {
            // Cache rect when drag starts entering the canvas
            if (this.game.interactionController && typeof this.game.interactionController.updateRect === 'function') {
                this.game.interactionController.updateRect();
            }
        }, { signal });

        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault(); // Required to allow drop
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

            // Optional: Highlight hex under cursor during drag
            if (this.game.interactionController && typeof this.game.interactionController.handleMouseMove === 'function') {
                this.game.interactionController.handleMouseMove(e);
            }
        }, { signal });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const dataTransfer = e.dataTransfer;
            if (!dataTransfer) return;

            const cardIndex = parseInt(dataTransfer.getData('text/plain'));
            if (isNaN(cardIndex)) return;

            // Use cached rect from InteractionController for consistency and performance
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // NOTE: handleCardDrop might be in InteractionController or ActionManager
            if (this.game.interactionController && typeof this.game.interactionController.handleCardDrop === 'function') {
                this.game.interactionController.handleCardDrop(cardIndex, x, y);
            }
        }, { signal });

        // Keyboard Shortcuts
        this.setupKeyboardShortcuts(signal);

        // UI Modals & Toggles
        this.setupSoundToggle();
        this.setupUIListeners();
    }

    setupSoundToggle(): void {
        const signal = this.abortController.signal;
        // Create sound toggle button if it doesn't exist
        let soundBtn = document.getElementById('sound-toggle-btn');

        if (!soundBtn) {
            // Add to header
            const headerRight = document.querySelector('.header-right');
            if (!headerRight) return; // Guard if header doesn't exist

            soundBtn = document.createElement('button');
            soundBtn.id = 'sound-toggle-btn';
            soundBtn.className = 'btn-icon';
            soundBtn.title = 'Sound ein/aus';
            soundBtn.innerHTML = this.game.sound && this.game.sound.enabled ? '🔊' : '🔇';
            headerRight.insertBefore(soundBtn, headerRight.firstChild);
        }

        // Toggle sound on click
        soundBtn.addEventListener('click', () => {
            if (this.game.sound) {
                const enabled = this.game.sound.toggle();
                if (soundBtn) soundBtn.innerHTML = enabled ? '🔊' : '🔇';
                this.game.addLog(enabled ? 'Sound aktiviert' : 'Sound deaktiviert', 'info');
            }
        }, { signal });
    }

    setupUIListeners(): void {
        const signal = this.abortController.signal;

        // Achievements Modal
        const achievementsBtn = document.getElementById('achievements-btn');
        const achievementsModal = document.getElementById('achievements-modal');
        const achievementsClose = document.getElementById('achievements-close');

        if (achievementsBtn && achievementsModal) {
            achievementsBtn.addEventListener('click', () => {
                this.game.renderController.renderAchievements('all');
                achievementsModal.classList.add('active');
            }, { signal });

            if (achievementsClose) {
                achievementsClose.addEventListener('click', () => {
                    achievementsModal.classList.remove('active');
                }, { signal });
            }

            // Tabs
            const tabs = achievementsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    tabs.forEach(t => t.classList.remove('active'));
                    target.classList.add('active');
                    this.game.renderController.renderAchievements(target.dataset.category);
                }, { signal });
            });
        }

        // Statistics Modal
        const statsBtn = document.getElementById('statistics-btn');
        const statsModal = document.getElementById('statistics-modal');
        const statsClose = document.getElementById('statistics-close');

        if (statsBtn && statsModal) {
            statsBtn.addEventListener('click', () => {
                this.game.renderController.renderStatistics('global');
                statsModal.classList.add('active');
            }, { signal });

            if (statsClose) {
                statsClose.addEventListener('click', () => {
                    statsModal.classList.remove('active');
                }, { signal });
            }

            // Tabs
            const tabs = statsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    tabs.forEach(t => t.classList.remove('active'));
                    target.classList.add('active');
                    this.game.renderController.renderStatistics(target.dataset.category);
                }, { signal });
            });
        }

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === achievementsModal) achievementsModal?.classList.remove('active');
            if (e.target === statsModal) statsModal?.classList.remove('active');
        }, { signal });
    }

    setupKeyboardShortcuts(signal: AbortSignal): void {
        document.addEventListener('keydown', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const helpModal = document.getElementById('help-modal');
            if (helpModal && helpModal.classList.contains('active')) return;

            // Number keys 1-5 to play cards
            if (e.key >= '1' && e.key <= '5') {
                const index = parseInt(e.key) - 1;
                if (this.game.hero && index < this.game.hero.hand.length) {
                    if (this.game.interactionController && typeof this.game.interactionController.handleCardClick === 'function') {
                        this.game.interactionController.handleCardClick(index, this.game.hero.hand[index]);
                        this.game.addLog(`Karte ${e.key} gespielt (Tastatur)`, 'info');
                    }
                }
                e.preventDefault();
            }

            // Commands via ShortcutManager
            if (this.game.shortcutManager) {
                const action = this.game.shortcutManager.getAction(e);

                switch (action) {
                    case 'END_TURN':
                        this.game.turnManager.endTurn();
                        e.preventDefault();
                        break;
                    case 'HELP': {
                        const helpBtn = document.getElementById('help-btn');
                        if (helpBtn) helpBtn.click();
                        e.preventDefault();
                        break;
                    }
                    case 'REST':
                        this.game.rest();
                        e.preventDefault();
                        break;
                    case 'EXPLORE':
                        this.game.actionManager.explore();
                        e.preventDefault();
                        break;
                    case 'TUTORIAL':
                        if (typeof this.game.showTutorial === 'function') this.game.showTutorial();
                        e.preventDefault();
                        break;
                    case 'CANCEL':
                        if (this.game.movementMode) {
                            this.game.actionManager.exitMovementMode();
                            this.game.addLog('Bewegungsmodus abgebrochen', 'info');
                        }
                        break;
                    case 'MANA_PANEL': {
                        const manaPanel = document.querySelector('.mana-panel');
                        if (manaPanel) {
                            manaPanel.scrollIntoView({ behavior: 'smooth' });
                            manaPanel.classList.add('highlight-pulse');
                            setTimeout(() => manaPanel.classList.remove('highlight-pulse'), 1000);
                        }
                        break;
                    }
                }
            }

            // Ctrl combinations
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.game.openSaveDialog();
                } else if (e.key === 'l') {
                    e.preventDefault();
                    this.game.openLoadDialog();
                } else if (e.key === 'z') {
                    e.preventDefault();
                    this.game.actionManager.undoLastAction();
                }
            }
        }, { signal });
    }

    isUIBlocked(): boolean {
        // Check if any modal is active
        const activeModals = document.querySelectorAll('.modal.active, .site-modal.active, .level-up-modal.active');
        if (activeModals.length > 0) return true;

        const helpModal = document.getElementById('help-modal');
        if (helpModal && helpModal.classList.contains('active')) return true;

        if (this.game.gameState !== 'playing' && this.game.gameState !== 'combat') return true;

        return false;
    }

    destroy(): void {
        this.abortController.abort();
    }
}
