export class InputController {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.abortController = new AbortController();
    }

    setup() {
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
                this.game.explore();
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
            this.game.interactionController.handleCanvasClick(e);
        }, { signal });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isUIBlocked()) return;
            this.game.interactionController.handleCanvasMouseMove(e);
        }, { signal });
        this.canvas.addEventListener('mouseleave', () => {
            this.game.ui.tooltipManager.hideTooltip();
        }, { signal });

        // Keyboard Shortcuts
        this.setupKeyboardShortcuts(signal);

        // UI Modals & Toggles
        this.setupSoundToggle();
        this.setupUIListeners();
    }

    setupSoundToggle() {
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
            soundBtn.innerHTML = this.game.sound.enabled ? '🔊' : '🔇';
            headerRight.insertBefore(soundBtn, headerRight.firstChild);
        }

        // Toggle sound on click
        soundBtn.addEventListener('click', () => {
            const enabled = this.game.sound.toggle();
            soundBtn.innerHTML = enabled ? '🔊' : '🔇';
            this.game.addLog(enabled ? 'Sound aktiviert' : 'Sound deaktiviert', 'info');
        }, { signal });
    }

    setupUIListeners() {
        const signal = this.abortController.signal;

        // Achievements Modal
        const achievementsBtn = document.getElementById('achievements-btn');
        const achievementsModal = document.getElementById('achievements-modal');
        const achievementsClose = document.getElementById('achievements-close');

        if (achievementsBtn && achievementsModal) {
            achievementsBtn.addEventListener('click', () => {
                this.game.renderController.renderAchievements('all');
                achievementsModal.style.display = 'block';
            }, { signal });

            achievementsClose.addEventListener('click', () => {
                achievementsModal.style.display = 'none';
            }, { signal });

            // Tabs
            const tabs = achievementsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.game.renderController.renderAchievements(e.target.dataset.category);
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
                statsModal.style.display = 'block';
            }, { signal });

            statsClose.addEventListener('click', () => {
                statsModal.style.display = 'none';
            }, { signal });

            // Tabs
            const tabs = statsModal.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.game.renderController.renderStatistics(e.target.dataset.category);
                }, { signal });
            });
        }

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target === achievementsModal) achievementsModal.style.display = 'none';
            if (e.target === statsModal) statsModal.style.display = 'none';
        }, { signal });
    }

    setupKeyboardShortcuts(signal) {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const helpModal = document.getElementById('help-modal');
            if (helpModal && helpModal.classList.contains('active')) return;

            // Number keys 1-5 to play cards
            if (e.key >= '1' && e.key <= '5') {
                const index = parseInt(e.key) - 1;
                if (index < this.game.hero.hand.length) {
                    this.game.interactionController.handleCardClick(index, this.game.hero.hand[index]);
                    this.game.addLog(`Karte ${e.key} gespielt (Tastatur)`, 'info');
                }
                e.preventDefault();
            }

            // Commands
            switch (e.key.toLowerCase()) {
                case ' ':
                case 'space':
                    this.game.turnManager.endTurn();
                    e.preventDefault();
                    break;
                case 'h': {
                    const helpBtn = document.getElementById('help-btn');
                    if (helpBtn) helpBtn.click();
                    e.preventDefault();
                    break;
                }
                case 'r':
                    this.game.phaseManager.rest();
                    e.preventDefault();
                    break;
                case 'e':
                    this.game.actionManager.explore();
                    e.preventDefault();
                    break;
                case 't':
                    this.game.showTutorial();
                    e.preventDefault();
                    break;
                case 'escape':
                    if (this.game.movementMode) {
                        this.game.exitMovementMode();
                        this.game.addLog('Bewegungsmodus abgebrochen', 'info');
                    }
                    break;
                case 'm': {
                    const manaPanel = document.querySelector('.mana-panel');
                    if (manaPanel) {
                        manaPanel.scrollIntoView({ behavior: 'smooth' });
                        manaPanel.classList.add('highlight-pulse');
                        setTimeout(() => manaPanel.classList.remove('highlight-pulse'), 1000);
                    }
                    break;
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

    isUIBlocked() {
        // Check if any modal is active
        const activeModals = document.querySelectorAll('.modal.active, .site-modal.active');
        if (activeModals.length > 0) return true;

        const helpModal = document.getElementById('help-modal');
        if (helpModal && helpModal.classList.contains('active')) return true;

        if (this.game.gameState !== 'playing' && this.game.gameState !== 'combat') return true;

        return false;
    }

    destroy() {
        this.abortController.abort();
    }
}
